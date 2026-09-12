import React, { useState } from 'react';
import { useAuth } from '../lib/auth/AuthContext';

export const CampaignView: React.FC = () => {
  const { activeBrandId } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'planning' | 'attribution' | 'insights'>('overview');
  const [isPlanningModalOpen, setIsPlanningModalOpen] = useState(false);
  const [generatingPlan, setGeneratingPlan] = useState(false);

  // Form inputs for AI Campaign Planner
  const [productOffer, setProductOffer] = useState('');
  const [targetAudience, setTargetAudience] = useState('Pemilik Bisnis & Agency Manager');
  const [objective, setObjective] = useState<'AWARENESS' | 'LEADS' | 'CONVERSION'>('LEADS');
  const [periodDays, setPeriodDays] = useState(14);
  const [planResult, setPlanResult] = useState<any | null>(null);

  const handleGenerateStrategy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productOffer.trim() || generatingPlan) return;

    setGeneratingPlan(true);
    try {
      const res = await fetch('/api/v1/campaigns/plan-strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandId: activeBrandId || 'brand_default',
          objective,
          platforms: ['instagram', 'linkedin', 'x'],
          targetAudience,
          periodDays,
          productOffer,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Generation failed');

      setPlanResult(data.data);
      setIsPlanningModalOpen(false);
      setActiveTab('planning');
      alert('Strategi Campaign AI dan Draft Konten berhasil dibuat! Seluruh draft konten berstatus DRAFT dan memerlukan persetujuan 3-tier sebelum penerbitan.');
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setGeneratingPlan(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Action Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl shadow-md border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full">
              Phase 2 Active
            </span>
            <span className="text-xs text-slate-400">Campaign Intelligence & Attribution</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight mt-1">Campaign Intelligence Center</h1>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Perencanaan strategi berbasis objective, atribusi performa kanonikal (*Last-Touch*), serta indikator konversi transparan.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsPlanningModalOpen(true)}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center gap-2"
          >
            <span>✨ AI Strategy Planner</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center justify-between bg-white p-2 rounded-xl border border-gray-200 shadow-sm text-xs">
        <div className="flex bg-gray-100 p-1 rounded-lg">
          {(['overview', 'planning', 'attribution', 'insights'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-md font-semibold text-[11px] capitalize transition-all ${
                activeTab === tab
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab === 'overview' ? '📊 Overview & KPIs' : tab === 'planning' ? '🎯 AI Strategy Plan' : tab === 'attribution' ? '🔗 Last-Touch Attribution' : '💡 AI Insights'}
            </button>
          ))}
        </div>
        <span className="text-[11px] text-gray-500 font-mono px-2">Brand: {activeBrandId || 'All Active Brands'}</span>
      </div>

      {/* TAB 1: OVERVIEW & KPIS */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* KPI Target Gauges */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-2">
              <div className="text-xs text-gray-500 font-medium">Campaign Reach</div>
              <div className="text-2xl font-black text-gray-900">14,280</div>
              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                <div className="bg-indigo-600 h-full w-[95%]"></div>
              </div>
              <div className="text-[10px] text-emerald-600 font-bold flex justify-between">
                <span>Target: 15,000</span>
                <span>95.2% Achieved</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-2">
              <div className="text-xs text-gray-500 font-medium">Engagement Rate</div>
              <div className="text-2xl font-black text-gray-900">5.42%</div>
              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full w-[100%]"></div>
              </div>
              <div className="text-[10px] text-emerald-600 font-bold flex justify-between">
                <span>Target: 4.5%</span>
                <span>120.4% Achieved 🚀</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-2">
              <div className="text-xs text-gray-500 font-medium">Total Clicks (CTR 3.1%)</div>
              <div className="text-2xl font-black text-gray-900">620</div>
              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                <div className="bg-blue-600 h-full w-[82%]"></div>
              </div>
              <div className="text-[10px] text-blue-600 font-bold flex justify-between">
                <span>Target: 750 Clicks</span>
                <span>82.6% Achieved</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-2">
              <div className="text-xs text-gray-500 font-medium">Conversions & Rate</div>
              <div className="text-2xl font-black text-amber-600">not_available</div>
              <div className="w-full bg-amber-100 h-2 rounded-full overflow-hidden">
                <div className="bg-amber-400 h-full w-[0%]"></div>
              </div>
              <div className="text-[10px] text-amber-700 font-medium flex justify-between">
                <span>Signal Status: Missing Pixel</span>
                <span>Honest Data ⚠️</span>
              </div>
            </div>
          </div>

          {/* Performance Breakdown Table */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-gray-900 text-sm">Performance Breakdown by Content Format</h3>
            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-gray-500 font-bold uppercase text-[10px]">
                    <th className="p-3">Format / Pillar</th>
                    <th className="p-3">Reach</th>
                    <th className="p-3">Impressions</th>
                    <th className="p-3">Engagement</th>
                    <th className="p-3">Clicks</th>
                    <th className="p-3">CTR</th>
                    <th className="p-3">Conversions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="p-3 font-bold text-gray-900">Carousel Edukasi</td>
                    <td className="p-3 font-mono">6,450</td>
                    <td className="p-3 font-mono">11,200</td>
                    <td className="p-3 font-mono text-emerald-600 font-bold">780 (6.9%)</td>
                    <td className="p-3 font-mono">310</td>
                    <td className="p-3 font-mono">2.76%</td>
                    <td className="p-3 text-amber-600 font-mono italic">not_available</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-gray-900">Reels Short-Form Video</td>
                    <td className="p-3 font-mono">5,200</td>
                    <td className="p-3 font-mono">8,900</td>
                    <td className="p-3 font-mono text-emerald-600 font-bold">610 (6.8%)</td>
                    <td className="p-3 font-mono">210</td>
                    <td className="p-3 font-mono">2.35%</td>
                    <td className="p-3 text-amber-600 font-mono italic">not_available</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-gray-900">LinkedIn Article & Post</td>
                    <td className="p-3 font-mono">2,630</td>
                    <td className="p-3 font-mono">4,100</td>
                    <td className="p-3 font-mono text-emerald-600 font-bold">290 (7.0%)</td>
                    <td className="p-3 font-mono">100</td>
                    <td className="p-3 font-mono">2.43%</td>
                    <td className="p-3 text-amber-600 font-mono italic">not_available</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: AI STRATEGY PLAN RESULT */}
      {activeTab === 'planning' && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-6 text-xs">
          {!planResult ? (
            <div className="text-center py-16 text-gray-400">
              Belum ada hasil perencanaan campaign. Klik tombol <strong>AI Strategy Planner</strong> di atas untuk membuat strategi campaign baru.
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-xl space-y-2">
                <div className="text-[10px] text-indigo-700 font-bold uppercase tracking-wider">Campaign Thesis & Key Message</div>
                <div className="text-gray-900 font-bold text-sm">{planResult.campaignThesis}</div>
                <div className="text-indigo-900 font-medium italic">"{planResult.keyMessage}"</div>
              </div>

              {/* Content Mix */}
              <div>
                <h3 className="font-bold text-gray-900 text-sm mb-2">Target Content Mix</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  {planResult.contentMix.map((c: any, idx: number) => (
                    <div key={idx} className="bg-gray-50 border border-gray-200 p-3 rounded-lg text-center">
                      <div className="font-mono text-[10px] text-gray-500 uppercase">{c.platform}</div>
                      <div className="font-bold text-gray-900 text-sm mt-1">{c.postType}</div>
                      <div className="text-indigo-600 font-bold text-xs mt-0.5">{c.count} Postings</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Draft Content Guard Notice */}
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <div className="font-bold text-amber-900">🛡️ Approval Guard Requirement</div>
                  <div className="text-amber-800 text-[11px] mt-0.5">
                    {planResult.createdDraftContents.length} draft konten telah dibuat dengan status <strong>DRAFT</strong>. Seluruh materi wajib disetujui di <strong>Client Approval Portal</strong> sebelum dijadwalkan.
                  </div>
                </div>
                <span className="px-3 py-1 bg-amber-600 text-white rounded-lg font-bold text-[11px]">3-Tier Approval Active</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: LAST-TOUCH ATTRIBUTION */}
      {activeTab === 'attribution' && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-6 text-xs">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Last-Touch Attribution Model</h3>
              <p className="text-gray-500 text-[11px]">Menghubungkan interaksi terakhir audiens ke conversion goal.</p>
            </div>
            <span className="px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold rounded-lg text-[11px]">
              Model: Last Touch (Canonical)
            </span>
          </div>

          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-amber-900 space-y-1">
            <div className="font-bold">Transparent Conversion Data Signal</div>
            <div className="text-[11px]">
              Sesuai prinsip kebenaran (truthfulness guardrail), data konversi belum dapat diklaim (status: <code className="font-mono bg-amber-100 px-1 py-0.5 rounded">not_available</code>) karena Meta Pixel/CRM Webhook belum terhubung secara langsung.
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: AI INSIGHTS & RECOMMENDATIONS */}
      {activeTab === 'insights' && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4 text-xs">
          <h3 className="font-bold text-gray-900 text-sm">Analytics Agent Recommendations & Guardrails</h3>

          <div className="space-y-3">
            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-900">Rekomendasi 1: Tingkatkan Frekuensi Carousel Edukasi</span>
                <span className="px-2 py-0.5 bg-emerald-600 text-white font-bold rounded text-[10px]">Confidence: 94%</span>
              </div>
              <p className="text-emerald-800 text-[11px]">
                <strong>Fakta:</strong> Carousel Edukasi menghasilkan CTR 2.76% (35% lebih tinggi dibanding format statis tunggal).<br />
                <strong>Interpretasi:</strong> Audiens B2B lebih tertarik pada konten geser multi-slide.<br />
                <strong>Aksi Disarankan:</strong> Alokasikan 50% dari content mix mendatang untuk format Carousel.
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-blue-900">Rekomendasi 2: A/B Testing Hook Pertanyaan di IG Reels</span>
                <span className="px-2 py-0.5 bg-blue-600 text-white font-bold rounded text-[10px]">Confidence: 88%</span>
              </div>
              <p className="text-blue-800 text-[11px]">
                <strong>Fakta:</strong> Video 15 detik memiliki retention rate 48% vs video 45 detik (22%).<br />
                <strong>Aksi Disarankan:</strong> Buat 2 variasi hook awal pada script Reels berikutnya.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: AI Campaign Strategy Planner */}
      {isPlanningModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-gray-200 max-w-lg w-full p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-bold text-gray-900 text-sm">AI Campaign Strategy Planner</h3>
              <button onClick={() => setIsPlanningModalOpen(false)} className="text-gray-400 hover:text-gray-700">
                ✕
              </button>
            </div>

            <form onSubmit={handleGenerateStrategy} className="space-y-3">
              <div>
                <label className="block font-medium text-gray-700 mb-1">Produk / Layanan / Offer Utama</label>
                <input
                  type="text"
                  required
                  value={productOffer}
                  onChange={(e) => setProductOffer(e.target.value)}
                  placeholder="e.g. Paket Automasi Sosmed AI Agensi 3-in-1"
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-gray-900"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">Target Audiens</label>
                <input
                  type="text"
                  required
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-gray-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Objective</label>
                  <select
                    value={objective}
                    onChange={(e: any) => setObjective(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 text-gray-900"
                  >
                    <option value="AWARENESS">AWARENESS</option>
                    <option value="LEADS">LEADS</option>
                    <option value="CONVERSION">CONVERSION</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-gray-700 mb-1">Durasi (Hari)</label>
                  <input
                    type="number"
                    value={periodDays}
                    onChange={(e) => setPeriodDays(Number(e.target.value))}
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 text-gray-900"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPlanningModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold border border-gray-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={generatingPlan || !productOffer.trim()}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-lg shadow"
                >
                  {generatingPlan ? 'Generasi AI...' : '✨ Buat Rencana Campaign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
