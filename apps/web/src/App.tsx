import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './lib/auth/AuthContext';
import { Sidebar, NavTab } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { AssistantView } from './components/AssistantView';
import { ResearchView } from './components/ResearchView';
import { ContentView } from './components/ContentView';
import { CalendarView } from './components/CalendarView';
import { KnowledgeView } from './components/KnowledgeView';
import { BrandsView } from './components/BrandsView';
import { ExecutionsView } from './components/ExecutionsView';
import { ApprovalPortalView } from './components/ApprovalPortalView';
import { CampaignView } from './components/CampaignView';
import { CompetitorTrendRadarView } from './components/CompetitorTrendRadarView';
import { UnifiedInboxView } from './components/UnifiedInboxView';
import { CreativeLibraryView } from './components/CreativeLibraryView';
import { CreativeProductionBoardView } from './components/CreativeProductionBoardView';
import { AgencyOperationsView } from './components/AgencyOperationsView';
import { ClientReportView } from './components/ClientReportView';
import { LoginView } from './components/LoginView';

const MainPortal: React.FC = () => {
  const { api, workspaceId, isAuthenticated, login } = useAuth();
  const [activeTab, setActiveTab] = useState<NavTab>('assistant');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);

  const [stats, setStats] = useState<any>({
    totalPosts: 0,
    pendingApprovals: 0,
    publishedThisMonth: 0,
    engagementRate: '0%',
  });
  const [brands, setBrands] = useState<any[]>([]);
  const [contentList, setContentList] = useState<any[]>([]);
  const [scheduledPosts, setScheduledPosts] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [executions, setExecutions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAllData = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const [dashRes, brandsRes, contentRes, calRes, knowRes, execRes] = await Promise.all([
        api.getDashboardStats().catch(() => ({ totalPosts: 0, pendingApprovals: 0, publishedThisMonth: 0, engagementRate: '0%' })),
        api.listBrands().catch(() => []),
        api.listContent().catch(() => []),
        api.listCalendar().catch(() => ({ scheduledPosts: [], contents: [] })),
        api.listKnowledge().catch(() => []),
        api.listAgentExecutions().catch(() => []),
      ]);

      setStats(dashRes || { totalPosts: 0, pendingApprovals: 0, publishedThisMonth: 0, engagementRate: '0%' });
      if (brandsRes) setBrands(brandsRes);
      if (contentRes) setContentList(contentRes);
      if (calRes?.scheduledPosts) setScheduledPosts(calRes.scheduledPosts);
      if (knowRes) setDocuments(knowRes);
      if (execRes) setExecutions(execRes);
    } catch (_err) {
      setStats({ totalPosts: 0, pendingApprovals: 0, publishedThisMonth: 0, engagementRate: '0%' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchAllData(true);
    }
  }, [workspaceId, isAuthenticated]);

  if (!isAuthenticated) {
    return <LoginView onLoginSuccess={login} />;
  }

  return (
    <div className="min-h-screen bg-[#12151b] text-[#d3d7e2] font-sans antialiased flex">
      {/* 1. Left Vertical Sidebar Menu */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        brands={brands}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* 2. Main Right Container (Clean Light Canvas) */}
      <div
        className={`flex-1 flex flex-col min-h-screen bg-[#f8f9fb] text-[#1e293b] transition-all duration-300 ${
          sidebarCollapsed ? 'ml-20' : 'ml-64'
        }`}
      >
        {/* Top White Header Bar */}
        <Header
          activeTab={activeTab}
          onRefresh={fetchAllData}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        {/* Main Content Area (Stitch Max-7xl Centered Container) */}
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto flex flex-col gap-6">
          {loading && !stats ? (
            <div className="flex items-center justify-center py-32 text-xs text-gray-500 font-mono animate-pulse">
              Connecting to Riona Social AI Agent Workspace API...
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && (
                <DashboardView stats={stats} onNavigate={setActiveTab} onRefresh={fetchAllData} />
              )}
              {activeTab === 'assistant' && (
                <AssistantView api={api} onRefresh={fetchAllData} onNavigate={setActiveTab} />
              )}
              {activeTab === 'research' && (
                <ResearchView />
              )}
              {activeTab === 'campaigns' && (
                <CampaignView />
              )}
              {activeTab === 'competitor' && (
                <CompetitorTrendRadarView />
              )}
              {activeTab === 'inbox' && (
                <UnifiedInboxView />
              )}
              {activeTab === 'creative_assets' && (
                <CreativeLibraryView />
              )}
              {activeTab === 'creative_board' && (
                <CreativeProductionBoardView />
              )}
              {activeTab === 'agency_ops' && (
                <AgencyOperationsView />
              )}
              {activeTab === 'client_reports' && (
                <ClientReportView />
              )}
              {activeTab === 'content' && (
                <ContentView contentList={contentList} onRefresh={fetchAllData} />
              )}
              {activeTab === 'approval' && (
                <ApprovalPortalView contentList={contentList} onRefresh={fetchAllData} />
              )}
              {activeTab === 'calendar' && (
                <CalendarView
                  scheduledPosts={scheduledPosts}
                  contentList={contentList}
                  onRefresh={fetchAllData}
                />
              )}
              {activeTab === 'knowledge' && (
                <KnowledgeView documents={documents} onRefresh={fetchAllData} />
              )}
              {activeTab === 'brands' && (
                <BrandsView brands={brands} onRefresh={fetchAllData} />
              )}
              {activeTab === 'executions' && (
                <ExecutionsView executions={executions} onRefresh={fetchAllData} />
              )}
            </>
          )}
        </main>
      </div>

    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <MainPortal />
    </AuthProvider>
  );
};

export default App;
