import { setup_HandleError, saveScrapedData } from '../../packages/core/src/utils';
import { defaultLogger } from '../../packages/core/src/logger';

export { setup_HandleError, saveScrapedData };

export async function handleError(
  error: unknown,
  _currentApiKeyIndex?: number,
  _schema?: unknown,
  _prompt?: string,
  _retryFn?: Function
): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  defaultLogger.error(`Agent Execution Error: ${message}`, { error });
}
