import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Lead, User } from '../types';

/**
 * Formats a numeric BRL currency amount cleanly as "R$ 0,00" when zero.
 */
export function formatBRL(value: number): string {
  const safeVal = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
    .format(safeVal)
    .replace(/\u00a0/g, ' ');
}

/**
 * Calculates pipeline volume (SUM of targetValue) and estimated commissions (2.5%)
 * dynamically from the real database leads list, returning exact 0 when empty.
 */
export function calculateLeadPipelineMetrics(leadsList: Lead[]): {
  potentialPipelineValue: number;
  estimatedCommissions: number;
  wonCount: number;
  conversionRate: number;
} {
  if (!Array.isArray(leadsList) || leadsList.length === 0) {
    return {
      potentialPipelineValue: 0,
      estimatedCommissions: 0,
      wonCount: 0,
      conversionRate: 0,
    };
  }

  const potentialPipelineValue = leadsList.reduce(
    (sum, lead) => sum + (Number(lead.targetValue) || 0),
    0
  );
  const estimatedCommissions =
    Math.round(potentialPipelineValue * 0.025 * 100) / 100;
  const wonCount = leadsList.filter((l) => l.status === 'venda_concluida').length;
  const conversionRate = Number(((wonCount / leadsList.length) * 100).toFixed(1));

  return {
    potentialPipelineValue,
    estimatedCommissions,
    wonCount,
    conversionRate,
  };
}

function normalizeLeadRow(row: any): Lead {
  return {
    id: row.id,
    name: row.name || '',
    phone: row.phone || '',
    email: row.email || '',
    city: row.city || '',
    state: row.state || '',
    product: row.product || 'Imóvel',
    targetValue: Number(row.target_value ?? row.targetValue ?? 0),
    installmentBudget: Number(row.installment_budget ?? row.installmentBudget ?? 0),
    purchaseTimeline: row.purchase_timeline ?? row.purchaseTimeline ?? 'Curto prazo (1 a 3 meses)',
    source: row.source || '',
    score: Number(row.score ?? 50),
    temperature: row.temperature ?? 'Em desenvolvimento',
    status: row.status ?? 'novo',
    sellerId: row.seller_id ?? row.sellerId ?? '',
    sellerName: row.seller_name ?? row.sellerName ?? '',
    tenantId: row.tenant_id ?? row.tenantId ?? 'tenant-1',
    createdAt: row.created_at ?? row.createdAt ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? row.updatedAt ?? new Date().toISOString(),
    consent: Boolean(row.consent ?? true),
    consentDate: row.consent_date ?? row.consentDate ?? new Date().toISOString(),
    consentIp: row.consent_ip ?? row.consentIp,
    objections: Array.isArray(row.objections) ? row.objections : [],
    nextRecommendedAction: row.next_recommended_action ?? row.nextRecommendedAction ?? '',
    aiAnalysisReason: row.ai_analysis_reason ?? row.aiAnalysisReason ?? '',
    history: Array.isArray(row.history) ? row.history : [],
    tasks: Array.isArray(row.tasks) ? row.tasks : [],
    duplicateOf: row.duplicate_of ?? row.duplicateOf,
    urgency: row.urgency ?? 'Média',
    interestedInContemplada: Boolean(
      row.interested_in_contemplada ?? row.interestedInContemplada ?? false
    ),
  };
}

