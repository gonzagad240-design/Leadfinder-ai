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
  updateUserProfile,
} from './services/authService';
import {
  isDemoUser,
  getInitialDemoDataset,
  buildDemoMetrics,
} from './services/demoData';
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
import {
  ProfileSettingsModal,
  ProfileUpdatePayload,
} from './components/ProfileSettingsModal';
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
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isQualifying, setIsQualifying] = useState(false);

  // Authenticated User & Privileges State (loaded exclusively from `public.profiles`)
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<AuthPermissions>(DEFAULT_LOGGED_OUT_PERMISSIONS);
  const [currentPlan, setCurrentPlan] = useState<string>('enterprise');

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

  const isDemoSession = isDemoUser(currentUser);

  const applyDemoLeads = useCallback(
    (nextLeads: Lead[], nextCartas = cartas, nextCampaigns = campaigns) => {
      setLeads(nextLeads);
      setMetrics(buildDemoMetrics(nextLeads, nextCartas, nextCampaigns));
      setSelectedLead((prev) =>
        prev ? nextLeads.find((l) => l.id === prev.id) || null : null
      );
    },
    [cartas, campaigns]
  );

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
      setCurrentPlan('enterprise');
      return;
    }

    if (isDemoUser(activeUser)) {
      const demo = getInitialDemoDataset();
      setMetrics(demo.metrics);
      setLeads(demo.leads);
      setCartas(demo.cartas);
      setCampaigns(demo.campaigns);
      setTeam(demo.team);
      setIntegrations(demo.integrations);
      setWhatsappChats(demo.whatsappChats);
      setOutboundProfiles(demo.outboundProfiles);
      setCurrentPlan(activeUser?.planId || 'enterprise');
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
        const [integrationsRes, outboundRes, settingsRes] = await Promise.all([
          fetch('/api/integrations', { credentials: 'include' }),
          fetch('/api/outbound/profiles', { credentials: 'include' }),
          fetch('/api/settings', { credentials: 'include' }),
        ]);
        setIntegrations(integrationsRes.ok ? await integrationsRes.json() : []);
        setOutboundProfiles(outboundRes.ok ? await outboundRes.json() : []);
        if (settingsRes.ok) {
          const settingsData = await settingsRes.json();
          setCurrentPlan(
            activePermissions.isMaster
              ? settingsData?.currentPlan || 'enterprise'
              : activeUser?.planId || settingsData?.currentPlan || 'enterprise'
          );
        } else {
          setCurrentPlan(activeUser?.planId || 'enterprise');
        }
      } else {
        setIntegrations([]);
        setOutboundProfiles([]);
        setCurrentPlan(activeUser?.planId || 'enterprise');
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
    if (!permissions.isAuthenticated || isDemoSession) return;

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
  }, [permissions.isAuthenticated, permissions.isVendedor, permissions.isGestor, currentUser?.id, currentUser?.tenantId, isDemoSession]);

  // Real-time synchronization for Supabase `public.leads` table changes
  useEffect(() => {
    if (!permissions.isAuthenticated || isDemoSession) return;
    const unsubscribe = subscribeToSupabaseLeadsRealtime(currentUser, (updatedLeads) => {
      setLeads(updatedLeads);
    });
    return () => {
      unsubscribe();
    };
  }, [permissions.isAuthenticated, currentUser?.id, currentUser?.role, currentUser?.tenantId, isDemoSession]);

  // Real-time synchronization for `public.profiles` across the global app state
  useEffect(() => {
    if (!permissions.isAuthenticated || isDemoSession) return;
    const unsubscribe = subscribeToProfilesRealtime(currentUser, (updated) => {
      setTeam(updated);
    });
    return () => {
      unsubscribe();
    };
  }, [permissions.isAuthenticated, currentUser?.id, currentUser?.role, currentUser?.tenantId, isDemoSession]);

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
    setSelectedLead(null);
    setSearchQuery('');
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
    setSelectedLead(null);
    setSearchQuery('');
    setCurrentUser(null);
    setPermissions(DEFAULT_LOGGED_OUT_PERMISSIONS);
    setCurrentView('dashboard');
    await fetchDomainData(DEFAULT_LOGGED_OUT_PERMISSIONS, null);
  };

  const refreshData = async () => {
    if (isDemoSession) {
      setMetrics(buildDemoMetrics(leads, cartas, campaigns));
      return;
    }
    await fetchDomainData(permissions, currentUser);
  };

  const handleSaveLead = async (leadData: Partial<Lead>) => {
    if (isDemoSession) {
      const nowIso = new Date().toISOString();
      if (editingLead) {
        const updatedLeads = leads.map((l) =>
          l.id === editingLead.id ? { ...l, ...leadData, updatedAt: nowIso } : l
        );
        applyDemoLeads(updatedLeads);
        setEditingLead(null);
        return;
      }
      const assignedSeller =
        team.find((m) => m.id === leadData.sellerId) ||
        team.find((m) => m.role === 'vendedor');
      const created: Lead = {
        id: `demo-lead-${Date.now()}`,
        name: leadData.name || 'Novo Lead Demo',
        phone: leadData.phone || '(11) 99000-0000',
        email: leadData.email || '',
        city: leadData.city || 'São Paulo',
        state: leadData.state || 'SP',
        product: leadData.product || 'Imóvel',
        targetValue: Number(leadData.targetValue) || 250000,
        installmentBudget: Number(leadData.installmentBudget) || 2000,
        purchaseTimeline: leadData.purchaseTimeline || 'Curto prazo (1 a 3 meses)',
        source: leadData.source || 'Cadastro Manual (Demo)',
        score: Number(leadData.score ?? 74),
        temperature: leadData.temperature || 'Quente',
        status: leadData.status || 'novo',
        sellerId: assignedSeller?.id || currentUser?.id || 'demo-evaluator-1',
        sellerName: assignedSeller?.name || currentUser?.name || 'Avaliador (Conta Demo)',
        tenantId: 'tenant-demo',
        createdAt: nowIso,
        updatedAt: nowIso,
        consent: leadData.consent ?? true,
        consentDate: nowIso,
        objections: leadData.objections || [],
        nextRecommendedAction:
          leadData.nextRecommendedAction || 'Enviar simulação comparativa sem juros.',
        aiAnalysisReason:
          leadData.aiAnalysisReason || 'Oportunidade registrada no ambiente Demo.',
        urgency: leadData.urgency || 'Média',
        interestedInContemplada: Boolean(leadData.interestedInContemplada),
        history: [],
        tasks: [],
      };
      applyDemoLeads([created, ...leads]);
      setEditingLead(null);
      return;
    }

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
    if (isDemoSession) {
      const nowIso = new Date().toISOString();
      const sellers = team.filter((m) => m.role === 'vendedor');
      const created: Lead[] = importedRows.map((row, idx) => {
        const seller = sellers.length > 0 ? sellers[idx % sellers.length] : currentUser;
        return {
          id: `demo-imp-${Date.now()}-${idx}`,
          name: row.name || `Lead Importado ${idx + 1}`,
          phone: row.phone || '(11) 99000-0000',
          email: row.email || '',
          city: row.city || 'São Paulo',
          state: row.state || 'SP',
          product: row.product || 'Imóvel',
          targetValue: Number(row.targetValue) || 300000,
          installmentBudget: Number(row.installmentBudget) || 2200,
          purchaseTimeline: row.purchaseTimeline || 'Curto prazo (1 a 3 meses)',
          source: row.source || 'Importação CSV (Demo)',
          score: Number(row.score ?? 68),
          temperature: row.temperature || 'Quente',
          status: row.status || 'novo',
          sellerId: seller?.id || 'demo-evaluator-1',
          sellerName: seller?.name || 'Avaliador (Conta Demo)',
          tenantId: 'tenant-demo',
          createdAt: nowIso,
          updatedAt: nowIso,
          consent: true,
          consentDate: nowIso,
          objections: [],
          nextRecommendedAction: 'Realizar contato inicial de triagem.',
          aiAnalysisReason: 'Importado em lote no ambiente demonstrativo.',
          urgency: 'Média',
          interestedInContemplada: Boolean(row.interestedInContemplada),
          history: [],
          tasks: [],
        };
      });
      applyDemoLeads([...created, ...leads]);
      return created.length;
    }

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
    if (isDemoSession) {
      applyDemoLeads(leads.filter((l) => l.id !== leadId));
      return;
    }

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
    if (isDemoSession) {
      setIsQualifying(true);
      const nextScore = 89;
      const nowIso = new Date().toISOString();
      const updatedLeads = leads.map((l) =>
        l.id === leadId
          ? {
              ...l,
              score: nextScore,
              temperature: 'Muito quente' as const,
              urgency: 'Alta' as const,
              aiAnalysisReason:
                'Qualificação Gemini (Demo): parcela compatível com a carta pretendida e alto potencial de conversão em 30 dias.',
              nextRecommendedAction:
                'Apresentar simulação com lance embutido de 25% e verificar disponibilidade para carta contemplada.',
              updatedAt: nowIso,
              history: [
                {
                  id: `dh-${Date.now()}`,
                  date: nowIso,
                  type: 'ai_qualification' as const,
                  description: `Gemini 3.8 pontuou ${nextScore}/100 na simulação do ambiente Demo.`,
                  author: 'Gemini Copilot',
                },
                ...(l.history || []),
              ],
            }
          : l
      );
      applyDemoLeads(updatedLeads);
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.7 },
      });
      setIsQualifying(false);
      return;
    }

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
    if (isDemoSession) {
      const nowIso = new Date().toISOString();
      const updatedLeads = leads.map((l) =>
        l.id === leadId
          ? {
              ...l,
              status: newStatus,
              updatedAt: nowIso,
              history: [
                {
                  id: `dh-${Date.now()}`,
                  date: nowIso,
                  type: 'status_change' as const,
                  description: `Etapa alterada para ${newStatus.replace(/_/g, ' ')} (Demo).`,
                  author: currentUser?.name || 'Avaliador Demo',
                },
                ...(l.history || []),
              ],
            }
          : l
      );
      applyDemoLeads(updatedLeads);
      if (newStatus === 'venda_concluida') {
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 } });
      }
      return;
    }

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

    if (isDemoSession) {
      const updatedLeads = leads.map((l) =>
        l.id === leadId ? { ...l, tasks: updatedTasks } : l
      );
      applyDemoLeads(updatedLeads);
      return;
    }

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

    if (isDemoSession) {
      const updatedLeads = leads.map((l) =>
        l.id === leadId ? { ...l, history: newHistory } : l
      );
      applyDemoLeads(updatedLeads);
      return;
    }

    const updated = await updateLeadRecord(leadId, { history: newHistory });
    if (updated) {
      if (selectedLead?.id === leadId) setSelectedLead(updated);
      await refreshData();
    }
  };

  const handleCreateCampaign = async (campaignData: Partial<Campaign>) => {
    if (isDemoSession) {
      const newCampaign: Campaign = {
        id: `demo-camp-${Date.now()}`,
        name: campaignData.name || 'Nova Campanha Demo',
        product: campaignData.product || 'Imóvel',
        status: 'ativa',
        budget: Number(campaignData.budget) || 2500,
        spent: 0,
        leadsCount: 0,
        conversions: 0,
        landingSlug: campaignData.landingSlug || `demo-${Date.now().toString().slice(-4)}`,
        channels: campaignData.channels || {
          metaAds: true,
          googleAds: true,
          whatsapp: true,
          landingPage: true,
        },
        utmCampaign: campaignData.utmCampaign || 'demo_campaign',
        targetAudience: campaignData.targetAudience || 'Público Demo Qualificado',
        createdAt: new Date().toISOString(),
      };
      setCampaigns((prev) => [newCampaign, ...prev]);
      return;
    }

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
    if (isDemoSession) {
      const newCarta: CartaContemplada = {
        id: `demo-carta-${Date.now()}`,
        administradora: cartaData.administradora || 'Porto Seguro Consórcios',
        tipoCredito: cartaData.tipoCredito || 'Imóvel',
        valorCarta: Number(cartaData.valorCarta) || 400000,
        valorEntrada: Number(cartaData.valorEntrada) || 120000,
        saldoDevedor: Number(cartaData.saldoDevedor) || 350000,
        parcelasRestantes: Number(cartaData.parcelasRestantes) || 160,
        valorParcela: Number(cartaData.valorParcela) || 2650,
        grupo: cartaData.grupo || '0850',
        cota: cartaData.cota || '112',
        documentacao: cartaData.documentacao || 'Aprovada',
        status: cartaData.status || 'disponivel',
        condicoesTransferencia:
          cartaData.condicoesTransferencia || 'Transferência rápida (Demo).',
        updatedDate: new Date().toISOString(),
        contatoResponsavel: currentUser?.name || 'Avaliador (Conta Demo)',
      };
      setCartas((prev) => [newCarta, ...prev]);
      return;
    }

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
    if (isDemoSession) {
      setCartas((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, ...cartaData, updatedDate: new Date().toISOString() } : c
        )
      );
      return;
    }

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
    if (isDemoSession) {
      setCartas((prev) => prev.filter((c) => c.id !== id));
      return;
    }

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
    if (isDemoSession) {
      const nowIso = new Date().toISOString();
      setWhatsappChats((prev) =>
        prev.map((c) =>
          c.id === chatId
            ? {
                ...c,
                lastMessage: text,
                lastMessageTime: nowIso,
                messages: [
                  ...c.messages,
                  {
                    id: `dm-${Date.now()}`,
                    sender: 'seller',
                    text,
                    timestamp: nowIso,
                  },
                ],
              }
            : c
        )
      );
      return;
    }

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
    if (isDemoSession) {
      setWhatsappChats((prev) =>
        prev.map((c) => (c.id === chatId ? { ...c, optOut: !c.optOut } : c))
      );
      return;
    }

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
    if (isDemoSession) {
      const sellers = team.filter((m) => m.role === 'vendedor' && m.available);
      if (sellers.length === 0) {
        throw new Error('Nenhum vendedor disponível na equipe Demo.');
      }
      let distributedCount = 0;
      const updatedLeads = leads.map((lead, idx) => {
        if (!lead.sellerId || lead.sellerId === 'demo-evaluator-1') {
          const target = sellers[idx % sellers.length];
          distributedCount += 1;
          return { ...lead, sellerId: target.id, sellerName: target.name };
        }
        return lead;
      });
      applyDemoLeads(updatedLeads);
      return { distributedCount };
    }

    const res = await fetch('/api/distribution/auto', {
      method: 'POST',
      credentials: 'include',
    });
    const data = await res.json();
    await refreshData();
    return data;
  };

  const handleUpdateIntegration = async (id: string, updatedData: Partial<Integration>) => {
    if (isDemoSession) {
      setIntegrations((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...updatedData } : item))
      );
      return;
    }

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

  const handleChangePlan = async (planId: string) => {
    setCurrentPlan(planId);
    if (isDemoSession) {
      setCurrentUser((prev) => (prev ? { ...prev, planId } : prev));
      return;
    }

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ currentPlan: planId }),
      });
      if (res.ok) {
        const updated = await res.json();
        if (updated?.currentPlan) {
          setCurrentPlan(updated.currentPlan);
        }
      }
    } catch (err) {
      console.error('Error updating active plan setting:', err);
    }
  };

  const handleSaveProfile = async (
    updates: ProfileUpdatePayload
  ): Promise<{ error?: string }> => {
    if (!currentUser) {
      return { error: 'Sessão não autenticada.' };
    }

    if (isDemoSession) {
      const updatedUser: User = {
        ...currentUser,
        ...(updates.avatar ? { avatar: updates.avatar } : {}),
        ...(updates.name ? { name: updates.name } : {}),
        ...(updates.phone !== undefined ? { phone: updates.phone } : {}),
      };
      setCurrentUser(updatedUser);
      setTeam((prev) =>
        prev.map((member) => (member.id === updatedUser.id ? updatedUser : member))
      );
      return {};
    }

    const res = await updateUserProfile(currentUser, updates);
    if (res.error || !res.user) {
      return { error: res.error || 'Erro ao atualizar perfil.' };
    }
    const updatedUser = res.user;
    setCurrentUser(updatedUser);
    setPermissions(res.permissions);
    setTeam((prev) =>
      prev.map((member) => (member.id === updatedUser.id ? updatedUser : member))
    );
    return {};
  };

  const handleAddTeamMember = async (memberData: Partial<User>) => {
    if (isDemoSession) {
      const newMember: User = {
        id: `demo-seller-${Date.now()}`,
        name: memberData.name || 'Novo Consultor Demo',
        email: memberData.email || `consultor.${Date.now()}@leadfinder.ai`,
        role: memberData.role || 'vendedor',
        avatar:
          memberData.avatar ||
          'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
        tenantId: 'tenant-demo',
        companyId: 'comp-demo',
        companyName: currentUser?.companyName || 'Horizonte Consórcios (Demonstração)',
        phone: memberData.phone || '(11) 99000-0000',
        specialties: memberData.specialties || ['Imóvel'],
        region: memberData.region || 'São Paulo',
        activeLeadsCount: 0,
        conversionRate: 0,
        available: true,
        planId: currentPlan,
        planName: currentUser?.planName || 'Plano Enterprise (Demo)',
        maxSellersLimit: 999999,
      };
      setTeam((prev) => [...prev, newMember]);
      return { user: newMember };
    }

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

  const handleDeleteDemoTeamMember = async (memberId: string) => {
    if (memberId === currentUser?.id) return;
    setTeam((prev) => prev.filter((m) => m.id !== memberId));
  };

  const handleAddOutboundProfile = async (profileData: Partial<OutboundTargetProfile>) => {
    if (isDemoSession) {
      const newProfile: OutboundTargetProfile = {
        id: `demo-out-${Date.now()}`,
        name: profileData.name || 'Nova Prospecção Demo',
        industry: profileData.industry || 'Transporte de Cargas & Logística',
        cities: profileData.cities || ['São Paulo'],
        states: profileData.states || ['SP'],
        targetCreditMin: Number(profileData.targetCreditMin) || 350000,
        targetCreditMax: Number(profileData.targetCreditMax) || 950000,
        targetProduct: profileData.targetProduct || 'Imóvel',
        provider: profileData.provider || 'google_places',
        webhookSecret: `demo_whsec_${Date.now().toString(36)}`,
        autoQualifyGemini: profileData.autoQualifyGemini ?? true,
        status: 'ativo',
        leadsFoundCount: 0,
        createdAt: new Date().toISOString(),
      };
      setOutboundProfiles((prev) => [newProfile, ...prev]);
      return;
    }

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
    if (isDemoSession) {
      setOutboundProfiles((prev) => prev.filter((p) => p.id !== id));
      return;
    }

    const res = await fetch(`/api/outbound/profiles/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (res.ok) {
      await refreshData();
    }
  };

  const handleDemoRunSearch = (profile: OutboundTargetProfile): Lead[] => {
    const nowIso = new Date().toISOString();
    const city = profile.cities[0] || 'Campinas';
    const state = profile.states[0] || 'SP';
    const sellers = team.filter((m) => m.role === 'vendedor');
    const seller = sellers[0] || currentUser;

    const generated: Lead[] = [
      {
        id: `demo-out-lead-${Date.now()}-1`,
        name: `Grupo Horizonte ${city} Ltda`,
        phone: '(11) 99310-4488',
        email: `diretoria@horizonte${city.toLowerCase().replace(/\s+/g, '')}.com.br`,
        city,
        state,
        product: profile.targetProduct,
        targetValue: Math.round((profile.targetCreditMin + profile.targetCreditMax) / 2),
        installmentBudget: 4800,
        purchaseTimeline: 'Curto prazo (1 a 3 meses)',
        source: `Outbound Demo (${profile.provider})`,
        score: 86,
        temperature: 'Muito quente',
        status: 'qualificado',
        sellerId: seller?.id || 'demo-evaluator-1',
        sellerName: seller?.name || 'Avaliador (Conta Demo)',
        tenantId: 'tenant-demo',
        createdAt: nowIso,
        updatedAt: nowIso,
        consent: true,
        consentDate: nowIso,
        objections: [],
        nextRecommendedAction: 'Enviar proposta de expansão de frota/patrimônio via carta programada.',
        aiAnalysisReason: `Empresa compatível com o perfil alvo "${profile.name}".`,
        urgency: 'Alta',
        interestedInContemplada: false,
        history: [],
        tasks: [],
      },
      {
        id: `demo-out-lead-${Date.now()}-2`,
        name: `Comercial Vanguarda ${state}`,
        phone: '(19) 99741-1122',
        email: 'compras@vanguardacomercial.com.br',
        city: profile.cities[1] || city,
        state,
        product: profile.targetProduct,
        targetValue: profile.targetCreditMin,
        installmentBudget: 3500,
        purchaseTimeline: 'Médio prazo (3 a 6 meses)',
        source: `Outbound Demo (${profile.provider})`,
        score: 77,
        temperature: 'Quente',
        status: 'novo',
        sellerId: (sellers[1] || seller)?.id || 'demo-evaluator-1',
        sellerName: (sellers[1] || seller)?.name || 'Avaliador (Conta Demo)',
        tenantId: 'tenant-demo',
        createdAt: nowIso,
        updatedAt: nowIso,
        consent: true,
        consentDate: nowIso,
        objections: [],
        nextRecommendedAction: 'Validar interesse com decisor financeiro por WhatsApp.',
        aiAnalysisReason: `Prospect localizado na região ${city}/${state}.`,
        urgency: 'Média',
        interestedInContemplada: false,
        history: [],
        tasks: [],
      },
    ];

    applyDemoLeads([...generated, ...leads]);
    setOutboundProfiles((prev) =>
      prev.map((p) =>
        p.id === profile.id
          ? {
              ...p,
              leadsFoundCount: p.leadsFoundCount + generated.length,
              lastSync: nowIso,
            }
          : p
      )
    );
    return generated;
  };

  const handleDemoCaptureLead = (leadData: Partial<Lead>) => {
    const nowIso = new Date().toISOString();
    const sellers = team.filter((m) => m.role === 'vendedor');
    const seller = sellers[0] || currentUser;

    const captured: Lead = {
      id: `demo-capture-${Date.now()}`,
      name: leadData.name || 'Visitante Landing Demo',
      phone: leadData.phone || '(11) 99000-0000',
      email: leadData.email || '',
      city: leadData.city || 'São Paulo',
      state: leadData.state || 'SP',
      product: leadData.product || 'Imóvel',
      targetValue: Number(leadData.targetValue) || 350000,
      installmentBudget: Number(leadData.installmentBudget) || 2400,
      purchaseTimeline: leadData.purchaseTimeline || 'Curto prazo (1 a 3 meses)',
      source: leadData.source || 'Landing Page Oficial (Demo)',
      score: 82,
      temperature: 'Quente',
      status: 'novo',
      sellerId: seller?.id || 'demo-evaluator-1',
      sellerName: seller?.name || 'Avaliador (Conta Demo)',
      tenantId: 'tenant-demo',
      createdAt: nowIso,
      updatedAt: nowIso,
      consent: true,
      consentDate: nowIso,
      objections: [],
      nextRecommendedAction: 'Responder em menos de 5 minutos com simulação personalizada.',
      aiAnalysisReason: 'Captado diretamente pelo formulário da Landing Page no modo Demo.',
      urgency: 'Alta',
      interestedInContemplada: Boolean(leadData.interestedInContemplada),
      history: [],
      tasks: [],
    };
    applyDemoLeads([captured, ...leads]);
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
          onOpenProfileSettings={() => setIsProfileModalOpen(true)}
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
                  isDemoMode={isDemoSession}
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
                    onDemoRunSearch={isDemoSession ? handleDemoRunSearch : undefined}
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
                  isDemoMode={isDemoSession}
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
                  isDemoMode={isDemoSession}
                />
              )}

              {currentView === 'products_consorcio' && <ProductsConsorcioView />}

              {currentView === 'simulators' && <SimulatorView />}

              {currentView === 'whatsapp' && (
                <WhatsAppView
                  chats={whatsappChats}
                  onSendMessage={handleSendMessage}
                  onToggleOptOut={handleToggleOptOut}
                  isDemoMode={isDemoSession}
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
                  onDeleteMember={isDemoSession ? handleDeleteDemoTeamMember : undefined}
                  onTriggerAutoDistribution={handleTriggerAutoDistribution}
                  onNavigate={(v) => setCurrentView(v)}
                  onTeamSync={(updated) => setTeam(updated)}
                />
              )}

              {currentView === 'subscriptions' && permissions.allowedViews.includes('subscriptions') && (
                <SubscriptionsView
                  currentUser={currentUser}
                  currentPlan={currentPlan}
                  onChangePlan={handleChangePlan}
                />
              )}

              {currentView === 'settings' && permissions.allowedViews.includes('settings') && (
                <SettingsIntegrationsView
                  integrations={integrations}
                  onUpdateIntegration={handleUpdateIntegration}
                  currentUser={currentUser}
                  onSaveProfile={handleSaveProfile}
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
                  onDemoCaptureLead={isDemoSession ? handleDemoCaptureLead : undefined}
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

      <ProfileSettingsModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        currentUser={currentUser}
        onSaveProfile={handleSaveProfile}
      />
    </div>
  );
}
