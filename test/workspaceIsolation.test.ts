import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ContentService } from '../services/api/src/services/ContentService';
import { BrandService } from '../services/api/src/services/BrandService';
import { KnowledgeService } from '../services/api/src/services/KnowledgeService';
import { createWorkspaceContext } from '../packages/core/src/context';
import { AuthorizationError, ValidationError } from '../packages/core/src/errors';

describe('Workspace Security Isolation', () => {
  let contentService: ContentService;
  let brandService: BrandService;
  let knowledgeService: KnowledgeService;

  beforeEach(() => {
    // Database store simulating multi-tenant workspace scoping
    const contentDb = [
      { _id: 'content-wsA-1', workspaceId: 'ws-A', title: 'Workspace A Secret Post', status: 'DRAFT' },
    ];
    const brandDb = [
      { _id: 'brand-wsA-1', workspaceId: 'ws-A', name: 'Workspace A Brand' },
    ];
    const knowledgeDb = [
      { _id: 'doc-wsA-1', workspaceId: 'ws-A', title: 'Workspace A Internal Doc', extractedText: 'Secret Data' },
    ];

    const mockContentRepo: any = {
      findById: vi.fn().mockImplementation((id, wsId) =>
        Promise.resolve(contentDb.find((c) => c._id === id && c.workspaceId === wsId) || null)
      ),
      updateStatus: vi.fn().mockImplementation((id, wsId, status) => {
        const item = contentDb.find((c) => c._id === id && c.workspaceId === wsId);
        if (item) item.status = status;
        return Promise.resolve(item || null);
      }),
      list: vi.fn().mockImplementation((wsId) =>
        Promise.resolve(contentDb.filter((c) => c.workspaceId === wsId))
      ),
    };

    const mockBrandRepo: any = {
      findById: vi.fn().mockImplementation((id, wsId) =>
        Promise.resolve(brandDb.find((b) => b._id === id && b.workspaceId === wsId) || null)
      ),
      list: vi.fn().mockImplementation((wsId) =>
        Promise.resolve(brandDb.filter((b) => b.workspaceId === wsId))
      ),
    };

    const mockKnowledgeRepo: any = {
      findById: vi.fn().mockImplementation((id, wsId) =>
        Promise.resolve(knowledgeDb.find((k) => k._id === id && k.workspaceId === wsId) || null)
      ),
      list: vi.fn().mockImplementation((wsId) =>
        Promise.resolve(knowledgeDb.filter((k) => k.workspaceId === wsId))
      ),
      delete: vi.fn().mockImplementation((id, wsId) => {
        const idx = knowledgeDb.findIndex((k) => k._id === id && k.workspaceId === wsId);
        if (idx !== -1) {
          knowledgeDb.splice(idx, 1);
          return Promise.resolve(true);
        }
        return Promise.resolve(false);
      }),
    };

    contentService = new ContentService(mockContentRepo);
    brandService = new BrandService(mockBrandRepo);
    knowledgeService = new KnowledgeService(mockKnowledgeRepo, {} as any);
  });

  it('should DENY User B in Workspace B from accessing Workspace A content', async () => {
    const ctxWorkspaceB = createWorkspaceContext('ws-B', 'user-B');
    const content = await contentService.getContent(ctxWorkspaceB, 'content-wsA-1');

    expect(content).toBeNull();
  });

  it('should DENY User B in Workspace B from approving Workspace A content', async () => {
    const ctxWorkspaceB = createWorkspaceContext('ws-B', 'user-B');
    await expect(contentService.approveContent(ctxWorkspaceB, 'content-wsA-1')).rejects.toThrow(ValidationError);
  });

  it('should DENY User B in Workspace B from reading Workspace A brands', async () => {
    const ctxWorkspaceB = createWorkspaceContext('ws-B', 'user-B');
    const brand = await brandService.getBrand(ctxWorkspaceB, 'brand-wsA-1');

    expect(brand).toBeNull();
  });

  it('should DENY User B in Workspace B from listing Workspace A knowledge documents', async () => {
    const ctxWorkspaceB = createWorkspaceContext('ws-B', 'user-B');
    const docs = await knowledgeService.listDocuments(ctxWorkspaceB);

    expect(docs).toHaveLength(0);
  });

  it('should DENY User B in Workspace B from deleting Workspace A knowledge documents', async () => {
    const ctxWorkspaceB = createWorkspaceContext('ws-B', 'user-B');
    const deleted = await knowledgeService.deleteDocument(ctxWorkspaceB, 'doc-wsA-1');

    expect(deleted).toBe(false);
  });
});
