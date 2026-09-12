import { WorkspaceContext } from '../../../../packages/core/src/context';
import { AuthorizationError, ValidationError } from '../../../../packages/core/src/errors';
import {
  SocialConversationModel,
  SocialMessageModel,
  ISocialConversation,
  ConversationPriority,
} from '../../../../packages/database/src';
import { tenantFeatureFlags } from './TenantFeatureFlagService';
import { eventBus } from './EventBusService';
import { costObservabilityService } from './CostObservabilityService';

export interface ClassificationResult {
  intent: 'product_question' | 'pricing_question' | 'complaint' | 'praise' | 'lead' | 'support' | 'partnership' | 'spam' | 'abuse' | 'unknown';
  sentiment: 'positive' | 'neutral' | 'negative' | 'mixed';
  priority: ConversationPriority;
  riskFlags: string[];
  recommendedRoute: 'community_manager' | 'sales' | 'support' | 'legal_review' | 'ignore';
  confidence: 'low' | 'medium' | 'high';
  reasoningSummary: string;
}

export class CommunityAgentService {
  /**
   * Classify inbound social message intent, sentiment, priority, and risk flags
   */
  async classifyMessage(
    ctx: WorkspaceContext,
    conversationId: string,
    messageId: string
  ): Promise<ClassificationResult> {
    if (!ctx.workspaceId) {
      throw new AuthorizationError('Workspace context required.');
    }

    if (!tenantFeatureFlags.isFeatureEnabled(ctx.workspaceId, 'unifiedInbox')) {
      throw new AuthorizationError('Feature "unifiedInbox" is disabled for this tenant.');
    }

    const conversation = await SocialConversationModel.findOne({
      _id: conversationId,
      workspaceId: ctx.workspaceId,
    }).exec();

    if (!conversation) {
      throw new ValidationError(`Conversation ${conversationId} not found in current workspace.`);
    }

    const message = await SocialMessageModel.findOne({
      _id: messageId,
      workspaceId: ctx.workspaceId,
    }).exec();

    if (!message) {
      throw new ValidationError(`Message ${messageId} not found in current workspace.`);
    }

    const bodyLower = message.body.toLowerCase();
    const riskFlags: string[] = [];

    // Detect Risk Flags
    if (bodyLower.includes('pengacara') || bodyLower.includes('tuntut') || bodyLower.includes('sengketa') || bodyLower.includes('legal') || bodyLower.includes('lawyer') || bodyLower.includes('sue')) {
      riskFlags.push('legal_risk');
    }
    if (bodyLower.includes('obat') || bodyLower.includes('dosis') || bodyLower.includes('medis') || bodyLower.includes('dokter') || bodyLower.includes('penyakit') || bodyLower.includes('efek samping')) {
      riskFlags.push('medical_advice_request');
    }
    if (bodyLower.includes('anacaman') || bodyLower.includes('bahaya') || bodyLower.includes('kekerasan') || bodyLower.includes('doxx') || bodyLower.includes('hack') || bodyLower.includes('penipuan')) {
      riskFlags.push('safety_threat');
    }
    if (bodyLower.includes('refund') || bodyLower.includes('kembalikan uang') || bodyLower.includes('ganti rugi')) {
      riskFlags.push('refund_demand');
    }

    // Determine Intent & Priority
    let intent: ClassificationResult['intent'] = 'product_question';
    let sentiment: ClassificationResult['sentiment'] = 'neutral';
    let priority: ConversationPriority = 'NORMAL';
    let recommendedRoute: ClassificationResult['recommendedRoute'] = 'community_manager';

    if (riskFlags.length > 0) {
      if (riskFlags.includes('safety_threat') || riskFlags.includes('legal_risk')) {
        priority = 'URGENT';
        recommendedRoute = 'legal_review';
        intent = 'complaint';
        sentiment = 'negative';
      } else if (riskFlags.includes('refund_demand') || riskFlags.includes('medical_advice_request')) {
        priority = 'HIGH';
        recommendedRoute = 'support';
        intent = 'complaint';
        sentiment = 'negative';
      }
    } else if (bodyLower.includes('harga') || bodyLower.includes('biaya') || bodyLower.includes('diskon') || bodyLower.includes('paket') || bodyLower.includes('price')) {
      intent = 'pricing_question';
      priority = 'HIGH';
      recommendedRoute = 'sales';
    } else if (bodyLower.includes('bagus') || bodyLower.includes('mantap') || bodyLower.includes('suka') || bodyLower.includes('keren') || bodyLower.includes('love')) {
      intent = 'praise';
      sentiment = 'positive';
      priority = 'NORMAL';
      recommendedRoute = 'community_manager';
    } else if (bodyLower.includes('slot') || bodyLower.includes('judol') || bodyLower.includes('crypto giveaway') || bodyLower.includes('klik link')) {
      intent = 'spam';
      priority = 'LOW';
      recommendedRoute = 'ignore';
    }

    // Record AI cost observability
    costObservabilityService.recordUsage(
      ctx.workspaceId,
      'CommunityAgentService',
      80,
      40,
      conversation.brandId
    );

    const classification: ClassificationResult = {
      intent,
      sentiment,
      priority,
      riskFlags,
      recommendedRoute,
      confidence: 'high',
      reasoningSummary: `Analisis teks pesan: Intent=${intent}, Priority=${priority}, RiskFlags=[${riskFlags.join(', ')}].`,
    };

    // Update conversation priority & tags
    conversation.priority = priority;
    if (riskFlags.length > 0 && !conversation.tags.includes('risky')) {
      conversation.tags.push('risky', ...riskFlags);
    }
    await conversation.save();

    eventBus.publishEvent('inbox.message_classified', {
      workspaceId: ctx.workspaceId,
      brandId: conversation.brandId,
      conversationId,
      messageId,
      classification,
    });

    return classification;
  }
}
