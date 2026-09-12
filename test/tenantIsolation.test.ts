import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createWorkspaceContext } from '../packages/core/src/context';
import { BrandService } from '../services/api/src/services/BrandService';
import { ContentService } from '../services/api/src/services/ContentService';

describe('Cross-Workspace Tenant Isolation Security Tests', () => {
  const ctxA = createWorkspaceContext('ws-tenant-A', 'user-A');
  const ctxB = createWorkspaceContext('ws-tenant-B', 'user-B');

  let brandDb: any[] = [];
  let contentDb: any[] = [];

  let brandService: BrandService;
  let contentService: ContentService;

  beforeEach(() => {
    brandDb = [];
    contentDb = [];

    const mockBrandRepo: any = {
      create: vi.fn().mockImplementation((data) => {
        const item = { _id: `brand_${Date.now()}`, ...data };
        brandDb.push(item);
        return Promise.resolve(item);
      }),
      findById: vi.fn().mockImplementation((id, wsId) => {
        return Promise.resolve(brandDb.find((b) => b._id === id && b.workspaceId === wsId) || null);
      }),
    };

    const mockContentRepo: any = {
      create: vi.fn().mockImplementation((data) => {
        const item = { _id: `content_${Date.now()}`, ...data };
        contentDb.push(item);
        return Promise.resolve(item);
      }),
      findById: vi.fn().mockImplementation((id, wsId) => {
        return Promise.resolve(contentDb.find((c) => c._id === id && c.workspaceId === wsId) || null);
      }),
    };

    brandService = new BrandService(mockBrandRepo);
    contentService = new ContentService(mockContentRepo);
  });

  it('should isolate Brand creation and retrieval between Workspace A and Workspace B', async () => {
    const brandA = await brandService.createBrand(ctxA, {
      name: 'Brand Alpha',
      industry: 'AI Technology',
    });

    expect(brandA.workspaceId).toBe('ws-tenant-A');

    // Workspace B queries Workspace A's brand ID -> MUST return null
    const crossFetch = await brandService.getBrand(ctxB, String((brandA as any)._id));
    expect(crossFetch).toBeNull();
  });

  it('should isolate Content creation and retrieval between Workspace A and Workspace B', async () => {
    const contentA = await contentService.createDraft(ctxA, {
      title: 'Confidential Post A',
      caption: 'Secret launch details',
      platform: 'instagram',
    });

    expect(contentA.workspaceId).toBe('ws-tenant-A');

    // Workspace B attempts to access Workspace A's content ID -> MUST return null
    const crossContent = await contentService.getContent(ctxB, String((contentA as any)._id));
    expect(crossContent).toBeNull();
  });
});
