import React from 'react';
import { useAuth } from '../lib/auth/AuthContext';

export type NavTab = 'dashboard' | 'assistant' | 'research' | 'content' | 'calendar' | 'knowledge' | 'brands' | 'executions';

interface NavigationProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  brands: any[];
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, onTabChange, brands }) => {
  const { workspaceId, setWorkspaceId, activeBrandId, setActiveBrandId } = useAuth();

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand Identity */}
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/30">
              AI
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-400 bg-clip-text text-transparent">
                Riona AI Social
              </span>
              <span className="ml-2 text-xs font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-400 border border-indigo-800/50">
                v1.0
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex space-x-1">
            {[
              { id: 'dashboard', label: 'Dashboard' },
              { id: 'assistant', label: 'AI Assistant' },
              { id: 'research', label: 'Research & Hooks' },
              { id: 'content', label: 'Content' },
              { id: 'calendar', label: 'Calendar' },
              { id: 'knowledge', label: 'Knowledge' },
              { id: 'brands', label: 'Brands' },
              { id: 'executions', label: 'Executions' },
            ].map((tab) => {

              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id as NavTab)}
                  className={`px-3.5 py-2 rounded-md text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-600/90 text-white shadow-sm shadow-indigo-600/50 font-semibold'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* Context Switchers */}
          <div className="flex items-center space-x-3">
            {/* Active Brand Selector */}
            <select
              value={activeBrandId || ''}
              onChange={(e) => setActiveBrandId(e.target.value || undefined)}
              className="bg-slate-800 text-xs text-slate-200 rounded-md border border-slate-700 px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">-- All Brands --</option>
              {brands.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.name}
                </option>
              ))}
            </select>

            {/* Workspace Context Badge */}
            <div className="flex items-center space-x-1.5 text-xs bg-slate-800/80 px-2.5 py-1.5 rounded-md border border-slate-700">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-slate-400 font-mono">Workspace:</span>
              <span className="font-semibold text-slate-200">{workspaceId}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
