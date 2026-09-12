import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth/AuthContext';

export const UnifiedInboxView: React.FC = () => {
  const { activeBrandId } = useAuth();
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [threadData, setThreadData] = useState<{ conversation: any; messages: any[]; drafts: any[] } | null>(null);
  const [loading, setLoading] = useState(false);

  // Filters
  const [filterPlatform, setFilterPlatform] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Draft Editor State
  const [draftContent, setDraftContent] = useState<string>('');
  const [isActionLoading, setIsActionLoading] = useState(false);

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const brandQuery = activeBrandId ? `?brandId=${activeBrandId}` : '';
      const res = await fetch(`/api/v1/inbox/conversations${brandQuery}`);
      if (res.ok) {
        const data = await res.json();
        setConversations(data.data || []);
        if (data.data?.length > 0 && !selectedConvId) {
          setSelectedConvId(data.data[0]._id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchThreadDetails = async (convId: string) => {
    try {
      const res = await fetch(`/api/v1/inbox/conversations/${convId}`);
      if (res.ok) {
        const data = await res.json();
        setThreadData(data.data);
        if (data.data.drafts && data.data.drafts.length > 0) {
          setDraftContent(data.data.drafts[0].content || '');
        } else {
          setDraftContent('');
        }
      }
    } catch (err) {
      console.error('Failed to fetch thread details:', err);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [activeBrandId]);

  useEffect(() => {
    if (selectedConvId) {
      fetchThreadDetails(selectedConvId);
    }
  }, [selectedConvId]);

  const handleGenerateDraft = async () => {
    if (!selectedConvId || !threadData?.messages?.length || isActionLoading) return;
    const lastInbound = [...threadData.messages].reverse().find((m) => m.direction === 'INBOUND');
    if (!lastInbound) return;

    setIsActionLoading(true);
    try {
      const res = await fetch(`/api/v1/inbox/conversations/${selectedConvId}/drafts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceMessageId: lastInbound._id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Draft generation failed');

      alert('Draft balasan AI berhasil dibuat berbasis Knowledge Base!');
      fetchThreadDetails(selectedConvId);
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleApproveDraft = async (draftId: string) => {
    setIsActionLoading(true);
    try {
      const res = await fetch(`/api/v1/inbox/drafts/${draftId}/approve`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Approval failed');

      alert('Draft berhasil di-approve dengan tanda tangan digital HMAC!');
      fetchThreadDetails(selectedConvId!);
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleSendDraft = async (draftId: string) => {
    setIsActionLoading(true);
    try {
      const res = await fetch(`/api/v1/inbox/drafts/${draftId}/send`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Send failed');

      alert('Balasan balasan sukses terkirim ke platform!');
      fetchThreadDetails(selectedConvId!);
      fetchConversations();
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsActionLoading(false);
    }
  };

  const filteredConversations = conversations.filter((c) => {
    if (filterPlatform !== 'all' && c.platform !== filterPlatform) return false;
    if (filterPriority !== 'all' && c.priority !== filterPriority) return false;
    if (filterStatus !== 'all' && c.status !== filterStatus) return false;
    return true;
  });

  const latestDraft = threadData?.drafts?.[0];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white p-6 rounded-2xl shadow-md border border-emerald-900/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full">
              Phase 4 Active
            </span>
            <span className="text-xs text-slate-400">Unified Social Inbox & Community Agent</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight mt-1">Unified Social Inbox</h1>
          <p className="text-slate-300 text-sm mt-1 max-w-2xl">
            Kelola percakapan pelanggan lintas platform, analisis klasifikasi AI, review draft balasan berbasis Knowledge Base, dan kirim respons setelah persetujuan manusia.
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium">
        <div>
          <label className="text-slate-400 mr-2">Platform:</label>
          <select
            value={filterPlatform}
            onChange={(e) => setFilterPlatform(e.target.value)}
            className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700"
          >
            <option value="all">Semua Platform</option>
            <option value="instagram">Instagram</option>
            <option value="facebook">Facebook</option>
            <option value="linkedin">LinkedIn</option>
            <option value="x">X / Twitter</option>
            <option value="tiktok">TikTok</option>
          </select>
        </div>

        <div>
          <label className="text-slate-400 mr-2">Prioritas:</label>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700"
          >
            <option value="all">Semua Prioritas</option>
            <option value="URGENT">URGENT</option>
            <option value="HIGH">HIGH</option>
            <option value="NORMAL">NORMAL</option>
            <option value="LOW">LOW</option>
          </select>
        </div>

        <div>
          <label className="text-slate-400 mr-2">Status:</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700"
          >
            <option value="all">Semua Status</option>
            <option value="OPEN">Open</option>
            <option value="WAITING_CUSTOMER">Waiting Customer</option>
            <option value="RESOLVED">Resolved</option>
          </select>
        </div>
      </div>

      {/* Main Inbox Two-Column Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Thread List */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h2 className="font-bold text-slate-900 dark:text-white text-sm">Percakapan ({filteredConversations.length})</h2>
            <button onClick={fetchConversations} className="text-slate-400 hover:text-slate-600 text-xs">
              Refresh
            </button>
          </div>

          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              Belum ada percakapan masuk yang sesuai filter.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[600px] overflow-y-auto">
              {filteredConversations.map((conv) => {
                const isSelected = conv._id === selectedConvId;
                const isUrgent = conv.priority === 'URGENT';
                const isHigh = conv.priority === 'HIGH';

                return (
                  <button
                    key={conv._id}
                    onClick={() => setSelectedConvId(conv._id)}
                    className={`w-full p-4 text-left transition-all flex flex-col gap-1.5 ${
                      isSelected
                        ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-l-4 border-emerald-600'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-mono font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300">
                          {conv.platform}
                        </span>
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[120px]">
                          {conv.participantReference}
                        </span>
                      </div>

                      {isUrgent && (
                        <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                          URGENT
                        </span>
                      )}
                      {isHigh && (
                        <span className="bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                          HIGH
                        </span>
                      )}
                    </div>

                    <span className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                      Channel: {conv.channelType} • Status: {conv.status}
                    </span>

                    <span className="text-[10px] text-slate-400">
                      {new Date(conv.lastMessageAt).toLocaleString('id-ID')}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Thread Detail & Action Panel */}
        <div className="lg:col-span-8 space-y-6">
          {!threadData ? (
            <div className="bg-white dark:bg-slate-900 p-12 rounded-xl border border-slate-200 dark:border-slate-800 text-center text-slate-500 text-sm">
              Pilih percakapan di sebelah kiri untuk melihat pesan dan draft balasan AI.
            </div>
          ) : (
            <div className="space-y-6">
              {/* Thread Header */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase font-mono">
                      {threadData.conversation?.platform} • {threadData.conversation?.channelType}
                    </span>
                    <span className="text-xs text-slate-400">
                      ID: {threadData.conversation?.externalConversationId}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                    {threadData.conversation?.participantReference}
                  </h2>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-lg">
                    Status: {threadData.conversation?.status}
                  </span>
                </div>
              </div>

              {/* Message History */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[350px] overflow-y-auto">
                <h3 className="text-xs uppercase font-bold text-slate-400 tracking-wider">Riwayat Pesan</h3>
                <div className="space-y-3">
                  {threadData.messages.map((msg) => {
                    const isInbound = msg.direction === 'INBOUND';
                    return (
                      <div
                        key={msg._id}
                        className={`flex flex-col ${isInbound ? 'items-start' : 'items-end'}`}
                      >
                        <div
                          className={`max-w-md p-3.5 rounded-2xl text-xs leading-relaxed ${
                            isInbound
                              ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-tl-none'
                              : 'bg-emerald-600 text-white rounded-tr-none'
                          }`}
                        >
                          <p>{msg.body}</p>
                          <span
                            className={`text-[9px] block mt-1.5 font-mono ${
                              isInbound ? 'text-slate-400' : 'text-emerald-200'
                            }`}
                          >
                            {new Date(msg.receivedAt).toLocaleTimeString('id-ID')}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Community Agent Classification & Draft Panel */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                    <span>🤖 Community Agent Review Panel</span>
                  </h3>
                  <button
                    onClick={handleGenerateDraft}
                    disabled={isActionLoading}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
                  >
                    Generate AI Draft
                  </button>
                </div>

                {/* Draft Content & Action Area */}
                {!latestDraft ? (
                  <div className="text-center py-6 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 text-xs">
                    Belum ada draft balasan. Klik tombol <strong>Generate AI Draft</strong> untuk membuat respons berbasis Knowledge Base.
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-700 dark:text-slate-300">Draft Status:</span>
                        <span className="bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded text-[10px] uppercase">
                          {latestDraft.status} (v{latestDraft.version})
                        </span>
                      </div>
                      <span className="text-slate-400 text-[11px]">Source: {latestDraft.createdBy}</span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Isi Balasan (Edit Material akan menaikkan versi & meminta re-approval)
                      </label>
                      <textarea
                        rows={4}
                        value={draftContent}
                        onChange={(e) => setDraftContent(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-white"
                      />
                    </div>

                    <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 p-3 rounded-lg text-xs text-amber-700 dark:text-amber-300 space-y-1">
                      <p className="font-bold">⚠️ Human Approval Guardrail:</p>
                      <p>
                        Setiap pengiriman pesan adalah EXTERNAL_ACTION dan WAJIB di-approve oleh pengguna sebelum dikirim via Worker.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                      {latestDraft.status !== 'APPROVED' && latestDraft.status !== 'SENT' && (
                        <button
                          onClick={() => handleApproveDraft(latestDraft._id)}
                          disabled={isActionLoading}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-lg shadow"
                        >
                          Approve Draft (Sign HMAC)
                        </button>
                      )}

                      {latestDraft.status === 'APPROVED' && (
                        <button
                          onClick={() => handleSendDraft(latestDraft._id)}
                          disabled={isActionLoading}
                          className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold px-4 py-2 rounded-lg shadow"
                        >
                          Kirim Balasan (Send Worker)
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UnifiedInboxView;
