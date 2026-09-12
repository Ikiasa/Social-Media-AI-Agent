import { describe, it, expect, vi } from 'vitest';
import { generateHmacSignature } from '../packages/core/src/crypto';
import { ContentService } from '../services/api/src/services/ContentService';
import { createWorkspaceContext } from '../packages/core/src/context';

describe('Approval Payload Binding & Tampering Protection', () => {
  it('should verify exact payload signature and detect modifications', () => {
    const payloadApproved = 'contentId=101&platform=instagram&scheduledAt=2026-09-02T10:00:00.000Z&caption=Original Caption';
    const approvedSignature = generateHmacSignature(payloadApproved);

    // Verify untampered payload
    const verifyOriginal = generateHmacSignature(payloadApproved);
    expect(verifyOriginal).toBe(approvedSignature);

    // Tampered caption
    const payloadTampered = 'contentId=101&platform=instagram&scheduledAt=2026-09-02T10:00:00.000Z&caption=HACKED Caption';
    const verifyTampered = generateHmacSignature(payloadTampered);

    expect(verifyTampered).not.toBe(approvedSignature);
  });

  it('should invalidate APPROVED status to DRAFT when content caption is modified post-approval', async () => {
    const mockRepo: any = {
      findById: vi.fn().mockResolvedValue({
        _id: 'content-approved-1',
        workspaceId: 'ws-1',
        title: 'Approved Post',
        caption: 'Approved Caption text',
        status: 'APPROVED',
        approvedBy: 'user-admin',
      }),
      update: vi.fn().mockImplementation((id, wsId, updates) =>
        Promise.resolve({ _id: id, workspaceId: wsId, ...updates })
      ),
    };

    const contentService = new ContentService(mockRepo);
    const ctx = createWorkspaceContext('ws-1', 'user-editor');

    const updated = await contentService.updateContent(ctx, 'content-approved-1', {
      caption: 'Modified Caption text post-approval',
    });

    expect(updated).not.toBeNull();
    expect(updated?.status).toBe('DRAFT');
    expect(updated?.approvedBy).toBeUndefined();
  });
});
