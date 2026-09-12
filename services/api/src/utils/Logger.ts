export interface LogContext {
  correlationId?: string;
  workspaceId?: string;
  brandId?: string;
  provider?: string;
  providerConnectionId?: string;
  operation?: string;
  safeErrorCode?: string;
  [key: string]: unknown;
}

export class Logger {
  private static sensitiveKeys = [
    'token',
    'accesstoken',
    'refreshtoken',
    'secret',
    'clientsecret',
    'password',
    'authorization',
    'auth',
    'code',
    'rawbody',
    'webhookbody',
  ];

  private static redactSensitiveData(obj: Record<string, unknown>): Record<string, unknown> {
    const redacted: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      if (Logger.sensitiveKeys.some((s) => lowerKey.includes(s))) {
        redacted[key] = '[REDACTED_SECRET]';
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        redacted[key] = Logger.redactSensitiveData(value as Record<string, unknown>);
      } else {
        redacted[key] = value;
      }
    }

    return redacted;
  }

  public static formatLog(level: 'info' | 'warn' | 'error', message: string, context: LogContext = {}): string {
    const redactedContext = Logger.redactSensitiveData(context as Record<string, unknown>);

    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      correlationId: redactedContext.correlationId || 'none',
      workspaceId: redactedContext.workspaceId || 'none',
      brandId: redactedContext.brandId || 'none',
      provider: redactedContext.provider || 'none',
      providerConnectionId: redactedContext.providerConnectionId || 'none',
      operation: redactedContext.operation || 'none',
      safeErrorCode: redactedContext.safeErrorCode || 'none',
      ...redactedContext,
    };

    return JSON.stringify(logEntry);
  }

  public static info(message: string, context: LogContext = {}): void {
    console.log(Logger.formatLog('info', message, context));
  }

  public static warn(message: string, context: LogContext = {}): void {
    console.warn(Logger.formatLog('warn', message, context));
  }

  public static error(message: string, context: LogContext = {}): void {
    console.error(Logger.formatLog('error', message, context));
  }
}
