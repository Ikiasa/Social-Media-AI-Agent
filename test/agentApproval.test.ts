import { describe, it, expect } from 'vitest';
import { ExecutionEngine } from '../services/agent/ExecutionEngine';
import { createWorkspaceContext } from '../packages/core/src/context';

describe('Human Approval Boundary', () => {
  it('should halt execution and set status WAITING_APPROVAL when tool requires approval', async () => {
    const engine = new ExecutionEngine();
    const ctx = createWorkspaceContext('ws-1', 'user-1');

    const result = await engine.executePlan(ctx, 'exec-1', [
      {
        stepIndex: 1,
        toolName: 'schedule_content',
        purpose: 'Schedule post publishing',
        input: { contentId: 'content-1', scheduledAt: new Date() },
      },
    ]);

    expect(result.status).toBe('WAITING_APPROVAL');
    expect(result.pendingToolCall).toBe('schedule_content');
    expect(result.traces[0].status).toBe('WAITING_APPROVAL');
  });
});
