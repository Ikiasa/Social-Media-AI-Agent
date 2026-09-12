import { describe, it, expect } from 'vitest';
import { IntentRouter } from '../services/agent/IntentRouter';

describe('IntentRouter', () => {
  const router = new IntentRouter();

  it('should detect STRATEGY intent', () => {
    const res = router.route('Buatkan strategi pilar konten bulan ini');
    expect(res.intent).toBe('STRATEGY');
  });

  it('should detect CONTENT_GENERATION intent', () => {
    const res = router.route('Buatkan 5 ide caption Instagram tentang AI');
    expect(res.intent).toBe('CONTENT_GENERATION');
  });

  it('should detect KNOWLEDGE_SEARCH intent', () => {
    const res = router.route('Cari informasi dokumen produk kopi');
    expect(res.intent).toBe('KNOWLEDGE_SEARCH');
  });

  it('should detect CONTENT_MANAGEMENT intent', () => {
    const res = router.route('Atur jadwal posting untuk besok');
    expect(res.intent).toBe('CONTENT_MANAGEMENT');
  });
});
