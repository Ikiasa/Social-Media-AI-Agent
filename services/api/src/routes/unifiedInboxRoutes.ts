import { Router, Response, NextFunction } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { UnifiedInboxIngestionService } from '../services/UnifiedInboxIngestionService';
import { CommunityAgentService } from '../services/CommunityAgentService';
import { ResponseDraftService } from '../services/ResponseDraftService';
import { UnifiedInboxSendWorker } from '../services/UnifiedInboxSendWorker';
import {
  SocialConversationModel,
  SocialMessageModel,
  ResponseDraftModel,
} from '../../../../packages/database/src';
import { AuthorizationError, ValidationError } from '../../../../packages/core/src';

const router = Router();
const ingestionService = new UnifiedInboxIngestionService();
const communityAgentService = new CommunityAgentService();
const responseDraftService = new ResponseDraftService();
const sendWorker = new UnifiedInboxSendWorker();

export function maskParticipantReference(ref: string): string {
  if (!ref) return '***';
  if (ref.length <= 4) return ref[0] + '***' + ref[ref.length - 1];
  return ref.substring(0, 2) + '***' + ref.substring(ref.length - 2);
}

export function sanitizeDraftResponse(draft: any, includeAuditSignature = false): any {
  if (!draft) return draft;
  const obj = typeof draft.toObject === 'function' ? draft.toObject() : { ...draft };
  if (!includeAuditSignature) {
    delete obj.approvalSignature;
  }
  return obj;
}

export function sanitizeConversationResponse(conv: any, includePii = false): any {
  if (!conv) return conv;
  const obj = typeof conv.toObject === 'function' ? conv.toObject() : { ...conv };
  if (!includePii && obj.participantReference) {
    obj.participantReference = maskParticipantReference(obj.participantReference);
  }
  return obj;
}

// 1. Webhook Ingestion Endpoint (Decoupled from standard user auth, uses provider HMAC & idempotency)
router.post('/webhook', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const signature = (req.headers['x-hub-signature-256'] as string) || (req.headers['x-webhook-signature'] as string);
    const secret = process.env.WEBHOOK_SECRET || 'riona_webhook_secret_key';

    if (process.env.NODE_ENV === 'production' || signature) {
      const isValid = ingestionService.verifyWebhookSignature(JSON.stringify(req.body), signature, secret);
      if (!isValid) {
        res.status(401).json({ error: 'Invalid webhook signature.' });
        return;
      }
    }

    const result = await ingestionService.ingestInboundMessage(req.context!, req.body);
    res.status(201).json({ data: result, message: 'Webhook event processed successfully.' });
  } catch (err) {
    next(err);
  }
});

// Protect all following inbox endpoints with Auth Middleware
router.use(authMiddleware);

// 2. List / Filter Conversations (with PII masking)
router.get('/conversations', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const brandId = req.query.brandId as string | undefined;
    const platform = req.query.platform as string | undefined;
    const status = req.query.status as string | undefined;
    const priority = req.query.priority as string | undefined;

    const query: Record<string, unknown> = { workspaceId: req.context!.workspaceId };
    if (brandId) query.brandId = brandId;
    if (platform) query.platform = platform;
    if (status) query.status = status;
    if (priority) query.priority = priority;

    const conversations = await SocialConversationModel.find(query).sort({ lastMessageAt: -1 }).exec();
    const includePii = req.query.includePii === 'true' && req.context?.role !== 'MEMBER';
    const data = conversations.map((c) => sanitizeConversationResponse(c, includePii));

    res.status(200).json({ data, meta: { total: data.length } });
  } catch (err) {
    next(err);
  }
});

// 3. Get Single Conversation Thread & Messages (with PII masking & Audit Signature Guard)
router.get('/conversations/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const conversation = await SocialConversationModel.findOne({
      _id: req.params.id,
      workspaceId: req.context!.workspaceId,
    }).exec();

    if (!conversation) {
      throw new ValidationError(`Conversation ${req.params.id} not found in current workspace.`);
    }

    const messages = await SocialMessageModel.find({
      conversationId: req.params.id,
      workspaceId: req.context!.workspaceId,
    }).sort({ receivedAt: 1 }).exec();

    const drafts = await ResponseDraftModel.find({
      conversationId: req.params.id,
      workspaceId: req.context!.workspaceId,
    }).sort({ createdAt: -1 }).exec();

    const includePii = req.query.includePii === 'true' && req.context?.role !== 'MEMBER';
    const includeAuditSignature = req.query.includeAuditSignature === 'true';

    const sanitizedConv = sanitizeConversationResponse(conversation, includePii);
    const sanitizedDrafts = drafts.map((d) => sanitizeDraftResponse(d, includeAuditSignature));

    res.status(200).json({
      data: {
        conversation: sanitizedConv,
        messages,
        drafts: sanitizedDrafts,
      },
    });
  } catch (err) {
    next(err);
  }
});

