import React, { useState } from 'react';
import { useAuth } from '../lib/auth/AuthContext';

interface MarketGapAnalysis {
  topic_core: string;
  saturated_angle: string;
  contrarian_angle: string;
  audience_pain_trigger: string;
  saturation_score: number;
}

interface ContentPillarItem {
  pillar_name: string;
  core_message: string;
}

interface HookItem {
  formula_type: string;
  verbal_hook: string;
  on_screen_text: string;
  visual_action_cue: string;
  psychological_trigger: string;
  retention_score: number;
}

interface IdeaMatrixItem {
  idea_id: string;
  title: string;
  impact: 'High' | 'Medium' | 'Low';
  effort: 'High' | 'Medium' | 'Low';
  contrarian_angle: string;
  selected_hook: HookItem;
}

interface ResearchResult {
  topic: string;
  target_brand: string;
  market_gap_analysis: MarketGapAnalysis;
  content_pillars: ContentPillarItem[];
  hooks: HookItem[];
  ideas_matrix: IdeaMatrixItem[];
  recommended_content_format: string;
}

export const ResearchView: React.FC = () => {
  const auth = useAuth();
  const [topic, setTopic] = useState('Otomatisasi Social Media dengan AI Agent');
  const [referenceUrls, setReferenceUrls] = useState('');
  const [targetBrand, setTargetBrand] = useState('Riona AI');
  const [loading, setLoading] = useState(false);
  const [promotingId, setPromotingId] = useState<string | null>(null);
  const [promoteSuccess, setPromoteSuccess] = useState<string | null>(null);
  const [result, setResult] = useState<ResearchResult | null>({
    topic: 'Otomatisasi Social Media dengan AI Agent',
    target_brand: 'Riona AI',
    market_gap_analysis: {
      topic_core: 'Otomatisasi Konten & Strategi Sosial Media Menggunakan AI Agent',
      saturated_angle: 'Cara cepat bikin 100 konten Instagram massal dalam 5 menit pakai ChatGPT.',
      contrarian_angle: 'Mengapa kuantitas tanpa validasi psikologi audiens membunuh jangkauan akun Anda, dan bagaimana AI Agent memvalidasi hook 3 detik sebelum pembuatan konten.',
      audience_pain_trigger: 'Frustrasi karena posting puluhan konten AI yang generik setiap hari namun sepi interaksi, zero conversion, dan jangkauan organik terus drop.',
      saturation_score: 82,
    },
    content_pillars: [
      { pillar_name: 'Hook Velocity', core_message: 'Format 3 detik pertama dengan visual action cue.' },
      { pillar_name: 'Autonomous HITL', core_message: 'Persetujuan manusia sebagai kontrol kualitas akhir.' },
    ],
    hooks: [
      {
        formula_type: 'Pattern Break',
        verbal_hook: 'Stop bikin 100 konten AI generik kalau Anda tidak mau akun terdeteksi spam.',
        on_screen_text: 'STOP POSTING 100 KONTEN AI!',
        visual_action_cue: 'Kamera push-in cepat ke teks merah di layar.',
        psychological_trigger: 'Takut rugi & kejutan pola.',
        retention_score: 96,
      },
      {
        formula_type: 'Contrarian Thesis',
        verbal_hook: 'Bukan algoritma yang berubah, tapi audiens Anda sudah kebal dengan intro biasa.',
        on_screen_text: 'AUDIENS SUDAH KEBAL!',
        visual_action_cue: 'Gestur tangan stop dengan grafik penurunan retensi.',
        psychological_trigger: 'Sudut pandang berlawanan.',
        retention_score: 91,
      },
    ],
    ideas_matrix: [
      {
        idea_id: 'idea_1',
        title: 'Bedah Algoritma Feed 2026',
        impact: 'High',
        effort: 'Low',
        contrarian_angle: 'Kuantitas posting kalah telak dibanding tingkat penyelesaian (completion rate) 3 detik pertama.',
        selected_hook: {
          formula_type: 'Pattern Break',
          verbal_hook: 'Stop bikin 100 konten AI generik kalau Anda tidak mau akun terdeteksi spam.',
          on_screen_text: 'STOP POSTING 100 KONTEN AI!',
          visual_action_cue: 'Kamera push-in cepat.',
          psychological_trigger: 'Pattern Break',
          retention_score: 96,
        },
      },
      {
        idea_id: 'idea_2',
        title: 'Arsitektur Hook 3 Detik Pertama',
        impact: 'High',
        effort: 'Medium',
        contrarian_angle: 'Hook bukan cuma kata-kata, tapi gabungan verbal, on-screen text, dan visual cue berdurasi 0-3 detik.',
        selected_hook: {
          formula_type: 'Contrarian',
          verbal_hook: 'Alasan kenapa akun yang cuma posting 3 kali seminggu bisa punya penjualan 10x lipat.',
          on_screen_text: '3 KONTEN > 30 KONTEN?',
          visual_action_cue: 'Whip-zoom ke layar monitor gelap.',
          psychological_trigger: 'Counter-intuitive proof.',
          retention_score: 92,
        },
      },
    ],
    recommended_content_format: 'Short-form Video (Reels / TikTok)',
  });

  const handleRunResearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;
    setLoading(true);
    setPromoteSuccess(null);

    const urls = referenceUrls
      .split('\n')
      .map((u) => u.trim())
      .filter((u) => u.length > 0);

    const payload = {
      topic,
      reference_urls: urls,
      target_brand: targetBrand,
      workspace_id: 'default',
    };

    try {
      let data: any = null;
      if (auth?.api?.runResearchAnalyze) {
        try {
          data = await auth.api.runResearchAnalyze(payload);
        } catch (_err) {
          data = null;
        }
      }

      if (!data) {
        const pyRes = await fetch('http://localhost:8000/api/v1/research/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (pyRes.ok) {
          data = await pyRes.json();
        } else {
          throw new Error(`CrewAI Python Service (port 8000) returned HTTP ${pyRes.status}`);
        }
      }

      if (data) {
        const normalized: ResearchResult = {
          topic: data.topic || topic,
          target_brand: data.target_brand || targetBrand,
          market_gap_analysis: {
            topic_core: data.market_gap_analysis?.topic_core || data.topic || topic,
            saturated_angle: data.market_gap_analysis?.saturated_angle || 'Sudut pandang umum yang jenuh',
            contrarian_angle: data.market_gap_analysis?.contrarian_angle || 'Celah pasar alternatif',
            audience_pain_trigger: data.market_gap_analysis?.audience_pain_trigger || 'Tantangan utama audiens',
            saturation_score: data.market_gap_analysis?.saturation_score ?? 50,
          },
          content_pillars: Array.isArray(data.content_pillars) ? data.content_pillars : [],
          hooks: Array.isArray(data.hooks) ? data.hooks : [],
          ideas_matrix: Array.isArray(data.ideas_matrix) ? data.ideas_matrix : [],
          recommended_content_format: data.recommended_content_format || 'Short-form Video',
        };
        setResult(normalized);
      }
    } catch (err: any) {
      console.error('Error running research:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePromoteToProduction = async (idea: IdeaMatrixItem) => {
    setPromotingId(idea.idea_id);
    setPromoteSuccess(null);

    const payload = {
      idea_id: idea.idea_id,
      title: idea.title,
      contrarian_angle: idea.contrarian_angle,
      verbal_hook: idea.selected_hook?.verbal_hook || '',
      hook: idea.selected_hook,
      recommended_format: result?.recommended_content_format || 'Short-form Video',
      target_brand: targetBrand,
      workspace_id: 'default',
    };

    try {
      let data: any = null;
      if (auth?.api?.runResearchPromote) {
        try {
          data = await auth.api.runResearchPromote(payload);
        } catch (_err) {
          data = null;
        }
      }

      if (!data) {
        const pyRes = await fetch('http://localhost:8000/api/v1/research/promote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (pyRes.ok) {
          data = await pyRes.json();
        } else {
          throw new Error(`CrewAI Service returned HTTP ${pyRes.status}`);
        }
      }

      setPromoteSuccess(`Ide "${idea.title}" berhasil diteruskan ke antrean produksi LangGraph!`);
    } catch (err: any) {
      console.error('Error promoting idea:', err);
      alert(`Gagal memicu produksi konten: ${err.message}`);
    } finally {
      setPromotingId(null);
    }
  };

  const saturationScore = result?.market_gap_analysis?.saturation_score ?? 50;

  return (
    <div className="space-y-6 text-[#0f172a] font-sans antialiased">
      {/* 1. Header Banner */}
      <div className="bg-white border border-[#e2e8f0] rounded-xl p-6 shadow-xs relative overflow-hidden">
        <div className="flex items-center space-x-3 mb-3">
          <span className="px-3 py-1 bg-[#eff6ff] text-[#2563eb] border border-[#bfdbfe] rounded-full text-xs font-mono font-medium">
            VIRAL ARCHITECTURE ENGINE
          </span>
          <span className="text-xs text-[#64748b] font-mono">CrewAI + Gemini 1.5 + RAG</span>
        </div>
        <h1 className="text-xl font-bold tracking-tight text-[#0f172a]">
          Market Research & Hook Matrix Scorer
        </h1>
        <p className="mt-1 text-xs text-[#64748b] max-w-3xl leading-relaxed">
          Validasi kejenuhan pasar, rumuskan sudut pandang <span className="text-[#0f172a] font-semibold">contrarian</span>, dan hasilkan formula hook 3 detik pertama dengan skor retensi tinggi.
        </p>
      </div>

      {/* 2. Input Form */}
      <form onSubmit={handleRunResearch} className="bg-white border border-[#e2e8f0] rounded-xl p-6 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-[#e2e8f0] pb-3">
          <h2 className="text-xs font-bold text-[#0f172a] flex items-center space-x-2">
            <span>🎯</span>
            <span>Parameter Riset Pasar & Referensi</span>
          </h2>
          <span className="text-[11px] text-[#64748b] font-mono">AI Scorer Active</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <label className="block text-[11px] font-semibold text-[#64748b] uppercase tracking-wider mb-1.5">
              Target Brand / Product
            </label>
            <input
              type="text"
              value={targetBrand}
              onChange={(e) => setTargetBrand(e.target.value)}
              className="w-full px-3.5 py-2 text-xs border border-[#cbd5e1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563eb] text-[#0f172a]"
              placeholder="e.g. Riona AI"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-[11px] font-semibold text-[#64748b] uppercase tracking-wider mb-1.5">
              Topik / Niche Utama Riset
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full px-3.5 py-2 text-xs border border-[#cbd5e1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563eb] text-[#0f172a]"
              placeholder="e.g. Otomatisasi Social Media dengan AI Agent"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-[#64748b] uppercase tracking-wider mb-1.5">
            URL Referensi Konten Kompetitor / Benchmark (Satu URL per baris)
          </label>
          <textarea
            value={referenceUrls}
            onChange={(e) => setReferenceUrls(e.target.value)}
            rows={3}
            className="w-full px-3.5 py-2 text-xs border border-[#cbd5e1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563eb] text-[#0f172a] font-mono"
            placeholder="https://instagram.com/p/example1&#10;https://tiktok.com/@user/video/12345"
          />
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-semibold rounded-lg transition-all flex items-center space-x-2 disabled:opacity-50 shadow-xs cursor-pointer"
          >
            {loading ? (
              <>
                <span className="animate-spin">🌀</span>
                <span>Memproses Riset Pasar dengan CrewAI...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-sm">science</span>
                <span>Jalankan Riset Pasar & Hook Scorer</span>
              </>
            )}
          </button>
        </div>
      </form>

      {promoteSuccess && (
        <div className="bg-[#ecfdf5] border border-[#a7f3d0] rounded-xl p-4 text-[#059669] text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-2">
            <span>✅</span>
            <span className="font-medium">{promoteSuccess}</span>
          </div>
          <span className="text-[10px] bg-white border border-[#a7f3d0] px-2.5 py-1 rounded-full text-[#059669] font-mono">Production Active</span>
        </div>
      )}

      {result && (
        <div className="space-y-6">
          {/* Section 1: Market Gap & Content Saturation */}
          <div className="bg-white border border-[#e2e8f0] rounded-xl p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#e2e8f0] pb-4 gap-2">
              <div>
                <h3 className="text-sm font-bold text-[#0f172a] flex items-center space-x-2">
                  <span>📊</span> <span>Analisis Niche & Content Saturation</span>
                </h3>
                <p className="text-xs text-[#64748b]">Inti Topik: <span className="text-[#2563eb] font-medium">{result.market_gap_analysis?.topic_core || result.topic || 'Analisis Topik'}</span></p>
              </div>
              <div className="flex items-center space-x-3 bg-[#f8fafc] px-3.5 py-2 rounded-lg border border-[#e2e8f0]">
                <span className="text-xs font-medium text-[#64748b]">Saturation Score:</span>
                <div className="flex items-center space-x-2">
                  <span className={`text-base font-extrabold font-mono ${saturationScore > 75 ? 'text-[#b45309]' : 'text-[#059669]'}`}>
                    {saturationScore}/100
                  </span>
                  <span className={`text-[10px] font-mono uppercase font-semibold px-2 py-0.5 rounded-full ${saturationScore > 75 ? 'bg-[#fef3c7] text-[#b45309] border border-[#fde68a]' : 'bg-[#ecfdf5] text-[#059669] border border-[#a7f3d0]'}`}>
                    {saturationScore > 75 ? 'High Saturation' : 'Fresh Opportunity'}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Saturated Angle */}
              <div className="bg-[#fff1f2] border border-[#fecdd3] rounded-lg p-4 space-y-1.5">
                <div className="flex items-center space-x-2 text-[#e11d48] font-semibold text-xs uppercase tracking-wide">
                  <span>⚠️ Saturated Angle (Pasar Jenuh)</span>
                </div>
                <p className="text-xs text-[#475569] leading-relaxed">
                  {result.market_gap_analysis?.saturated_angle || 'Sudut pandang generik yang sudah terlalu sering dipakai.'}
                </p>
              </div>

              {/* Contrarian Angle */}
              <div className="bg-[#ecfdf5] border border-[#a7f3d0] rounded-lg p-4 space-y-1.5">
                <div className="flex items-center space-x-2 text-[#059669] font-semibold text-xs uppercase tracking-wide">
                  <span>💡 Contrarian Angle (Celah Pasar Unik)</span>
                </div>
                <p className="text-xs text-[#047857] leading-relaxed font-medium">
                  {result.market_gap_analysis?.contrarian_angle || 'Celah diferensiasi unik yang belum banyak dibahas.'}
                </p>
              </div>
            </div>

            {/* Pain Point Trigger */}
            <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-lg p-4 flex items-start space-x-3">
              <span className="text-base">🔥</span>
              <div>
                <h4 className="text-[11px] font-semibold text-[#64748b] uppercase tracking-wider">Audience Pain Trigger Specific</h4>
                <p className="text-xs text-[#334155] mt-0.5">{result.market_gap_analysis?.audience_pain_trigger || 'Tantangan utama yang dihadapi oleh audiens.'}</p>
              </div>
            </div>
          </div>

          {/* Section 2: High-Converting Hook Generator & Retention Matrix */}
          <div className="bg-white border border-[#e2e8f0] rounded-xl p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-[#e2e8f0] pb-4">
              <div>
                <h3 className="text-sm font-bold text-[#0f172a] flex items-center space-x-2">
                  <span>🪝</span> <span>High-Converting Hook Generator & Retention Matrix</span>
                </h3>
                <p className="text-xs text-[#64748b]">Dimaksimalkan untuk prinsip retensi 3 detik pertama dengan Visual Cue & Teks Layar.</p>
              </div>
              <span className="text-[11px] font-mono bg-[#f1f5f9] text-[#475569] border border-[#e2e8f0] px-3 py-1 rounded-full">
                Format: {result.recommended_content_format || 'Short-form Video'}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {(result.hooks || []).map((h, idx) => (
                <div key={idx} className="bg-[#f8fafc] border border-[#e2e8f0] rounded-lg p-5 space-y-3 hover:border-[#cbd5e1] transition-all">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-[11px] font-semibold px-2.5 py-0.5 bg-[#eff6ff] text-[#2563eb] border border-[#bfdbfe] rounded-full">
                        {h.formula_type}
                      </span>
                      <span className="text-[11px] text-[#64748b] font-mono">Trigger: {h.psychological_trigger}</span>
                    </div>
                    <div className="flex items-center space-x-1.5 bg-white px-2.5 py-1 rounded-lg border border-[#e2e8f0]">
                      <span className="text-[11px] text-[#64748b] font-medium">Retention:</span>
                      <span className={`text-xs font-mono font-bold ${(h.retention_score || 0) >= 90 ? 'text-[#059669]' : 'text-[#2563eb]'}`}>
                        {h.retention_score || 85}%
                      </span>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-[#0f172a] leading-snug">"{h.verbal_hook}"</h4>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1.5 border-t border-[#e2e8f0]">
                    <div className="bg-white p-2.5 rounded-lg border border-[#e2e8f0]">
                      <span className="font-semibold text-[#2563eb] text-[11px] block mb-0.5">📺 On-Screen Text (0-2s):</span>
                      <span className="font-mono text-[#0f172a] font-bold text-xs">"{h.on_screen_text}"</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-[#e2e8f0]">
                      <span className="font-semibold text-[#059669] text-[11px] block mb-0.5">🎥 Visual Action Cue (0-3s):</span>
                      <span className="text-[#334155] text-xs">{h.visual_action_cue}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Ideation Canvas (2x2 Impact vs Effort Matrix) */}
          <div className="bg-white border border-[#e2e8f0] rounded-xl p-6 shadow-xs space-y-6">
            <div className="border-b border-[#e2e8f0] pb-4">
              <h3 className="text-sm font-bold text-[#0f172a] flex items-center space-x-2">
                <span>⚡</span> <span>Ideation Canvas (2x2 Impact vs Effort Matrix)</span>
              </h3>
              <p className="text-xs text-[#64748b]">Pilih ide terbaik dan klik 1-Click "Promote to Production" untuk memicu otomatisasi pembuatan naskah lengkap.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Quadrant 1: High Impact / Low Effort (Quick Wins) */}
              <div className="bg-[#ecfdf5]/40 border border-[#a7f3d0] rounded-lg p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-[#a7f3d0] pb-2">
                  <h4 className="text-xs font-bold text-[#059669] flex items-center space-x-1.5 uppercase tracking-wider">
                    <span>⭐</span> <span>Quick Wins (High Impact, Low Effort)</span>
                  </h4>
                  <span className="text-[10px] bg-[#ecfdf5] text-[#059669] border border-[#a7f3d0] px-2 py-0.5 rounded-full font-mono font-semibold">PRIORITY #1</span>
                </div>

                {(result.ideas_matrix || [])
                  .filter((i) => i.impact === 'High' && i.effort === 'Low')
                  .map((item) => (
                    <div key={item.idea_id} className="bg-white border border-[#e2e8f0] rounded-lg p-4 space-y-3 shadow-xs">
                      <div className="flex items-start justify-between">
                        <h5 className="font-bold text-[#0f172a] text-xs">{item.title}</h5>
                        <span className="text-[10px] px-2 py-0.5 bg-[#ecfdf5] text-[#059669] border border-[#a7f3d0] rounded-full font-mono font-semibold">
                          Retensi {item.selected_hook?.retention_score || 85}%
                        </span>
                      </div>
                      <p className="text-xs text-[#64748b] italic">"{item.contrarian_angle}"</p>
                      <button
                        onClick={() => handlePromoteToProduction(item)}
                        disabled={promotingId === item.idea_id}
                        className="w-full py-2 bg-[#0f172a] hover:bg-[#1e293b] text-white text-xs font-medium rounded-lg transition-all flex items-center justify-center space-x-1.5 disabled:opacity-50 shadow-xs cursor-pointer"
                      >
                        {promotingId === item.idea_id ? (
                          <span>Promoting to LangGraph...</span>
                        ) : (
                          <>
                            <span>🚀 1-Click Promote to Production</span>
                          </>
                        )}
                      </button>
                    </div>
                  ))}
              </div>

              {/* Quadrant 2: High Impact / High Effort (Strategic Bets) */}
              <div className="bg-[#eff6ff]/40 border border-[#bfdbfe] rounded-lg p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-[#bfdbfe] pb-2">
                  <h4 className="text-xs font-bold text-[#2563eb] flex items-center space-x-1.5 uppercase tracking-wider">
                    <span>🚀</span> <span>Strategic Bets (High Impact, High Effort)</span>
                  </h4>
                  <span className="text-[10px] bg-[#eff6ff] text-[#2563eb] border border-[#bfdbfe] px-2 py-0.5 rounded-full font-mono font-semibold">BIG WINS</span>
                </div>

                {(result.ideas_matrix || [])
                  .filter((i) => i.impact === 'High' && (i.effort === 'Medium' || i.effort === 'High'))
                  .map((item) => (
                    <div key={item.idea_id} className="bg-white border border-[#e2e8f0] rounded-lg p-4 space-y-3 shadow-xs">
                      <div className="flex items-start justify-between">
                        <h5 className="font-bold text-[#0f172a] text-xs">{item.title}</h5>
                        <span className="text-[10px] px-2 py-0.5 bg-[#eff6ff] text-[#2563eb] border border-[#bfdbfe] rounded-full font-mono font-semibold">
                          Retensi {item.selected_hook?.retention_score || 85}%
                        </span>
                      </div>
                      <p className="text-xs text-[#64748b] italic">"{item.contrarian_angle}"</p>
                      <button
                        onClick={() => handlePromoteToProduction(item)}
                        disabled={promotingId === item.idea_id}
                        className="w-full py-2 bg-[#0f172a] hover:bg-[#1e293b] text-white text-xs font-medium rounded-lg transition-all flex items-center justify-center space-x-1.5 disabled:opacity-50 shadow-xs cursor-pointer"
                      >
                        {promotingId === item.idea_id ? (
                          <span>Promoting to LangGraph...</span>
                        ) : (
                          <>
                            <span>🚀 1-Click Promote to Production</span>
                          </>
                        )}
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
