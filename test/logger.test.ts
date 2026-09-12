import { describe, it, expect, vi } from 'vitest';
import { WinstonLogger } from '../packages/core/src/logger';

describe('WinstonLogger', () => {
  it('should instantiate and log info without throwing error', () => {
    const logger = new WinstonLogger();
    expect(() => logger.info('Test info log', { workspaceId: 'ws-123' })).not.toThrow();
  });

  it('should mask sensitive keys in meta object', () => {
    const logger = new WinstonLogger();
    const spy = vi.spyOn((logger as any).logger, 'info');

    logger.info('User login', { password: 'secretpassword', sessionToken: 'abc123token', username: 'user1' });

    expect(spy).toHaveBeenCalledWith('User login', {
      password: '[REDACTED]',
      sessionToken: '[REDACTED]',
      username: 'user1',
    });
  });
});
