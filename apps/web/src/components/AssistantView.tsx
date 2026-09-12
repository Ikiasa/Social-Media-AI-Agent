import React, { useState } from 'react';
import { useAuth } from '../lib/auth/AuthContext';
import { GuidedPipelineStepper, PipelineStep } from './GuidedPipelineStepper';

interface AssistantViewProps {
  api?: any;
  onRefresh?: () => void;
  onNavigate?: (tab: any) => void;
}

export const AssistantView: React.FC<AssistantViewProps> = ({
  api: propApi,
  onRefresh: propOnRefresh,
  onNavigate,
}) => {
  const auth = useAuth();
  const api = propApi || auth?.api;
  const onRefresh = propOnRefresh || (() => {});
  const [activeSubTab, setActiveSubTab] = useState<'crewai' | 'chat'>('crewai');
  const [pipelineStep, setPipelineStep] = useState<PipelineStep>(1);

  // Target Input Mode & Depth Selector
  const [targetType, setTargetType] = useState<'url' | 'handle' | 'hashtag'>('url');
  const [topicInput, setTopicInput] = useState('MBG');
  const [scrapingDepth, setScrapingDepth] = useState<'quick' | 'standard' | 'deep'>('standard');

  const [loading, setLoading] = useState(false);
  const [jobData, setJobData] = useState<any | null>(null);
  const [selectedResult, setSelectedResult] = useState<any | null>(null);
  const [hitlStatusMap, setHitlStatusMap] = useState<Record<string, string>>({});

  // Console Agent Chat state
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<
    Array<{ id: string; sender: 'user' | 'agent'; text: string; timestamp: Date }>
  >([
    {
      id: 'init',
      sender: 'agent',
      text: 'Halo! Saya Riona Agent Assistant. Ada yang bisa saya bantu dengan strategi konten atau riset audiens Anda hari ini?',
      timestamp: new Date(),
    },
  ]);
  const [chatLoading, setChatLoading] = useState(false);

  const handleRunCrewAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicInput.trim() || loading) return;

    setLoading(true);
    setPipelineStep(1);
    setJobData(null);
    setSelectedResult(null);

    try {
      // Trigger background job with targetType and scrapingDepth
      const response = await api.runAgentAnalysis(topicInput, {
        targetType,
        depth: scrapingDepth,
      });

      // If response already contains completed result, render immediately
      if (response && response.result && (response.status === 'SUCCESS' || response.status === 'completed')) {
        setJobData(response);
        setSelectedResult(response.result);
        setLoading(false);
        setPipelineStep(2);
        onRefresh();
        return;
      }

      const jobId = response?.job_id || response?.id;
      if (!jobId) {
        if (response) {
          setJobData(response);
          setSelectedResult(response.result || response);
        }
        setLoading(false);
        setPipelineStep(2);
        onRefresh();
        return;
      }

      setPipelineStep(2);

      // Poll job status until completed
      let attempts = 0;
      const interval = setInterval(async () => {
        attempts++;
        try {
          const statusRes = await api.getAgentJobStatus(jobId);
          setJobData(statusRes);

          if (statusRes.status === 'completed' || statusRes.status === 'SUCCESS') {
            clearInterval(interval);
            setLoading(false);
            const resultPayload = statusRes.result || statusRes;
            setSelectedResult(resultPayload);
            setPipelineStep(2);
            onRefresh();
          } else if (statusRes.status === 'failed' || attempts > 20) {
            clearInterval(interval);
            setLoading(false);
            const errMsg = typeof statusRes.error === 'object' ? statusRes.error?.message : statusRes.error;
            alert(errMsg ? `Info Analisis Agen: ${errMsg}` : 'CrewAI Agent execution timed out or encountered an error.');
          }
        } catch (err) {
          console.error('Polling error:', err);
          if (attempts > 20) {
            clearInterval(interval);
            setLoading(false);
          }
        }
      }, 1500);
    } catch (err) {
      setLoading(false);
      alert(`Error starting agent execution: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleApproveReply = (replyId: string) => {
    setHitlStatusMap((prev) => ({ ...prev, [replyId]: 'APPROVED' }));
    setPipelineStep(4);
    alert(`Draf Balasan ID #${replyId} disetujui & siap dipublish!`);
  };

  const handleRejectReply = (replyId: string) => {
    setHitlStatusMap((prev) => ({ ...prev, [replyId]: 'REJECTED' }));
    alert(`Draf Balasan ID #${replyId} ditolak.`);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userMsg = {
      id: `u_${Date.now()}`,
      sender: 'user' as const,
      text: chatInput,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setChatInput('');
    setChatLoading(true);

    try {
      const res = await api.executeAgentTask(userMsg.text);
      const agentMsg = {
        id: `a_${Date.now()}`,
        sender: 'agent' as const,
        text: typeof res.result === 'string' ? res.result : res.result?.message || JSON.stringify(res.result),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, agentMsg]);
      if (res.result) setSelectedResult(res.result);
    } catch (err) {
      const errorMsg = {
        id: `err_${Date.now()}`,
        sender: 'agent' as const,
        text: `Error: ${err instanceof Error ? err.message : String(err)}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setChatLoading(false);
    }
  };

  const sentimentDist = selectedResult?.sentiment_distribution || {
    positive_pct: selectedResult?.sentiment?.positive ?? 65,
    neutral_pct: selectedResult?.sentiment?.neutral ?? 25,
    negative_pct: selectedResult?.sentiment?.negative ?? 10,
  };

  return (
    <div className="space-y-6">
      {/* 1. Guided 5-Step Pipeline Stepper */}
      <GuidedPipelineStepper
        currentStep={pipelineStep}
        onStepClick={(step) => setPipelineStep(step)}
      />

      {/* 2. Sub-navigation Tabs */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-3">
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveSubTab('crewai')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeSubTab === 'crewai'
                ? 'bg-[#0f172a] text-white shadow-xs'
                : 'bg-white text-[#64748b] hover:text-[#0f172a] border border-[#e2e8f0]'
            }`}
          >
            🤖 CrewAI Multi-Agent Intelligence
            <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-[#2563eb] text-white font-mono">HITL LIVE</span>
          </button>
          <button
            onClick={() => setActiveSubTab('chat')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeSubTab === 'chat'
                ? 'bg-[#0f172a] text-white shadow-xs'
                : 'bg-white text-[#64748b] hover:text-[#0f172a] border border-[#e2e8f0]'
            }`}
          >
            💬 Agent Console Chat
          </button>
        </div>
      </div>

      {activeSubTab === 'crewai' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
          {/* Left Column: Target Mode & Scraping Depth Controls (4 Cols) */}
          <div className="lg:col-span-4 xl:col-span-3 bg-white border border-gray-200 rounded-xl p-5 space-y-5 shadow-sm self-start">
            <div>
              <h3 className="text-base font-bold text-gray-900 flex items-center space-x-2">
                <span>CrewAI Scraper & Analyst</span>
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                4-Agent Orchestration: Scraper ➔ Radit Analyst ➔ Response Tactician ➔ Database Sync
              </p>
            </div>

            {/* Target Type Mode Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                Mode Target Scraping
              </label>
              <div className="grid grid-cols-3 gap-1.5 bg-gray-100 p-1 rounded-lg border border-gray-200 text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    setTargetType('url');
                    setTopicInput('https://www.instagram.com/p/C_sample123/');
                  }}
                  className={`py-1.5 rounded-md transition-all text-center ${
                    targetType === 'url' ? 'bg-white text-blue-600 shadow font-bold' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  🔗 URL Post
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTargetType('handle');
                    setTopicInput('@brand_kompetitor');
                  }}
                  className={`py-1.5 rounded-md transition-all text-center ${
                    targetType === 'handle' ? 'bg-white text-blue-600 shadow font-bold' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  👤 @Username
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTargetType('hashtag');
                    setTopicInput('MBG');
                  }}
                  className={`py-1.5 rounded-md transition-all text-center ${
                    targetType === 'hashtag' ? 'bg-white text-blue-600 shadow font-bold' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  # Hashtag
                </button>
              </div>
            </div>

            {/* Scraping Depth Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                Kedalaman Scraping (*Depth*)
              </label>
              <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setScrapingDepth('quick')}
                  className={`p-2 rounded-lg border text-center font-bold transition-all ${
                    scrapingDepth === 'quick'
                      ? 'bg-blue-50 text-blue-700 border-blue-500 ring-1 ring-blue-500'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  ⚡ Quick
                  <div className="text-[9px] font-normal text-gray-400">20 Komentar</div>
                </button>
                <button
                  type="button"
                  onClick={() => setScrapingDepth('standard')}
                  className={`p-2 rounded-lg border text-center font-bold transition-all ${
                    scrapingDepth === 'standard'
                      ? 'bg-blue-50 text-blue-700 border-blue-500 ring-1 ring-blue-500'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  📊 Standard
                  <div className="text-[9px] font-normal text-gray-400">100 Komentar</div>
                </button>
                <button
                  type="button"
                  onClick={() => setScrapingDepth('deep')}
                  className={`p-2 rounded-lg border text-center font-bold transition-all ${
                    scrapingDepth === 'deep'
                      ? 'bg-blue-50 text-blue-700 border-blue-500 ring-1 ring-blue-500'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  🔬 Deep
                  <div className="text-[9px] font-normal text-gray-400">300+ Komentar</div>
                </button>
              </div>
            </div>

            <form onSubmit={handleRunCrewAI} className="space-y-4 text-xs">
              <div>
                <label className="block text-gray-700 font-bold mb-1">
                  {targetType === 'url' ? 'Link Post / Reels Instagram' : targetType === 'handle' ? 'Username Kompetitor / Brand' : 'Topik / Hashtag Sosial Media'}
                </label>
                <input
                  type="text"
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  placeholder={
                    targetType === 'url'
                      ? 'https://www.instagram.com/p/...'
                      : targetType === 'handle'
                      ? '@username'
                      : 'e.g. MBG, Pilkada, Skincare, Kopi'
                  }
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !topicInput.trim()}
                className="w-full py-2.5 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-all shadow disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <span className="animate-spin text-sm">↻</span>
                    <span>Menganalisis Multi-Agent...</span>
                  </>
                ) : (
                  <span>🚀 Jalankan Analisis Agen CrewAI</span>
                )}
              </button>
            </form>

            {/* CrewAI Agents Roster */}
            <div className="pt-4 border-t border-gray-100 space-y-2 text-[11px]">
              <div className="font-bold text-gray-400 uppercase tracking-wider text-[10px]">
                CrewAI Agents In Service:
              </div>
              <ul className="space-y-1.5 text-gray-600">
                <li className="flex items-center space-x-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                  <span><strong>1. Scraper Agent:</strong> Intake post & komentar publik</span>
                </li>
                <li className="flex items-center space-x-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
                  <span><strong>2. Radit Analyst:</strong> Sentimen & pain points</span>
                </li>
                <li className="flex items-center space-x-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-600"></span>
                  <span><strong>3. Responder Agent:</strong> Draf balasan persuasif</span>
                </li>
                <li className="flex items-center space-x-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                  <span><strong>4. Archivist Sync:</strong> Format status <code className="text-amber-600 font-bold">pending_review</code></span>
                </li>
              </ul>
            </div>
          </div>

          {/* Right Columns: Results, Sentiment Distribution, Pain Points, and HITL Suggested Replies (8-9 Cols) */}
          <div className="lg:col-span-8 xl:col-span-9 space-y-6">
            {!jobData && !selectedResult ? (
              <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-500 space-y-3 shadow-sm">
                <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto text-2xl font-bold">
                  🚀
                </div>
                <h3 className="font-bold text-gray-900 text-base">Siap Memulai Analisis Intelligence</h3>
                <p className="text-xs text-gray-500 max-w-md mx-auto">
                  Pilih mode target (URL / @Username / Hashtag), tentukan kedalaman scraping, lalu klik tombol <strong>Jalankan Analisis Agen CrewAI</strong> di sebelah kiri.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Status & Sentiment Distribution Board */}
                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                    <div>
                      <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wider font-mono">
                        Hasil Analisis CrewAI (Mode: {selectedResult?.target_type?.toUpperCase() || 'URL'} | Depth: {selectedResult?.depth?.toUpperCase() || 'STANDARD'})
                      </div>
                      <h2 className="text-lg font-bold text-gray-900">{selectedResult?.topic || topicInput}</h2>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 self-start sm:self-auto">
                      Status: {jobData?.status || 'Completed'} ({selectedResult?.total_comments_analyzed || 100} Komentar Diserap)
                    </span>
                  </div>

                  {/* Sentiment Percentage Distribution Bar */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-gray-700">Distribusi Sentimen Audiens (Radit Intelligence):</span>
                      <div className="flex space-x-3 text-[11px]">
                        <span className="text-emerald-600">Positif: {sentimentDist.positive_pct}%</span>
                        <span className="text-blue-600">Netral: {sentimentDist.neutral_pct}%</span>
                        <span className="text-rose-600">Kritis/Objeksi: {sentimentDist.negative_pct}%</span>
                      </div>
                    </div>
                    <div className="w-full h-3 rounded-full bg-gray-100 overflow-hidden flex">
                      <div style={{ width: `${sentimentDist.positive_pct}%` }} className="bg-emerald-500 h-full" title={`Positif ${sentimentDist.positive_pct}%`}></div>
                      <div style={{ width: `${sentimentDist.neutral_pct}%` }} className="bg-blue-500 h-full" title={`Netral ${sentimentDist.neutral_pct}%`}></div>
                      <div style={{ width: `${sentimentDist.negative_pct}%` }} className="bg-rose-500 h-full" title={`Kritis ${sentimentDist.negative_pct}%`}></div>
                    </div>
                  </div>

                  {/* Radit Analyst Pain Points Cluster Cards */}
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                      <span>🎯 Temuan Utama Pain Points Audiens (Radit Analyst):</span>
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {selectedResult?.pain_points?.map((pt: string, idx: number) => (
                        <div key={idx} className="bg-gray-50 border border-gray-200 p-3.5 rounded-lg text-xs space-y-1">
                          <div className="text-[10px] font-mono font-bold text-blue-600">#{String(idx + 1).padStart(2, '0')}</div>
                          <div className="text-gray-800 font-semibold leading-snug">{pt}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* High-Intent Purchase Leads (If Any) */}
                {selectedResult?.high_intent_leads && selectedResult.high_intent_leads.length > 0 && (
                  <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-5 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center space-x-1.5">
                        <span>🔥 High-Intent Purchase Leads Diserap (Siap Dihubungi)</span>
                      </h3>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-amber-200 text-amber-900 rounded-full">
                        {selectedResult.high_intent_leads.length} Calon Prospek
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {selectedResult.high_intent_leads.map((lead: any, idx: number) => (
                        <div key={idx} className="bg-white border border-amber-200 p-3 rounded-lg text-xs space-y-1 shadow-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-gray-900 font-mono">@{lead.user}</span>
                            <span className="text-[10px] bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded">
                              {lead.intent_type}
                            </span>
                          </div>
                          <p className="text-gray-700 italic">"{lead.text}"</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* HITL Review & Approval Options Drawer */}
                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm">
                        Kontrol Human-in-the-Loop (HITL) — Draf Balasan Persuasif
                      </h3>
                      <p className="text-xs text-gray-500">
                        Setiap draf opsi berstatus <code className="text-amber-600 font-bold">pending_review</code> sebelum disetujui untuk dipublish.
                      </p>
                    </div>
                    {onNavigate && (
                      <button
                        onClick={() => {
                          setPipelineStep(3);
                          onNavigate('content');
                        }}
                        className="px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-all shadow"
                      >
                        + Buat Konten Solusi di Content Tab →
                      </button>
                    )}
                  </div>

                  <div className="space-y-4">
                    {selectedResult?.suggested_replies?.map((rep: any, idx: number) => {
                      const replyId = rep.comment_id || `rep_${idx}`;
                      const status = hitlStatusMap[replyId] || rep.status || 'pending_review';

                      return (
                        <div key={replyId} className="bg-gray-50 border border-gray-200 p-4 rounded-xl space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-700">
                              Komentar Asli #{idx + 1} ({rep.category?.toUpperCase()})
                            </span>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                status === 'APPROVED'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : status === 'REJECTED'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                            >
                              {status}
                            </span>
                          </div>

                          <div className="bg-white p-3 rounded-lg border border-gray-200 text-xs italic text-gray-800">
                            "{rep.original_comment}"
                          </div>

                          {/* Draft Options */}
                          <div className="space-y-2">
                            <div className="text-[10px] font-bold text-gray-500 uppercase">Opsi Balasan Draf Agen:</div>
                            {rep.draft_options?.map((opt: string, optIdx: number) => (
                              <div
                                key={optIdx}
                                className="p-3 bg-white border border-gray-200 rounded-lg flex items-center justify-between text-xs gap-3"
                              >
                                <span className="text-gray-800 leading-relaxed">
                                  <strong>Opsi {optIdx + 1}:</strong> {opt}
                                </span>
                                <div className="flex space-x-1.5 shrink-0">
                                  <button
                                    onClick={() => handleApproveReply(replyId)}
                                    disabled={status === 'APPROVED'}
                                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded font-bold text-[11px] shadow transition-all"
                                  >
                                    Setujui & Publish
                                  </button>
                                  <button
                                    onClick={() => handleRejectReply(replyId)}
                                    disabled={status === 'REJECTED'}
                                    className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded font-semibold text-[11px] border border-gray-300"
                                  >
                                    Tolak
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Agent Console Chat Tab */
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4 max-w-4xl mx-auto">
          <div className="border-b border-gray-100 pb-3">
            <h3 className="font-bold text-gray-900 text-base">Agent Console Interactive Chat</h3>
            <p className="text-xs text-gray-500">
              Interaksi percakapan langsung dengan Riona Agent untuk membuat prompt, menyusun strategi, atau melakukan kueri instan.
            </p>
          </div>

          <div className="h-[400px] overflow-y-auto space-y-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-xl text-xs leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-blue-600 text-white shadow'
                      : 'bg-white border border-gray-200 text-gray-900 shadow-xs'
                  }`}
                >
                  <div className="font-bold text-[10px] opacity-75 mb-1 font-mono">
                    {m.sender === 'user' ? 'You' : 'Riona Agent'}
                  </div>
                  <div className="whitespace-pre-wrap">{m.text}</div>
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ketik pesan atau instruksi untuk Agen..."
              className="flex-1 bg-gray-50 border border-gray-300 rounded-lg px-4 py-2.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={chatLoading || !chatInput.trim()}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs shadow transition-all disabled:opacity-50"
            >
              {chatLoading ? 'Sending...' : 'Kirim'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
