import { pgTable, text, integer, doublePrecision, boolean, timestamp, serial, jsonb } from 'drizzle-orm/pg-core';

// Users table (Firebase Auth linkage)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  name: text('name'),
  role: text('role').default('vendedor'), // 'master' | 'gestor' | 'vendedor'
  avatar: text('avatar'),
  tenantId: text('tenant_id').default('tenant-1'),
  companyId: text('company_id').default('comp-1'),
  companyName: text('company_name').default('Aliança Consórcios & Investimentos'),
  planId: text('plan_id').default('pro'),
  planName: text('plan_name').default('Plano Profissional'),
  maxSellersLimit: integer('max_sellers_limit').default(3),
  createdAt: timestamp('created_at').defaultNow(),
});

// Profiles table (Supabase & Cloud SQL compatible public.profiles)
export const profiles = pgTable('profiles', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  role: text('role').notNull().default('vendedor'), // 'master' | 'gestor' | 'vendedor'
  tenantId: text('tenant_id'), // NULL for master accounts (global scope)
  companyId: text('company_id'),
  companyName: text('company_name').default('Aliança Consórcios & Investimentos'),
  avatar: text('avatar'),
  phone: text('phone'),
  specialties: jsonb('specialties'),
  region: text('region').default('Brasil'),
  planId: text('plan_id').default('pro'),
  planName: text('plan_name').default('Plano Profissional'),
  maxSellersLimit: integer('max_sellers_limit').default(3),
  activeLeadsCount: integer('active_leads_count').default(0),
  conversionRate: doublePrecision('conversion_rate').default(0),
  available: boolean('available').default(true),
  passwordHash: text('password_hash'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Leads table (Real-time leads database)
export const leads = pgTable('leads', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  phone: text('phone').notNull(),
  email: text('email').notNull(),
  city: text('city').notNull(),
  state: text('state').notNull(),
  product: text('product').notNull(),
  targetValue: doublePrecision('target_value').notNull(),
  installmentBudget: doublePrecision('installment_budget').notNull(),
  purchaseTimeline: text('purchase_timeline').notNull(),
  source: text('source').notNull(),
  score: integer('score').default(50),
  temperature: text('temperature').default('Em desenvolvimento'),
  status: text('status').default('novo'),
  sellerId: text('seller_id'),
  sellerName: text('seller_name'),
  tenantId: text('tenant_id').default('tenant-1'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  consent: boolean('consent').default(true),
  consentDate: text('consent_date'),
  consentIp: text('consent_ip'),
  objections: jsonb('objections'),
  nextRecommendedAction: text('next_recommended_action'),
  aiAnalysisReason: text('ai_analysis_reason'),
  urgency: text('urgency'),
  interestedInContemplada: boolean('interested_in_contemplada'),
  history: jsonb('history'),
  tasks: jsonb('tasks'),
  duplicateOf: text('duplicate_of'),
});

// Cartas Contempladas table
export const cartas = pgTable('cartas', {
  id: text('id').primaryKey(),
  administradora: text('administradora').notNull(),
  tipoCredito: text('tipo_credito').notNull(),
  valorCarta: doublePrecision('valor_carta').notNull(),
  valorEntrada: doublePrecision('valor_entrada').notNull(),
  saldoDevedor: doublePrecision('saldo_devedor').notNull(),
  parcelasRestantes: integer('parcelas_restantes').notNull(),
  valorParcela: doublePrecision('valor_parcela').notNull(),
  grupo: text('grupo'),
  cota: text('cota'),
  documentacao: text('documentacao').default('Em dia'),
  status: text('status').default('disponivel'),
  condicoesTransferencia: text('condicoes_transferencia'),
  updatedDate: text('updated_date'),
  contatoResponsavel: text('contato_responsavel'),
});

// Campaigns table
export const campaigns = pgTable('campaigns', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  product: text('product').notNull(),
  status: text('status').default('ativa'),
  budget: doublePrecision('budget').default(0),
  spent: doublePrecision('spent').default(0),
  leadsCount: integer('leads_count').default(0),
  conversions: integer('conversions').default(0),
  landingSlug: text('landing_slug').notNull(),
  channels: jsonb('channels'),
  utmCampaign: text('utm_campaign'),
  targetAudience: text('target_audience'),
  createdAt: text('created_at').notNull(),
});

// Outbound Profiles table
export const outboundProfiles = pgTable('outbound_profiles', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  industry: text('industry').notNull(),
  cities: jsonb('cities'),
  states: jsonb('states'),
  targetCreditMin: doublePrecision('target_credit_min').notNull(),
  targetCreditMax: doublePrecision('target_credit_max').notNull(),
  targetProduct: text('target_product').notNull(),
  provider: text('provider').notNull(),
  webhookSecret: text('webhook_secret').notNull(),
  active: boolean('active').default(true),
  autoQualifyGemini: boolean('auto_qualify_gemini').default(true),
  leadsFoundCount: integer('leads_found_count').default(0),
  lastSync: text('last_sync'),
  createdAt: text('created_at').notNull(),
});
