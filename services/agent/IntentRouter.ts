import { AgentIntent } from './types/agent';

export class IntentRouter {
  route(message: string): { intent: AgentIntent; confidence: number } {
    const text = message.toLowerCase();

    if (text.includes('strategi') || text.includes('strategy') || text.includes('pillar') || text.includes('pilar') || text.includes('angle') || text.includes('tema')) {
      return { intent: 'STRATEGY', confidence: 0.95 };
    }

    if (text.includes('analytics') || text.includes('analisis') || text.includes('engagement') || text.includes('performa') || text.includes('reach')) {
      return { intent: 'ANALYTICS', confidence: 0.9 };
    }

    if (text.includes('jadwal') || text.includes('schedule') || text.includes('publish') || text.includes('posting')) {
      return { intent: 'CONTENT_MANAGEMENT', confidence: 0.9 };
    }

    if (text.includes('knowledge') || text.includes('dokumen') || text.includes('cari') || text.includes('search') || text.includes('informasi')) {
      return { intent: 'KNOWLEDGE_SEARCH', confidence: 0.85 };
    }

    if (text.includes('ubah') || text.includes('edit') || text.includes('revise') || text.includes('revisi') || text.includes('perbaiki')) {
      return { intent: 'CONTENT_REVISION', confidence: 0.85 };
    }

    if (text.includes('buat') || text.includes('generate') || text.includes('bikin') || text.includes('ide') || text.includes('konten') || text.includes('content') || text.includes('caption')) {
      return { intent: 'CONTENT_GENERATION', confidence: 0.95 };
    }

    return { intent: 'GENERAL', confidence: 0.7 };
  }
}
