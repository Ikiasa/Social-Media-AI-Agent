import React, { useState } from 'react';

export const CreativeLibraryView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'all' | 'image' | 'video' | 'template'>('all');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<any | null>(null);

  // Mock Asset Data
  const assets = [
    {
      id: 'asset-1',
      name: 'Summer Campaign Hero Video',
      assetType: 'video',
      status: 'READY',
      currentVersion: 2,
      tags: ['hero', 'summer2026', 'promo'],
      usageRights: 'owned',
      mimeType: 'video/mp4',
      size: '42.5 MB',
      createdAt: '2026-09-10',
      derivativesCount: 5,
    },
    {
      id: 'asset-2',
      name: 'Brand Key Visual Carousel Banner',
      assetType: 'image',
      status: 'READY',
      currentVersion: 1,
      tags: ['carousel', 'branding'],
      usageRights: 'licensed',
      mimeType: 'image/png',
      size: '4.8 MB',
      createdAt: '2026-09-11',
      derivativesCount: 5,
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Creative Asset Library</h1>
          <p className="text-sm text-slate-500">Manage multi-format creative assets, version histories, and platform-specific derivatives.</p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition"
        >
          <span className="material-symbols-outlined text-base">upload</span>
          <span>Upload Asset</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-2 border-b border-slate-200">
        {(['all', 'image', 'video', 'template'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-2 px-3 text-sm font-medium border-b-2 capitalize transition ${
              activeTab === tab
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Asset Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {assets.map((asset) => (
          <div key={asset.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition">
            <div className="h-40 bg-slate-100 flex items-center justify-center border-b border-slate-200 relative">
              {asset.assetType === 'video' ? (
                <span className="material-symbols-outlined text-4xl text-slate-400">videocam</span>
              ) : (
                <span className="material-symbols-outlined text-4xl text-slate-400">image</span>
              )}
              <span className="absolute top-3 right-3 bg-emerald-100 text-emerald-700 text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">check_circle</span> READY
              </span>
              <span className="absolute bottom-3 left-3 bg-slate-800 text-white text-xs font-medium px-2 py-0.5 rounded">
                v{asset.currentVersion}
              </span>
            </div>
            <div className="p-4 space-y-3">
              <h3 className="font-semibold text-slate-800 text-base">{asset.name}</h3>
              <div className="flex items-center space-x-2 text-xs text-slate-500">
                <span className="material-symbols-outlined text-sm text-indigo-500">verified_user</span>
                <span className="capitalize font-medium text-slate-700">Rights: {asset.usageRights}</span>
                <span>•</span>
                <span>{asset.size}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {asset.tags.map((tag) => (
                  <span key={tag} className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded">
                    #{tag}
                  </span>
                ))}
              </div>
              <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs">
                <span className="text-slate-400">{asset.derivativesCount} Derivatives</span>
                <button
                  onClick={() => setSelectedAsset(asset)}
                  className="text-indigo-600 font-medium hover:underline flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">visibility</span> View Details
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Version History Modal */}
      {selectedAsset && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Asset Version History: {selectedAsset.name}</h2>
            <div className="space-y-2">
              <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                <div className="flex justify-between font-semibold text-sm text-indigo-900">
                  <span>Version 2 (Current)</span>
                  <span className="text-xs text-indigo-600">Active</span>
                </div>
                <p className="text-xs text-indigo-700 mt-1">Non-destructive platform derivative presets generated (Instagram 1:1, TikTok 9:16, LinkedIn 16:9).</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-600 text-sm">
                <div className="flex justify-between font-medium">
                  <span>Version 1</span>
                  <span className="text-xs text-slate-400">Archived</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">Initial upload by Creative Lead.</p>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedAsset(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
