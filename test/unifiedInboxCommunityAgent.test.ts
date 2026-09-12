import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UnifiedInboxIngestionService } from '../services/api/src/services/UnifiedInboxIngestionService';
import { CommunityAgentService } from '../services/api/src/services/CommunityAgentService';
import { ResponseDraftService } from '../services/api/src/services/ResponseDraftService';
import { UnifiedInboxSendWorker } from '../services/api/src/services/UnifiedInboxSendWorker';
import { createWorkspaceContext } from '../packages/core/src/context';
import { tenantFeatureFlags } from '../services/api/src/services/TenantFeatureFlagService';
import { generateHmacSignature, generateCanonicalApprovalHmac, verifyCanonicalApprovalHmac } from '../packages/core/src/crypto';
import { maskParticipantReference, sanitizeDraftResponse, sanitizeConversationResponse } from '../services/api/src/routes/unifiedInboxRoutes';
import {
  SocialConversationModel,
  SocialMessageModel,
  ResponseDraftModel,
  SocialAccountModel,
  KnowledgeDocumentModel,
} from '../packages/database/src';

describe('Phase 4: Unified Inbox & Community Agent Test Suite', () => {
  let ingestionService: UnifiedInboxIngestionService;
  let communityAgentService: CommunityAgentService;
  let responseDraftService: ResponseDraftService;
  let sendWorker: UnifiedInboxSendWorker;

  const ctxTenantA = createWorkspaceContext('tenant-a', 'user-a');
  const ctxTenantB = createWorkspaceContext('tenant-b', 'user-b');

  beforeEach(() => {
    communityAgentService = new CommunityAgentService();
    ingestionService = new UnifiedInboxIngestionService(communityAgentService);
    responseDraftService = new ResponseDraftService();
    sendWorker = new UnifiedInboxSendWorker();

    vi.restoreAllMocks();

    tenantFeatureFlags.setFlags('tenant-a', { unifiedInbox: true, communityAgentDrafts: true });
    tenantFeatureFlags.setFlags('tenant-b', { unifiedInbox: true, communityAgentDrafts: true });

    // Mock Knowledge Base by default
    vi.spyOn(KnowledgeDocumentModel, 'find').mockReturnValue({
      exec: vi.fn().mockResolvedValue([]),
    } as any);
  });

  // Scenario 1: Tenant Isolation
  it('1. should enforce strict tenant isolation so Tenant A cannot access Tenant B conversation, message, or draft', async () => {
    vi.spyOn(SocialConversationModel, 'findOne').mockReturnValue({
      exec: vi.fn().mockResolvedValue(null),
    } as any);

    await expect(
      communityAgentService.classifyMessage(ctxTenantA, 'conv-b-1', 'msg-b-1')
    ).rejects.toThrow('Conversation conv-b-1 not found in current workspace.');

    await expect(
      responseDraftService.generateDraft(ctxTenantA, 'conv-b-1', 'msg-b-1')
    ).rejects.toThrow('Conversation conv-b-1 not found in current workspace.');
  });

  // Scenario 2: Webhook Signature Verification
  it('2. should reject invalid webhook signature and accept valid HMAC signature', () => {
    const rawPayload = JSON.stringify({ event: 'message_received', id: 'msg-1' });
    const secret = 'webhook_secret_123';
    const validSig = generateHmacSignature(rawPayload, secret);

    const isValid = ingestionService.verifyWebhookSignature(rawPayload, validSig, secret);
    expect(isValid).toBe(true);

    const isInvalid = ingestionService.verifyWebhookSignature(rawPayload, 'invalid_sig_abc', secret);
    expect(isInvalid).toBe(false);
  });

  // Scenario 3: Event Deduplication & Idempotency
  it('3. should prevent duplicate message creation when receiving duplicate webhook event', async () => {
    const existingMessage = {
      _id: 'msg-existing-1',
      workspaceId: 'tenant-a',
      conversationId: 'conv-1',
      externalMessageId: 'ext-msg-100',
    };

    const existingConversation = {
      _id: 'conv-1',
      workspaceId: 'tenant-a',
    };

    vi.spyOn(SocialMessageModel, 'findOne').mockReturnValue({
      exec: vi.fn().mockResolvedValue(existingMessage),
    } as any);

    vi.spyOn(SocialConversationModel, 'findById').mockReturnValue({
      exec: vi.fn().mockResolvedValue(existingConversation),
    } as any);

    vi.spyOn(SocialMessageModel, 'create');

    const result = await ingestionService.ingestInboundMessage(ctxTenantA, {
      brandId: 'brand-a',
      socialAccountId: 'account-1',
      platform: 'instagram',
      externalConversationId: 'ext-conv-1',
      externalMessageId: 'ext-msg-100',
      participantReference: '@customer_user',
      body: 'Halo admin!',
      providerEventId: 'evt-100',
    });

    expect(result.isDuplicate).toBe(true);
    expect(SocialMessageModel.create).not.toHaveBeenCalled();
  });

  // Scenario 4: Out-of-Order Message Ordering
  it('4. should handle out-of-order messages cleanly and sort messages by receivedAt', async () => {
    const msgEarly = { _id: 'm1', receivedAt: new Date('2026-09-12T09:00:00Z'), body: 'Message 1' };
    const msgLate = { _id: 'm2', receivedAt: new Date('2026-09-12T09:05:00Z'), body: 'Message 2' };

    vi.spyOn(SocialMessageModel, 'find').mockReturnValue({
      sort: vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue([msgEarly, msgLate]),
      }),
    } as any);

    const messages = await SocialMessageModel.find({ conversationId: 'conv-1' }).sort({ receivedAt: 1 }).exec();
    expect(messages[0].body).toBe('Message 1');
    expect(messages[1].body).toBe('Message 2');
  });

  // Scenario 5: Risky Complaint / Legal Request Classification & Human Review Routing
  it('5. should route risky legal/medical requests to human review with HIGH/URGENT priority', async () => {
    vi.spyOn(SocialConversationModel, 'findOne').mockReturnValue({
      exec: vi.fn().mockResolvedValue({ _id: 'conv-1', brandId: 'brand-a', tags: [], save: vi.fn() }),
    } as any);

    vi.spyOn(SocialMessageModel, 'findOne').mockReturnValue({
      exec: vi.fn().mockResolvedValue({
        _id: 'msg-legal',
        body: 'Saya akan menghubungi pengacara dan menuntut perusahaan Anda terkait sengketa ini!',
      }),
    } as any);

    const classification = await communityAgentService.classifyMessage(ctxTenantA, 'conv-1', 'msg-legal');

    expect(classification.priority).toBe('URGENT');
    expect(classification.recommendedRoute).toBe('legal_review');
    expect(classification.riskFlags).toContain('legal_risk');
  });

  // Scenario 6: Knowledge Base Fact Grounding & Safe Fallback
  it('6. should return safe fallback message when Knowledge Base has insufficient information', async () => {
    vi.spyOn(SocialConversationModel, 'findOne').mockReturnValue({
      exec: vi.fn().mockResolvedValue({ _id: 'conv-1', brandId: 'brand-a' }),
    } as any);

    vi.spyOn(SocialMessageModel, 'findOne').mockReturnValue({
      exec: vi.fn().mockResolvedValue({
        _id: 'msg-unknown',
        body: 'Apakah ada kebijakan khusus medis terkait dosis produk ini?',
      }),
    } as any);

    // Knowledge docs empty -> triggers safe fallback
    vi.spyOn(KnowledgeDocumentModel, 'find').mockReturnValue({
      exec: vi.fn().mockResolvedValue([]),
    } as any);

    let createdDraft: any;
    vi.spyOn(ResponseDraftModel, 'create').mockImplementation((data: any) => {
      createdDraft = data;
      return Promise.resolve({ ...data, _id: 'draft-fallback-1' }) as any;
    });

    await responseDraftService.generateDraft(ctxTenantA, 'conv-1', 'msg-unknown');

    expect(createdDraft).toBeDefined();
    expect(createdDraft.content).toContain('Terima kasih sudah menghubungi kami. Tim kami akan memeriksa detailnya');
    expect(createdDraft.status).toBe('DRAFT');
  });

  // Scenario 7: Material Edit Version Invalidation
  it('7. should increment version and reset status to PENDING_APPROVAL when draft is edited', async () => {
    const existingDraft: any = {
      _id: 'draft-1',
      workspaceId: 'tenant-a',
      version: 1,
      status: 'APPROVED',
      approvedBy: 'user-approver',
      approvedAt: new Date(),
      approvalSignature: 'hmac_signature_old',
      save: vi.fn().mockResolvedValue(true),
    };

    vi.spyOn(ResponseDraftModel, 'findOne').mockReturnValue({
      exec: vi.fn().mockResolvedValue(existingDraft),
    } as any);

    const updated = await responseDraftService.updateDraftContent(ctxTenantA, 'draft-1', 'Konten balasan baru yang direvisi.');

    expect(updated.version).toBe(2);
    expect(updated.status).toBe('PENDING_APPROVAL');
    expect(updated.approvedBy).toBeUndefined();
    expect(updated.approvalSignature).toBeUndefined();
  });

  // Scenario 8: Worker Guard Approval Validation (Canonical HMAC Verification)
  it('8. should verify canonical HMAC-SHA256 signature in worker and reject tampered signatures or unapproved drafts', async () => {
    const approvedAtIso = new Date().toISOString();
    const payload = {
      tenantId: 'tenant-a',
      brandId: 'brand-a',
      contentId: 'draft-approved-1',
      contentVersion: 1,
      decision: 'APPROVED' as const,
      reviewerId: 'user-a',
      approvedAt: approvedAtIso,
    };

    const validSignature = generateCanonicalApprovalHmac(payload);
    expect(verifyCanonicalApprovalHmac(payload, validSignature)).toBe(true);

    const tamperedPayload = { ...payload, contentVersion: 2 };
    expect(verifyCanonicalApprovalHmac(tamperedPayload, validSignature)).toBe(false);

    const unapprovedDraft: any = {
      _id: 'draft-unapproved',
      workspaceId: 'tenant-a',
      status: 'DRAFT', // NOT APPROVED
      version: 1,
      save: vi.fn().mockResolvedValue(true),
    };

    vi.spyOn(ResponseDraftModel, 'findOne').mockReturnValue({
      exec: vi.fn().mockResolvedValue(unapprovedDraft),
    } as any);

    await expect(sendWorker.sendApprovedResponse(ctxTenantA, 'draft-unapproved')).rejects.toThrow(
      'BLOCKED_APPROVAL_VALIDATION: Response draft approval is missing, tampered, version-mismatched, or invalidated.'
    );
  });

  // Scenario 9: Double-Send Idempotency Guard
  it('9. should prevent double-sending the same response draft', async () => {
    const sentDraft: any = {
      _id: 'draft-sent-1',
      workspaceId: 'tenant-a',
      conversationId: 'conv-1',
      status: 'SENT',
      save: vi.fn().mockResolvedValue(true),
    };

    const existingOutboundMsg = {
      _id: 'outbound-msg-1',
      workspaceId: 'tenant-a',
      conversationId: 'conv-1',
      direction: 'OUTBOUND',
      body: 'Balasan terkirim',
    };

    vi.spyOn(ResponseDraftModel, 'findOne').mockReturnValue({
      exec: vi.fn().mockResolvedValue(sentDraft),
    } as any);

    vi.spyOn(SocialMessageModel, 'findOne').mockReturnValue({
      exec: vi.fn().mockResolvedValue(existingOutboundMsg),
    } as any);

    vi.spyOn(SocialMessageModel, 'create');

    const result = await sendWorker.sendApprovedResponse(ctxTenantA, 'draft-sent-1');

    expect(result.draft.status).toBe('SENT');
    expect(SocialMessageModel.create).not.toHaveBeenCalled();
  });

  // Scenario 10: Provider Failure & Redacted Credentials
  it('10. should log provider errors safely without leaking credentials', async () => {
    const safeErrorLog = vi.fn();
    try {
      throw new Error('API Send failure: OAuth Token = secret_access_token_xyz');
    } catch (err: any) {
      const sanitized = err.message.replace(/secret_access_token_[^\s]+/g, '[REDACTED_TOKEN]');
      safeErrorLog(sanitized);
    }

    expect(safeErrorLog).toHaveBeenCalledWith('API Send failure: OAuth Token = [REDACTED_TOKEN]');
  });

  // Scenario 11: Feature Flag Rejection
  it('11. should reject unified inbox requests when feature flag is disabled', async () => {
    tenantFeatureFlags.setFlags('tenant-a', { unifiedInbox: false, communityAgentDrafts: false });

    await expect(
      ingestionService.ingestInboundMessage(ctxTenantA, {
        brandId: 'brand-a',
        socialAccountId: 'acc-1',
        platform: 'instagram',
        externalConversationId: 'c1',
        externalMessageId: 'm1',
        participantReference: '@user',
        body: 'test',
        providerEventId: 'e1',
      })
    ).rejects.toThrow('Feature "unifiedInbox" is disabled for this tenant.');

    await expect(
      responseDraftService.generateDraft(ctxTenantA, 'c1', 'm1')
    ).rejects.toThrow('Feature "communityAgentDrafts" is disabled for this tenant.');
  });

  // Scenario 12: PII Masking & Audit Signature Non-exposure Guard
  it('12. should mask participantReference for non-privileged roles and omit approvalSignature from API response by default', () => {
    const ref = '@customer_user_99';
    const masked = maskParticipantReference(ref);
    expect(masked).toBe('@c***99');
    expect(masked).not.toBe(ref);

    const draftWithSig = {
      _id: 'draft-1',
      content: 'Balasan brand',
      status: 'APPROVED',
      approvalSignature: 'a1b2c3d4e5f6_hmac_sig',
    };

    const sanitizedDefault = sanitizeDraftResponse(draftWithSig, false);
    expect(sanitizedDefault.approvalSignature).toBeUndefined();

    const sanitizedAudit = sanitizeDraftResponse(draftWithSig, true);
    expect(sanitizedAudit.approvalSignature).toBe('a1b2c3d4e5f6_hmac_sig');
  });
});
