export interface ApiConfig {
  baseUrl?: string;
  userId?: string;
  workspaceId?: string;
}

export class ApiClient {
  private baseUrl: string;
  private userId: string;
  private workspaceId: string;

  constructor(config: ApiConfig = {}) {
    this.baseUrl = config.baseUrl || (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}/api` : 'http://localhost:3001/api');
    this.userId = config.userId || 'user-dev-1';
    this.workspaceId = config.workspaceId || 'ws-dev-1';
  }

  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'X-Dev-User-Id': this.userId,
      'X-Dev-Workspace-Id': this.workspaceId,
    };
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...(options.headers || {}),
      },
    });

    const json = await res.json();
    if (!res.ok) {
      const errorMsg =
        (typeof json?.error === 'object' ? json?.error?.message : json?.error) ||
        json?.message ||
        `HTTP ${res.status} Request Failed`;
      throw new Error(errorMsg);
    }
    return json.data !== undefined ? json.data : json;
  }

  // Dashboard Stats
  async getDashboardStats(): Promise<any> {
    return this.request('/dashboard');
  }

  // Brands
  async listBrands(): Promise<any[]> {
    return this.request('/brands');
  }

  async getBrand(id: string): Promise<any> {
    return this.request(`/brands/${id}`);
  }

  async createBrand(data: any): Promise<any> {
    return this.request('/brands', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateBrand(id: string, data: any): Promise<any> {
    return this.request(`/brands/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Knowledge Base
  async listKnowledge(): Promise<any[]> {
    return this.request('/knowledge');
  }

  async ingestKnowledge(data: { sourceType: string; sourceUriOrBuffer: string; title: string; brandId?: string }): Promise<any> {
    return this.request('/knowledge', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteKnowledge(id: string): Promise<any> {
    return this.request(`/knowledge/${id}`, {
      method: 'DELETE',
    });
  }

  // Content Drafts & Workflow
  async listContent(status?: string): Promise<any[]> {
    const query = status ? `?status=${status}` : '';
    return this.request(`/content${query}`);
  }

  async getContent(id: string): Promise<any> {
    return this.request(`/content/${id}`);
  }

  async createContent(data: any): Promise<any> {
    return this.request('/content', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateContent(id: string, data: any): Promise<any> {
    return this.request(`/content/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async approveContent(id: string): Promise<any> {
    return this.request(`/content/${id}/approve`, {
      method: 'POST',
    });
  }

  async rejectContent(id: string): Promise<any> {
    return this.request(`/content/${id}/reject`, {
      method: 'POST',
    });
  }

  async generateContent(data: { topic: string; brandId?: string; platform?: string; contentType?: string }): Promise<any> {
    return this.request('/content/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Calendar & Scheduling
  async listCalendar(): Promise<{ scheduledPosts: any[]; contents: any[] }> {
    return this.request('/calendar');
  }

  async scheduleContent(data: { contentId: string; scheduledAt: string; timezone?: string; platform?: string; brandId?: string }): Promise<any> {
    return this.request('/calendar/schedule', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async cancelSchedule(id: string): Promise<any> {
    return this.request(`/calendar/schedule/${id}`, {
      method: 'DELETE',
    });
  }

  // Agent Orchestrator & Execution Traces
  async runAgent(message: string, brandId?: string): Promise<any> {
    return this.request('/agent/run', {
      method: 'POST',
      body: JSON.stringify({ message, brandId }),
    });
  }

  async listAgentExecutions(): Promise<any[]> {
    return this.request('/agent/executions');
  }

  async getExecutionTrace(id: string): Promise<any> {
    return this.request(`/agent/executions/${id}`);
  }

  async approveExecution(id: string): Promise<any> {
    return this.request(`/agent/executions/${id}/approve`, {
      method: 'POST',
    });
  }

  // CrewAI Intelligence Scraper & Multi-Agent Analysis
  async runAgentAnalysis(topic: string, options: { targetType?: string; depth?: string } = {}): Promise<any> {
    return this.request('/crewai/run-analysis', {
      method: 'POST',
      body: JSON.stringify({
        topic,
        target_url: topic.startsWith('http') ? topic : undefined,
        target_type: options.targetType || 'url',
        depth: options.depth || 'standard',
      }),
    });
  }

  async getAgentJobStatus(jobId: string): Promise<any> {
    return this.request(`/crewai/jobs/${jobId}`);
  }

  async runResearchAnalyze(data: { topic: string; reference_urls?: string[]; target_brand?: string; workspace_id?: string }): Promise<any> {
    return this.request('/crewai/research/analyze', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async runResearchPromote(data: { idea_id: string; title: string; contrarian_angle: string; verbal_hook: string; target_brand?: string; workspace_id?: string }): Promise<any> {
    return this.request('/crewai/research/promote', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async loginPlatformAccount(brandId: string, data: { platform: string; username: string; password?: string; sessionCookieJson?: string }): Promise<any> {
    return this.request(`/brands/${brandId}/accounts/login-platform`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async verifyPlatformSession(brandId: string, data: { platform: string; username: string }): Promise<any> {
    return this.request(`/brands/${brandId}/accounts/verify-session`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deletePlatformAccount(brandId: string, data: { platform: string; username: string }): Promise<any> {
    return this.request(`/brands/${brandId}/accounts/delete`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async executeAgentTask(message: string, brandId?: string): Promise<any> {
    return this.runAgent(message, brandId);
  }

  // BullMQ + Redis Queue Status & Worker Metrics
  async getQueueStatus(): Promise<any> {
    return this.request('/v1/queues/status');
  }

  async dispatchQueueJob(queueName: string, payload?: any): Promise<any> {
    return this.request('/v1/queues/dispatch', {
      method: 'POST',
      body: JSON.stringify({ queueName, payload }),
    });
  }

  // Multi-Tenant Brand Isolation & Proxy Rotation
  async getBrandProxy(brandId: string): Promise<any> {
    return this.request(`/brands/${brandId}/proxy`);
  }

  async testBrandProxy(brandId: string): Promise<any> {
    return this.request(`/brands/${brandId}/proxy/test`, { method: 'POST' });
  }

  async rotateBrandProxy(brandId: string): Promise<any> {
    return this.request(`/brands/${brandId}/proxy/rotate`, { method: 'POST' });
  }

  // Intuitive Instagram AI Audit & Advisor
  async auditInstagramAccount(handle: string = '@acme_brand'): Promise<any> {
    return this.request('/v1/instagram/audit', {
      method: 'POST',
      body: JSON.stringify({ handle }),
    });
  }
}



