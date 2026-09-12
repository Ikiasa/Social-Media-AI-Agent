import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ContentService } from '../services/api/src/services/ContentService';
import { createWorkspaceContext } from '../packages/core/src/context';
import { ValidationError } from '../packages/core/src/errors';

describe('ContentService', () => {
  let service: ContentService;
  let mockRepo: any;

  beforeEach(() => {
    mockRepo = {
      create: vi.fn().mockImplementation((data) => Promise.resolve({ _id: 'content-1', ...data })),
      findById: vi.fn().mockImplementation((id, wsId) => {
        if (id === 'content-1' && wsId === 'ws-1') {
          return Promise.resolve({ _id: 'content-1', workspaceId: 'ws-1', title: 'Draft 1', status: 'DRAFT' });
        }
        return Promise.resolve(null);
      }),
      updateStatus: vi.fn().mockImplementation((id, wsId, status) => {
        if (id === 'content-1' && wsId === 'ws-1') {
          return Promise.resolve({ _id: 'content-1', workspaceId: 'ws-1', title: 'Draft 1', status });
        }
        return Promise.resolve(null);
      }),
      update: vi.fn().mockImplementation((id, wsId, updates) => {
        if (id === 'content-1' && wsId === 'ws-1') {
          return Promise.resolve({ _id: 'content-1', workspaceId: 'ws-1', title: 'Draft 1', ...updates });
        }
        return Promise.resolve(null);
      }),
      list: vi.fn().mockResolvedValue([]),
    };
    service = new ContentService(mockRepo);
  });

  it('should create content draft with status DRAFT', async () => {
    const ctx = createWorkspaceContext('ws-1', 'user-1');
    const draft = await service.createDraft(ctx, { title: 'New Post Title', caption: 'Post caption' });

    expect(draft.title).toBe('New Post Title');
    expect(draft.status).toBe('DRAFT');
    expect(draft.workspaceId).toBe('ws-1');
  });

  it('should approve content draft changing status to APPROVED', async () => {
    const ctx = createWorkspaceContext('ws-1', 'user-1');
    const approved = await service.approveContent(ctx, 'content-1');

    expect(approved).not.toBeNull();
    expect(approved?.status).toBe('APPROVED');
  });

  it('should reject content draft changing status to REJECTED', async () => {
    const ctx = createWorkspaceContext('ws-1', 'user-1');
    const rejected = await service.rejectContent(ctx, 'content-1');

    expect(rejected).not.toBeNull();
    expect(rejected?.status).toBe('REJECTED');
  });

  it('should throw ValidationError when approving non-existent content', async () => {
    const ctx = createWorkspaceContext('ws-1', 'user-1');
    await expect(service.approveContent(ctx, 'invalid-id')).rejects.toThrow(ValidationError);
  });
});
