export type UserRole = 'master' | 'gestor' | 'vendedor' | 'admin_master' | 'empresa';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  tenantId: string | null;
  companyId: string | null;
  companyName: string;
  phone: string;
  specialties: string[];
  region: string;
  activeLeadsCount: number;
  conversionRate: number;
  available: boolean;
  planId?: string;
  planName?: string;
  maxSellersLimit?: number;
}

export interface AuthPermissions {
  isAuthenticated: boolean;
  isMaster: boolean;
  isGestor: boolean;
  isVendedor: boolean;
  hasFullAccess: boolean;
  canAccessAdminMaster: boolean;
  canManageAllTenants: boolean;
  canManageGlobalBilling: boolean;
  canManageTeam: boolean;
  canConfigureApis: boolean;
  canViewFinancials: boolean;
  bypassPlanLimits: boolean;
  allowedViews: string[];
}

export type LeadTemperature = 'Muito quente' | 'Quente' | 'Em desenvolvimento' | 'Frio';

export type CrmStage = 
  | 'novo'
  | 'qualificado'
  | 'primeiro_contato'
  | 'em_negociacao'
  | 'proposta_enviada'
  | 'aguardando_resposta'
  | 'venda_concluida'
  | 'perdido';

export type ConsorcioProduct = 
  | 'Imóvel'
  | 'Automóvel'
  | 'Motocicleta'
  | 'Caminhão'
  | 'Máquinas Agrícolas'
  | 'Construção/Reforma'
  | 'Investimento Imobiliário'
  | 'Carta Contemplada'
  | 'Serviços';

export interface LeadHistoryItem {
  id: string;
  date: string;
  type: 'status_change' | 'contact' | 'note' | 'ai_qualification' | 'task';
  description: string;
  author: string;
}

export interface LeadTask {
  id: string;
  title: string;
  dueDate: string;
  completed: boolean;
  priority: 'baixa' | 'media' | 'alta';
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  state: string;
  product: ConsorcioProduct;
  targetValue: number;
  installmentBudget: number;
  purchaseTimeline: 'Imediato (até 30 dias)' | 'Curto prazo (1 a 3 meses)' | 'Médio prazo (3 a 6 meses)' | 'Longo prazo (acima de 6 meses)';
  source: string;
  score: number; // 0 - 100
  temperature: LeadTemperature;
  status: CrmStage;
  sellerId: string;
  sellerName: string;
  tenantId?: string;
  createdAt: string;
  updatedAt: string;
  consent: boolean;
  consentDate: string;
  consentIp?: string;
  objections: string[];
  nextRecommendedAction: string;
  aiAnalysisReason: string;
  history: LeadHistoryItem[];
  tasks: LeadTask[];
  duplicateOf?: string;
  urgency?: 'Alta' | 'Média' | 'Baixa';
  interestedInContemplada?: boolean;
}

export interface CartaContemplada {
  id: string;
  administradora: string;
  tipoCredito: ConsorcioProduct;
  valorCarta: number;
  valorEntrada: number;
  saldoDevedor: number;
  parcelasRestantes: number;
  valorParcela: number;
  grupo: string;
  cota: string;
  documentacao: 'Em dia' | 'Pendente análise' | 'Aprovada';
  status: 'disponivel' | 'reservada' | 'transferida';
  condicoesTransferencia: string;
  updatedDate: string;
  contatoResponsavel?: string;
}

export interface Campaign {
  id: string;
  name: string;
  product: ConsorcioProduct;
  status: 'ativa' | 'pausada' | 'concluida';
  budget: number;
  spent: number;
  leadsCount: number;
  conversions: number;
  landingSlug: string;
  channels: {
    metaAds: boolean;
    googleAds: boolean;
    whatsapp: boolean;
    landingPage: boolean;
  };
  utmCampaign: string;
  targetAudience: string;
  createdAt: string;
}

export interface Integration {
  id: string;
  name: string;
  provider: 'meta_ads' | 'google_ads' | 'whatsapp_cloud' | 'mercado_pago' | 'stripe';
  category: 'Tráfego & Anúncios' | 'Mensageria' | 'Pagamentos';
  status: 'connected' | 'pending' | 'disconnected';
  lastSync?: string;
  description: string;
  apiKey?: string;
  config: Record<string, string>;
}

export interface WhatsAppMessage {
  id: string;
  sender: 'lead' | 'bot' | 'seller';
  text: string;
  timestamp: string;
  automated?: boolean;
}

export interface WhatsAppChat {
  id: string;
  leadId: string;
  leadName: string;
  phone: string;
  product: string;
  status: 'aguardando' | 'em_atendimento' | 'qualificado_ia' | 'encaminhado' | 'descadastrado';
  optOut: boolean;
  lastMessage: string;
  lastMessageTime: string;
  messages: WhatsAppMessage[];
}

export interface SaaSPlan {
  id: 'basic' | 'pro' | 'business' | 'enterprise';
  name: string;
  tagline: string;
  priceMonthly: number;
  priceAnnual: number;
  maxLeadsMonth: number | 'Ilimitado';
  maxSellers: number | 'Ilimitado';
  aiIncluded: boolean;
  whatsappIncluded: boolean;
  hunterIncluded: boolean;
  customIntegrations: boolean;
  popular?: boolean;
}

export interface SystemMetrics {
  totalLeads: number;
  newLeadsToday: number;
  hotLeads: number;
  inNegotiationLeads: number;
  wonLeads: number;
  conversionRate: number;
  potentialPipelineValue: number;
  estimatedCommissions: number;
}

export type OutboundProvider = 'phantombuster' | 'outscraper' | 'google_places' | 'custom_webhook';

export interface OutboundTargetProfile {
  id: string;
  name: string;
  industry: string; // Ramo de atividade (ex: Construção Civil, Transporte de Cargas, Produtores de Grãos, Clínicas Médicas)
  cities: string[];
  states: string[];
  targetCreditMin: number;
  targetCreditMax: number;
  targetProduct: ConsorcioProduct;
  provider: OutboundProvider;
  webhookSecret: string;
  apiKey?: string;
  autoQualifyGemini: boolean;
  status: 'ativo' | 'pausado';
  leadsFoundCount: number;
  lastSync?: string;
  createdAt: string;
}

