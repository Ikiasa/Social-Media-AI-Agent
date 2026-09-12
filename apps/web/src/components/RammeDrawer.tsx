import React from 'react';
import { LocalInstagramBrowser } from './LocalInstagramBrowser';

interface RammeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RammeDrawer: React.FC<RammeDrawerProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center sm:justify-end sm:pr-8 p-4 bg-black/60 backdrop-blur-xs transition-all animate-fade-in">
      {/* Phone Mockup Frame - Centered & Scaled to fit Viewport */}
      <div className="relative my-auto w-full max-w-[380px] h-[700px] max-h-[84vh] bg-black rounded-[36px] border-4 border-zinc-800 shadow-2xl overflow-hidden flex flex-col transition-all">
        
        {/* iPhone Dynamic Island Bar */}
        <div className="w-full bg-zinc-950 py-1.5 flex items-center justify-center border-b border-zinc-900 select-none shrink-0">
          <div className="w-20 h-3 bg-zinc-900 rounded-full flex items-center justify-between px-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span className="w-1.5 h-1.5 rounded-full bg-black border border-zinc-800"></span>
          </div>
        </div>

        {/* Ramme View Header */}
        <div className="bg-zinc-900 px-4 py-2 border-b border-zinc-800 flex items-center justify-between text-xs text-zinc-300 font-semibold select-none shrink-0">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse"></span>
            <span className="text-pink-400 font-bold tracking-wide">RAMME LOCAL BROWSER</span>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 w-6 h-6 rounded-full flex items-center justify-center text-xs transition-colors"
            title="Tutup Ramme View"
          >
            ✕
          </button>
        </div>

        {/* Local Instagram Proxy Browser Container */}
        <div className="flex-1 min-h-0 bg-black w-full h-full relative overflow-hidden">
          <LocalInstagramBrowser />
        </div>

        {/* Phone Bottom Home Bar */}
        <div className="w-full bg-zinc-950 py-1.5 flex items-center justify-center select-none border-t border-zinc-900 shrink-0">
          <div className="w-28 h-1 bg-zinc-700 rounded-full"></div>
        </div>
      </div>
    </div>
  );
};
