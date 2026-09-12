import { ContentRepository } from '../../../../packages/database/src/repositories/ContentRepository';
import { IContent, ContentStatus } from '../../../../packages/database/src/models/Content';
import { WorkspaceContext } from '../../../../packages/core/src/context';
import { ValidationError, AuthorizationError } from '../../../../packages/core/src/errors';
import {
  generateHmacSignature,
  generateCanonicalApprovalHmac,
  CanonicalApprovalPayload,
} from '../../../../packages/core/src/crypto';
import { eventBus } from './EventBusService';

export interface ApprovalComment {
  id: string;
  authorId: string;
  authorRole: 'writer' | 'strategist' | 'client' | 'system';
  authorName: string;
  comment: string;
  timestamp: string;
}

export interface ApprovalHistoryEntry {
  fromStatus: ContentStatus;
  toStatus: ContentStatus;
  actorId: string;
  actorRole: string;
  notes?: string;
  timestamp: string;
}

export class ApprovalWorkflowService {
  private repo: ContentRepository;

  constructor(repo: ContentRepository = new ContentRepository()) {
    this.repo = repo;
  }

  /**
   * Writer submits DRAFT or REVISION_REQUESTED content to Strategist
   */
  async submitForStrategistReview(ctx: WorkspaceContext, contentId: string, notes?: string): Promise<IContent> {
    if (!ctx.workspaceId || !ctx.userId) {
      throw new AuthorizationError('Workspace and User context required.');
    }

    const content = await this.repo.findById(contentId, ctx.workspaceId);
    if (!content) {
      throw new ValidationError(`Content ${contentId} not found in workspace.`);
    }

    if (content.status !== 'DRAFT' && content.status !== 'REVISION_REQUESTED' && content.status !== 'IDEA') {
      throw new ValidationError(`Cannot submit content with status '${content.status}' to strategist review.`);
    }

    const history: ApprovalHistoryEntry[] = content.metadata?.approvalHistory as ApprovalHistoryEntry[] || [];
    history.push({
      fromStatus: content.status,
      toStatus: 'PENDING_STRATEGIST_REVIEW',
      actorId: ctx.userId,
      actorRole: 'writer',
      notes: notes || 'Submitted for strategist review',
      timestamp: new Date().toISOString(),
    });

    const updated = await this.repo.update(contentId, ctx.workspaceId, {
      status: 'PENDING_STRATEGIST_REVIEW',
      metadata: {
        ...(content.metadata || {}),
        approvalHistory: history,
        lastSubmittedAt: new Date().toISOString(),
      },
    });

    eventBus.emit('approval.submitted_to_strategist', {
      workspaceId: ctx.workspaceId,
      contentId,
      submittedBy: ctx.userId,
    });

    return updated!;
  }

  /**
   * Strategist approves content -> PENDING_CLIENT_REVIEW or requests revision -> REVISION_REQUESTED
   */
  async strategistReview(
    ctx: WorkspaceContext,
    contentId: string,
    action: 'approve' | 'request_revision' | 'reject',
    notes?: string
  ): Promise<IContent> {
    if (!ctx.workspaceId || !ctx.userId) {
      throw new AuthorizationError('Workspace and User context required.');
    }

    const content = await this.repo.findById(contentId, ctx.workspaceId);
    if (!content) {
      throw new ValidationError(`Content ${contentId} not found in workspace.`);
    }

    if (content.status !== 'PENDING_STRATEGIST_REVIEW') {
      throw new ValidationError(`Content is not in 'PENDING_STRATEGIST_REVIEW' status (current: ${content.status}).`);
    }

    let nextStatus: ContentStatus;
    if (action === 'approve') {
      nextStatus = 'PENDING_CLIENT_REVIEW';
    } else if (action === 'request_revision') {
      nextStatus = 'REVISION_REQUESTED';
    } else {
      nextStatus = 'REJECTED';
    }

    const history: ApprovalHistoryEntry[] = content.metadata?.approvalHistory as ApprovalHistoryEntry[] || [];
    history.push({
      fromStatus: content.status,
      toStatus: nextStatus,
      actorId: ctx.userId,
      actorRole: 'strategist',
      notes: notes || `Strategist decision: ${action}`,
      timestamp: new Date().toISOString(),
    });

    const updated = await this.repo.update(contentId, ctx.workspaceId, {
      status: nextStatus,
      metadata: {
        ...(content.metadata || {}),
        approvalHistory: history,
        strategistApprovedBy: action === 'approve' ? ctx.userId : undefined,
        strategistReviewedAt: new Date().toISOString(),
      },
    });

    eventBus.emit(`approval.strategist_${action}`, {
      workspaceId: ctx.workspaceId,
      contentId,
      strategistId: ctx.userId,
      nextStatus,
    });

    return updated!;
  }

