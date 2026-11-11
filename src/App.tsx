/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  AuthPermissions,
  Campaign,
  CartaContemplada,
  CrmStage,
  Integration,
  Lead,
  SystemMetrics,
  User,
  WhatsAppChat,
  OutboundTargetProfile,
} from './types';
import {
  initializeAuthSession,
  initializeMasterPrivileges,
  logoutAuthSession,
} from './services/authService';
import {
  fetchRealtimeProfiles,
  subscribeToProfilesRealtime,
} from './services/teamService';
import {
  fetchRealtimeLeads,
  subscribeToSupabaseLeadsRealtime,
  createLeadRecord,
  updateLeadRecord,
  deleteLeadRecord,
  importLeadsRecords,
} from './services/leadsService';
import { Sidebar, NavViewId } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { LeadModal } from './components/LeadModal';
import { LeadDetailDrawer } from './components/LeadDetailDrawer';
import { AuthModal } from './components/AuthModal';
import { CaptureLandingPage } from './components/CaptureLandingPage';

// Views
import { DashboardView } from './views/DashboardView';
import { LeadHunterView } from './views/LeadHunterView';
import { OutboundProspectingView } from './views/OutboundProspectingView';
import { LeadsDatabaseView } from './views/LeadsDatabaseView';
import { CrmKanbanView } from './views/CrmKanbanView';
import { AiAssistantView } from './views/AiAssistantView';
import { CampaignsView } from './views/CampaignsView';
import { CartasContempladasView } from './views/CartasContempladasView';
import { ProductsConsorcioView } from './views/ProductsConsorcioView';
import { SimulatorView } from './views/SimulatorView';
import { WhatsAppView } from './views/WhatsAppView';
import { ReportsView } from './views/ReportsView';
import { TeamView } from './views/TeamView';
import { SubscriptionsView } from './views/SubscriptionsView';
import { SettingsIntegrationsView } from './views/SettingsIntegrationsView';
import { AdminMasterView } from './views/AdminMasterView';
import { LgpdComplianceView } from './views/LgpdComplianceView';

const DEFAULT_LOGGED_OUT_PERMISSIONS: AuthPermissions = initializeMasterPrivileges(null).permissions;

