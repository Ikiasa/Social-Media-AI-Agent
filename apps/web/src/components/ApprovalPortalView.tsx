import React, { useState } from 'react';
import { useAuth } from '../lib/auth/AuthContext';

interface ApprovalPortalViewProps {
  contentList: any[];
  onRefresh: () => void;
}

export const ApprovalPortalView: React.FC<ApprovalPortalViewProps> = ({ contentList, onRefresh }) => {
  const { activeBrandId } = useAuth();
  const [activeRole, setActiveRole] = useState<'writer' | 'strategist' | 'client'>('client');
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [commentText, setCommentText] = useState('');
  const [revisionNotes, setRevisionNotes] = useState('');
  const [clientNameInput, setClientNameInput] = useState('Brand Client Manager');

  // Filter content based on active brand & role
  const pendingItems = contentList.filter((item) => {
    if (activeBrandId && item.brandId !== activeBrandId) return false;

    if (activeRole === 'writer') {
      return item.status === 'DRAFT' || item.status === 'REVISION_REQUESTED' || item.status === 'IDEA';
    }
    if (activeRole === 'strategist') {
      return item.status === 'PENDING_STRATEGIST_REVIEW';
    }
    if (activeRole === 'client') {
      return item.status === 'PENDING_CLIENT_REVIEW' || item.status === 'APPROVED';
    }
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'PENDING_CLIENT_REVIEW':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'PENDING_STRATEGIST_REVIEW':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'REVISION_REQUESTED':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'REJECTED':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const handleWriterSubmit = async (item: any) => {
    try {
      const res = await fetch(`/api/v1/approvals/${item._id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'Submitted by Content Writer' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Submit failed');
      alert('Content submitted to Strategist Review successfully!');
      onRefresh();
      setSelectedItem(data.data);
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleStrategistAction = async (item: any, action: 'approve' | 'request_revision' | 'reject') => {
    try {
      const res = await fetch(`/api/v1/approvals/${item._id}/strategist-review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notes: revisionNotes || `Strategist action: ${action}` }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Review failed');
      alert(`Strategist action recorded: ${action}`);
      setRevisionNotes('');
      onRefresh();
      setSelectedItem(data.data);
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleClientDecision = async (item: any, action: 'approve' | 'request_revision' | 'reject') => {
    try {
      const res = await fetch(`/api/v1/approvals/${item._id}/client-decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          clientName: clientNameInput,
          notes: revisionNotes || `Client decision: ${action}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Decision failed');
      alert(`Client decision recorded: ${action}`);
      setRevisionNotes('');
      onRefresh();
      setSelectedItem(data.data);
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !commentText.trim()) return;

    try {
      const res = await fetch(`/api/v1/approvals/${selectedItem._id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorName: clientNameInput,
          authorRole: activeRole,
          comment: commentText,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Comment failed');

      setCommentText('');
      setSelectedItem({
        ...selectedItem,
        metadata: {
          ...(selectedItem.metadata || {}),
          comments: data.data,
        },
      });
    } catch (err) {
      alert(`Error adding comment: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* White-Label Banner & Portal Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl shadow-md border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full">
              White-Label Client Portal
            </span>
            <span className="text-xs text-slate-400">Riona Multi-Brand Suite</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight mt-1">Client Workspace & Approval Portal</h1>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Sistem peninjauan 3-tier (Writer → Strategist → Client) dengan fitur kalender, komentar real-time, dan audit trail resmi.
          </p>
        </div>

        {/* Role & Switcher */}
        <div className="bg-slate-800/80 p-2 rounded-xl border border-slate-700/60 flex flex-col sm:flex-row items-center gap-2 text-xs">
          <span className="text-slate-400 font-medium px-2 text-[11px]">View Portal As:</span>
          <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-700">
            {(['client', 'strategist', 'writer'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setActiveRole(r)}
                className={`px-3 py-1.5 rounded-md font-semibold text-[11px] capitalize transition-all ${
                  activeRole === r
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {r === 'client' ? '🏢 Client' : r === 'strategist' ? '🎯 Strategist' : '✍️ Writer'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Grid: Pending Approval Items List & Live Social Media Card Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Items Queue */}
        <div className="lg:col-span-1 bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <h3 className="font-bold text-gray-900 text-sm">
              Items for {activeRole.toUpperCase()} ({pendingItems.length})
            </h3>
            <span className="text-[10px] text-gray-500 font-mono">
              Brand: {activeBrandId || 'All Brands'}
            </span>
          </div>

          <div className="space-y-2.5 max-h-[620px] overflow-y-auto pr-1">
            {pendingItems.length === 0 ? (
              <div className="text-center py-16 text-gray-400 text-xs">
                Tidak ada item yang membutuhkan tindakan untuk peran <strong>{activeRole}</strong> saat ini.
              </div>
            ) : (
              pendingItems.map((item) => (
                <div
                  key={item._id}
                  onClick={() => setSelectedItem(item)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all text-xs space-y-2 ${
                    selectedItem?._id === item._id
                      ? 'bg-indigo-50/70 border-indigo-500 shadow-sm'
                      : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-indigo-600 font-semibold uppercase">
                      {item.platform || 'Instagram'}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(item.status)}`}>
                      {item.status}
                    </span>
                  </div>
                  <div className="font-bold text-gray-900 line-clamp-1">{item.title}</div>
                  <div className="text-gray-500 text-[11px] line-clamp-2">{item.caption || item.hook}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Content Reviewer & Live Mock Preview */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-6">
          {!selectedItem ? (
            <div className="text-center py-24 text-gray-400 text-xs space-y-2">
              <div className="text-3xl">📋</div>
              <p>Pilih postingan dari daftar di sebelah kiri untuk meninjau preview, histori revisi, dan melakukan approval.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Header Title & Status Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 pb-4 gap-2">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedItem.title}</h2>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                    <span>Platform: <strong className="capitalize">{selectedItem.platform}</strong></span>
                    <span>•</span>
                    <span>Content Pillar: <strong>{selectedItem.contentPillar || 'General'}</strong></span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusBadge(selectedItem.status)}`}>
                    {selectedItem.status}
                  </span>
                </div>
              </div>

              {/* 3-Tier Workflow Stepper */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="font-bold text-slate-700">Approval Workflow Stage</div>
                <div className="grid grid-cols-3 gap-2 text-center font-semibold text-[11px]">
                  <div className={`p-2 rounded-lg border ${
                    selectedItem.status === 'DRAFT' || selectedItem.status === 'REVISION_REQUESTED'
                      ? 'bg-amber-100 border-amber-300 text-amber-900'
                      : 'bg-emerald-100 border-emerald-300 text-emerald-900'
                  }`}>
                    1. Writer Draft
                  </div>
                  <div className={`p-2 rounded-lg border ${
                    selectedItem.status === 'PENDING_STRATEGIST_REVIEW'
                      ? 'bg-amber-100 border-amber-300 text-amber-900'
                      : selectedItem.status === 'PENDING_CLIENT_REVIEW' || selectedItem.status === 'APPROVED'
                      ? 'bg-emerald-100 border-emerald-300 text-emerald-900'
                      : 'bg-gray-100 border-gray-200 text-gray-400'
                  }`}>
                    2. Strategist Review
                  </div>
                  <div className={`p-2 rounded-lg border ${
                    selectedItem.status === 'PENDING_CLIENT_REVIEW'
                      ? 'bg-purple-100 border-purple-300 text-purple-900 font-bold shadow-xs'
                      : selectedItem.status === 'APPROVED'
                      ? 'bg-emerald-100 border-emerald-300 text-emerald-900'
                      : 'bg-gray-100 border-gray-200 text-gray-400'
                  }`}>
                    3. Client Approval
                  </div>
                </div>
              </div>

              {/* Visual Preview Box */}
              <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 space-y-3 max-w-md mx-auto shadow-lg">
                <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2 font-bold text-slate-200">
                    <span className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-[10px]">R</span>
                    <span>{selectedItem.brandId || 'Official Brand'}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 capitalize">{selectedItem.platform || 'Instagram'}</span>
                </div>

                {selectedItem.hook && (
                  <div className="text-amber-300 font-bold text-sm bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/50">
                    "{selectedItem.hook}"
                  </div>
                )}

                <div className="text-slate-200 text-xs whitespace-pre-wrap leading-relaxed">
                  {selectedItem.caption || selectedItem.body}
                </div>

                {selectedItem.cta && (
                  <div className="text-indigo-400 font-semibold text-xs border-t border-slate-800 pt-2">
                    👉 {selectedItem.cta}
                  </div>
                )}

                {selectedItem.hashtags && selectedItem.hashtags.length > 0 && (
                  <div className="text-indigo-300 text-[11px] font-mono">
                    {selectedItem.hashtags.join(' ')}
                  </div>
                )}
              </div>

              {/* Action Controls per Role */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3 text-xs">
                <div className="font-bold text-gray-900">Action Controls ({activeRole.toUpperCase()})</div>

                {activeRole === 'writer' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleWriterSubmit(selectedItem)}
                      disabled={selectedItem.status !== 'DRAFT' && selectedItem.status !== 'REVISION_REQUESTED'}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white font-bold rounded-lg shadow-xs transition-all"
                    >
                      🚀 Submit to Strategist
                    </button>
                  </div>
                )}

                {activeRole === 'strategist' && (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={revisionNotes}
                      onChange={(e) => setRevisionNotes(e.target.value)}
                      placeholder="Notes for writer / client..."
                      className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs text-gray-900"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleStrategistAction(selectedItem, 'approve')}
                        disabled={selectedItem.status !== 'PENDING_STRATEGIST_REVIEW'}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold rounded-lg shadow-xs"
                      >
                        ✓ Pass to Client Review
                      </button>
                      <button
                        onClick={() => handleStrategistAction(selectedItem, 'request_revision')}
                        disabled={selectedItem.status !== 'PENDING_STRATEGIST_REVIEW'}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white font-bold rounded-lg shadow-xs"
                      >
                        ✍️ Request Revision
                      </button>
                    </div>
                  </div>
                )}

                {activeRole === 'client' && (
                  <div className="space-y-3">
                    <div className="flex gap-2 items-center">
                      <label className="text-gray-600 text-[11px] font-medium">Reviewer Name:</label>
                      <input
                        type="text"
                        value={clientNameInput}
                        onChange={(e) => setClientNameInput(e.target.value)}
                        className="bg-white border border-gray-300 rounded-lg px-2.5 py-1 text-xs text-gray-900"
                      />
                    </div>
                    <input
                      type="text"
                      value={revisionNotes}
                      onChange={(e) => setRevisionNotes(e.target.value)}
                      placeholder="Client feedback notes..."
                      className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs text-gray-900"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleClientDecision(selectedItem, 'approve')}
                        disabled={selectedItem.status !== 'PENDING_CLIENT_REVIEW'}
                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold rounded-lg shadow"
                      >
                        ✅ APPROVE CONTENT
                      </button>
                      <button
                        onClick={() => handleClientDecision(selectedItem, 'request_revision')}
                        disabled={selectedItem.status !== 'PENDING_CLIENT_REVIEW'}
                        className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white font-bold rounded-lg shadow"
                      >
                        💬 Request Revision
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Comments & Discussion Thread */}
              <div className="border-t border-gray-200 pt-4 space-y-3 text-xs">
                <h4 className="font-bold text-gray-900 text-xs">Discussion & Feedback Thread</h4>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {(!selectedItem.metadata?.comments || selectedItem.metadata.comments.length === 0) ? (
                    <div className="text-gray-400 italic text-[11px]">Belum ada komentar untuk konten ini.</div>
                  ) : (
                    selectedItem.metadata.comments.map((c: any) => (
                      <div key={c.id} className="bg-gray-50 border border-gray-200 p-2.5 rounded-lg space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-gray-900">{c.authorName} ({c.authorRole})</span>
                          <span className="text-[10px] text-gray-400">{new Date(c.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <div className="text-gray-700 text-xs">{c.comment}</div>
                      </div>
                    ))
                  )}
                </div>

                {/* New Comment Input */}
                <form onSubmit={handleAddComment} className="flex gap-2">
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Tulis komentar atau instruksi revisi..."
                    className="flex-1 bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900"
                  />
                  <button
                    type="submit"
                    disabled={!commentText.trim()}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold rounded-lg"
                  >
                    Kirim
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
