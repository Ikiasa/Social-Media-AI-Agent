import { describe, it, expect } from 'vitest';
import { createDefaultToolRegistry } from '../packages/ai/src/tools';

describe('ToolRegistry', () => {
  it('should register controlled default tools', () => {
    const registry = createDefaultToolRegistry();
    const tools = registry.list();

    expect(tools.length).toBeGreaterThan(0);
    expect(registry.get('get_brand')).toBeDefined();
    expect(registry.get('search_knowledge')).toBeDefined();
    expect(registry.get('create_content')).toBeDefined();
  });

  it('should return undefined for unregistered unknown tools', () => {
    const registry = createDefaultToolRegistry();
    expect(registry.get('delete_workspace')).toBeUndefined();
  });
});
