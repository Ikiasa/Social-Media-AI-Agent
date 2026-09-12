export interface MetricRecord {
  name: string;
  value: number;
  tags?: Record<string, string>;
  timestamp: string;
}

export class TelemetryService {
  private static instance: TelemetryService;
  private metrics: MetricRecord[] = [];

  private constructor() {}

  static getInstance(): TelemetryService {
    if (!TelemetryService.instance) {
      TelemetryService.instance = new TelemetryService();
    }
    return TelemetryService.instance;
  }

  recordCounter(name: string, value = 1, tags?: Record<string, string>): void {
    this.metrics.push({
      name,
      value,
      tags,
      timestamp: new Date().toISOString(),
    });
  }

  recordTimer(name: string, durationMs: number, tags?: Record<string, string>): void {
    this.metrics.push({
      name,
      value: durationMs,
      tags,
      timestamp: new Date().toISOString(),
    });
  }

  getMetrics(filterName?: string): MetricRecord[] {
    if (filterName) {
      return this.metrics.filter((m) => m.name === filterName);
    }
    return [...this.metrics];
  }

  clear(): void {
    this.metrics = [];
  }
}

export const telemetry = TelemetryService.getInstance();
