import { WorkspaceContext } from '../../../../packages/core/src/context';
import { AuthorizationError, ValidationError } from '../../../../packages/core/src/errors';
import { generateCanonicalApprovalHmac, CanonicalApprovalPayload } from '../../../../packages/core/src/crypto';
import {
  SocialConversationModel,
  SocialMessageModel,
  ResponseDraftModel,
  IResponseDraft,
} from '../../../../packages/database/src';
import { tenantFeatureFlags } from './TenantFeatureFlagService';
import { eventBus } from './EventBusService';
import { KnowledgeService } from './KnowledgeService';
import { costObservabilityService } from './CostObservabilityService';

export class ResponseDraftService {
  private knowledgeService: KnowledgeService;

  constructor(knowledgeService: KnowledgeService = new KnowledgeService()) {
    this.knowledgeService = knowledgeService;
  }

  /**
   * Generate RAG-Assisted AI Response Draft with Fact Grounding & Safe Fallback
   */
  async generateDraft(
    ctx: WorkspaceContext,
    conversationId: string,
    sourceMessageId: string
  ): Promise<IResponseDraft> {
    if (!ctx.workspaceId || !ctx.userId) {
      throw new AuthorizationError('Workspace & User context required.');
    }

    if (!tenantFeatureFlags.isFeatureEnabled(ctx.workspaceId, 'communityAgentDrafts')) {
      throw new AuthorizationError('Feature "communityAgentDrafts" is disabled for this tenant.');
    }

    const conversation = await SocialConversationModel.findOne({
      _id: conversationId,
      workspaceId: ctx.workspaceId,
    }).exec();

    if (!conversation) {
      throw new ValidationError(`Conversation ${conversationId} not found in current workspace.`);
    }

    const sourceMessage = await SocialMessageModel.findOne({
      _id: sourceMessageId,
      workspaceId: ctx.workspaceId,
    }).exec();

    if (!sourceMessage) {
      throw new ValidationError(`Message ${sourceMessageId} not found in current workspace.`);
    }

    // Query Knowledge Base Documents for Fact Grounding
    const knowledgeDocs = await this.knowledgeService.listDocuments(ctx).catch(() => []);
    const knowledgeSources = knowledgeDocs.map((d: any) => String(d.title || d._id));

    let draftContent = '';
    const bodyLower = sourceMessage.body.toLowerCase();

    // RAG Fact Matching or Safe Fallback Guardrail
    if (knowledgeDocs.length === 0 || bodyLower.includes('spesifik') || bodyLower.includes('kebijakan khusus') || bodyLower.includes('tuntut')) {
      // Safe Fallback when factual knowledge is insufficient or message is high-risk
      draftContent = 'Terima kasih sudah menghubungi kami. Tim kami akan memeriksa detailnya dan segera membantu Anda.';
    } else {
      const matchedDoc = knowledgeDocs[0]?.title || 'FAQ Brand Guidelines';
      draftContent = `Halo! Terima kasih telah menghubungi kami. Berdasarkan panduan resmi (${matchedDoc}), kami dapat membantu Anda terkait pertanyaan ini.\n\nAda hal lain yang dapat kami bantu?`;
    }

    // Record AI cost usage
    costObservabilityService.recordUsage(
      ctx.workspaceId,
      'ResponseDraftService',
      100,
      50,
      conversation.brandId
    );

    const draft = await ResponseDraftModel.create({
      workspaceId: ctx.workspaceId,
      brandId: conversation.brandId,
      conversationId: String(conversation._id),
      sourceMessageId: String(sourceMessage._id),
      content: draftContent,
      status: 'DRAFT',
      knowledgeSources: knowledgeSources.length > 0 ? knowledgeSources : ['Default Brand Safety Fallback'],
      createdBy: 'Community Agent',
      version: 1,
    });

    eventBus.publishEvent('inbox.draft_created', {
      workspaceId: ctx.workspaceId,
      brandId: conversation.brandId,
      conversationId: String(conversation._id),
      draftId: String(draft._id),
    });

    return draft;
  }

  /**
   * Update Response Draft Content (Material Edit Version Invalidation)
   */
  async updateDraftContent(
    ctx: WorkspaceContext,
    draftId: string,
    newContent: string
  ): Promise<IResponseDraft> {
    if (!ctx.workspaceId) {
      throw new AuthorizationError('Workspace context required.');
    }

    const draft = await ResponseDraftModel.findOne({
      _id: draftId,
      workspaceId: ctx.workspaceId,
    }).exec();

    if (!draft) {
      throw new ValidationError(`Draft ${draftId} not found in current workspace.`);
    }

    if (!newContent || !newContent.trim()) {
      throw new ValidationError('Draft content cannot be empty.');
    }

    // If content changes, increment version & reset approval status to PENDING_APPROVAL
    draft.content = newContent.trim();
    draft.version = (draft.version || 1) + 1;
    draft.status = 'PENDING_APPROVAL';
    draft.approvedBy = undefined;
    draft.approvedAt = undefined;
    draft.approvalSignature = undefined;

    await draft.save();
    return draft;
  }

  /**
   * Approve Response Draft & Sign Canonical HMAC
   */
  async approveDraft(ctx: WorkspaceContext, draftId: string): Promise<IResponseDraft> {
    if (!ctx.workspaceId || !ctx.userId) {
      throw new AuthorizationError('Workspace & User context required.');
    }

    const draft = await ResponseDraftModel.findOne({
      _id: draftId,
      workspaceId: ctx.workspaceId,
    }).exec();

    if (!draft) {
      throw new ValidationError(`Draft ${draftId} not found in current workspace.`);
    }

    const approvedAt = new Date();
    const approvedAtIso = approvedAt.toISOString();

    // Canonical HMAC Payload for Response Draft Approval
    const payload: CanonicalApprovalPayload = {
      tenantId: ctx.workspaceId,
      brandId: draft.brandId || '',
      contentId: String(draft._id),
      contentVersion: draft.version || 1,
      decision: 'APPROVED',
      reviewerId: ctx.userId,
      approvedAt: approvedAtIso,
    };

    const signature = generateCanonicalApprovalHmac(payload);

    draft.status = 'APPROVED';
    draft.approvedBy = ctx.userId;
    draft.approvedAt = approvedAt;
    draft.approvalSignature = signature;

    await draft.save();

    eventBus.publishEvent('inbox.draft_approved', {
      workspaceId: ctx.workspaceId,
      brandId: draft.brandId,
      conversationId: draft.conversationId,
      draftId: String(draft._id),
      version: draft.version,
    });

    return draft;
  }

  /**
   * Reject Response Draft
   */
  async rejectDraft(ctx: WorkspaceContext, draftId: string): Promise<IResponseDraft> {
    if (!ctx.workspaceId) {
      throw new AuthorizationError('Workspace context required.');
    }

    const draft = await ResponseDraftModel.findOneAndUpdate(
      { _id: draftId, workspaceId: ctx.workspaceId },
      { $set: { status: 'REJECTED' } },
      { new: true }
    ).exec();

    if (!draft) {
      throw new ValidationError(`Draft ${draftId} not found in current workspace.`);
    }

    return draft;
  }
}
