import { ScheduledPostModel, IScheduledPost } from '../../packages/database/src/models/ScheduledPost';
import { ContentModel } from '../../packages/database/src/models/Content';
import { PublicationModel } from '../../packages/database/src/models/Publication';
import { defaultLogger, Logger } from '../../packages/core/src/logger';
import { AuthorizationError } from '../../packages/core/src/errors';

export interface SchedulerProcessResult {
  processedCount: number;
  readyToPublishCount: number;
  blockedCount: number;
  items: Array<{
    scheduleId: string;
    contentId: string;
    status: string;
    reason?: string;
  }>;
}

export class SchedulerEngine {
  private logger: Logger;

  constructor(logger: Logger = defaultLogger) {
    this.logger = logger;
  }

  async processDuePosts(workspaceId?: string): Promise<SchedulerProcessResult> {
    const query: Record<string, unknown> = {
      status: 'SCHEDULED',
      scheduledAt: { $lte: new Date() },
    };
    if (workspaceId) {
      query.workspaceId = workspaceId;
    }

    const duePosts: IScheduledPost[] = await ScheduledPostModel.find(query).exec();

    this.logger.info(`SchedulerEngine: Found ${duePosts.length} due posts for processing`, {
      workspaceId: workspaceId || 'all',
      count: duePosts.length,
    });

    const result: SchedulerProcessResult = {
      processedCount: duePosts.length,
      readyToPublishCount: 0,
      blockedCount: 0,
      items: [],
    };

    for (const post of duePosts) {
      try {
        // Enforce idempotency: verify publication has not already been created for this schedule
        const existingPub = await PublicationModel.findOne({
          scheduledPostId: String(post._id),
          workspaceId: post.workspaceId,
        });

        if (existingPub) {
          this.logger.info(`SchedulerEngine: Post ${post._id} already processed. Updating status.`);
          post.status = 'PUBLISHED';
          await post.save();
          continue;
        }

        // Real platform OAuth credentials are not connected until Phase 7.
        // Transition to READY_TO_PUBLISH without fake publishing success claims.
        post.status = 'READY_TO_PUBLISH';
        await post.save();

        await ContentModel.updateOne(
          { _id: post.contentId, workspaceId: post.workspaceId },
          { $set: { status: 'SCHEDULED' } }
        );

        result.readyToPublishCount++;
        result.items.push({
          scheduleId: String(post._id),
          contentId: post.contentId,
          status: 'READY_TO_PUBLISH',
          reason: 'Post reached scheduled timestamp; ready for platform OAuth publishing phase.',
        });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        post.status = 'BLOCKED';
        await post.save();

        result.blockedCount++;
        result.items.push({
          scheduleId: String(post._id),
          contentId: post.contentId,
          status: 'BLOCKED',
          reason: errorMsg,
        });
      }
    }

    return result;
  }
}