  /**
   * Client decisions: APPROVED, REVISION_REQUESTED, or REJECTED
   */
  async clientDecision(
    ctx: WorkspaceContext,
    contentId: string,
    action: 'approve' | 'request_revision' | 'reject',
    clientName: string,
    notes?: string
  ): Promise<IContent> {
    if (!ctx.workspaceId) {
      throw new AuthorizationError('Workspace context required.');
    }

    const content = await this.repo.findById(contentId, ctx.workspaceId);
    if (!content) {
      throw new ValidationError(`Content ${contentId} not found in workspace.`);
    }

    if (content.status !== 'PENDING_CLIENT_REVIEW') {
      throw new ValidationError(
        `Cannot execute client decision: Content is not in 'PENDING_CLIENT_REVIEW' status (current status: '${content.status}'). Strategist approval is required first.`
      );
    }

    let nextStatus: ContentStatus;
    if (action === 'approve') {
      nextStatus = 'APPROVED';
    } else if (action === 'request_revision') {
      nextStatus = 'REVISION_REQUESTED';
    } else {
      nextStatus = 'REJECTED';
    }

    const timestampIso = new Date().toISOString();
    const approvedAtDate = new Date(timestampIso);
    const history: ApprovalHistoryEntry[] = content.metadata?.approvalHistory as ApprovalHistoryEntry[] || [];
    history.push({
      fromStatus: content.status,
      toStatus: nextStatus,
      actorId: ctx.userId || clientName,
      actorRole: 'client',
      notes: notes || `Client decision (${clientName}): ${action}`,
      timestamp: timestampIso,
    });

    let approvalSignature: string | undefined;
    const contentVersion = content.contentVersion || 1;

    if (action === 'approve') {
      const canonicalPayload: CanonicalApprovalPayload = {
        tenantId: ctx.workspaceId,
        brandId: content.brandId || '',
        contentId: String(content._id || contentId),
        contentVersion,
        decision: 'APPROVED',
        reviewerId: ctx.userId || clientName,
        approvedAt: timestampIso,
      };
      approvalSignature = generateCanonicalApprovalHmac(canonicalPayload);
    }

    const updateFields: Partial<IContent> = {
      status: nextStatus,
      approvedBy: action === 'approve' ? clientName : undefined,
      finalApprovedBy: action === 'approve' ? clientName : undefined,
      finalApprovalAt: action === 'approve' ? approvedAtDate : undefined,
      approvalSignature: action === 'approve' ? approvalSignature : undefined,
      approvalSignatureVersion: action === 'approve' ? 'v1' : undefined,
      approvalInvalidatedAt: undefined,
      approvalInvalidationReason: undefined,
      metadata: {
        ...(content.metadata || {}),
        approvalHistory: history,
        clientName,
        clientApprovedAt: action === 'approve' ? timestampIso : undefined,
        canonicalPayload: action === 'approve' ? {
          tenantId: ctx.workspaceId,
          brandId: content.brandId || '',
          contentId: String(content._id || contentId),
          contentVersion,
          decision: 'APPROVED',
          reviewerId: ctx.userId || clientName,
          approvedAt: timestampIso,
        } : undefined,
      },
    };

    const updated = await this.repo.update(contentId, ctx.workspaceId, updateFields);

    eventBus.emit(`approval.client_${action}`, {
      workspaceId: ctx.workspaceId,
      contentId,
      clientName,
      nextStatus,
    });

    return updated!;
  }

  /**
   * Add comment/feedback to content item
   */
  async addComment(
    ctx: WorkspaceContext,
    contentId: string,
    authorName: string,
    authorRole: 'writer' | 'strategist' | 'client',
    commentText: string
  ): Promise<ApprovalComment[]> {
    if (!ctx.workspaceId) {
      throw new AuthorizationError('Workspace context required.');
    }

    const content = await this.repo.findById(contentId, ctx.workspaceId);
    if (!content) {
      throw new ValidationError(`Content ${contentId} not found.`);
    }

    const comments: ApprovalComment[] = (content.metadata?.comments as ApprovalComment[]) || [];
    const newComment: ApprovalComment = {
      id: `comment_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      authorId: ctx.userId || authorName,
      authorRole,
      authorName,
      comment: commentText,
      timestamp: new Date().toISOString(),
    };

    comments.push(newComment);

    await this.repo.update(contentId, ctx.workspaceId, {
      metadata: {
        ...(content.metadata || {}),
        comments,
      },
    });

    return comments;
  }
}
