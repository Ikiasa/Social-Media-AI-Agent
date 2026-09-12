export interface MemoryEntry {
  id: string;
  brandId: string;
  campaignId?: string;
  topic: string;
  insight: string;
  performanceScore?: number;
  sourceEvent?: string;
  createdAt: string;
}

export class BrandMemoryService {
  private memories: Map<string, MemoryEntry[]> = new Map();

  /**
   * Add memory entry bound strictly to brandId and workspaceId
   */
  async addMemory(
    workspaceId: string,
    brandId: string,
    topic: string,
    insight: string,
    performanceScore?: number,
    campaignId?: string
  ): Promise<MemoryEntry> {
    const memoryKey = `${workspaceId}:${brandId}`;
    const brandMemories = this.memories.get(memoryKey) || [];

    const entry: MemoryEntry = {
      id: `mem_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      brandId,
      campaignId,
      topic,
      insight,
      performanceScore,
      createdAt: new Date().toISOString(),
    };

    brandMemories.push(entry);
    this.memories.set(memoryKey, brandMemories);
    return entry;
  }

  /**
   * Query memories for brand context, ensuring zero cross-tenant contamination
   */
  async queryBrandMemories(workspaceId: string, brandId: string, topicKeyword?: string): Promise<MemoryEntry[]> {
    const memoryKey = `${workspaceId}:${brandId}`;
    const brandMemories = this.memories.get(memoryKey) || [];

    if (!topicKeyword) return brandMemories;

    const queryLower = topicKeyword.toLowerCase();
    return brandMemories.filter(
      (m) => m.topic.toLowerCase().includes(queryLower) || m.insight.toLowerCase().includes(queryLower)
    );
  }
}

export const brandMemoryService = new BrandMemoryService();
