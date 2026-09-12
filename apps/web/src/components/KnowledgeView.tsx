import React, { useState } from 'react';
import { useAuth } from '../lib/auth/AuthContext';

interface KnowledgeViewProps {
  documents: any[];
  onRefresh: () => void;
}

export const KnowledgeView: React.FC<KnowledgeViewProps> = ({ documents, onRefresh }) => {
  const { api, activeBrandId } = useAuth();
  const [showIngestModal, setShowIngestModal] = useState(false);

  const [sourceType, setSourceType] = useState('txt');
  const [title, setTitle] = useState('');
  const [sourceUriOrBuffer, setSourceUriOrBuffer] = useState('');
  const [ingesting, setIngesting] = useState(false);

  const handleIngestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !sourceUriOrBuffer || ingesting) return;

    setIngesting(true);
    try {
      await api.ingestKnowledge({
        sourceType,
        title,
        sourceUriOrBuffer,
        brandId: activeBrandId,
      });

      onRefresh();
      setShowIngestModal(false);
      setTitle('');
      setSourceUriOrBuffer('');
      alert('Document ingested & processed into vector store!');
    } catch (err) {
      alert(`Ingestion error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIngesting(false);
    }
  };

  const handleDeleteDoc = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document? This will trigger a delete cascade removing all chunk vectors.')) {
      return;
    }
    try {
      await api.deleteKnowledge(id);
      onRefresh();
      alert('Document and vector chunks deleted.');
    } catch (err) {
      alert(`Delete error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Brand Knowledge Base</h1>
          <p className="text-xs text-gray-500 mt-1">
            Ingest brand guides, PDFs, Web articles, and YouTube transcripts into RAG memory.
          </p>
        </div>

        <button
          onClick={() => setShowIngestModal(true)}
          className="px-4 py-2 text-xs font-medium rounded-lg bg-[#0f172a] hover:bg-[#1e293b] text-white transition-all shadow-xs"
        >
          + Ingest Document
        </button>
      </div>

      {/* Documents Grid - Flexible Responsive Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 w-full">
        {documents.length === 0 ? (
          <div className="col-span-full text-center py-16 text-[#64748b] text-xs bg-white border border-[#e2e8f0] rounded-xl">
            No knowledge documents currently ingested in workspace.
          </div>
        ) : (
          documents.map((doc) => (
            <div
              key={doc._id}
              className="bg-white border border-[#e2e8f0] rounded-xl p-5 shadow-xs hover:shadow-md hover:border-[#cbd5e1] transition-all duration-200 space-y-3 flex flex-col justify-between min-w-0"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase">
                    {doc.sourceType}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      doc.status === 'READY'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : doc.status === 'PROCESSING'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    {doc.status}
                  </span>
                </div>

                <h3 className="font-bold text-gray-900 text-sm line-clamp-1">{doc.title}</h3>
                <p className="text-gray-500 text-xs line-clamp-3 leading-relaxed">
                  {doc.extractedText}
                </p>
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                <span className="text-[11px] font-mono text-gray-400">
                  {new Date(doc.createdAt).toLocaleDateString()}
                </span>
                <button
                  onClick={() => handleDeleteDoc(doc._id)}
                  className="text-rose-600 hover:underline text-[11px] font-medium"
                >
                  Delete Cascade
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Ingest Modal */}
      {showIngestModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-gray-200 rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-bold text-gray-900 text-base">Ingest Knowledge Source</h3>
              <button onClick={() => setShowIngestModal(false)} className="text-gray-400 hover:text-gray-700">
                ✕
              </button>
            </div>

            <form onSubmit={handleIngestSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-gray-700 font-medium mb-1">Source Type</label>
                <select
                  value={sourceType}
                  onChange={(e) => setSourceType(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-gray-900"
                >
                  <option value="txt">Text Content / Article</option>
                  <option value="web">Web URL Scraping</option>
                  <option value="youtube">YouTube URL Transcript</option>
                  <option value="manual">Manual Document Guide</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1">Document Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Brand Voice & Product Overview"
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-gray-900"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1">Source Content / URL</label>
                <textarea
                  rows={5}
                  value={sourceUriOrBuffer}
                  onChange={(e) => setSourceUriOrBuffer(e.target.value)}
                  placeholder={
                    sourceType === 'web' || sourceType === 'youtube'
                      ? 'https://example.com/article or https://youtube.com/watch?v=...'
                      : 'Paste raw document content text here...'
                  }
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-gray-900"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowIngestModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold border border-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={ingesting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow disabled:opacity-50"
                >
                  {ingesting ? 'Processing Vectors...' : 'Ingest Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
