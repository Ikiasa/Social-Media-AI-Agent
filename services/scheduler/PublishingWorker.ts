import { ScheduledPostModel, IScheduledPost } from '../../packages/database/src/models/ScheduledPost';
import { SocialAccountModel } from '../../packages/database/src/models/SocialAccount';
import { ContentModel } from '../../packages/database/src/models/Content';
import { PublicationModel } from '../../packages/database/src/models/Publication';
import {
  SocialPublisher,
  SocialPlatform,
  PublishRequest,
} from '../../packages/social/src/publisher';
import { PublisherRegistry, defaultPublisherRegistry } from '../../packages/social/src/PublisherRegistry';
import { InstagramPublisher } from '../../platforms/instagram/src/InstagramPublisher';
import { LinkedInPublisher } from '../../platforms/linkedin/src/LinkedInPublisher';
import { XPublisher } from '../../platforms/x/src/XPublisher';
import { createWorkspaceContext } from '../../packages/core/src/context';
import { defaultLogger, Logger } from '../../packages/core/src/logger';
import {
  verifyCanonicalApprovalHmac,
  CanonicalApprovalPayload,
} from '../../packages/core/src/crypto';

export class PublishingWorker {
  private registry: PublisherRegistry;
  private logger: Logger;
  private maxRetries = 5;

  constructor(publishers?: SocialPublisher[], logger: Logger = defaultLogger, registry?: PublisherRegistry) {
    this.logger = logger;
    this.registry = registry || new PublisherRegistry();

    const initialPublishers = publishers || [new InstagramPublisher(), new LinkedInPublisher(), new XPublisher()];
    for (const p of initialPublishers) {
      this.registry.register(p);
    }
  }

  async runWorkerCycle(workspaceId?: string): Promise<{
    processed: number;
    published: number;
    retryWait: number;
    failed: number;
    recovered: number;
  }> {
    const stats = { processed: 0, published: 0, retryWait: 0, failed: 0, recovered: 0 };

    // 1. Crash Recovery & Safe Reconciliation of stale PUBLISHING/RECONCILING posts (locked > 5 minutes ago)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const staleQuery: Record<string, unknown> = {
      status: { $in: ['PUBLISHING', 'PUBLISHING_UNKNOWN', 'RECONCILING'] },
      updatedAt: { $lte: fiveMinutesAgo },
    };
    if (workspaceId) staleQuery.workspaceId = workspaceId;

    const stalePosts: IScheduledPost[] = await ScheduledPostModel.find(staleQuery).exec();
    for (const stale of stalePosts) {
      this.logger.warn(`PublishingWorker: Reconciling crashed/stale post ${stale._id}`);

      // Check 1: Idempotency check in PublicationModel database
      const existingPub = await PublicationModel.findOne({
        workspaceId: stale.workspaceId,
        scheduledPostId: String(stale._id),
      });

      if (existingPub) {
        stale.status = 'PUBLISHED';
        await stale.save();
        stats.published++;
        continue;
      }

      // Check 2: Generic provider status check if containerId/providerReference exists
      const platform = (stale.platform as SocialPlatform) || 'instagram';
      let isReconciledPublished = false;

      if (stale.containerId && this.registry.has(platform)) {
        const publisher = this.registry.get(platform);
        const ctx = createWorkspaceContext(stale.workspaceId, stale.createdBy || 'worker');
        const account = await SocialAccountModel.findOne({ workspaceId: stale.workspaceId, platform }).exec();

        if (account) {
          let statusRes: any;
          if (publisher.getPublishStatus) {
            statusRes = await publisher.getPublishStatus(ctx, account, stale.containerId);
          } else if (publisher.checkContainerStatus) {
            statusRes = await publisher.checkContainerStatus(ctx, account, stale.containerId);
          }

          if (statusRes && (statusRes.status === 'PUBLISHED' || statusRes.status === 'SUCCESS' || statusRes.outcome === 'PUBLISHED')) {
            stale.status = 'PUBLISHED';
            await stale.save();

            const postId = statusRes.providerPostId || statusRes.platformPostId || stale.containerId;
            await PublicationModel.create({
              workspaceId: stale.workspaceId,
              brandId: stale.brandId,
              contentId: String(stale.contentId),
              scheduledPostId: String(stale._id),
              platform,
              platformPostId: postId,
              providerPostId: postId,
              providerContainerId: stale.containerId,
              postUrl: statusRes.providerUrl || statusRes.postUrl || `https://${platform}.com/p/${postId}`,
              publishedAt: new Date(),
              publishedBy: stale.createdBy || 'worker',
            });

            isReconciledPublished = true;
            stats.published++;
          }
        }
      }

      if (!isReconciledPublished) {
        // Safe retry reset
        stale.status = 'READY_TO_PUBLISH';
        await stale.save();
        stats.recovered++;
      }
    }