function toSupabaseLeadPayload(lead: Partial<Lead>, currentUser: User | null, idx = 0) {
  const nowIso = new Date().toISOString();
  return {
    id: lead.id || `lead-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
    name: lead.name || 'Novo Lead',
    phone: lead.phone || '',
    email: lead.email || '',
    city: lead.city || 'São Paulo',
    state: lead.state || 'SP',
    product: lead.product || 'Imóvel',
    target_value: Number(lead.targetValue) || 0,
    installment_budget: Number(lead.installmentBudget) || 0,
    purchase_timeline: lead.purchaseTimeline || 'Curto prazo (1 a 3 meses)',
    source: lead.source || 'Cadastro Manual',
    score: Number(lead.score ?? 50) || 50,
    temperature: lead.temperature || 'Em desenvolvimento',
    status: lead.status || 'novo',
    seller_id: lead.sellerId || currentUser?.id || '',
    seller_name: lead.sellerName || currentUser?.name || '',
    tenant_id: lead.tenantId || currentUser?.tenantId || 'tenant-1',
    created_at: lead.createdAt || nowIso,
    updated_at: nowIso,
    consent: lead.consent ?? true,
    consent_date: lead.consentDate || nowIso,
    objections: Array.isArray(lead.objections) ? lead.objections : [],
    next_recommended_action: lead.nextRecommendedAction || '',
    ai_analysis_reason: lead.aiAnalysisReason || '',
    history: Array.isArray(lead.history) ? lead.history : [],
    tasks: Array.isArray(lead.tasks) ? lead.tasks : [],
    urgency: lead.urgency || 'Média',
    interested_in_contemplada: Boolean(lead.interestedInContemplada ?? false),
  };
}

/**
 * Fetches leads directly from Supabase `leads` table (when configured)
 * or backend Cloud SQL `/api/leads` endpoint. Never returns mock leads.
 */
export async function fetchRealtimeLeads(currentUser: User | null): Promise<Lead[]> {
  if (isSupabaseConfigured && supabase) {
    let query = supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });

    const role = String(currentUser?.role || '').toLowerCase();
    if (role === 'vendedor' && currentUser?.id) {
      query = query.eq('seller_id', currentUser.id);
    } else if ((role === 'gestor' || role === 'empresa') && currentUser?.tenantId) {
      query = query.eq('tenant_id', currentUser.tenantId);
    }

    const { data, error } = await query;
    if (!error && Array.isArray(data)) {
      return data.map(normalizeLeadRow);
    }
  }

  const res = await fetch('/api/leads', { credentials: 'include' });
  if (!res.ok) {
    return [];
  }
  const rows = await res.json();
  return Array.isArray(rows) ? rows.map(normalizeLeadRow) : [];
}

/**
 * Inserts a new lead directly into Supabase `leads` (when configured)
 * or via `/api/leads` in PostgreSQL.
 */
export async function createLeadRecord(
  leadData: Partial<Lead>,
  currentUser: User | null
): Promise<Lead | null> {
  if (isSupabaseConfigured && supabase) {
    const payload = toSupabaseLeadPayload(leadData, currentUser);
    const { data, error } = await supabase.from('leads').insert(payload).select().single();
    if (!error && data) {
      return normalizeLeadRow(data);
    }
  }

  const res = await fetch('/api/leads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(leadData),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data?.lead ? normalizeLeadRow(data.lead) : null;
}

/**
 * Updates an existing lead in Supabase `leads` (when configured)
 * or via `/api/leads/:id` in PostgreSQL.
 */
export async function updateLeadRecord(
  leadId: string,
  updates: Partial<Lead>
): Promise<Lead | null> {
  if (isSupabaseConfigured && supabase) {
    const patch: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (updates.name !== undefined) patch.name = updates.name;
    if (updates.phone !== undefined) patch.phone = updates.phone;
    if (updates.email !== undefined) patch.email = updates.email;
    if (updates.city !== undefined) patch.city = updates.city;
    if (updates.state !== undefined) patch.state = updates.state;
    if (updates.product !== undefined) patch.product = updates.product;
    if (updates.targetValue !== undefined) patch.target_value = Number(updates.targetValue) || 0;
    if (updates.installmentBudget !== undefined) patch.installment_budget = Number(updates.installmentBudget) || 0;
    if (updates.purchaseTimeline !== undefined) patch.purchase_timeline = updates.purchaseTimeline;
    if (updates.status !== undefined) patch.status = updates.status;
    if (updates.score !== undefined) patch.score = updates.score;
    if (updates.temperature !== undefined) patch.temperature = updates.temperature;
    if (updates.sellerId !== undefined) patch.seller_id = updates.sellerId;
    if (updates.sellerName !== undefined) patch.seller_name = updates.sellerName;
    if (updates.tasks !== undefined) patch.tasks = updates.tasks;
    if (updates.history !== undefined) patch.history = updates.history;
    if (updates.objections !== undefined) patch.objections = updates.objections;
    if (updates.nextRecommendedAction !== undefined) patch.next_recommended_action = updates.nextRecommendedAction;
    if (updates.aiAnalysisReason !== undefined) patch.ai_analysis_reason = updates.aiAnalysisReason;
    if (updates.urgency !== undefined) patch.urgency = updates.urgency;
    if (updates.interestedInContemplada !== undefined) patch.interested_in_contemplada = updates.interestedInContemplada;

    const { data, error } = await supabase
      .from('leads')
      .update(patch)
      .eq('id', leadId)
      .select()
      .single();

    if (!error && data) {
      return normalizeLeadRow(data);
    }
  }

  const res = await fetch(`/api/leads/${leadId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(updates),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data ? normalizeLeadRow(data) : null;
}

/**
 * Deletes a lead directly from Supabase `leads` (when configured)
 * or via `/api/leads/:id`.
 */
export async function deleteLeadRecord(leadId: string): Promise<boolean> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('leads').delete().eq('id', leadId);
    if (!error) return true;
  }

  const res = await fetch(`/api/leads/${leadId}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  return res.ok;
}

/**
 * Bulk-imports parsed lead records directly into Supabase `leads` (when configured)
 * or `/api/leads/import` in PostgreSQL.
 */
export async function importLeadsRecords(
  leadsInput: Partial<Lead>[],
  currentUser: User | null
): Promise<Lead[]> {
  if (!Array.isArray(leadsInput) || leadsInput.length === 0) return [];

  if (isSupabaseConfigured && supabase) {
    const rows = leadsInput.map((l, idx) =>
      toSupabaseLeadPayload({ ...l, source: l.source || 'Importação Base de Dados' }, currentUser, idx)
    );
    const { data, error } = await supabase.from('leads').insert(rows).select();
    if (!error && Array.isArray(data)) {
      return data.map(normalizeLeadRow);
    }
  }

  const res = await fetch('/api/leads/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ leads: leadsInput }),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data?.leads) ? data.leads.map(normalizeLeadRow) : [];
}

/**
 * Subscribes directly to Supabase Realtime Postgres changes on `public.leads`
 * when Supabase is configured, keeping dashboard SUM totals synced instantaneously.
 */
export function subscribeToSupabaseLeadsRealtime(
  currentUser: User | null,
  onLeadsUpdated: (leads: Lead[]) => void
): () => void {
  if (!isSupabaseConfigured || !supabase) {
    return () => {};
  }

  let disposed = false;
  const channel = supabase
    .channel('public:leads-realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'leads' },
      async () => {
        const latest = await fetchRealtimeLeads(currentUser);
        if (!disposed) {
          onLeadsUpdated(latest);
        }
      }
    )
    .subscribe();

  return () => {
    disposed = true;
    if (supabase) {
      supabase.removeChannel(channel);
    }
  };
}
