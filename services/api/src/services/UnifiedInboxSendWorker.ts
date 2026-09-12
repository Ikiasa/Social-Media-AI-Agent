import { WorkspaceContext } from '../../../../packages/core/src/context';
import { AuthorizationError, ValidationError } from '../../../../packages/core/src/errors';
import { generateHmacSignature, timingSafeCompare, verifyCanonicalApprovalHmac, CanonicalApprovalPayload } from '../../../../packages/core/src/crypto';
import {
  ResponseDraftModel,
  SocialConversationModel,
  SocialMessageModel,
  SocialAccountModel,
  IResponseDraft,
  ISocialMessage,
} from '../../../../packages/database/src';
import { tenantFeatureFlags } from './TenantFeatureFlagService';
import { eventBus } from './EventBusService';

export class UnifiedInboxSendWorker {
  /**
   * Worker executing send of human-approved response draft
   * Enforces 3-tier Approval Guard, HMAC signature verification, and Double-Send Idempotency.
   */
  async sendApprovedResponse(
    ctx: WorkspaceContext,
    draftId: string
  ): Promise<{ draft: IResponseDraft; outboundMessage: ISocialMessage }> {
    if (!ctx.workspaceId) {
      throw new AuthorizationError('Workspace context required.');
    }

    if (!tenantFeatureFlags.isFeatureEnabled(ctx.workspaceId, 'unifiedInbox')) {
      throw new AuthorizationError('Feature "unifiedInbox" is disabled for this tenant.');
    }

    // 1. Load Draft Record
    const draft = await ResponseDraftModel.findOne({
      _id: draftId,
      workspaceId: ctx.workspaceId,
    }).exec();

    if (!draft) {
      throw new ValidationError(`Draft ${draftId} not found in current workspace.`);
    }

    // 2. Double-Send Idempotency Check
    if (draft.status === 'SENT') {
      const existingOutbound = await SocialMessageModel.findOne({
        workspaceId: ctx.workspaceId,
        conversationId: draft.conversationId,
        direction: 'OUTBOUND',
        providerEventId: `outbound_draft_${draft._id}`,
      }).exec();

      return { draft, outboundMessage: existingOutbound! };
    }

    // 3. Worker Approval Guard Validation
    const isStatusApproved = draft.status === 'APPROVED';
    const hasApprovedBy = Boolean(draft.approvedBy);
    const hasApprovedAt = Boolean(draft.approvedAt);
    const hasSignature = Boolean(draft.approvalSignature);

    let isSignatureValid = false;
    if (hasSignature && hasApprovedBy && hasApprovedAt) {
      const approvedAtIso = new Date(draft.approvedAt!).toISOString();
      const payload: CanonicalApprovalPayload = {
        tenantId: ctx.workspaceId,
        brandId: draft.brandId || '',
        contentId: String(draft._id),
        contentVersion: draft.version || 1,
        decision: 'APPROVED',
        reviewerId: draft.approvedBy!,
        approvedAt: approvedAtIso,
      };

      isSignatureValid = verifyCanonicalApprovalHmac(payload, draft.approvalSignature!);
    }

    if (!isStatusApproved || !hasApprovedBy || !hasApprovedAt || !hasSignature || !isSignatureValid) {
      draft.status = 'INVALIDATED';
      await draft.save();

      eventBus.publishEvent('inbox.reply_failed', {
        workspaceId: ctx.workspaceId,
        draftId,
        reason: 'BLOCKED_APPROVAL_VALIDATION: Response draft approval is missing, tampered, version-mismatched, or invalidated.',
      });

      throw new ValidationError('BLOCKED_APPROVAL_VALIDATION: Response draft approval is missing, tampered, version-mismatched, or invalidated.');
    }

    // 4. Load Conversation & Social Account
    const conversation = await SocialConversationModel.findOne({
      _id: draft.conversationId,
      workspaceId: ctx.workspaceId,
    }).exec();

    if (!conversation) {
      draft.status = 'FAILED';
      await draft.save();
      throw new ValidationError(`Conversation ${draft.conversationId} not found.`);
    }

    const socialAccount = await SocialAccountModel.findOne({
      workspaceId: ctx.workspaceId,
      brandId: draft.brandId,
      platform: conversation.platform,
    }).exec();

    // 5. Execute Platform Outbound Send (Simulated / Provider integration)
    const externalOutboundMessageId = `outbound_msg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

    // Update Draft Record Status
    const now = new Date();
    draft.status = 'SENT';
    draft.sentAt = now;
    await draft.save();

    // Create Outbound SocialMessage Record
    const outboundMessage = await SocialMessageModel.create({
      workspaceId: ctx.workspaceId,
      brandId: draft.brandId,
      conversationId: draft.conversationId,
      socialAccountId: conversation.socialAccountId,
      platform: conversation.platform,
      externalMessageId: externalOutboundMessageId,
      direction: 'OUTBOUND',
      messageType: 'text',
      body: draft.content,
      receivedAt: now,
      providerEventId: `outbound_draft_${draft._id}`,
    });

    // Update Conversation Status
    conversation.status = 'WAITING_CUSTOMER';
    conversation.lastMessageAt = now;
    await conversation.save();

    eventBus.publishEvent('inbox.reply_sent', {
      workspaceId: ctx.workspaceId,
      brandId: draft.brandId,
      conversationId: draft.conversationId,
      draftId: String(draft._id),
      outboundMessageId: String(outboundMessage._id),
    });

    return { draft, outboundMessage };
  }
}
