import { WorkspaceContext } from '../../../packages/core/src/context';
import { NotImplementedError } from '../../../packages/core/src/errors';

export class AnalyticsCapability {
  async analyzePerformance(_context: WorkspaceContext): Promise<never> {
    throw new NotImplementedError('Analytics capability engine is scheduled for Phase 6.');
  }
}