// 4. Assign Conversation
router.post('/conversations/:id/assign', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { assignedTo } = req.body;
    const conversation = await SocialConversationModel.findOneAndUpdate(
      { _id: req.params.id, workspaceId: req.context!.workspaceId },
      { $set: { assignedTo } },
      { new: true }
    ).exec();

    if (!conversation) {
      throw new ValidationError(`Conversation ${req.params.id} not found.`);
    }

    res.status(200).json({ data: conversation, message: `Conversation assigned to ${assignedTo}.` });
  } catch (err) {
    next(err);
  }
});

// 5. Update Conversation Status
router.post('/conversations/:id/status', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body;
    const conversation = await SocialConversationModel.findOneAndUpdate(
      { _id: req.params.id, workspaceId: req.context!.workspaceId },
      { $set: { status } },
      { new: true }
    ).exec();

    if (!conversation) {
      throw new ValidationError(`Conversation ${req.params.id} not found.`);
    }

    res.status(200).json({ data: conversation, message: `Conversation status updated to ${status}.` });
  } catch (err) {
    next(err);
  }
});

// 6. Classify Inbound Message
router.post('/conversations/:id/classify', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { messageId } = req.body;
    const classification = await communityAgentService.classifyMessage(req.context!, req.params.id, messageId);
    res.status(200).json({ data: classification, message: 'Message classified successfully.' });
  } catch (err) {
    next(err);
  }
});

// 7. Generate Response Draft
router.post('/conversations/:id/drafts', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { sourceMessageId } = req.body;
    const draft = await responseDraftService.generateDraft(req.context!, req.params.id, sourceMessageId);
    const includeAuditSignature = req.query.includeAuditSignature === 'true';
    const sanitized = sanitizeDraftResponse(draft, includeAuditSignature);
    res.status(201).json({ data: sanitized, message: 'Response draft generated successfully.' });
  } catch (err) {
    next(err);
  }
});

// 8. Edit Response Draft (Material Edit Version Invalidation)
router.put('/drafts/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { content } = req.body;
    const draft = await responseDraftService.updateDraftContent(req.context!, req.params.id, content);
    const includeAuditSignature = req.query.includeAuditSignature === 'true';
    const sanitized = sanitizeDraftResponse(draft, includeAuditSignature);
    res.status(200).json({ data: sanitized, message: 'Draft content updated. Version incremented & approval reset to PENDING_APPROVAL.' });
  } catch (err) {
    next(err);
  }
});

// 9. Approve Response Draft
router.post('/drafts/:id/approve', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const draft = await responseDraftService.approveDraft(req.context!, req.params.id);
    const includeAuditSignature = req.query.includeAuditSignature === 'true';
    const sanitized = sanitizeDraftResponse(draft, includeAuditSignature);
    res.status(200).json({ data: sanitized, message: 'Draft approved successfully with HMAC signature.' });
  } catch (err) {
    next(err);
  }
});

// 10. Reject Response Draft
router.post('/drafts/:id/reject', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const draft = await responseDraftService.rejectDraft(req.context!, req.params.id);
    const includeAuditSignature = req.query.includeAuditSignature === 'true';
    const sanitized = sanitizeDraftResponse(draft, includeAuditSignature);
    res.status(200).json({ data: sanitized, message: 'Draft rejected.' });
  } catch (err) {
    next(err);
  }
});

// 11. Send Approved Response (Worker Execution)
router.post('/drafts/:id/send', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const result = await sendWorker.sendApprovedResponse(req.context!, req.params.id);
    const includeAuditSignature = req.query.includeAuditSignature === 'true';
    const sanitizedDraft = sanitizeDraftResponse(result.draft, includeAuditSignature);
    res.status(200).json({
      data: { draft: sanitizedDraft, outboundMessage: result.outboundMessage },
      message: 'Approved response sent successfully.',
    });
  } catch (err) {
    next(err);
  }
});

export default router;
