import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BrandService } from '../services/api/src/services/BrandService';
import { createWorkspaceContext } from '../packages/core/src/context';
import { AuthorizationError, ValidationError } from '../packages/core/src/errors';

describe('BrandService', () => {
  let service: BrandService;
  let mockRepo: any;

  beforeEach(() => {
    mockRepo = {
      create: vi.fn().mockImplementation((data) => Promise.resolve({ _id: 'brand-1', ...data })),
      findById: vi.fn().mockImplementation((id, wsId) => {
        if (id === 'brand-1' && wsId === 'ws-1') {
          return Promise.resolve({ _id: 'brand-1', workspaceId: 'ws-1', name: 'Test Brand' });
        }
        return Promise.resolve(null);
      }),
      update: vi.fn().mockImplementation((id, wsId, updates) => {
        if (id === 'brand-1' && wsId === 'ws-1') {
          return Promise.resolve({ _id: 'brand-1', workspaceId: 'ws-1', ...updates });
        }
        return Promise.resolve(null);
      }),
      list: vi.fn().mockImplementation((wsId) => {
        if (wsId === 'ws-1') return Promise.resolve([{ _id: 'brand-1', workspaceId: 'ws-1', name: 'Test Brand' }]);
        return Promise.resolve([]);
      }),
    };
    service = new BrandService(mockRepo);
  });

  it('should create a brand for valid workspace context', async () => {
    const ctx = createWorkspaceContext('ws-1', 'user-1');
    const brand = await service.createBrand(ctx, { name: 'Acme Corp', industry: 'Tech' });

    expect(brand.name).toBe('Acme Corp');
    expect(brand.workspaceId).toBe('ws-1');
    expect(mockRepo.create).toHaveBeenCalled();
  });

  it('should throw ValidationError if brand name is empty', async () => {
    const ctx = createWorkspaceContext('ws-1', 'user-1');
    await expect(service.createBrand(ctx, { name: '' })).rejects.toThrow(ValidationError);
  });

  it('should retrieve brand owned by workspace', async () => {
    const ctx = createWorkspaceContext('ws-1', 'user-1');
    const brand = await service.getBrand(ctx, 'brand-1');
    expect(brand).not.toBeNull();
    expect(brand?._id).toBe('brand-1');
  });

  it('should return null if brand belongs to another workspace', async () => {
    const ctx = createWorkspaceContext('ws-2', 'user-2');
    const brand = await service.getBrand(ctx, 'brand-1');
    expect(brand).toBeNull();
  });
});
