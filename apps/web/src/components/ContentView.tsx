import React, { useState } from 'react';
import { useAuth } from '../lib/auth/AuthContext';

interface ContentViewProps {
  contentList: any[];
  onRefresh: () => void;
}

export const ContentView: React.FC<ContentViewProps> = ({ contentList, onRefresh }) => {
  const { api, activeBrandId } = useAuth();
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [generating, setGenerating] = useState(false);
  const [topicInput, setTopicInput] = useState('');

  const filtered = contentList.filter((item) => {
    if (filterStatus && item.status !== filterStatus) return false;
    if (activeBrandId && item.brandId !== activeBrandId) return false;
    return true;
  });

  const handleApprove = async (id: string) => {
    try {
      await api.approveContent(id);
      onRefresh();
      if (selectedItem?._id === id) setSelectedItem({ ...selectedItem, status: 'APPROVED' });
    } catch (err) {
      alert(`Approval error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleReject = async (id: string) => {
    try {
      await api.rejectContent(id);
      onRefresh();
      if (selectedItem?._id === id) setSelectedItem({ ...selectedItem, status: 'REJECTED' });
    } catch (err) {
      alert(`Rejection error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleGenerateAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicInput.trim() || generating) return;

    setGenerating(true);
    try {
      const draft = await api.generateContent({
        topic: topicInput,
        brandId: activeBrandId,
        platform: 'instagram',
        contentType: 'educational',
      });
      setTopicInput('');
      onRefresh();
      setSelectedItem(draft);
      alert(`Draft created: "${draft.title}"`);
    } catch (err) {
      alert(`AI Generation error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    try {
      const updated = await api.updateContent(editingItem._id, editingItem);
      onRefresh();
      setSelectedItem(updated);
      setEditingItem(null);
      alert('Content updated successfully!');
    } catch (err) {
      alert(`Update error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick AI Generation Form */}
      <div className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Content Management & Workflow</h1>
          <p className="text-xs text-gray-500 mt-1">
            Review, edit, approve, reject, and schedule generated content drafts.
          </p>
        </div>

        <form onSubmit={handleGenerateAI} className="flex gap-2 w-full md:w-auto">
          <input
            type="text"
            value={topicInput}
            onChange={(e) => setTopicInput(e.target.value)}
            placeholder="AI topic (e.g. 5 Productivity Hacks)..."
            className="bg-gray-50 border border-gray-300 rounded-lg px-3.5 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={generating || !topicInput.trim()}
            className="px-4 py-2 text-xs font-medium rounded-lg bg-[#0f172a] hover:bg-[#1e293b] text-white transition-all shadow-xs disabled:opacity-50"
          >
            {generating ? 'Generating...' : '+ Generate Draft'}
          </button>
        </form>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center space-x-2 text-xs">
          <span className="text-gray-500 font-medium">Filter Status:</span>
          {['', 'DRAFT', 'REVIEW', 'APPROVED', 'REJECTED', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-2.5 py-1 rounded-md font-semibold text-[11px] transition-all ${
                filterStatus === st
                  ? 'bg-[#0f172a] text-white shadow-xs'
                  : 'bg-[#f1f5f9] text-[#64748b] hover:text-[#0f172a] hover:bg-[#e2e8f0]'
              }`}
            >
              {st || 'ALL'}
            </button>
          ))}
        </div>
        <div className="text-xs text-gray-500">Total: {filtered.length} Items</div>
      </div>

      {/* Grid: Left Col Content List | Right Col Detail & Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Content List */}
        <div className="lg:col-span-1 bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-3 max-h-[600px] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-xs">
              No content items found for selected status filter.
            </div>
          ) : (
            filtered.map((item) => (
              <div
                key={item._id}
                onClick={() => setSelectedItem(item)}
                className={`p-3.5 rounded-lg border cursor-pointer transition-all text-xs space-y-1.5 ${
                  selectedItem?._id === item._id
                    ? 'bg-blue-50/70 border-blue-500 shadow-sm'
                    : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-bold text-gray-900 line-clamp-1">{item.title}</div>
                <div className="text-gray-500 text-[11px] line-clamp-2">{item.caption || item.hook}</div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] font-mono text-gray-400">{item.platform || 'instagram'}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      item.status === 'APPROVED'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : item.status === 'REJECTED'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : item.status === 'SCHEDULED'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Content Detail & Editor Panel */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-6">
          {!selectedItem ? (
            <div className="text-center py-24 text-gray-400 text-xs">
              Select a content item from the list to view detail, edit parameters, approve, or schedule.
            </div>
          ) : editingItem ? (
            /* Edit Form */
            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="font-bold text-gray-900 text-sm">Edit Content Draft</h3>
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="text-gray-400 hover:text-gray-700"
                >
                  ✕ Cancel
                </button>
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1">Title</label>
                <input
                  type="text"
                  value={editingItem.title || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1">Hook</label>
                <input
                  type="text"
                  value={editingItem.hook || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, hook: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1">Caption</label>
                <textarea
                  rows={4}
                  value={editingItem.caption || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, caption: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1">CTA</label>
                <input
                  type="text"
                  value={editingItem.cta || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, cta: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-gray-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold border border-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow"
                >
                  Save Changes
                </button>
              </div>
            </form>
          ) : (
            /* Item Detail View */
            <div className="space-y-6 text-xs">
              <div className="flex items-start justify-between border-b border-gray-100 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{selectedItem.title}</h2>
                  <div className="text-gray-500 font-mono text-[11px] mt-0.5">
                    Platform: {selectedItem.platform || 'instagram'} | Type: {selectedItem.contentType || 'educational'}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      selectedItem.status === 'APPROVED'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : selectedItem.status === 'REJECTED'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {selectedItem.status}
                  </span>
                  <button
                    onClick={() => setEditingItem(selectedItem)}
                    className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold border border-gray-300"
                  >
                    Edit Draft
                  </button>
                </div>
              </div>

              {selectedItem.hook && (
                <div className="bg-gray-50 p-3.5 rounded-lg border border-gray-200">
                  <div className="text-[10px] text-gray-400 font-bold uppercase">Opening Hook</div>
                  <div className="text-gray-800 mt-1 italic">"{selectedItem.hook}"</div>
                </div>
              )}

              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-2">
                <div className="text-[10px] text-gray-400 font-bold uppercase">Full Caption</div>
                <div className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                  {selectedItem.caption || selectedItem.body}
                </div>
              </div>

              {selectedItem.cta && (
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <div className="text-[10px] text-gray-400 font-bold uppercase">Call to Action</div>
                  <div className="text-blue-700 font-semibold mt-0.5">{selectedItem.cta}</div>
                </div>
              )}

              {selectedItem.hashtags && selectedItem.hashtags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedItem.hashtags.map((h: string, idx: number) => (
                    <span key={idx} className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-[11px] font-semibold">
                      {h}
                    </span>
                  ))}
                </div>
              )}

              {/* Workflow Actions */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(selectedItem._id)}
                    disabled={selectedItem.status === 'APPROVED'}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-semibold rounded-lg transition-all shadow"
                  >
                    ✓ Approve Draft
                  </button>
                  <button
                    onClick={() => handleReject(selectedItem._id)}
                    disabled={selectedItem.status === 'REJECTED'}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white font-semibold rounded-lg transition-all shadow"
                  >
                    ✕ Reject Draft
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
