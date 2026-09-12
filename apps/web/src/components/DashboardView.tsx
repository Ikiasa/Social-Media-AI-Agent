import React, { useState } from 'react';
import { NavTab } from './Sidebar';
import { useAuth } from '../lib/auth/AuthContext';
import { InstagramAIAdvisor } from './InstagramAIAdvisor';

interface DashboardViewProps {
  stats: any;
  onNavigate: (tab: NavTab) => void;
  onRefresh: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ stats, onNavigate, onRefresh }) => {
  const { workspaceId } = useAuth();
  const [dispatching, setDispatching] = useState(false);
  const [dispatchedSuccess, setDispatchedSuccess] = useState(false);
  const [ragSyncing, setRagSyncing] = useState(false);
  const [logsCleared, setLogsCleared] = useState(false);
  const [filterMode, setFilterMode] = useState<'all' | 'gemini' | 'crewai'>('all');

  const [approvedItems, setApprovedItems] = useState<Record<string, boolean>>({});

  const handleTriggerAgent = () => {
    setDispatching(true);
    setTimeout(() => {
      setDispatching(false);
      setDispatchedSuccess(true);
      setTimeout(() => setDispatchedSuccess(false), 2000);
    }, 1000);
  };

  const handleSyncRAG = () => {
    setRagSyncing(true);
    setTimeout(() => {
      setRagSyncing(false);
    }, 1200);
  };

  const handleApprove = (id: string) => {
    setApprovedItems((prev) => ({ ...prev, [id]: true }));
  };

  return (
    <div className="flex flex-col gap-6 text-[#1e293b] font-sans antialiased">
      {/* Title & Trigger Action Bar */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#e2e8f0]">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-xs font-mono text-[#64748b]">
            <span>Workspace</span>
            <span className="text-[#94a3b8]">/</span>
            <span className="text-[#0f172a] font-medium">{workspaceId || 'Acme Global HQ'}</span>
          </div>
          <h1 className="text-xl font-semibold text-[#0f172a] tracking-tight">Social Agent Control Deck</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSyncRAG}
            className="px-3 py-1.5 rounded-md border border-[#e2e8f0] bg-white hover:bg-[#f8fafc] text-[#334155] hover:text-[#0f172a] text-xs font-medium transition-colors flex items-center gap-1.5 shadow-xs"
            title="Sync Vector Embeddings"
          >
            <span className={`material-symbols-outlined text-sm text-[#64748b] ${ragSyncing ? 'animate-spin' : ''}`}>
              sync
            </span>
            <span>{ragSyncing ? 'Syncing...' : 'Sync RAG'}</span>
          </button>

          <button
            onClick={() => onNavigate('content')}
            className="px-3 py-1.5 rounded-md border border-[#e2e8f0] bg-white hover:bg-[#f8fafc] text-[#334155] hover:text-[#0f172a] text-xs font-medium transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <span className="material-symbols-outlined text-sm text-[#64748b]">add</span>
            <span>New Post</span>
          </button>

          <button
            onClick={handleTriggerAgent}
            disabled={dispatching}
            className="px-3.5 py-1.5 rounded-md bg-[#0f172a] hover:bg-[#1e293b] border border-[#0f172a] text-white text-xs font-medium transition-all shadow-sm flex items-center gap-1.5 active:scale-[0.98] disabled:opacity-70"
          >
            {dispatching ? (
              <>
                <span className="material-symbols-outlined text-sm animate-spin text-indigo-400">sync</span>
                <span>Dispatching...</span>
              </>
            ) : dispatchedSuccess ? (
              <>
                <span className="material-symbols-outlined text-sm text-emerald-400">check</span>
                <span>Dispatched</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-sm text-[#94a3b8]">play_arrow</span>
                <span>Trigger Agent Run</span>
              </>
            )}
          </button>
        </div>
      </section>

      {/* Autonomous Instagram AI Advisor & Instant Audit Banner */}
      <InstagramAIAdvisor onNavigate={onNavigate} onRefresh={onRefresh} />

      {/* 4 Clean Light Telemetry KPI Cards - Flexible Fluid Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 w-full">
        {/* Tile 1 */}
        <div className="p-4 rounded-xl bg-white border border-[#e2e8f0] shadow-xs hover:shadow-md hover:border-[#cbd5e1] transition-all duration-200 flex flex-col justify-between gap-3 min-w-0">
          <div className="flex items-center justify-between text-xs text-[#64748b] font-mono">
            <span className="truncate">Autonomous Throughput</span>
            <span className="material-symbols-outlined text-sm text-[#94a3b8] shrink-0">auto_mode</span>
          </div>
          <div>
            <div className="text-2xl font-semibold font-mono text-[#0f172a] tracking-tight">1,428</div>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <span className="text-[11px] font-mono text-[#059669] font-medium bg-[#ecfdf5] px-1.5 py-0.5 rounded border border-[#a7f3d0]">
                +18.4%
              </span>
              <span className="text-xs text-[#64748b]">posts routed (7d)</span>
            </div>
          </div>
          <div className="w-full pt-1">
            <svg className="w-full h-5 text-[#94a3b8] overflow-visible" viewBox="0 0 160 20">
              <path d="M0,16 Q20,15 40,11 T80,13 T120,6 T140,8 L160,2" fill="none" stroke="currentColor" strokeWidth="1.5"></path>
            </svg>
          </div>
        </div>

        {/* Tile 2 */}
        <div className="p-4 rounded-xl bg-white border border-[#e2e8f0] shadow-xs hover:shadow-md hover:border-[#cbd5e1] transition-all duration-200 flex flex-col justify-between gap-3 min-w-0">
          <div className="flex items-center justify-between text-xs text-[#64748b] font-mono">
            <span className="truncate">Predicted 3s Retention</span>
            <span className="material-symbols-outlined text-sm text-[#94a3b8] shrink-0">speed</span>
          </div>
          <div>
            <div className="flex items-baseline gap-1 font-mono">
              <span className="text-2xl font-semibold text-[#0f172a] tracking-tight">88.6</span>
              <span className="text-xs text-[#64748b]">/ 100</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#f1f5f9] text-[#475569] border border-[#e2e8f0] font-medium">
                Optimal
              </span>
              <span className="text-xs text-[#64748b]">Top 4% benchmark</span>
            </div>
          </div>
          <div className="w-full h-1.5 bg-[#f1f5f9] rounded-full overflow-hidden mt-2">
            <div className="h-full bg-[#0284c7] rounded-full w-[88.6%]"></div>
          </div>
        </div>

        {/* Tile 3 */}
        <div className="p-4 rounded-xl bg-white border border-[#e2e8f0] shadow-xs hover:shadow-md hover:border-[#cbd5e1] transition-all duration-200 flex flex-col justify-between gap-3 min-w-0">
          <div className="flex items-center justify-between text-xs text-[#64748b] font-mono">
            <span className="truncate">HITL Review Gate</span>
            <span className="material-symbols-outlined text-sm text-[#d97706] shrink-0">fact_check</span>
          </div>
          <div>
            <div className="flex items-baseline gap-2 font-mono flex-wrap">
              <span className="text-2xl font-semibold text-[#0f172a] tracking-tight">6 Drafts</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#fef3c7] text-[#b45309] border border-[#fde68a] font-medium">
                Pending
              </span>
            </div>
            <p className="text-xs text-[#64748b] mt-1 truncate">Awaiting human sign-off</p>
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono text-[#64748b] pt-1">
            <span>Oldest: 42m ago</span>
            <button onClick={() => onNavigate('content')} className="text-[#2563eb] hover:underline font-medium transition-colors">
              Queue →
            </button>
          </div>
        </div>

        {/* Tile 4 */}
        <div className="p-4 rounded-xl bg-white border border-[#e2e8f0] shadow-xs hover:shadow-md hover:border-[#cbd5e1] transition-all duration-200 flex flex-col justify-between gap-3 min-w-0">
          <div className="flex items-center justify-between text-xs text-[#64748b] font-mono">
            <span className="truncate">Protocol Synchrony</span>
            <span className="material-symbols-outlined text-sm text-[#94a3b8] shrink-0">lan</span>
          </div>
          <div>
            <div className="flex items-baseline gap-2 font-mono flex-wrap">
              <span className="text-2xl font-semibold text-[#0f172a] tracking-tight">4 / 5</span>
              <span className="text-xs text-[#059669] font-medium bg-[#ecfdf5] px-1.5 py-0.5 rounded border border-[#a7f3d0]">
                99.9% Uptime
              </span>
            </div>
            <p className="text-xs text-[#64748b] mt-1 truncate">Adapter endpoints verified</p>
          </div>
          <div className="flex items-center gap-1.5 pt-1 text-[10px] font-mono text-[#475569] flex-wrap">
            <span className="px-1.5 py-0.5 rounded bg-[#f1f5f9] border border-[#e2e8f0]">IG</span>
            <span className="px-1.5 py-0.5 rounded bg-[#f1f5f9] border border-[#e2e8f0]">LI</span>
            <span className="px-1.5 py-0.5 rounded bg-[#f1f5f9] border border-[#e2e8f0]">X</span>
            <span className="px-1.5 py-0.5 rounded bg-[#f1f5f9] border border-[#e2e8f0]">Threads</span>
          </div>
        </div>
      </section>

      {/* Main Operational Split - Adaptive Grid Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full">
        {/* Left Column (8 cols): Execution Feed & Pipeline */}
        <div className="lg:col-span-12 xl:col-span-8 flex flex-col gap-6 w-full min-w-0">
          {/* Terminal / Execution Stream */}
          <div className="rounded-xl bg-white border border-[#e2e8f0] shadow-xs hover:border-[#cbd5e1] transition-all duration-200 overflow-hidden w-full">
            <div className="px-4 py-3 border-b border-[#e2e8f0] flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#64748b] text-base">terminal</span>
                <span className="text-xs font-semibold text-[#0f172a]">Execution Telemetry</span>
                <span className="text-[#94a3b8] font-mono text-xs">/</span>
                <span className="text-[11px] font-mono text-[#64748b]">Node-04-Prod</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-[#f1f5f9] border border-[#e2e8f0] rounded p-0.5 text-[11px] font-mono">
                  <button
                    onClick={() => setFilterMode('all')}
                    className={`px-2 py-0.5 rounded ${filterMode === 'all' ? 'bg-white text-[#0f172a] shadow-xs font-medium' : 'text-[#64748b] hover:text-[#0f172a]'}`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setFilterMode('gemini')}
                    className={`px-2 py-0.5 rounded ${filterMode === 'gemini' ? 'bg-white text-[#0f172a] shadow-xs font-medium' : 'text-[#64748b] hover:text-[#0f172a]'}`}
                  >
                    Gemini
                  </button>
                  <button
                    onClick={() => setFilterMode('crewai')}
                    className={`px-2 py-0.5 rounded ${filterMode === 'crewai' ? 'bg-white text-[#0f172a] shadow-xs font-medium' : 'text-[#64748b] hover:text-[#0f172a]'}`}
                  >
                    CrewAI
                  </button>
                </div>
                <span className="text-[10px] font-mono text-[#64748b] px-1.5 py-0.5 rounded bg-[#f1f5f9] border border-[#e2e8f0]">218ms</span>
              </div>
            </div>

            {/* Terminal Entries */}
            <div className="p-3.5 flex flex-col gap-2 font-mono text-xs bg-[#f8fafc] border-b border-[#e2e8f0]">
              {!logsCleared ? (
                <>
                  <div className="flex items-start gap-2.5 text-[#334155]">
                    <span className="text-[#94a3b8] text-[11px] shrink-0 select-none">14:38:12</span>
                    <span className="text-[#475569] text-[10px] px-1 py-0.2 rounded bg-white border border-[#e2e8f0] shrink-0 font-medium">Researcher</span>
                    <p className="text-[#334155] leading-snug">
                      Viral signal extracted: <span className="text-[#0f172a] font-medium">"Why AI-generated video is saturating B2B SaaS"</span>
                      <span className="text-[#64748b] text-[10px] ml-1">[conf: 94.2%]</span>
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5 text-[#334155]">
                    <span className="text-[#94a3b8] text-[11px] shrink-0 select-none">14:38:14</span>
                    <span className="text-[#475569] text-[10px] px-1 py-0.2 rounded bg-white border border-[#e2e8f0] shrink-0 font-medium">HookWriter</span>
                    <p className="text-[#334155] leading-snug">
                      Candidate synthesized: <span className="text-[#0f172a] font-medium">"Stop rendering 4K avatars—your buyers only care about the first 1.8s."</span>
                      <span className="text-[#64748b] text-[10px] ml-1">[p-score: 92.1%]</span>
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5 text-[#334155]">
                    <span className="text-[#94a3b8] text-[11px] shrink-0 select-none">14:38:16</span>
                    <span className="text-[#475569] text-[10px] px-1 py-0.2 rounded bg-white border border-[#e2e8f0] shrink-0 font-medium">Validator</span>
                    <p className="text-[#64748b] leading-snug">
                      Constraints valid: X payload (242/280 chars). Aspect ratio 4:5 (1080x1350) for Instagram.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5 text-[#334155]">
                    <span className="text-[#94a3b8] text-[11px] shrink-0 select-none">14:38:20</span>
                    <span className="text-[#475569] text-[10px] px-1 py-0.2 rounded bg-white border border-[#e2e8f0] shrink-0 font-medium">Publisher</span>
                    <p className="text-[#334155] leading-snug">
                      LinkedIn API <code className="text-[#2563eb] bg-[#eff6ff] px-1 py-0.5 rounded">v202608/ugcPosts</code>:
                      <span className="text-[#059669] font-medium bg-[#ecfdf5] px-1 rounded border border-[#a7f3d0] ml-1">HTTP 200</span>
                      <span className="text-[#64748b] text-[11px] ml-1">(urn:li:share:9881029471)</span>
                    </p>
                  </div>
                </>
              ) : (
                <div className="text-center py-4 text-[#94a3b8] text-xs font-mono">
                  [Telemetry Output Cleared]
                </div>
              )}
            </div>
            <div className="px-4 py-2 bg-white flex items-center justify-between text-[11px] font-mono text-[#64748b]">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]"></span>
                <span>Workers autoscaling healthy</span>
              </div>
              <button
                onClick={() => {
                  setLogsCleared(true);
                  setTimeout(() => setLogsCleared(false), 3000);
                }}
                className="hover:text-[#0f172a] transition-colors font-medium"
              >
                {logsCleared ? 'Cleared' : 'Clear Output'}
              </button>
            </div>
          </div>

          {/* Dispatch Pipeline */}
          <div className="rounded-lg bg-white border border-[#e2e8f0] shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-[#e2e8f0] flex items-center justify-between bg-white">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#64748b] text-base">calendar_today</span>
                <h2 className="text-xs font-semibold text-[#0f172a]">Upcoming Autonomous Pipeline</h2>
              </div>
              <button onClick={() => onNavigate('calendar')} className="text-xs font-mono text-[#2563eb] hover:underline transition-colors font-medium">
                Full Schedule →
              </button>
            </div>
            <div className="divide-y divide-[#e2e8f0]">
              {/* Item 1 */}
              <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#f8fafc] transition-colors">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded border border-[#e2e8f0] bg-[#f1f5f9] flex items-center justify-center shrink-0 text-[#334155] font-mono text-xs font-medium">
                    LI
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-[#0f172a]">LinkedIn • Carousel</span>
                      <span className="text-[11px] font-mono text-[#64748b]">Today, 16:30 EST</span>
                    </div>
                    <p className="text-xs text-[#475569] line-clamp-1">"Most growth teams spend 80% of their compute on generation and 0% on hook velocity."</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#f1f5f9] text-[#475569] border border-[#e2e8f0]">Auto-Scheduled</span>
                  <button className="w-7 h-7 rounded border border-[#e2e8f0] bg-white hover:border-[#cbd5e1] hover:bg-[#f8fafc] flex items-center justify-center text-[#64748b] hover:text-[#0f172a] transition-colors shadow-xs">
                    <span className="material-symbols-outlined text-sm">more_horiz</span>
                  </button>
                </div>
              </div>

              {/* Item 2 (HITL Pending) */}
              <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#fffbeb] hover:bg-[#fef3c7]/60 transition-colors border-l-2 border-l-[#d97706]">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded border border-[#fde68a] bg-[#fef3c7] flex items-center justify-center shrink-0 text-[#b45309] font-mono text-xs font-bold">
                    IG
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-[#0f172a]">Instagram Reels • Video</span>
                      <span className="text-[11px] font-mono text-[#b45309] font-medium">Target: Today, 19:15 EST</span>
                    </div>
                    <p className="text-xs text-[#78350f] line-clamp-1">"The 3 silent cues that trigger 70%+ Reel completion rates before second 4."</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  {approvedItems['item-2'] ? (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#ecfdf5] text-[#059669] border border-[#a7f3d0] font-medium">
                      Approved ✓
                    </span>
                  ) : (
                    <>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#fef3c7] text-[#b45309] border border-[#fde68a] font-medium">Needs Sign-off</span>
                      <button
                        onClick={() => handleApprove('item-2')}
                        className="px-2.5 py-1 rounded bg-[#0f172a] hover:bg-[#1e293b] border border-[#0f172a] text-white text-xs font-medium transition-colors shadow-xs active:scale-95"
                      >
                        Approve
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Item 3 */}
              <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#f8fafc] transition-colors">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded border border-[#e2e8f0] bg-[#f1f5f9] flex items-center justify-center shrink-0 text-[#334155] font-mono text-xs font-medium">
                    X
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-[#0f172a]">X Thread • 7 Posts</span>
                      <span className="text-[11px] font-mono text-[#64748b]">Tomorrow, 09:00 EST</span>
                    </div>
                    <p className="text-xs text-[#475569] line-clamp-1">"We processed 12,000 algorithmic feed changes from 2024 to 2026. Here is the matrix 🧵"</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#f1f5f9] text-[#64748b] border border-[#e2e8f0]">Approved</span>
                  <button className="w-7 h-7 rounded border border-[#e2e8f0] bg-white hover:border-[#cbd5e1] hover:bg-[#f8fafc] flex items-center justify-center text-[#64748b] hover:text-[#0f172a] transition-colors shadow-xs">
                    <span className="material-symbols-outlined text-sm">more_horiz</span>
                  </button>
                </div>
              </div>

              {/* Item 4 */}
              <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#f8fafc] transition-colors">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded border border-[#e2e8f0] bg-[#f1f5f9] flex items-center justify-center shrink-0 text-[#334155] font-mono text-xs font-medium">
                    TH
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-[#0f172a]">Threads • Text Micro-take</span>
                      <span className="text-[11px] font-mono text-[#64748b]">Tomorrow, 11:45 EST</span>
                    </div>
                    <p className="text-xs text-[#475569] line-clamp-1">"Micro-take: The next 6 months will belong to teams running autonomous HITL loops."</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#f1f5f9] text-[#475569] border border-[#e2e8f0]">Auto-Scheduled</span>
                  <button className="w-7 h-7 rounded border border-[#e2e8f0] bg-white hover:border-[#cbd5e1] hover:bg-[#f8fafc] flex items-center justify-center text-[#64748b] hover:text-[#0f172a] transition-colors shadow-xs">
                    <span className="material-symbols-outlined text-sm">more_horiz</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (4 cols on XL): Minimalist Hook Scorer, RAG, & Proxy */}
        <div className="lg:col-span-12 xl:col-span-4 flex flex-col gap-6 w-full min-w-0">
          {/* Hook Matrix Scorer */}
          <div className="rounded-xl bg-white border border-[#e2e8f0] shadow-xs hover:border-[#cbd5e1] transition-all duration-200 p-4 flex flex-col gap-4 w-full">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[#64748b] text-base">psychology</span>
                <h3 className="text-xs font-semibold text-[#0f172a]">Hook Matrix Scorer</h3>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#f1f5f9] text-[#475569] border border-[#e2e8f0] font-medium">Active Vector</span>
            </div>

            {/* Radial Metric Card */}
            <div className="p-4 rounded-md bg-[#f8fafc] border border-[#e2e8f0] flex flex-col items-center justify-center text-center gap-2">
              <div className="relative w-24 h-24 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle className="text-[#e2e8f0]" cx="50" cy="50" fill="transparent" r="42" stroke="currentColor" strokeWidth="4"></circle>
                  <circle className="text-[#0284c7]" cx="50" cy="50" fill="transparent" r="42" stroke="currentColor" strokeDasharray="264" strokeDashoffset="31.6" strokeLinecap="round" strokeWidth="4"></circle>
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-2xl font-mono font-semibold text-[#0f172a] tracking-tight">88%</span>
                  <span className="text-[9px] font-mono uppercase text-[#64748b] tracking-wider">Score</span>
                </div>
              </div>
              <div className="mt-1">
                <span className="text-[10px] font-mono text-[#64748b] uppercase tracking-wider block font-medium">Synthesized Pattern</span>
                <p className="text-xs font-semibold text-[#0f172a] mt-0.5">Pattern Break + Contrarian Thesis</p>
              </div>
            </div>

            {/* Breakdown */}
            <div className="flex flex-col gap-1.5 text-xs font-mono">
              <div className="flex items-center justify-between p-2 rounded bg-[#f8fafc] border border-[#e2e8f0]">
                <span className="text-[#475569] text-[11px]">0.0s – 1.0s Pattern Break</span>
                <span className="text-[#0f172a] font-semibold">96%</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-[#f8fafc] border border-[#e2e8f0]">
                <span className="text-[#475569] text-[11px]">1.0s – 2.5s Counter-Narrative</span>
                <span className="text-[#0f172a] font-semibold">89%</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-[#f8fafc] border border-[#e2e8f0]">
                <span className="text-[#475569] text-[11px]">2.5s – 3.0s Open Loop</span>
                <span className="text-[#0f172a] font-semibold">82%</span>
              </div>
            </div>

            <button
              onClick={() => onNavigate('research')}
              className="w-full py-2 rounded-md border border-[#e2e8f0] bg-white hover:bg-[#f8fafc] text-[#334155] hover:text-[#0f172a] text-xs font-medium transition-colors flex items-center justify-center gap-1.5 shadow-xs"
            >
              <span className="material-symbols-outlined text-sm text-[#64748b]">science</span>
              <span>Test Custom Hook String</span>
            </button>
          </div>

          {/* Brand Knowledge RAG Widget */}
          <div className="rounded-lg bg-white border border-[#e2e8f0] shadow-sm p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[#64748b] text-base">database</span>
                <h3 className="text-xs font-semibold text-[#0f172a]">Brand Knowledge Base</h3>
              </div>
              <span className="text-[10px] font-mono text-[#64748b] font-medium bg-[#f1f5f9] px-1.5 py-0.5 rounded border border-[#e2e8f0]">
                1,840 Vectors
              </span>
            </div>
            <div className="p-2.5 rounded-md bg-[#f8fafc] border border-[#e2e8f0] flex flex-col gap-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#64748b] font-mono text-[11px]">Database:</span>
                <span className="text-[#0f172a] font-mono text-[11px] font-medium">Mongoose Vector / HNSW</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#64748b] font-mono text-[11px]">Tone Matrix:</span>
                <span className="text-[#0f172a] font-mono text-[11px] font-medium">98.2% Executive</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#64748b] font-mono text-[11px]">Last Sync:</span>
                <span className="text-[#64748b] font-mono text-[11px]">18m ago</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span onClick={() => onNavigate('knowledge')} className="px-2 py-1 rounded bg-[#f8fafc] border border-[#e2e8f0] text-[#475569] text-[10px] font-mono flex items-center gap-1 hover:bg-white transition-colors cursor-pointer">
                <span className="material-symbols-outlined text-xs text-[#64748b]">description</span> Q3 Brand Book.pdf
              </span>
              <span onClick={() => onNavigate('knowledge')} className="px-2 py-1 rounded bg-[#f8fafc] border border-[#e2e8f0] text-[#475569] text-[10px] font-mono flex items-center gap-1 hover:bg-white transition-colors cursor-pointer">
                <span className="material-symbols-outlined text-xs text-[#64748b]">code</span> ToneOfVoice_v2.md
              </span>
              <span onClick={() => onNavigate('knowledge')} className="px-2 py-1 rounded bg-[#f8fafc] border border-[#e2e8f0] text-[#475569] text-[10px] font-mono flex items-center gap-1 hover:bg-white transition-colors cursor-pointer">
                <span className="material-symbols-outlined text-xs text-[#64748b]">data_object</span> Hooks_v1.json
              </span>
            </div>
          </div>

          {/* Ramme View Session Widget */}
          <div className="rounded-lg bg-white border border-[#e2e8f0] shadow-sm p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[#64748b] text-base">phone_iphone</span>
                <h3 className="text-xs font-semibold text-[#0f172a]">Ramme View Session</h3>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#f1f5f9] text-[#64748b] border border-[#e2e8f0]">3001</span>
            </div>
            <div className="flex items-center gap-3 p-2.5 rounded-md bg-[#f8fafc] border border-[#e2e8f0]">
              <div className="w-8 h-8 rounded border border-[#e2e8f0] bg-white flex items-center justify-center shrink-0 text-[#64748b] shadow-xs">
                <span className="material-symbols-outlined text-base">devices</span>
              </div>
              <div className="flex flex-col truncate">
                <span className="text-xs font-medium text-[#0f172a]">@riona.ai.official</span>
                <span className="text-[10px] font-mono text-[#64748b] truncate">Cookies synced via local daemon</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono text-[#64748b] pt-0.5">
              <span>Target: Instagram Mobile</span>
              <span className="text-[#059669] font-medium bg-[#ecfdf5] px-1.5 py-0.2 rounded border border-[#a7f3d0]">Ready</span>
            </div>
            <button
              onClick={() => {
                if ((window as any).rionaDesktop) {
                  (window as any).rionaDesktop.switchTab('instagram');
                } else {
                  window.open('https://www.instagram.com', 'RammeInstagram', 'width=390,height=750');
                }
              }}
              className="w-full py-2 rounded-md border border-[#e2e8f0] bg-white hover:bg-[#f8fafc] text-[#334155] hover:text-[#0f172a] text-xs font-medium transition-colors flex items-center justify-center gap-1.5 shadow-xs"
            >
              <span className="material-symbols-outlined text-sm text-[#e1306c]">open_in_new</span>
              <span>Launch Ramme Emulator</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
