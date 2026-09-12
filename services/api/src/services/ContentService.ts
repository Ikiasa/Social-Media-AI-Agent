import { ContentRepository } from '../../../../packages/database/src/repositories/ContentRepository';
import { IContent, ContentStatus } from '../../../../packages/database/src/models/Content';
import { WorkspaceContext } from '../../../../packages/core/src/context';
import { ValidationError, AuthorizationError } from '../../../../packages/core/src/errors';
import { generateHmacSignature } from '../../../../packages/core/src/crypto';

export class ContentService {
  private repo: ContentRepository;

  constructor(repo: ContentRepository = new ContentRepository()) {
    this.repo = repo;
  }

  async createDraft(ctx: WorkspaceContext, data: Partial<IContent>): Promise<IContent> {
    if (!ctx.workspaceId || !ctx.userId) {
      throw new AuthorizationError('Workspace & User context required to create content draft.');
    }
    if (!data.title || !data.title.trim()) {
      throw new ValidationError('Content title is required.');
    }

    return await this.repo.create({
      ...data,
      workspaceId: ctx.workspaceId,
      createdBy: ctx.userId,
      status: 'DRAFT',
    });
  }

  async getContent(ctx: WorkspaceContext, id: string): Promise<IContent | null> {
    if (!ctx.workspaceId) {
      throw new AuthorizationError('Workspace context required to view content.');
    }
    return await this.repo.findById(id, ctx.workspaceId);
  }

  async listContent(ctx: WorkspaceContext, filterStatus?: ContentStatus): Promise<IContent[]> {
    if (!ctx.workspaceId) {
      throw new AuthorizationError('Workspace context required to list content.');
    }
    return await this.repo.list(ctx.workspaceId, filterStatus);
  }

  async updateContent(ctx: WorkspaceContext, id: string, updates: Partial<IContent>): Promise<IContent | null> {
    if (!ctx.workspaceId) {
      throw new AuthorizationError('Workspace context required to update content.');
    }

    const existing = await this.repo.findById(id, ctx.workspaceId);
    if (!existing) return null;

    const isMaterialEdit =
      updates.title !== undefined ||
      updates.caption !== undefined ||
      updates.body !== undefined ||
      updates.hook !== undefined ||
      updates.cta !== undefined ||
      updates.hashtags !== undefined ||
      updates.media !== undefined ||
      updates.platform !== undefined;

    if (isMaterialEdit) {
      // Always increment version on material edits
      const currentVersion = existing.contentVersion || 1;
      updates.contentVersion = currentVersion + 1;

      // Invalidation: If content was APPROVED, clear signature & reset status to DRAFT
      if (existing.status === 'APPROVED') {
        const timestamp = new Date();
        updates.status = 'DRAFT';
        (updates as any).approvedBy = undefined;
        (updates as any).finalApprovedBy = undefined;
        (updates as any).finalApprovalAt = undefined;
        (updates as any).approvalSignature = undefined;
        updates.approvalInvalidatedAt = timestamp;
        updates.approvalInvalidationReason = 'Material content edit after final approval';

        const history = existing.metadata?.approvalHistory as any[] || [];
        history.push({
          fromStatus: 'APPROVED',
          toStatus: 'DRAFT',
          actorId: ctx.userId || 'system',
          actorRole: 'writer',
          notes: `Content version incremented to v${updates.contentVersion} due to material edit. Final approval invalidated.`,
          timestamp: timestamp.toISOString(),
        });

        updates.metadata = {
          ...(existing.metadata || {}),
          ...(updates.metadata || {}),
          approvalHistory: history,
        };
      }
    }

    return await this.repo.update(id, ctx.workspaceId, updates);
  }

  async approveContent(ctx: WorkspaceContext, id: string): Promise<IContent | null> {
    if (!ctx.workspaceId || !ctx.userId) {
      throw new AuthorizationError('Workspace & User context required to approve content.');
    }

    const content = await this.repo.findById(id, ctx.workspaceId);
    if (!content) {
      throw new ValidationError('Content not found in current workspace.');
    }

    const timestamp = new Date().toISOString();
    const payloadToSign = `workspaceId=${ctx.workspaceId}&contentId=${id}&title=${content.title}&caption=${content.caption || ''}&approverId=${ctx.userId}&timestamp=${timestamp}`;
    const approvalSignature = generateHmacSignature(payloadToSign);

    return await this.repo.update(id, ctx.workspaceId, {
      status: 'APPROVED',
      approvedBy: ctx.userId,
      metadata: {
        ...(content.metadata || {}),
        approvalSignature,
        approvedAt: timestamp,
      },
    });
  }

  async rejectContent(ctx: WorkspaceContext, id: string): Promise<IContent | null> {
    if (!ctx.workspaceId) {
      throw new AuthorizationError('Workspace context required to reject content.');
    }
    const content = await this.repo.findById(id, ctx.workspaceId);
    if (!content) {
      throw new ValidationError('Content not found in current workspace.');
    }
    return await this.repo.updateStatus(id, ctx.workspaceId, 'REJECTED');
  }

  async archiveContent(ctx: WorkspaceContext, id: string): Promise<IContent | null> {
    if (!ctx.workspaceId) {
      throw new AuthorizationError('Workspace context required to archive content.');
    }
    return await this.repo.updateStatus(id, ctx.workspaceId, 'ARCHIVED');
  }
}
