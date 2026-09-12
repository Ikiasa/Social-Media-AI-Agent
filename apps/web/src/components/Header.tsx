import React, { useState } from 'react';
import { NavTab } from './Sidebar';
import { useAuth } from '../lib/auth/AuthContext';
import { RammeDrawer } from './RammeDrawer';

interface HeaderProps {
  activeTab: NavTab;
  onRefresh: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, onRefresh, collapsed, onToggleCollapse }) => {
  const auth = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [isRammeOpen, setIsRammeOpen] = useState(false);

  return (
    <header className="h-14 border-b border-[#e2e8f0] bg-white/90 backdrop-blur-md sticky top-0 z-40 flex items-center justify-between px-6 shadow-xs">
      <RammeDrawer isOpen={isRammeOpen} onClose={() => setIsRammeOpen(false)} />

      {/* Command Search Bar */}
      <div className="flex items-center gap-3 w-full max-w-md">
        <button
          onClick={onToggleCollapse}
          className="p-1 rounded border border-[#e2e8f0] hover:bg-[#f8fafc] text-[#64748b] transition-colors md:hidden"
          title="Toggle Sidebar"
        >
          <span className="material-symbols-outlined text-base">menu</span>
        </button>

        <div className="relative w-full">
          <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8] text-sm">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search queues, vectors, hooks, or runs..."
            className="w-full bg-[#f1f5f9] border border-[#e2e8f0] rounded-md pl-8 pr-12 py-1.5 text-xs text-[#1e293b] placeholder-[#94a3b8] focus:outline-none focus:border-[#cbd5e1] focus:bg-white focus:ring-0 transition-colors"
          />
          <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono text-[#64748b] bg-white border border-[#e2e8f0] px-1.5 py-0.5 rounded shadow-xs select-none">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Status Badges & Profile */}
      <div className="flex items-center gap-3">
        {/* Ramme View Toggle */}
        <button
          onClick={() => setIsRammeOpen(!isRammeOpen)}
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-[#e2e8f0] bg-white hover:bg-[#f8fafc] text-[11px] font-mono text-[#334155] shadow-xs transition-colors"
          title="Buka Ramme Instagram Emulator"
        >
          <span className="material-symbols-outlined text-sm text-[#e1306c]">devices</span>
          <span>Ramme View</span>
        </button>

        {/* Gemini Standby Badge */}
        <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-md border border-[#e2e8f0] bg-white text-[11px] font-mono text-[#475569] shadow-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]"></span>
          <span>Gemini 1.5 & CrewAI Standby</span>
        </div>

        {/* Port Status Badge */}
        <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-md border border-[#e2e8f0] bg-white text-[11px] font-mono text-[#64748b] shadow-xs">
          <span>Port 3000 : 3001</span>
        </div>

        {/* Refresh Button */}
        <button
          onClick={onRefresh}
          className="w-8 h-8 rounded-md border border-[#e2e8f0] bg-white hover:bg-[#f8fafc] flex items-center justify-center text-[#64748b] hover:text-[#1e293b] transition-colors shadow-xs"
          title="Refresh Data"
        >
          <span className="material-symbols-outlined text-base">sync</span>
        </button>

        {/* Notification Badge */}
        <button className="w-8 h-8 rounded-md border border-[#e2e8f0] bg-white hover:bg-[#f8fafc] flex items-center justify-center text-[#64748b] hover:text-[#1e293b] transition-colors relative shadow-xs">
          <span className="material-symbols-outlined text-base">notifications</span>
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#f43f5e]"></span>
        </button>

        {/* Profile Avatar */}
        <div className="flex items-center gap-2 pl-2 border-l border-[#e2e8f0]">
          <div className="w-7 h-7 rounded-md bg-[#0f172a] border border-[#0f172a] flex items-center justify-center text-xs font-mono font-medium text-white shadow-xs">
            {auth?.user?.name ? auth.user.name.slice(0, 2).toUpperCase() : 'AL'}
          </div>
          <div className="hidden sm:flex flex-col text-left">
            <span className="text-xs font-medium text-[#0f172a] leading-none">
              {auth?.user?.name || 'Admin Lead'}
            </span>
            <span className="text-[10px] text-[#64748b] mt-0.5 leading-none font-mono">
              {auth?.user?.role || 'controller'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
