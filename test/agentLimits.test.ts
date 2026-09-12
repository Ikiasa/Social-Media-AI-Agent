import { describe, it, expect, vi } from 'vitest';
import { ExecutionEngine } from '../services/agent/ExecutionEngine';
import { createWorkspaceContext } from '../packages/core/src/context';
import { ToolRegistry } from '../packages/ai/src/tools/types';

describe('Agent Guardrails & Execution Limits', () => {
  it('should return LIMIT_REACHED status if steps exceed maxSteps limit', async () => {
    const mockTool: any = {
      name: 'mock_tool',
      category: 'READ',
      requiresApproval: false,
      execute: vi.fn().mockResolvedValue({ status: 'ok' }),
    };

    const mockRegistry: ToolRegistry = {
      register: vi.fn(),
      get: vi.fn().mockReturnValue(mockTool),
      list: vi.fn().mockReturnValue([mockTool]),
    };

    const engine = new ExecutionEngine({ registry: mockRegistry, guardrails: { maxSteps: 2 } });
    const ctx = createWorkspaceContext('ws-1', 'user-1');

    const steps = [
      { stepIndex: 1, toolName: 'mock_tool', purpose: 'Step 1', input: {} },
      { stepIndex: 2, toolName: 'mock_tool', purpose: 'Step 2', input: {} },
      { stepIndex: 3, toolName: 'mock_tool', purpose: 'Step 3', input: {} },
    ];

    const result = await engine.executePlan(ctx, 'exec-limit', steps);
    expect(result.status).toBe('LIMIT_REACHED');
  });

  it('should return FAILED status if an unregistered tool is requested', async () => {
    const engine = new ExecutionEngine();
    const ctx = createWorkspaceContext('ws-1', 'user-1');

    const result = await engine.executePlan(ctx, 'exec-unknown', [
      { stepIndex: 1, toolName: 'delete_workspace', purpose: 'Malicious step', input: {} },
    ]);

    expect(result.status).toBe('FAILED');
    expect(result.error).toContain('TOOL_NOT_FOUND');
  });
});
