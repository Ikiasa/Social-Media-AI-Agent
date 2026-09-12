import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth/AuthContext';

export const CompetitorTrendRadarView: React.FC = () => {
  const { activeBrandId } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'watchlist' | 'signals' | 'alerts'>('overview');

  // State
  const [watchlist, setWatchlist] = useState<any[]>([]);
  const [signals, setSignals] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [selectedConfidence, setSelectedConfidence] = useState<string>('all');

  // Watchlist Modal Form
  const [isAddWatchlistOpen, setIsAddWatchlistOpen] = useState(false);
  const [compName, setCompName] = useState('');
  const [compHandle, setCompHandle] = useState('');
  const [compPlatform, setCompPlatform] = useState<'instagram' | 'tiktok' | 'linkedin' | 'x' | 'threads'>('instagram');

  // Strategy Brief Modal Form
  const [selectedSignalForBrief, setSelectedSignalForBrief] = useState<any | null>(null);
  const [briefProductOffer, setBriefProductOffer] = useState('');
  const [briefTargetAudience, setBriefTargetAudience] = useState('Pemilik Bisnis & Strategy Specialist');
  const [generatingBrief, setGeneratingBrief] = useState(false);

  const fetchRadarData = async () => {
    setLoading(true);
    try {
      const brandQuery = activeBrandId ? `?brandId=${activeBrandId}` : '';
      const [wlRes, sigRes, altRes] = await Promise.all([
        fetch(`/api/v1/competitor-radar/watchlist${brandQuery}`),
        fetch(`/api/v1/competitor-radar/signals${brandQuery}`),
        fetch(`/api/v1/competitor-radar/alerts${brandQuery}`),
      ]);

      if (wlRes.ok) {
        const wlData = await wlRes.json();
        setWatchlist(wlData.data || []);
      }
      if (sigRes.ok) {
        const sigData = await sigRes.json();
        setSignals(sigData.data || []);
      }
      if (altRes.ok) {
        const altData = await altRes.json();
        setAlerts(altData.data || []);
      }
    } catch (err) {
      console.error('Failed to load competitor radar data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRadarData();
  }, [activeBrandId]);

  const handleAddWatchlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!compName || !compHandle) return;

    try {
      const res = await fetch('/api/v1/competitor-radar/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandId: activeBrandId || 'brand_default',
          name: compName,
          platform: compPlatform,
          externalHandle: compHandle,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to add watchlist');

      setWatchlist((prev) => [data.data, ...prev]);
      setIsAddWatchlistOpen(false);
      setCompName('');
      setCompHandle('');
      alert('Kompetitor berhasil ditambahkan ke watchlist monitoring!');
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleDeleteWatchlist = async (id: string) => {
    if (!confirm('Hapus kompetitor ini dari watchlist?')) return;
    try {
      const res = await fetch(`/api/v1/competitor-radar/watchlist/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      setWatchlist((prev) => prev.filter((item) => item._id !== id));
    } catch (err) {
      alert('Gagal menghapus item watchlist');
    }
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      const res = await fetch(`/api/v1/competitor-radar/alerts/${alertId}/acknowledge`, { method: 'POST' });
      if (res.ok) {
        setAlerts((prev) =>
          prev.map((a) => (a._id === alertId ? { ...a, status: 'ACKNOWLEDGED' } : a))
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleGenerateBrief = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSignalForBrief || generatingBrief) return;

    setGeneratingBrief(true);
    try {
      const res = await fetch('/api/v1/competitor-radar/strategy-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandId: activeBrandId || 'brand_default',
          trendSignalId: selectedSignalForBrief._id,
          signalLabel: selectedSignalForBrief.label,
          productOffer: briefProductOffer || 'Solusi Berbasis Tren',
          targetAudience: briefTargetAudience,
          objective: 'AWARENESS',
          brandConstraints: {
            restrictedTopics: ['crypto', 'gambling', 'unverified_medical'],
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Brief generation failed');

      setSelectedSignalForBrief(null);
      alert(
        'Strategy Brief dan Draft Konten berhasil dibuat! Seluruh rekomendasi disimpan dengan status DRAFT dan memerlukan persetujuan 3-tier sebelum penerbitan.'
      );
      fetchRadarData();
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setGeneratingBrief(false);
    }
  };

  const filteredSignals = signals.filter((s) => {
    if (selectedPlatform !== 'all' && s.platform !== selectedPlatform) return false;
    if (selectedConfidence !== 'all' && s.confidence !== selectedConfidence) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 text-white p-6 rounded-2xl shadow-md border border-purple-900/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full">
              Phase 3 Active
            </span>
            <span className="text-xs text-slate-400">Competitor Watchlist & Trend Signal Radar</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight mt-1">Competitor & Trend Radar</h1>
          <p className="text-slate-300 text-sm mt-1 max-w-2xl">
            Pantau aktivitas kompetitor, analisis sinyal tren keterlibatan, dan bangun strategi konten yang relevan berbasis bukti tanpa melanggar kebijakan platform atau brand guardrails.
          </p>
        </div>

        <button
          onClick={() => setIsAddWatchlistOpen(true)}
          className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-purple-600/25 transition-all flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Tambah Watchlist
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center border-b border-slate-200 dark:border-slate-800 space-x-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 border-b-2 transition-all ${
            activeTab === 'overview'
              ? 'border-purple-600 text-purple-600 dark:text-purple-400'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Radar Overview
        </button>
        <button
          onClick={() => setActiveTab('watchlist')}
          className={`pb-3 border-b-2 transition-all ${
            activeTab === 'watchlist'
              ? 'border-purple-600 text-purple-600 dark:text-purple-400'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Competitor Watchlist ({watchlist.length})
        </button>
        <button
          onClick={() => setActiveTab('signals')}
          className={`pb-3 border-b-2 transition-all ${
            activeTab === 'signals'
              ? 'border-purple-600 text-purple-600 dark:text-purple-400'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Trend Signals ({signals.length})
        </button>
        <button
          onClick={() => setActiveTab('alerts')}
          className={`pb-3 border-b-2 transition-all ${
            activeTab === 'alerts'
              ? 'border-purple-600 text-purple-600 dark:text-purple-400'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Alert Feed ({alerts.filter((a) => a.status === 'ACTIVE').length})
        </button>
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">Kompetitor Dipantau</span>
              <p className="text-3xl font-black text-slate-900 dark:text-white mt-1">{watchlist.length}</p>
              <span className="text-xs text-slate-500 mt-2 block">Aktif pada 5 platform resmi</span>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">Sinyal Tren Terdeteksi</span>
              <p className="text-3xl font-black text-purple-600 dark:text-purple-400 mt-1">{signals.length}</p>
              <span className="text-xs text-slate-500 mt-2 block">Minimal sample size ≥ 5 post</span>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">Alert Aktif Tim</span>
              <p className="text-3xl font-black text-amber-500 mt-1">{alerts.filter((a) => a.status === 'ACTIVE').length}</p>
              <span className="text-xs text-slate-500 mt-2 block">Memerlukan review strategist</span>
            </div>
          </div>

          {/* Quick Active Alerts Overview */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <span>🚨 Alert Tren Utama Hari Ini</span>
            </h2>
            {alerts.length === 0 ? (
              <div className="text-center py-10 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                  Belum ada alert tren aktif. Data provider sedang menyinkronkan snapshot kompetitor.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {alerts.map((alertItem) => (
                  <div
                    key={alertItem._id}
                    className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                          {alertItem.confidence} confidence
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {new Date(alertItem.createdAt).toLocaleDateString('id-ID')}
                        </span>
                      </div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-base">{alertItem.title}</h3>
                      <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">{alertItem.summary}</p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {alertItem.status === 'ACTIVE' && (
                        <button
                          onClick={() => handleAcknowledgeAlert(alertItem._id)}
                          className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold px-3 py-2 rounded-lg transition-all"
                        >
                          Acknowledge
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* WATCHLIST TAB */}
      {activeTab === 'watchlist' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Daftar Akun Kompetitor</h2>
            <button
              onClick={() => setIsAddWatchlistOpen(true)}
              className="bg-purple-600 text-white text-xs font-bold px-3 py-2 rounded-lg"
            >
              + Tambah Akun
            </button>
          </div>

          {watchlist.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <p className="text-slate-500 text-sm">Belum ada akun kompetitor dalam watchlist brand ini.</p>
              <button
                onClick={() => setIsAddWatchlistOpen(true)}
                className="mt-3 text-purple-600 font-bold text-xs hover:underline"
              >
                + Tambah Kompetitor Pertama
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {watchlist.map((item) => (
                <div
                  key={item._id}
                  className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                >
                  <div>
                    <span className="text-[10px] font-extrabold uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded">
                      {item.platform}
                    </span>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base mt-1">{item.name}</h3>
                    <p className="text-xs text-purple-600 dark:text-purple-400 font-mono">@{item.externalHandle}</p>
                    <span className="text-[11px] text-slate-400 mt-2 block">
                      Source: {item.sourceType} • Status: {item.status}
                    </span>
                  </div>

                  <button
                    onClick={() => handleDeleteWatchlist(item._id)}
                    className="text-red-500 hover:text-red-700 text-xs font-bold p-2"
                  >
                    Hapus
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SIGNALS TAB */}
      {activeTab === 'signals' && (
        <div className="space-y-4">
          {/* Signal Filters */}
          <div className="flex flex-wrap items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium">
            <div>
              <label className="text-slate-400 mr-2">Platform:</label>
              <select
                value={selectedPlatform}
                onChange={(e) => setSelectedPlatform(e.target.value)}
                className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700"
              >
                <option value="all">Semua Platform</option>
                <option value="instagram">Instagram</option>
                <option value="tiktok">TikTok</option>
                <option value="linkedin">LinkedIn</option>
                <option value="x">X / Twitter</option>
              </select>
            </div>

            <div>
              <label className="text-slate-400 mr-2">Confidence:</label>
              <select
                value={selectedConfidence}
                onChange={(e) => setSelectedConfidence(e.target.value)}
                className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700"
              >
                <option value="all">Semua Confidence</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          {filteredSignals.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <p className="text-slate-500 text-sm">Tidak ada sinyal tren terdeteksi yang sesuai dengan filter.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSignals.map((sig) => (
                <div
                  key={sig._id}
                  className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="bg-purple-600 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">
                        +{sig.growthPercent}% Growth
                      </span>
                      <span className="text-xs uppercase tracking-wider font-bold text-slate-400">{sig.platform}</span>
                      <span className="text-xs text-slate-400">• Sample Size: {sig.sampleSize} posts</span>
                    </div>

                    <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded font-mono">
                      Coverage: {sig.dataQuality?.coverage || 'complete'}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 dark:text-white text-base">{sig.label}</h3>

                  <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1 list-disc list-inside">
                    {(sig.evidence || []).map((ev: string, idx: number) => (
                      <li key={idx}>{ev}</li>
                    ))}
                  </ul>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-[11px] text-slate-400 font-mono">
                      Baseline: {sig.baselineValue} ➔ Current: {sig.currentValue}
                    </span>

                    <button
                      onClick={() => setSelectedSignalForBrief(sig)}
                      className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
                    >
                      Create Strategy Brief
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ALERTS TAB */}
      {activeTab === 'alerts' && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Alert Feed Internal</h2>
          {alerts.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <p className="text-slate-500 text-sm">Tidak ada alert aktif.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {alerts.map((a) => (
                <div
                  key={a._id}
                  className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-500 uppercase">{a.status}</span>
                    <span className="text-xs text-slate-400">{new Date(a.createdAt).toLocaleString('id-ID')}</span>
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">{a.title}</h3>
                  <p className="text-sm text-slate-700 dark:text-slate-300">{a.summary}</p>

                  <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg text-xs space-y-1">
                    <p className="font-semibold text-slate-700 dark:text-slate-300">💡 Rekomendasi Aksi:</p>
                    <p className="text-slate-600 dark:text-slate-400">{a.recommendedAction}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal: Tambah Competitor Watchlist */}
      {isAddWatchlistOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Tambah Competitor ke Watchlist</h3>
            <form onSubmit={handleAddWatchlist} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Nama Kompetitor</label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Competitor Brand A"
                  value={compName}
                  onChange={(e) => setCompName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Platform</label>
                <select
                  value={compPlatform}
                  onChange={(e) => setCompPlatform(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white"
                >
                  <option value="instagram">Instagram</option>
                  <option value="tiktok">TikTok</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="x">X / Twitter</option>
                  <option value="threads">Threads</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Handle / Username</label>
                <input
                  type="text"
                  required
                  placeholder="Misal: competitor_official"
                  value={compHandle}
                  onChange={(e) => setCompHandle(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddWatchlistOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg text-xs font-bold shadow"
                >
                  Simpan Watchlist
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Strategy Brief */}
      {selectedSignalForBrief && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Buat Strategy Brief AI berbasis Tren</h3>
            <div className="bg-purple-50 dark:bg-purple-950/40 p-3 rounded-lg text-xs text-purple-700 dark:text-purple-300">
              <p className="font-bold">Sinyal Tren Terpilih:</p>
              <p>{selectedSignalForBrief.label}</p>
            </div>

            <form onSubmit={handleGenerateBrief} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Produk / Penawaran Utama
                </label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Fitur AI Marketing Automation"
                  value={briefProductOffer}
                  onChange={(e) => setBriefProductOffer(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Target Audiens</label>
                <input
                  type="text"
                  required
                  value={briefTargetAudience}
                  onChange={(e) => setBriefTargetAudience(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-lg text-xs text-amber-700 dark:text-amber-300 space-y-1">
                <p className="font-bold">⚠️ Panduan Guardrail Approval Workflow:</p>
                <p>
                  Semua ide & draft konten yang dibuat akan berstatus DRAFT dan WAJIB disetujui melalui 3-tier approval portal sebelum dipublikasikan.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedSignalForBrief(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={generatingBrief}
                  className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg text-xs font-bold shadow flex items-center gap-2"
                >
                  {generatingBrief ? 'Membuat Brief AI...' : 'Generate Brief & Draft Content'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompetitorTrendRadarView;
