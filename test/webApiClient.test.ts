import { describe, it, expect } from 'vitest';
import { ApiClient } from '../apps/web/src/lib/api/client';

describe('Web ApiClient', () => {
  it('should instantiate ApiClient with default or custom context headers', () => {
    const client = new ApiClient({
      userId: 'user-test-1',
      workspaceId: 'ws-test-1',
    });

    expect(client).toBeDefined();
  });
});
