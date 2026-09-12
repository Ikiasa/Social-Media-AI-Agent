export interface TokenUsageRecord {
  id: string;
  workspaceId: string;
  brandId?: string;
  agentName: string;
  promptTokens: number;
  completionTokens: number;
  estimatedCostUsd: number;
  timestamp: string;
}

export class CostObservabilityService {
  private records: TokenUsageRecord[] = [];

  recordUsage(
    workspaceId: string,
    agentName: string,
    promptTokens: number,
    completionTokens: number,
    brandId?: string
  ): TokenUsageRecord {
    // Estimated pricing (e.g. Gemini / Claude / GPT rates)
    const costPer1kInput = 0.0005;
    const costPer1kOutput = 0.0015;

    const estimatedCostUsd =
      (promptTokens / 1000) * costPer1kInput + (completionTokens / 1000) * costPer1kOutput;

    const record: TokenUsageRecord = {
      id: `usage_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      workspaceId,
      brandId,
      agentName,
      promptTokens,
      completionTokens,
      estimatedCostUsd: Number(estimatedCostUsd.toFixed(6)),
      timestamp: new Date().toISOString(),
    };

    this.records.push(record);
    return record;
  }

  getWorkspaceMetrics(workspaceId: string, brandId?: string) {
    const filtered = this.records.filter((r) => {
      if (r.workspaceId !== workspaceId) return false;
      if (brandId && r.brandId !== brandId) return false;
      return true;
    });

    const totalPromptTokens = filtered.reduce((acc, r) => acc + r.promptTokens, 0);
    const totalCompletionTokens = filtered.reduce((acc, r) => acc + r.completionTokens, 0);
    const totalCostUsd = filtered.reduce((acc, r) => acc + r.estimatedCostUsd, 0);

    return {
      totalRequests: filtered.length,
      totalPromptTokens,
      totalCompletionTokens,
      totalCostUsd: Number(totalCostUsd.toFixed(4)),
      usageHistory: filtered,
    };
  }
}

export const costObservabilityService = new CostObservabilityService();
