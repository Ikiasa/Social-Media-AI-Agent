import { AgentTool } from './types';
import { WorkspaceContext } from '../../../core/src/context';
import { NotImplementedError } from '../../../core/src/errors';

export interface ScheduleContentInput {
  contentId: string;
  scheduledAt: Date;
}

export class ScheduleContentTool implements AgentTool<ScheduleContentInput, { status: string }> {
  readonly name = 'schedule_content';
  readonly description = 'Schedules content for automatic publishing (requires human approval)';
  readonly category = 'EXTERNAL_ACTION';
  readonly requiresApproval = true;

  async execute(_context: WorkspaceContext, _input: ScheduleContentInput): Promise<{ status: string }> {
    throw new NotImplementedError(
      'Schedule content worker queue is not available yet in current milestone.'
    );
  }
}
