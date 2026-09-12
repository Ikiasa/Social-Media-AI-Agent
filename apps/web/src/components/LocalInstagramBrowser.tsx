import React, { useState, useRef } from 'react';

export const LocalInstagramBrowser: React.FC = () => {
  const [viewMode, setViewMode] = useState<'emulator' | 'proxy'>('emulator');
  const [currentUrl, setCurrentUrl] = useState('https://www.instagram.com');
  const [inputUrl, setInputUrl] = useState('https://www.instagram.com');
  const [proxyTimestamp, setProxyTimestamp] = useState(Date.now());
  const [activeTab, setActiveTab] = useState<'feed' | 'reels' | 'profile'>('profile');
  const [iframeError, setIframeError] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const proxyUrl = `http://localhost:3001/api/v1/instagram-proxy/view?url=${encodeURIComponent(currentUrl)}&t=${proxyTimestamp}`;

  const handleRefresh = () => {
    setProxyTimestamp(Date.now());
    setIframeError(false);
  };

  const handleNavigate = (e: React.FormEvent) => {
    e.preventDefault();
    let url = inputUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }
    setCurrentUrl(url);
    setInputUrl(url);
    setViewMode('proxy');
    setProxyTimestamp(Date.now());
    setIframeError(false);
  };

  return (
    <div className="w-full h-full flex flex-col bg-black text-white select-none overflow-hidden font-sans">
      {/* Top Navigation & Address Bar */}
      <div className="bg-zinc-900 border-b border-zinc-800 px-3 py-2 flex flex-col gap-2 text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setViewMode('emulator')}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
                viewMode === 'emulator'
                  ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-xs'
                  : 'bg-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              📱 Mobile View
            </button>
            <button
              onClick={() => setViewMode('proxy')}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
                viewMode === 'proxy'
                  ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-xs'
                  : 'bg-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              🌐 Proxy
            </button>
          </div>

          <div className="flex items-center space-x-1.5 text-[10px] font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-emerald-400 font-bold">SESSION ACTIVE</span>
          </div>
        </div>

        {/* Address Input */}
        <form onSubmit={handleNavigate} className="w-full">
          <div className="relative flex items-center">
            <span className="absolute left-2.5 text-[10px] text-zinc-500">🔒</span>
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              className="w-full bg-zinc-950 text-zinc-200 text-[11px] font-mono pl-7 pr-7 py-1 rounded-full border border-zinc-800 focus:outline-none focus:border-pink-500 transition-colors"
              placeholder="https://www.instagram.com/acme_brand"
            />
            <button
              type="button"
              onClick={handleRefresh}
              className="absolute right-2 text-zinc-400 hover:text-white text-[11px]"
              title="Refresh"
            >
              🔄
            </button>
          </div>
        </form>
      </div>

      {/* Main Content View */}
      {viewMode === 'proxy' && !iframeError ? (
        <div className="flex-1 bg-black w-full h-full relative overflow-hidden">
          <iframe
            ref={iframeRef}
            src={proxyUrl}
            title="Local Instagram Browser Proxy"
            className="w-full h-full border-0 bg-black"
            onError={() => setIframeError(true)}
          />
        </div>
      ) : (
        /* Native Pixel-Perfect Ramme Instagram Emulator UI */
        <div className="flex-1 min-h-0 bg-black flex flex-col justify-between overflow-y-auto">
          {/* Instagram Header */}
          <div className="px-4 py-3 border-b border-zinc-900 flex items-center justify-between bg-black sticky top-0 z-20">
            <div className="flex items-center space-x-1.5">
              <span className="font-bold text-sm text-white tracking-tight">acme_brand</span>
              <span className="material-symbols-outlined text-blue-500 text-xs fill-current">verified</span>
              <span className="material-symbols-outlined text-xs text-zinc-400">expand_more</span>
            </div>
            <div className="flex items-center space-x-4 text-zinc-300">
              <span className="material-symbols-outlined text-lg hover:text-white cursor-pointer">add_box</span>
              <span className="material-symbols-outlined text-lg hover:text-white cursor-pointer">favorite</span>
              <span className="material-symbols-outlined text-lg hover:text-white cursor-pointer">send</span>
            </div>
          </div>

          {/* Profile & Feed Content */}
          <div className="p-4 space-y-4">
            {/* Avatar & Stats */}
            <div className="flex items-center justify-between">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600 p-0.5">
                  <div className="w-full h-full rounded-full bg-zinc-900 border-2 border-black flex items-center justify-center font-bold text-white text-lg">
                    AB
                  </div>
                </div>
                <div className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px] font-bold border border-black">
                  +
                </div>
              </div>

              <div className="flex items-center space-x-6 text-center">
                <div>
                  <div className="font-bold text-sm text-white">142</div>
                  <div className="text-[10px] text-zinc-400 font-mono">Posts</div>
                </div>
                <div>
                  <div className="font-bold text-sm text-white">24.8K</div>
                  <div className="text-[10px] text-zinc-400 font-mono">Followers</div>
                </div>
                <div>
                  <div className="font-bold text-sm text-white">482</div>
                  <div className="text-[10px] text-zinc-400 font-mono">Following</div>
                </div>
              </div>
            </div>

            {/* Bio */}
            <div className="space-y-1 text-xs">
              <div className="font-bold text-white">Acme Global Brand HQ</div>
              <div className="text-zinc-300">Autonomous Social Media Operations & AI Pipeline</div>
              <div className="text-blue-400 font-mono text-[11px]">riona.ai/control-plane</div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <button className="py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-semibold transition-colors">
                Edit Profile
              </button>
              <button className="py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-semibold transition-colors">
                Share Profile
              </button>
            </div>

            {/* Grid vs Reels Tab Bar */}
            <div className="border-t border-zinc-900 flex items-center justify-around text-zinc-500 pt-2">
              <button
                onClick={() => setActiveTab('profile')}
                className={`py-1 flex items-center justify-center w-full border-b-2 transition-all ${
                  activeTab === 'profile' ? 'border-white text-white' : 'border-transparent text-zinc-500'
                }`}
              >
                <span className="material-symbols-outlined text-lg">grid_on</span>
              </button>
              <button
                onClick={() => setActiveTab('reels')}
                className={`py-1 flex items-center justify-center w-full border-b-2 transition-all ${
                  activeTab === 'reels' ? 'border-white text-white' : 'border-transparent text-zinc-500'
                }`}
              >
                <span className="material-symbols-outlined text-lg">movie</span>
              </button>
            </div>

            {/* Post Feed Thumbnails */}
            <div className="grid grid-cols-3 gap-1 pt-1">
              <div className="aspect-square bg-zinc-900 rounded-sm relative group overflow-hidden border border-zinc-800 flex flex-col items-center justify-center p-2 text-center">
                <span className="material-symbols-outlined text-pink-500 text-lg mb-1">auto_awesome</span>
                <span className="text-[9px] text-zinc-300 font-mono font-medium line-clamp-2">AI Video B2B</span>
                <span className="absolute bottom-1 right-1 text-[9px] font-mono text-emerald-400 font-bold">3.4x</span>
              </div>
              <div className="aspect-square bg-zinc-900 rounded-sm relative group overflow-hidden border border-zinc-800 flex flex-col items-center justify-center p-2 text-center">
                <span className="material-symbols-outlined text-amber-500 text-lg mb-1">speed</span>
                <span className="text-[9px] text-zinc-300 font-mono font-medium line-clamp-2">Hook Velocity</span>
                <span className="absolute bottom-1 right-1 text-[9px] font-mono text-zinc-400">88%</span>
              </div>
              <div className="aspect-square bg-zinc-900 rounded-sm relative group overflow-hidden border border-zinc-800 flex flex-col items-center justify-center p-2 text-center">
                <span className="material-symbols-outlined text-indigo-400 text-lg mb-1">view_carousel</span>
                <span className="text-[9px] text-zinc-300 font-mono font-medium line-clamp-2">Algoritma 2026</span>
                <span className="absolute bottom-1 right-1 text-[9px] font-mono text-zinc-400">1.2K</span>
              </div>
            </div>
          </div>

          {/* Bottom App Navigation Bar */}
          <div className="bg-black border-t border-zinc-900 px-6 py-2.5 flex items-center justify-between text-zinc-400 sticky bottom-0 z-20">
            <span className="material-symbols-outlined text-xl text-white cursor-pointer">home</span>
            <span className="material-symbols-outlined text-xl hover:text-white cursor-pointer">search</span>
            <span className="material-symbols-outlined text-xl hover:text-white cursor-pointer">add_box</span>
            <span className="material-symbols-outlined text-xl hover:text-white cursor-pointer">movie</span>
            <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-amber-400 to-rose-500 p-0.5 cursor-pointer">
              <div className="w-full h-full rounded-full bg-zinc-900 border border-black flex items-center justify-center text-[8px] font-bold text-white">
                R
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
