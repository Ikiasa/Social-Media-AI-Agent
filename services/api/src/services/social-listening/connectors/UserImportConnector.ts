import {
  SocialDataConnector,
  DataSourceType,
  ConnectorContext,
  ConnectorHealth,
  NormalizedSocialRecord,
  FetchMetricsInput,
  SocialPlatform,
} from '../types';

export interface UserImportRow {
  platform?: SocialPlatform;
  sourceRecordId?: string;
  recordType?: 'metric' | 'post' | 'engagement' | 'message' | 'trend_signal';
  occurredAt?: string;
  data?: Record<string, unknown>;
}

export class UserImportConnector implements SocialDataConnector {
  public readonly provider = 'user_import';
  public readonly sourceType: DataSourceType = 'user_import';

  async healthCheck(_context: ConnectorContext): Promise<ConnectorHealth> {
    return {
      status: 'CONNECTED',
      provider: this.provider,
      sourceType: this.sourceType,
      lastCheckedAt: new Date().toISOString(),
      message: 'User import connector ready for validated CSV/JSON payloads (Max 5MB).',
    };
  }

  async fetchMetrics(
    _context: ConnectorContext,
    _input: FetchMetricsInput
  ): Promise<NormalizedSocialRecord[]> {
    return [];
  }

  processImportPayload(
    context: ConnectorContext,
    rows: UserImportRow[],
    rawPayloadSizeBytes?: number
  ): NormalizedSocialRecord[] {
    const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB limit
    if (rawPayloadSizeBytes && rawPayloadSizeBytes > MAX_SIZE_BYTES) {
      throw new Error(`User import payload size (${(rawPayloadSizeBytes / 1024 / 1024).toFixed(2)}MB) exceeds 5MB limit.`);
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      throw new Error('User import payload must contain a non-empty array of record objects.');
    }

    return rows.map((row, idx) => {
      if (!row.sourceRecordId || !row.sourceRecordId.trim()) {
        throw new Error(`Row #${idx + 1} is missing required field 'sourceRecordId'.`);
      }
      if (!row.platform) {
        throw new Error(`Row #${idx + 1} is missing required field 'platform'.`);
      }

      return {
        workspaceId: context.workspaceId,
        brandId: context.brandId,
        platform: row.platform || 'generic',
        source: 'user_import',
        sourceRecordId: row.sourceRecordId,
        recordType: row.recordType || 'metric',
        capturedAt: new Date().toISOString(),
        occurredAt: row.occurredAt || new Date().toISOString(),
        data: row.data || {},
        dataQuality: {
          coverage: 'complete',
          unavailableFields: [],
        },
      };
    });
  }
}
