export interface AlertRule {
  id: string;
  name: string;
  severity: 'WARNING' | 'CRITICAL';
  threshold: number;
}

export interface MetricTelemetry {
  errorRate: number;
  apiLatencyMs: number;
  workerQueueDepth: number;
  failedJobCount: number;
  webhookFailuresCount: number;
  circuitBreakersOpenCount: number;
  storageQuotaUsagePercent: number;
}

export class AlertManagerService {
  private static instance: AlertManagerService;
  private activeAlerts: Map<string, { alertId: string; triggeredAt: string; message: string }> = new Map();

  public static getInstance(): AlertManagerService {
    if (!AlertManagerService.instance) {
      AlertManagerService.instance = new AlertManagerService();
    }
    return AlertManagerService.instance;
  }

  evaluateMetrics(telemetry: MetricTelemetry): { alertsTriggered: number; alerts: any[] } {
    const alerts: any[] = [];

    if (telemetry.circuitBreakersOpenCount > 0) {
      alerts.push({
        ruleId: 'CIRCUIT_BREAKER_OPEN',
        severity: 'CRITICAL',
        message: `${telemetry.circuitBreakersOpenCount} provider connection circuit breaker(s) are in OPEN state.`,
      });
    }

    if (telemetry.webhookFailuresCount > 5) {
      alerts.push({
        ruleId: 'WEBHOOK_SIGNATURE_SPIKE',
        severity: 'CRITICAL',
        message: `High webhook signature failure rate detected: ${telemetry.webhookFailuresCount} failures.`,
      });
    }

    if (telemetry.workerQueueDepth > 100) {
      alerts.push({
        ruleId: 'WORKER_QUEUE_BACKLOG',
        severity: 'WARNING',
        message: `Worker queue backlog depth exceeded threshold: ${telemetry.workerQueueDepth} pending jobs.`,
      });
    }

    if (telemetry.storageQuotaUsagePercent >= 85) {
      alerts.push({
        ruleId: 'QUOTA_STORAGE_WARNING',
        severity: 'WARNING',
        message: `Storage quota usage reached ${telemetry.storageQuotaUsagePercent}%.`,
      });
    }

    for (const a of alerts) {
      this.activeAlerts.set(a.ruleId, { alertId: a.ruleId, triggeredAt: new Date().toISOString(), message: a.message });
    }

    return { alertsTriggered: alerts.length, alerts };
  }

  getActiveAlerts(): any[] {
    return Array.from(this.activeAlerts.values());
  }

  clearAlerts(): void {
    this.activeAlerts.clear();
  }
}

export const alertManagerService = AlertManagerService.getInstance();
