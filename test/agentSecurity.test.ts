import { describe, it, expect, vi } from 'vitest';
import { GetBrandTool } from '../packages/ai/src/tools/getBrand.tool';
import { UpdateContentTool } from '../packages/ai/src/tools/updateContent.tool';
import { createWorkspaceContext } from '../packages/core/src/context';
import { ValidationError } from '../packages/core/src/errors';

describe('Agent Security Isolation', () => {
  it('should DENY Workspace A user from reading Workspace B brand via GetBrandTool', async () => {
    const mockBrandService: any = {
      getBrand: vi.fn().mockResolvedValue(null), // Filtered out by workspace scoping
      listBrands: vi.fn().mockResolvedValue([]),
    };

    const tool = new GetBrandTool(mockBrandService);
    const ctxWorkspaceA = createWorkspaceContext('ws-A', 'user-A');

    const result = await tool.execute(ctxWorkspaceA, { brandId: 'brand-wsB' });
    expect(result).toBeNull();
    expect(mockBrandService.getBrand).toHaveBeenCalledWith(ctxWorkspaceA, 'brand-wsB');
  });

  it('should DENY Workspace A user from updating Workspace B content via UpdateContentTool', async () => {
    const mockContentService: any = {
      updateContent: vi.fn().mockResolvedValue(null),
    };

    const tool = new UpdateContentTool(mockContentService);
    const ctxWorkspaceA = createWorkspaceContext('ws-A', 'user-A');

    await expect(
      tool.execute(ctxWorkspaceA, { contentId: 'content-wsB', updates: { title: 'Hacked' } })
    ).rejects.toThrow(ValidationError);
  });
});
