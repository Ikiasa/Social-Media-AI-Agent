import React from 'react';
import { useAuth } from '../lib/auth/AuthContext';

export type NavTab =
  | 'dashboard'
  | 'assistant'
  | 'research'
  | 'campaigns'
  | 'competitor'
  | 'inbox'
  | 'creative_assets'
  | 'creative_board'
  | 'agency_ops'
  | 'client_reports'
  | 'content'
  | 'approval'
  | 'calendar'
  | 'knowledge'
  | 'brands'
  | 'executions';

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  brands: any[];
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  brands,
  collapsed,
  onToggleCollapse,
}) => {
  const { workspaceId, activeBrandId, setActiveBrandId } = useAuth();

  const navItems: { id: NavTab; label: string; icon: string; badge?: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'research', label: 'Market Research', icon: 'query_stats' },
    { id: 'campaigns', label: 'Campaign Intelligence', icon: 'campaign', badge: 'AI' },
    { id: 'competitor', label: 'Competitor & Trend Radar', icon: 'radar', badge: 'P3' },
    { id: 'inbox', label: 'Unified Social Inbox', icon: 'inbox', badge: 'P4' },
    { id: 'creative_assets', label: 'Creative Asset Library', icon: 'perm_media', badge: 'P5' },
    { id: 'creative_board', label: 'Creative Task Board', icon: 'dashboard_customize', badge: 'P5' },
    { id: 'agency_ops', label: 'Agency Operations & SLA', icon: 'monitoring', badge: 'P5' },
    { id: 'client_reports', label: 'White-Label Reports', icon: 'assessment', badge: 'P5' },
    { id: 'content', label: 'Content Pipeline', icon: 'stream', badge: '6' },
    { id: 'approval', label: 'Client Approval Portal', icon: 'verified_user', badge: '3-tier' },
    { id: 'calendar', label: 'Publishing Calendar', icon: 'calendar_today' },
    { id: 'knowledge', label: 'Knowledge RAG Base', icon: 'database' },
    { id: 'brands', label: 'Brands & Social Accounts', icon: 'devices' },
    { id: 'assistant', label: 'CrewAI Intelligence', icon: 'psychology' },
    { id: 'executions', label: 'Audit Executions', icon: 'tune' },
  ];

  return (
    <aside
      className={`fixed left-0 top-0 h-full bg-[#161a23] border-r border-[#262b36] z-50 flex flex-col justify-between p-4 transition-all duration-300 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      <div className="flex flex-col gap-5">
        {/* Brand & Tenant Switcher */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-6 h-6 rounded bg-[#252a36] border border-[#262b36] flex items-center justify-center shrink-0">
                <span className="text-[#d3d7e2] text-xs font-semibold font-mono">R</span>
              </div>
              {!collapsed && (
                <div className="flex flex-col truncate">
                  <span className="text-sm font-semibold text-[#e1e4eb] tracking-tight leading-none">Riona AI</span>
                  <span className="text-[10px] font-mono text-[#6b7282] uppercase tracking-wider mt-0.5">Control Plane</span>
                </div>
              )}
            </div>
            {!collapsed && (
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-[#262b36] bg-[#151821] text-[11px] font-mono text-[#8a92a3]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#64a98c]"></span>
                v2.5
              </div>
            )}
          </div>

          {!collapsed && (
            <div className="w-full px-2.5 py-2 rounded-md bg-[#1e222c] border border-[#262b36] flex items-center justify-between transition-colors text-left">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-5 h-5 rounded bg-[#262b37] text-[10px] font-mono font-medium text-[#a0a7b8] flex items-center justify-center shrink-0">
                  WS
                </div>
                <div className="flex flex-col truncate">
                  <span className="text-xs font-medium text-[#d3d7e2] truncate leading-none">{workspaceId}</span>
                  <span className="text-[10px] font-mono text-[#6b7282] mt-0.5 truncate">us-east-1 • prod</span>
                </div>
              </div>
              <button onClick={onToggleCollapse} title="Toggle Sidebar" className="text-[#6b7282] hover:text-[#9299a9]">
                <span className="material-symbols-outlined text-sm">unfold_more</span>
              </button>
            </div>
          )}
        </div>

        {/* Navigation Links */}
        <div>
          {!collapsed && (
            <div className="px-2 pb-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#6b7282] font-semibold">Workspace</span>
            </div>
          )}
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs transition-all ${
                    isActive
                      ? 'bg-[#252a36] text-[#e1e4eb] font-semibold border border-[#383f4f] shadow-xs'
                      : 'text-[#8a92a3] hover:text-[#d3d7e2] hover:bg-[#1e222c]'
                  }`}
                  title={collapsed ? item.label : undefined}
                >
                  <span className={`material-symbols-outlined text-base ${isActive ? 'text-[#a0a7b8]' : 'text-[#6b7282]'}`}>
                    {item.icon}
                  </span>
                  {!collapsed && (
                    <div className="flex items-center justify-between w-full truncate">
                      <span className="truncate">{item.label}</span>
                      {item.badge && (
                        <span className="ml-auto text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#1e222c] text-[#8a92a3] border border-[#262b36]">
                          {item.badge}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Cluster Telemetry Bar & Brand Selector */}
      {!collapsed && (
        <div className="space-y-3">
          <div className="p-2.5 rounded-md bg-[#151821] border border-[#262b36] space-y-1.5 text-xs">
            <span className="text-[10px] font-mono text-[#6b7282] uppercase tracking-wider block font-semibold">
              Active Brand Context
            </span>
            <select
              value={activeBrandId || ''}
              onChange={(e) => setActiveBrandId(e.target.value || undefined)}
              className="w-full bg-[#1c202b] text-xs text-[#d3d7e2] rounded border border-[#262b36] px-2 py-1 focus:outline-none focus:border-[#383f4f]"
            >
              <option value="">-- All Brands --</option>
              {brands.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div className="p-3 rounded-md bg-[#151821] border border-[#262b36] flex flex-col gap-2">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-[#6b7282]">LLM Capacity</span>
              <span className="text-[#8a92a3]">92% Idle</span>
            </div>
            <div className="w-full h-1 bg-[#252a36] rounded-full overflow-hidden">
              <div className="h-full bg-[#64a98c] rounded-full w-[8%]"></div>
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono text-[#6b7282] pt-0.5">
              <span>Node Latency</span>
              <span className="text-[#8a92a3]">142ms</span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