    // 2. Fetch candidates for publishing (READY_TO_PUBLISH or RETRY_WAIT due for retry)
    const now = new Date();
    const dueQuery: Record<string, unknown> = {
      $or: [
        { status: 'READY_TO_PUBLISH' },
        { status: 'RETRY_WAIT', nextRetryAt: { $lte: now } },
      ],
    };
    if (workspaceId) dueQuery.workspaceId = workspaceId;

    const candidates: IScheduledPost[] = await ScheduledPostModel.find(dueQuery).exec();
    stats.processed = candidates.length;

    for (const candidate of candidates) {
      // 3. Atomic Job Claim: Race-condition safe transition candidate -> PUBLISHING
      const claimedPost = await ScheduledPostModel.findOneAndUpdate(
        {
          _id: candidate._id,
          status: { $in: ['READY_TO_PUBLISH', 'RETRY_WAIT'] },
        },
        {
          $set: { status: 'PUBLISHING', updatedAt: new Date() },
        },
        { new: true }
      ).exec();

      if (!claimedPost) {
        // Post was claimed concurrently by another worker
        continue;
      }

      await this.processSinglePost(claimedPost, stats);
    }

    return stats;
  }

  private async processSinglePost(
    post: IScheduledPost,
    stats: { published: number; retryWait: number; failed: number }
  ): Promise<void> {
    const ctx = createWorkspaceContext(post.workspaceId, post.createdBy || 'worker');

    // 1. Idempotency Check in Database
    const existingPub = await PublicationModel.findOne({
      workspaceId: post.workspaceId,
      scheduledPostId: String(post._id),
    });

    if (existingPub) {
      this.logger.info(`PublishingWorker: Duplicate publish prevented for post ${post._id}. Post already published.`);
      post.status = 'PUBLISHED';
      await post.save();
      stats.published++;
      return;
    }

    // 2. Load Content Record
    const content = await ContentModel.findOne({
      _id: post.contentId,
      workspaceId: post.workspaceId,
    });

    if (!content) {
      post.status = 'FAILED';
      post.errorMessage = 'Content record missing';
      await post.save();
      stats.failed++;
      return;
    }

    // 2b. Pre-Publish Queue Guard Security Validation
    const isStatusApproved = content.status === 'APPROVED';
    const hasFinalApproval = Boolean(content.finalApprovalAt || content.metadata?.clientApprovedAt);
    const hasApprovedBy = Boolean(content.finalApprovedBy || content.approvedBy);
    const hasSignature = Boolean(content.approvalSignature);

    let isSignatureValid = false;
    if (hasSignature && hasFinalApproval && hasApprovedBy) {
      const approvedAtIso = content.finalApprovalAt
        ? new Date(content.finalApprovalAt).toISOString()
        : String(content.metadata?.clientApprovedAt || '');

      const canonicalPayload: CanonicalApprovalPayload = {
        tenantId: post.workspaceId,
        brandId: content.brandId || post.brandId || '',
        contentId: String(content._id),
        contentVersion: content.contentVersion || 1,
        decision: 'APPROVED',
        reviewerId: content.finalApprovedBy || content.approvedBy || '',
        approvedAt: approvedAtIso,
      };

      isSignatureValid = verifyCanonicalApprovalHmac(canonicalPayload, content.approvalSignature!);
    }

    if (!isStatusApproved || !hasFinalApproval || !hasApprovedBy || !hasSignature || !isSignatureValid) {
      this.logger.error(
        `QueueGuard: BLOCKED publishing for post ${post._id}. Status=${content.status}, SignatureValid=${isSignatureValid}`
      );
      post.status = 'BLOCKED_APPROVAL_VALIDATION';
      post.errorMessage = 'BLOCKED_APPROVAL_VALIDATION: Content approval is missing, tampered, version-mismatched, or invalidated.';
      await post.save();
      stats.failed++;
      return;
    }

    const platform = ((post.platform || content.platform || 'instagram') as SocialPlatform);

    // Resolve SocialPublisher via Registry
    if (!this.registry.has(platform)) {
      post.status = 'FAILED';
      post.errorMessage = `No registered social publisher available for platform '${platform}'`;
      await post.save();
      stats.failed++;
      return;
    }

    const publisher = this.registry.get(platform);

    // 3. Load Connected Social Account
    const accountFilter: Record<string, unknown> = {
      workspaceId: post.workspaceId,
      platform,
    };
    if (post.brandId) accountFilter.brandId = post.brandId;

    const account = await SocialAccountModel.findOne(accountFilter).exec();
    if (!account) {
      post.status = 'FAILED';
      post.errorMessage = `No connected ${platform} social account found for workspace ${post.workspaceId}`;
      await post.save();
      stats.failed++;
      return;
    }

    // 4. Build Normalized PublishRequest
    const request: PublishRequest = {
      scheduledPostId: String(post._id),
      contentId: String(content._id),
      platform,
      caption: content.caption || content.body || content.title,
      metadata: content.metadata,
    };

    // 5. Execute Platform-Neutral SocialPublisher
    const publishRes = await publisher.publish(ctx, account, request);

    const isPublished = publishRes.outcome === 'PUBLISHED' || publishRes.status === 'SUCCESS';
    const isRetry = publishRes.outcome === 'PROCESSING' || publishRes.status === 'RETRY_WAIT';

    if (isPublished) {
      const postId = publishRes.providerPostId || publishRes.platformPostId || 'post_published';
      const containerId = publishRes.providerContainerId;

      post.status = 'PUBLISHED';
      post.containerId = containerId;
      post.errorMessage = undefined;
      await post.save();

      content.status = 'PUBLISHED';
      await content.save();

      // Create Audit Trail Publication Record
      await PublicationModel.create({
        workspaceId: post.workspaceId,
        brandId: post.brandId,
        contentId: String(content._id),
        scheduledPostId: String(post._id),
        platform,
        platformPostId: postId,
        providerPostId: postId,
        providerContainerId: containerId,
        postUrl: publishRes.providerUrl || publishRes.postUrl || `https://${platform}.com/p/${postId}`,
        publishedAt: new Date(),
        publishedBy: post.createdBy || 'worker',
      });

      stats.published++;
      this.logger.info(`PublishingWorker: Successfully published post ${post._id} to ${platform}`);
    } else if (isRetry) {
      const currentRetryCount = (post as any).retryCount || 0;
      const nextCount = currentRetryCount + 1;

      if (nextCount > this.maxRetries) {
        post.status = 'FAILED';
        post.errorMessage = `Max retries (${this.maxRetries}) exceeded. Last error: ${publishRes.errorMessage}`;
        await post.save();
        content.status = 'FAILED';
        await content.save();
        stats.failed++;
      } else {
        // Exponential Backoff: 2^retryCount minutes
        const delayMs = Math.pow(2, currentRetryCount) * 60 * 1000;
        const nextRetryAt = new Date(Date.now() + delayMs);

        post.status = 'RETRY_WAIT';
        if (publishRes.providerContainerId) {
          post.containerId = publishRes.providerContainerId;
        }
        (post as any).retryCount = nextCount;
        (post as any).nextRetryAt = nextRetryAt;
        post.errorMessage = publishRes.errorMessage || 'Rate limit / transient server retry wait';
        await post.save();
        stats.retryWait++;
      }
    } else {
      post.status = 'FAILED';
      post.errorMessage = publishRes.errorMessage || 'Publishing failed';
      await post.save();

      content.status = 'FAILED';
      await content.save();

      const isAuthError =
        publishRes.isPermanentAuthFailure ||
        publishRes.errorCategory === 'AUTHENTICATION' ||
        publishRes.errorCategory === 'AUTHORIZATION';

      if (isAuthError) {
        account.status = 'RE-AUTH_REQUIRED';
        await account.save();
        this.logger.warn(`PublishingWorker: Permanent auth failure for account ${account.username}. Marked RE-AUTH_REQUIRED.`);
      }

      stats.failed++;
    }
  }
}
