import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentOrchestrator } from '../services/agent/AgentOrchestrator';
import { createWorkspaceContext } from '../packages/core/src/context';
import { AgentExecutionModel } from '../packages/database/src/models/AgentExecution';

describe('AgentOrchestrator', () => {
  beforeEach(() => {
    vi.spyOn(AgentExecutionModel, 'create').mockResolvedValue({} as any);
  });

  it('should execute content generation request and return structured AgentResult', async () => {
    const mockExecutionEngine: any = {
      executePlan: vi.fn().mockResolvedValue({
        status: 'COMPLETED',
        traces: [
          { stepIndex: 1, toolName: 'get_brand', status: 'SUCCESS' },
          { stepIndex: 2, toolName: 'create_content', status: 'SUCCESS' },
        ],
        outputs: {
          create_content: { _id: 'content-101', title: '5 AI Automation Secrets', status: 'DRAFT' },
        },
      }),
    };

    const orchestrator = new AgentOrchestrator(
      undefined,
      undefined,
      mockExecutionEngine
    );

    const ctx = createWorkspaceContext('ws-1', 'user-1');
    const result = await orchestrator.execute(ctx, {
      message: 'Buatkan 5 ide konten Instagram tentang AI',
    });

    expect(result.status).toBe('COMPLETED');
    expect(result.intent).toBe('CONTENT_GENERATION');
    expect(result.contentId).toBe('content-101');
    expect(result.requiresApproval).toBe(false);
  });
});
