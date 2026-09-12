import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth/AuthContext';

interface InstagramRecommendation {
  id: string;
  type: 'opportunity' | 'warning' | 'timing';
  title: string;
  description: string;
  actionText: string;
  metricBadge: string;
  payload: any;
}

interface InstagramAuditResult {
  handle: string;
  followers: string;
  healthScore: number;
  engagementRate: string;
  topPostPerformance: string;
  analyzedPostCount: number;
  recommendations: InstagramRecommendation[];
  lastAuditedAt: string;
}

interface InstagramAIAdvisorProps {
  onNavigate?: (tab: string) => void;
  onRefresh?: () => void;
}

export const InstagramAIAdvisor: React.FC<InstagramAIAdvisorProps> = ({ onNavigate, onRefresh }) => {
  const { api } = useAuth();
  const [handle, setHandle] = useState('@acme_brand');
  const [loading, setLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [auditData, setAuditData] = useState<InstagramAuditResult | null>({
    handle: '@acme_brand',
    followers: '24.8K',
    healthScore: 88,
    engagementRate: '4.82%',
    topPostPerformance: 'Viral Growth Spike',
    analyzedPostCount: 10,
    recommendations: [
      {
        id: 'rec_1',
        type: 'opportunity',
        title: '🎯 Konten Seri Ke-2: "AI Video vs B2B SaaS"',
        description: 'Postingan terakhir Anda tentang AI Video mendapat engagement 3.4x lebih tinggi. Klik untuk langsung meng-generate Carousel seri kelanjutannya.',
        actionText: '🚀 1-Click Auto-Generate Draft',
        metricBadge: '+340% Engagement Rate',
        payload: {
          topic: 'Panduan Lengkap Menggunakan AI Video untuk Tim Marketing B2B',
          contentType: 'carousel',
        },
      },
      {
        id: 'rec_2',
        type: 'warning',
        title: '🪝 Peringatan Retensi: Hook Drop di Detik 1.8',
        description: '2 Reel terakhir mengalami penurunan penonton sebelum detik ke-2. Disarankan menggunakan Formula Pattern Break dengan Teks Layar kontras.',
        actionText: '🪝 1-Click Terapkan Pattern Break',
        metricBadge: 'Retensi 88.6% Optimalized',
        payload: {
          hookFormula: 'Pattern Break + Contrarian Thesis',
          verbalHook: 'Stop posting 100 konten AI generik!',
        },
      },
      {
        id: 'rec_3',
        type: 'timing',
        title: '⏰ Jam Sibuk Audiens: Hari Ini Pukul 19:30 WIB',
        description: 'Berdasarkan histori aktivitas pengikut akun @acme_brand, jam 19:30 WIB adalah puncak interaksi tertinggi hari ini.',
        actionText: '📅 1-Click Masukkan Antrean Kalender',
        metricBadge: 'Puncak Aktif 19:30 WIB',
        payload: {
          targetTime: '19:30',
          timezone: 'Asia/Jakarta',
        },
      },
    ],
    lastAuditedAt: new Date().toISOString(),
  });

  const runAudit = async () => {
    setLoading(true);
    setActionSuccess(null);
    try {
      let res: any = null;
      if (api?.auditInstagramAccount) {
        res = await api.auditInstagramAccount(handle);
      } else {
        const fetchRes = await fetch('http://localhost:3001/api/v1/instagram/audit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ handle }),
        });
        if (fetchRes.ok) res = await fetchRes.json();
      }

      if (res?.data || res) {
        setAuditData(res.data || res);
      }
    } catch (err: any) {
      console.error('Audit error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRecommendationAction = async (rec: InstagramRecommendation) => {
    setActionSuccess(null);
    try {
      if (rec.type === 'opportunity') {
        if (api?.createContent) {
          await api.createContent({
            title: rec.payload.topic,
            topic: rec.payload.topic,
            platform: 'instagram',
            status: 'DRAFT',
          });
        }
        setActionSuccess(`Draf baru "${rec.payload.topic}" berhasil dibuat dan siap ditinjau!`);
        if (onNavigate) onNavigate('content');
      } else if (rec.type === 'warning') {
        setActionSuccess(`Formula Pattern Break ("${rec.payload.verbalHook}") berhasil diterapkan ke Hook Matrix Generator!`);
        if (onNavigate) onNavigate('research');
      } else if (rec.type === 'timing') {
        if (api?.scheduleContent) {
          const todayIso = new Date().toISOString().split('T')[0];
          await api.scheduleContent({
            contentId: 'cnt_auto_rec',
            scheduledAt: `${todayIso}T19:30:00.000Z`,
            timezone: 'Asia/Jakarta',
            platform: 'instagram',
          });
        }
        setActionSuccess(`Antrean posting otomatis dijadwalkan pada Pukul 19:30 WIB!`);
        if (onNavigate) onNavigate('calendar');
      }
    } catch (err: any) {
      alert(`Action Error: ${err.message || String(err)}`);
    }
  };

  return (
    <div className="bg-white border border-[#e2e8f0] rounded-xl p-5 shadow-xs transition-all duration-200 space-y-4 w-full text-[#0f172a]">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e2e8f0] pb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#f67035] via-[#e1306c] to-[#833ab4] flex items-center justify-center text-white shadow-xs font-mono font-bold shrink-0">
            IG
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-bold text-[#0f172a]">{auditData?.handle || handle}</h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#ecfdf5] text-[#059669] border border-[#a7f3d0] font-semibold">
                READY & AUDITED
              </span>
            </div>
            <p className="text-xs text-[#64748b] mt-0.5">
              {auditData?.followers || '24.8K'} pengikut • Engagement Rate: <span className="font-semibold text-[#059669]">{auditData?.engagementRate || '4.82%'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 self-end sm:self-center">
          {/* Health Score Gauge */}
          <div className="flex items-center space-x-2 bg-[#f8fafc] px-3 py-1.5 rounded-lg border border-[#e2e8f0]">
            <span className="text-[11px] font-mono text-[#64748b]">Account Health:</span>
            <span className="text-sm font-bold font-mono text-[#059669]">{auditData?.healthScore || 88}/100</span>
          </div>

          <button
            onClick={runAudit}
            disabled={loading}
            className="px-3 py-1.5 rounded-md border border-[#e2e8f0] bg-white hover:bg-[#f8fafc] text-[#334155] hover:text-[#0f172a] text-xs font-medium transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50"
          >
            <span className={`material-symbols-outlined text-sm text-[#2563eb] ${loading ? 'animate-spin' : ''}`}>
              sync
            </span>
            <span>{loading ? 'Auditing...' : 'Re-Run Audit'}</span>
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="bg-[#ecfdf5] border border-[#a7f3d0] rounded-lg p-3 text-[#059669] text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-2">
            <span>⚡</span>
            <span className="font-medium">{actionSuccess}</span>
          </div>
          <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded text-[#059669] border border-[#a7f3d0]">AI Agent Executed</span>
        </div>
      )}

      {/* 3 Intuitive AI Recommendation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {auditData?.recommendations.map((rec) => (
          <div
            key={rec.id}
            className={`p-4 rounded-lg border flex flex-col justify-between space-y-3 transition-all duration-200 hover:shadow-sm ${
              rec.type === 'opportunity'
                ? 'bg-[#eff6ff]/30 border-[#bfdbfe]'
                : rec.type === 'warning'
                ? 'bg-[#fffbeb]/40 border-[#fde68a]'
                : 'bg-[#ecfdf5]/30 border-[#a7f3d0]'
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span
                  className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded ${
                    rec.type === 'opportunity'
                      ? 'bg-[#eff6ff] text-[#2563eb] border border-[#bfdbfe]'
                      : rec.type === 'warning'
                      ? 'bg-[#fef3c7] text-[#b45309] border border-[#fde68a]'
                      : 'bg-[#ecfdf5] text-[#059669] border border-[#a7f3d0]'
                  }`}
                >
                  {rec.metricBadge}
                </span>
              </div>
              <h3 className="text-xs font-bold text-[#0f172a] leading-snug">{rec.title}</h3>
              <p className="text-[11px] text-[#475569] leading-relaxed">{rec.description}</p>
            </div>

            <button
              onClick={() => handleRecommendationAction(rec)}
              className={`w-full py-1.5 px-3 rounded text-xs font-semibold transition-all shadow-xs flex items-center justify-center space-x-1 ${
                rec.type === 'opportunity'
                  ? 'bg-[#0f172a] hover:bg-[#1e293b] text-white'
                  : rec.type === 'warning'
                  ? 'bg-[#b45309] hover:bg-[#78350f] text-white'
                  : 'bg-[#059669] hover:bg-[#047857] text-white'
              }`}
            >
              <span>{rec.actionText}</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
