import { WorkspaceContext } from '../../../../packages/core/src/context';
import { AuthorizationError, ValidationError } from '../../../../packages/core/src/errors';
import { generateHmacSignature, timingSafeCompare } from '../../../../packages/core/src/crypto';
import {
  SocialConversationModel,
  SocialMessageModel,
  ISocialConversation,
  ISocialMessage,
  SocialPlatformType,
  ChannelType,
} from '../../../../packages/database/src';
import { tenantFeatureFlags } from './TenantFeatureFlagService';
import { eventBus } from './EventBusService';
import { CommunityAgentService } from './CommunityAgentService';

export interface IngestInboundMessageInput {
  brandId: string;
  socialAccountId: string;
  platform: SocialPlatformType;
  externalConversationId: string;
  externalMessageId: string;
  participantReference: string;
  channelType?: ChannelType;
  messageType?: 'text' | 'comment' | 'media' | 'system';
  body: string;
  receivedAt?: Date;
  providerEventId: string;
  metadata?: Record<string, any>;
}

export class UnifiedInboxIngestionService {
  private communityAgentService: CommunityAgentService;

  constructor(communityAgentService: CommunityAgentService = new CommunityAgentService()) {
    this.communityAgentService = communityAgentService;
  }

  /**
   * Verify HMAC Webhook Signature
   */
  verifyWebhookSignature(rawPayload: string, signature: string, secretKey: string): boolean {
    if (!signature || !secretKey) return false;
    const computed = generateHmacSignature(rawPayload, secretKey);
    return timingSafeCompare(computed, signature);
  }

  /**
   * Securely Ingest Inbound Message & Deduplicate Events
   */
  async ingestInboundMessage(
    ctx: WorkspaceContext,
    input: IngestInboundMessageInput
  ): Promise<{ conversation: ISocialConversation; message: ISocialMessage; isDuplicate: boolean }> {
    if (!ctx.workspaceId) {
      throw new AuthorizationError('Workspace context required.');
    }

    if (!tenantFeatureFlags.isFeatureEnabled(ctx.workspaceId, 'unifiedInbox')) {
      throw new AuthorizationError('Feature "unifiedInbox" is disabled for this tenant.');
    }

    if (!input.brandId || !input.socialAccountId || !input.externalMessageId || !input.body) {
      throw new ValidationError('brandId, socialAccountId, externalMessageId, and body are required.');
    }

    // Sandbox fixture guard: production consumers must not process sandbox records
    if (input.metadata?.source === 'sandbox_fixture' || input.metadata?.isSandbox) {
      return null as any;
    }

    // 1. Idempotency Check: Prevent duplicate message processing
    const existingMessage = await SocialMessageModel.findOne({
      workspaceId: ctx.workspaceId,
      platform: input.platform,
      socialAccountId: input.socialAccountId,
      externalMessageId: input.externalMessageId,
    }).exec();

    if (existingMessage) {
      const existingConv = await SocialConversationModel.findById(existingMessage.conversationId).exec();
      return {
        conversation: existingConv!,
        message: existingMessage,
        isDuplicate: true,
      };
    }

    // 2. Find or Create Conversation Thread
    let isNewConversation = false;
    let conversation = await SocialConversationModel.findOne({
      workspaceId: ctx.workspaceId,
      platform: input.platform,
      socialAccountId: input.socialAccountId,
      externalConversationId: input.externalConversationId,
    }).exec();

    const receivedAt = input.receivedAt || new Date();

    if (!conversation) {
      isNewConversation = true;
      conversation = await SocialConversationModel.create({
        workspaceId: ctx.workspaceId,
        brandId: input.brandId,
        socialAccountId: input.socialAccountId,
        platform: input.platform,
        externalConversationId: input.externalConversationId,
        participantReference: input.participantReference,
        channelType: input.channelType || 'dm',
        status: 'OPEN',
        priority: 'NORMAL',
        lastMessageAt: receivedAt,
        tags: [],
      });

      eventBus.publishEvent('inbox.conversation_created', {
        workspaceId: ctx.workspaceId,
        brandId: input.brandId,
        conversationId: String(conversation._id),
        platform: input.platform,
      });
    } else {
      // Update lastMessageAt & status
      conversation.lastMessageAt = receivedAt;
      if (conversation.status === 'RESOLVED' || conversation.status === 'ARCHIVED') {
        conversation.status = 'OPEN';
      }
      await conversation.save();
    }

    // 3. Save Message Record
    const message = await SocialMessageModel.create({
      workspaceId: ctx.workspaceId,
      brandId: input.brandId,
      conversationId: String(conversation._id),
      socialAccountId: input.socialAccountId,
      platform: input.platform,
      externalMessageId: input.externalMessageId,
      direction: 'INBOUND',
      messageType: input.messageType || 'text',
      body: input.body,
      receivedAt,
      providerEventId: input.providerEventId,
      metadata: input.metadata || {},
    });

    eventBus.publishEvent('inbox.message_received', {
      workspaceId: ctx.workspaceId,
      brandId: input.brandId,
      conversationId: String(conversation._id),
      messageId: String(message._id),
      platform: input.platform,
      isNewConversation,
    });

    // 4. Trigger Automatic Classification Engine
    await this.communityAgentService.classifyMessage(ctx, String(conversation._id), String(message._id)).catch(() => {});

    return {
      conversation,
      message,
      isDuplicate: false,
    };
  }
}