export default function App() {
  // Navigation & UI state
  const [currentView, setCurrentView] = useState<NavViewId>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Drawers
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isQualifying, setIsQualifying] = useState(false);

  // Authenticated User & Privileges State (loaded exclusively from `public.profiles`)
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<AuthPermissions>(DEFAULT_LOGGED_OUT_PERMISSIONS);

  // Operational Domain State
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [cartas, setCartas] = useState<CartaContemplada[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [team, setTeam] = useState<User[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [whatsappChats, setWhatsappChats] = useState<WhatsAppChat[]>([]);
  const [outboundProfiles, setOutboundProfiles] = useState<OutboundTargetProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch protected domain datasets based on resolved profile permissions
  const fetchDomainData = useCallback(async (activePermissions: AuthPermissions, activeUser?: User | null) => {
    if (!activePermissions.isAuthenticated) {
      setMetrics(null);
      setLeads([]);
      setCartas([]);
      setCampaigns([]);
      setTeam([]);
      setIntegrations([]);
      setWhatsappChats([]);
      setOutboundProfiles([]);
      return;
    }

    try {
      const [metricsRes, realLeads, cartasRes, campaignsRes, whatsappRes, realProfiles] =
        await Promise.all([
          fetch('/api/metrics', { credentials: 'include' }),
          fetchRealtimeLeads(activeUser ?? null),
          fetch('/api/cartas', { credentials: 'include' }),
          fetch('/api/campaigns', { credentials: 'include' }),
          fetch('/api/whatsapp/chats', { credentials: 'include' }),
          fetchRealtimeProfiles(activeUser ?? null),
        ]);

      if (metricsRes.ok) setMetrics(await metricsRes.json());
      setLeads(realLeads);
      if (cartasRes.ok) setCartas(await cartasRes.json());
      if (campaignsRes.ok) setCampaigns(await campaignsRes.json());
      if (whatsappRes.ok) setWhatsappChats(await whatsappRes.json());
      setTeam(realProfiles);

      // Only Master & Gestor load system configuration & outbound profiles
      const canLoadConfig = activePermissions.isMaster || activePermissions.isGestor;
      if (canLoadConfig) {
        const [integrationsRes, outboundRes] = await Promise.all([
          fetch('/api/integrations', { credentials: 'include' }),
          fetch('/api/outbound/profiles', { credentials: 'include' }),
        ]);
        setIntegrations(integrationsRes.ok ? await integrationsRes.json() : []);
        setOutboundProfiles(outboundRes.ok ? await outboundRes.json() : []);
      } else {
        setIntegrations([]);
        setOutboundProfiles([]);
      }
    } catch (err) {
      console.error('Error loading LeadFinder operational datasets:', err);
    }
  }, []);

  // Initialize Auth Session directly from `public.profiles` (and Supabase Auth when configured)
  const initializeSessionAndData = useCallback(async () => {
    try {
      setIsLoading(true);
      const urlParams = new URLSearchParams(window.location.search);
      const hasLandingParam = Boolean(urlParams.get('landing'));

      const authState = await initializeAuthSession();
      setCurrentUser(authState.user);
      setPermissions(authState.permissions);

      if (hasLandingParam) {
        setCurrentView('landing_preview');
      } else if (authState.user) {
        // Automatically redirect Master to Painel Master SaaS on session startup
        setCurrentView(authState.redirectView);
      }

      await fetchDomainData(authState.permissions, authState.user);
    } catch (err) {
      console.error('Error initializing auth session:', err);
    } finally {
      setIsLoading(false);
    }
  }, [fetchDomainData]);

  useEffect(() => {
    initializeSessionAndData();
  }, [initializeSessionAndData]);

  // Real-time synchronization with Cloud SQL PostgreSQL live stream
  useEffect(() => {
    if (!permissions.isAuthenticated) return;

    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/leads/stream');
      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'lead_added' && payload.lead) {
            setLeads((prev) => {
              if (prev.some((l) => l.id === payload.lead.id)) return prev;
              // Apply client wallet guard immediately on SSE broadcast
              if (permissions.isVendedor && payload.lead.sellerId !== currentUser?.id) return prev;
              if (permissions.isGestor && payload.lead.tenantId && payload.lead.tenantId !== currentUser?.tenantId) return prev;
              return [payload.lead, ...prev];
            });
            fetch('/api/metrics', { credentials: 'include' })
              .then((r) => (r.ok ? r.json() : null))
              .then((m) => m && setMetrics(m))
              .catch(() => {});
          } else if (payload.type === 'lead_updated' && payload.lead) {
            setLeads((prev) => prev.map((l) => (l.id === payload.lead.id ? payload.lead : l)));
            setSelectedLead((prev) => (prev && prev.id === payload.lead.id ? payload.lead : prev));
            fetch('/api/metrics', { credentials: 'include' })
              .then((r) => (r.ok ? r.json() : null))
              .then((m) => m && setMetrics(m))
              .catch(() => {});
          } else if (payload.type === 'lead_deleted' && payload.leadId) {
            setLeads((prev) => prev.filter((l) => l.id !== payload.leadId));
            setSelectedLead((prev) => (prev && prev.id === payload.leadId ? null : prev));
            fetch('/api/metrics', { credentials: 'include' })
              .then((r) => (r.ok ? r.json() : null))
              .then((m) => m && setMetrics(m))
              .catch(() => {});
          }
        } catch {
          // Ignore keep-alive ping events
        }
      };
    } catch (err) {
      console.warn('Real-time SSE connection notice:', err);
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [permissions.isAuthenticated, permissions.isVendedor, permissions.isGestor, currentUser?.id, currentUser?.tenantId]);

  // Real-time synchronization for Supabase `public.leads` table changes
  useEffect(() => {
    if (!permissions.isAuthenticated) return;
    const unsubscribe = subscribeToSupabaseLeadsRealtime(currentUser, (updatedLeads) => {
      setLeads(updatedLeads);
    });
    return () => {
      unsubscribe();
    };
  }, [permissions.isAuthenticated, currentUser?.id, currentUser?.role, currentUser?.tenantId]);

  // Real-time synchronization for `public.profiles` across the global app state
  useEffect(() => {
    if (!permissions.isAuthenticated) return;
    const unsubscribe = subscribeToProfilesRealtime(currentUser, (updated) => {
      setTeam(updated);
    });
    return () => {
      unsubscribe();
    };
  }, [permissions.isAuthenticated, currentUser?.id, currentUser?.role, currentUser?.tenantId]);

  // Strict Role-based Navigation Guard
  useEffect(() => {
    if (!permissions.isAuthenticated || currentView === 'landing_preview') return;

    if (!permissions.allowedViews.includes(currentView)) {
      setCurrentView(permissions.isMaster ? 'admin_master' : 'dashboard');
    }
  }, [permissions, currentView]);

  const handleAuthSuccess = async (result: {
    user: User;
    permissions: AuthPermissions;
    redirectView: NavViewId;
  }) => {
    setCurrentUser(result.user);
    setPermissions(result.permissions);
    // Master automatically redirects to 'admin_master' (Painel Master SaaS); Gestor/Vendedor to 'dashboard'
    setCurrentView(result.redirectView);
    setIsLoading(true);
    await fetchDomainData(result.permissions, result.user);
    setIsLoading(false);
  };

  const handleLogout = async () => {
    await logoutAuthSession();
    setCurrentUser(null);
    setPermissions(DEFAULT_LOGGED_OUT_PERMISSIONS);
    setCurrentView('dashboard');
    await fetchDomainData(DEFAULT_LOGGED_OUT_PERMISSIONS, null);
  };

  const refreshData = async () => {
    await fetchDomainData(permissions, currentUser);
  };

  const handleSaveLead = async (leadData: Partial<Lead>) => {
    try {
      if (editingLead) {
        const updated = await updateLeadRecord(editingLead.id, leadData);
        if (updated) {
          await refreshData();
          setEditingLead(null);
        }
      } else {
        const created = await createLeadRecord(leadData, currentUser);
        if (created) {
          await refreshData();
          setEditingLead(null);
        }
      }
    } catch (err) {
      console.error('Error saving lead:', err);
    }
  };

  const handleImportLeads = async (importedRows: Partial<Lead>[]) => {
    try {
      const saved = await importLeadsRecords(importedRows, currentUser);
      if (saved.length > 0) {
        await refreshData();
      }
      return saved.length;
    } catch (err) {
      console.error('Error importing leads:', err);
      return 0;
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    try {
      const deleted = await deleteLeadRecord(leadId);
      if (deleted) {
        if (selectedLead?.id === leadId) setSelectedLead(null);
        await refreshData();
      }
    } catch (err) {
      console.error('Error deleting lead:', err);
    }
  };

  const handleQualifyWithGemini = async (leadId: string) => {
    try {
      setIsQualifying(true);
      const res = await fetch(`/api/leads/${leadId}/qualify`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();

      if (data.lead) {
        if (data.lead.score >= 80) {
          confetti({
            particleCount: 70,
            spread: 60,
            origin: { y: 0.7 },
          });
        }

        if (selectedLead?.id === leadId) {
          setSelectedLead(data.lead);
        }

        await refreshData();
      }
    } catch (err) {
      console.error('Error qualifying lead with Gemini:', err);
    } finally {
      setIsQualifying(false);
    }
  };

  const handleBatchQualify = async () => {
    const pendingLeads = leads.filter((l) => l.score === 50 || l.temperature === 'Em desenvolvimento');
    for (const l of pendingLeads.slice(0, 5)) {
      await handleQualifyWithGemini(l.id);
    }
  };

  const handleUpdateStatus = async (leadId: string, newStatus: CrmStage) => {
    try {
      const updated = await updateLeadRecord(leadId, {
        status: newStatus,
      });
      if (updated) {
        if (selectedLead?.id === leadId) setSelectedLead(updated);
        await refreshData();

        if (newStatus === 'venda_concluida') {
          confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 } });
        }
      }
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const handleAddTask = async (leadId: string, taskTitle: string, dueDate: string) => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;
    const newTask = {
      id: `t-${Date.now()}`,
      title: taskTitle,
      dueDate,
      completed: false,
      priority: 'alta' as const,
    };
    const updatedTasks = [...(lead.tasks || []), newTask];

    const updated = await updateLeadRecord(leadId, { tasks: updatedTasks });
    if (updated) {
      if (selectedLead?.id === leadId) setSelectedLead(updated);
      await refreshData();
    }
  };

  const handleAddNote = async (leadId: string, noteText: string) => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;
    const newHistory = [
      {
        id: `h-${Date.now()}`,
        date: new Date().toISOString(),
        type: 'note' as const,
        description: noteText,
        author: currentUser?.name || 'Consultor',
      },
      ...(lead.history || []),
    ];

    const updated = await updateLeadRecord(leadId, { history: newHistory });
    if (updated) {
      if (selectedLead?.id === leadId) setSelectedLead(updated);
      await refreshData();
    }
  };

  const handleCreateCampaign = async (campaignData: Partial<Campaign>) => {
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(campaignData),
      });
      if (res.ok) {
        await refreshData();
      }
    } catch (err) {
      console.error('Error creating campaign:', err);
    }
  };

  const handleAddCarta = async (cartaData: Partial<CartaContemplada>) => {
    try {
      const res = await fetch('/api/cartas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(cartaData),
      });
      if (res.ok) {
        await refreshData();
      }
    } catch (err) {
      console.error('Error adding carta:', err);
    }
  };

  const handleUpdateCarta = async (id: string, cartaData: Partial<CartaContemplada>) => {
    try {
      const res = await fetch(`/api/cartas/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(cartaData),
      });
      if (res.ok) {
        await refreshData();
      }
    } catch (err) {
      console.error('Error updating carta:', err);
    }
  };

  const handleDeleteCarta = async (id: string) => {
    try {
      const res = await fetch(`/api/cartas/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        await refreshData();
      }
    } catch (err) {
      console.error('Error deleting carta:', err);
    }
  };

  const handleSendMessage = async (chatId: string, text: string) => {
    try {
      const res = await fetch('/api/whatsapp/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ chatId, text, sender: 'seller' }),
      });
      if (res.ok) {
        await refreshData();
      }
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  const handleToggleOptOut = async (chatId: string) => {
    try {
      const res = await fetch(`/api/whatsapp/${chatId}/opt-out`, {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        await refreshData();
      }
    } catch (err) {
      console.error('Error toggling opt-out:', err);
    }
  };

  const handleTriggerAutoDistribution = async () => {
    const res = await fetch('/api/distribution/auto', {
      method: 'POST',
      credentials: 'include',
    });
    const data = await res.json();
    await refreshData();
    return data;
  };

  const handleUpdateIntegration = async (id: string, updatedData: Partial<Integration>) => {
    const res = await fetch(`/api/integrations/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(updatedData),
    });
    if (res.ok) {
      await refreshData();
    }
  };

  const handleAddTeamMember = async (memberData: Partial<User>) => {
    try {
      const res = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...memberData,
          tenantId: currentUser?.tenantId || 'tenant-1',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { error: data.error || 'Não foi possível cadastrar o vendedor no momento.' };
      }
      await refreshData();
      return data;
    } catch (err: any) {
      return { error: err.message || 'Erro ao conectar ao servidor.' };
    }
  };

  const handleAddOutboundProfile = async (profileData: Partial<OutboundTargetProfile>) => {
    const res = await fetch('/api/outbound/profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(profileData),
    });
    if (res.ok) {
      await refreshData();
    }
  };

  const handleDeleteOutboundProfile = async (id: string) => {
    const res = await fetch(`/api/outbound/profiles/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (res.ok) {
      await refreshData();
    }
  };

  // Visibility enforced strictly from authenticated `public.profiles` role & tenant_id
  const visibleLeads = permissions.isVendedor
    ? leads.filter((l) => l.sellerId === currentUser?.id)
    : permissions.isGestor
    ? leads.filter((l) => l.tenantId === currentUser?.tenantId || (!l.tenantId && currentUser?.tenantId === 'tenant-1'))
    : leads;

  const hotLeadsCount = visibleLeads.filter(
    (l) => l.temperature === 'Muito quente' || l.temperature === 'Quente'
  ).length;

  // Render full-screen authentication gate when signed out (except public landing preview)
  if (!isLoading && !currentUser && currentView !== 'landing_preview') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 antialiased font-sans">
        <AuthModal
          isOpen={true}
          mode="gate"
          onClose={() => {}}
          onAuthSuccess={handleAuthSuccess}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row antialiased font-sans">
      {/* Sidebar Navigation */}
      <Sidebar
        currentView={currentView}
        onNavigate={(view) => setCurrentView(view)}
        userRole={currentUser?.role}
        permissions={permissions}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        hotLeadsCount={hotLeadsCount}
      />

      {/* Main App Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        <Navbar
          currentUser={currentUser}
          permissions={permissions}
          onOpenNewLeadModal={() => {
            setEditingLead(null);
            setIsLeadModalOpen(true);
          }}
          onOpenAiAssistant={() => setCurrentView('ai_assistant')}
          onOpenAdminMaster={() => {
            if (permissions.canAccessAdminMaster) {
              setCurrentView('admin_master');
            }
          }}
          searchQuery={searchQuery}
          onSearchChange={(q) => {
            setSearchQuery(q);
            if (q.trim() && currentView !== 'leads_database') {
              setCurrentView('leads_database');
            }
          }}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          onLogout={handleLogout}
        />

        {/* View Router */}
        <main className="flex-1 p-4 md:p-8">
          {isLoading ? (
            <div className="h-64 flex items-center justify-center text-xs text-blue-400 gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping"></span>
              <span>Carregando perfil autenticado de public.profiles...</span>
            </div>
          ) : (
            <>
              {currentView === 'dashboard' && (
                <DashboardView
                  metrics={metrics}
                  leads={visibleLeads}
                  onSelectLead={(l) => setSelectedLead(l)}
                  onNavigate={(v) => setCurrentView(v)}
                  onQualifyWithGemini={handleQualifyWithGemini}
                  currentUser={currentUser}
                />
              )}

              {currentView === 'lead_hunter' && permissions.allowedViews.includes('lead_hunter') && (
                <LeadHunterView
                  integrations={integrations}
                  campaigns={campaigns}
                  onCreateCampaign={handleCreateCampaign}
                  onNavigate={(v) => setCurrentView(v)}
                />
              )}

              {currentView === 'outbound_prospecting' &&
                permissions.allowedViews.includes('outbound_prospecting') && (
                  <OutboundProspectingView
                    profiles={outboundProfiles}
                    onAddProfile={handleAddOutboundProfile}
                    onDeleteProfile={handleDeleteOutboundProfile}
                    onSelectLead={(l) => setSelectedLead(l)}
                    onNavigate={(v) => setCurrentView(v)}
                    onRefreshAllData={refreshData}
                  />
                )}

              {currentView === 'leads_database' && (
                <LeadsDatabaseView
                  leads={visibleLeads}
                  sellers={team}
                  onSelectLead={(l) => setSelectedLead(l)}
                  onOpenNewLeadModal={() => {
                    setEditingLead(null);
                    setIsLeadModalOpen(true);
                  }}
                  onImportLeads={handleImportLeads}
                  onQualifyWithGemini={handleQualifyWithGemini}
                  onBatchQualify={handleBatchQualify}
                  onDeleteLead={handleDeleteLead}
                />
              )}

              {currentView === 'crm_kanban' && (
                <CrmKanbanView
                  leads={visibleLeads}
                  sellers={team}
                  onSelectLead={(l) => setSelectedLead(l)}
                  onUpdateStatus={handleUpdateStatus}
                  onOpenNewLeadModal={() => {
                    setEditingLead(null);
                    setIsLeadModalOpen(true);
                  }}
                  onQualifyWithGemini={handleQualifyWithGemini}
                />
              )}

              {currentView === 'ai_assistant' && (
                <AiAssistantView
                  leads={visibleLeads}
                  onSelectLead={(l) => setSelectedLead(l)}
                />
              )}

              {currentView === 'campaigns' && permissions.allowedViews.includes('campaigns') && (
                <CampaignsView
                  campaigns={campaigns}
                  onCreateCampaign={handleCreateCampaign}
                  onNavigate={(v) => setCurrentView(v)}
                />
              )}

              {currentView === 'cartas_contempladas' && (
                <CartasContempladasView
                  cartas={cartas}
                  leads={visibleLeads}
                  onSelectLead={(l) => setSelectedLead(l)}
                  onAddCarta={handleAddCarta}
                  onUpdateCarta={handleUpdateCarta}
                  onDeleteCarta={handleDeleteCarta}
                />
              )}

              {currentView === 'products_consorcio' && <ProductsConsorcioView />}

              {currentView === 'simulators' && <SimulatorView />}

              {currentView === 'whatsapp' && (
                <WhatsAppView
                  chats={whatsappChats}
                  onSendMessage={handleSendMessage}
                  onToggleOptOut={handleToggleOptOut}
                />
              )}

              {currentView === 'reports' && permissions.allowedViews.includes('reports') && (
                <ReportsView
                  metrics={metrics}
                  leads={visibleLeads}
                  campaigns={campaigns}
                  sellers={team}
                />
              )}

              {currentView === 'team' && permissions.allowedViews.includes('team') && (
                <TeamView
                  team={team}
                  currentUser={currentUser}
                  onAddMember={handleAddTeamMember}
                  onTriggerAutoDistribution={handleTriggerAutoDistribution}
                  onNavigate={(v) => setCurrentView(v)}
                  onTeamSync={(updated) => setTeam(updated)}
                />
              )}

              {currentView === 'subscriptions' && permissions.allowedViews.includes('subscriptions') && (
                <SubscriptionsView />
              )}

              {currentView === 'settings' && permissions.allowedViews.includes('settings') && (
                <SettingsIntegrationsView
                  integrations={integrations}
                  onUpdateIntegration={handleUpdateIntegration}
                />
              )}

              {currentView === 'admin_master' &&
                permissions.isMaster &&
                permissions.canAccessAdminMaster && (
                  <AdminMasterView
                    currentUser={currentUser}
                    permissions={permissions}
                    onNavigate={(v) => setCurrentView(v)}
                  />
                )}

              {currentView === 'landing_preview' && (
                <CaptureLandingPage
                  campaigns={campaigns}
                  onLeadCaptured={refreshData}
                />
              )}

              {currentView === 'lgpd_compliance' && permissions.allowedViews.includes('lgpd_compliance') && (
                <LgpdComplianceView
                  leads={leads}
                  onDeleteLead={handleDeleteLead}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Modals & Drawers */}
      <LeadModal
        isOpen={isLeadModalOpen}
        onClose={() => {
          setIsLeadModalOpen(false);
          setEditingLead(null);
        }}
        onSave={handleSaveLead}
        sellers={team}
        editLead={editingLead}
      />

      <LeadDetailDrawer
        lead={selectedLead}
        isOpen={!!selectedLead}
        onClose={() => setSelectedLead(null)}
        onQualifyWithGemini={handleQualifyWithGemini}
        onUpdateStatus={handleUpdateStatus}
        onAddTask={handleAddTask}
        onAddNote={handleAddNote}
        onDeleteLead={handleDeleteLead}
        onOpenMatchmaker={() => {
          setSelectedLead(null);
          setCurrentView('cartas_contempladas');
        }}
        isQualifying={isQualifying}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />
    </div>
  );
}
