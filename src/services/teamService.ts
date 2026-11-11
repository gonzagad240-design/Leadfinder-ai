import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { User, UserRole } from '../types';

function normalizeProfileRow(row: any): User {
  const rawRole = String(row.role || 'vendedor').toLowerCase().trim() as UserRole;
  const isMaster = rawRole === 'master' || rawRole === 'admin_master';

  return {
    id: row.id,
    email: row.email,
    name: row.name || row.full_name || row.email.split('@')[0],
    role: isMaster ? 'master' : rawRole,
    avatar:
      row.avatar ||
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    tenantId: isMaster ? null : (row.tenant_id ?? row.tenantId ?? 'tenant-1'),
    companyId: isMaster ? null : (row.company_id ?? row.companyId ?? 'comp-1'),
    companyName:
      row.company_name ||
      row.companyName ||
      (isMaster
        ? 'LeadFinder AI Global (SaaS Master)'
        : 'Aliança Consórcios & Investimentos'),
    phone: row.phone || '',
    specialties: Array.isArray(row.specialties) ? row.specialties : [],
    region: row.region || 'Brasil',
    activeLeadsCount: Number(row.active_leads_count ?? row.activeLeadsCount ?? 0),
    conversionRate: Number(row.conversion_rate ?? row.conversionRate ?? 0),
    available: Boolean(row.available ?? true),
    planId: row.plan_id || row.planId || (isMaster ? 'enterprise' : 'pro'),
    planName:
      row.plan_name ||
      row.planName ||
      (isMaster ? 'Plano Enterprise' : 'Plano Profissional'),
    maxSellersLimit: isMaster
      ? 999999
      : Number(row.max_sellers_limit ?? row.maxSellersLimit ?? 3),
  };
}

/**
 * Queries real users strictly from `public.profiles` (Supabase Realtime DB if configured,
 * or PostgreSQL backend /api/team endpoint). Contains zero mock arrays.
 */
export async function fetchRealtimeProfiles(currentUser: User | null): Promise<User[]> {
  if (isSupabaseConfigured && supabase) {
    let query = supabase.from('profiles').select('*');
    const isMaster =
      currentUser?.role === 'master' || currentUser?.role === 'admin_master';
    if (!isMaster && currentUser?.tenantId) {
      query = query.eq('tenant_id', currentUser.tenantId);
    }
    const { data, error } = await query;
    if (!error && Array.isArray(data)) {
      const priority: Record<string, number> = {
        master: 0,
        admin_master: 0,
        gestor: 1,
        empresa: 1,
        vendedor: 2,
      };
      return data
        .map(normalizeProfileRow)
        .sort((a, b) => (priority[a.role] ?? 9) - (priority[b.role] ?? 9));
    }
  }

  const res = await fetch('/api/team', { credentials: 'include' });
  if (!res.ok) {
    return [];
  }
  const rows = await res.json();
  return Array.isArray(rows) ? rows.map(normalizeProfileRow) : [];
}

/**
 * Subscribes in real time to changes on `public.profiles` (via Supabase Realtime Postgres Changes
 * when configured, and via backend PostgreSQL SSE stream `/api/team/stream`).
 */
export function subscribeToProfilesRealtime(
  currentUser: User | null,
  onProfilesUpdated: (profiles: User[]) => void
): () => void {
  let disposed = false;

  const refresh = async () => {
    try {
      const latest = await fetchRealtimeProfiles(currentUser);
      if (!disposed) {
        onProfilesUpdated(latest);
      }
    } catch (err) {
      console.error('Error syncing realtime profiles:', err);
    }
  };

  // 1. Optional Supabase postgres_changes subscription when configured
  let supabaseChannel: ReturnType<NonNullable<typeof supabase>['channel']> | null = null;
  if (isSupabaseConfigured && supabase) {
    supabaseChannel = supabase
      .channel('public:profiles-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          refresh();
        }
      )
      .subscribe();
  }

  // 2. Real-time PostgreSQL SSE stream (`/api/team/stream`)
  let eventSource: EventSource | null = null;
  try {
    eventSource = new EventSource('/api/team/stream');
    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'profiles_updated' && Array.isArray(payload.profiles)) {
          if (!disposed) {
            onProfilesUpdated(payload.profiles.map(normalizeProfileRow));
          }
        } else if (payload.type === 'profiles_changed') {
          refresh();
        }
      } catch {
        // Ignore ping frames
      }
    };
  } catch (err) {
    console.warn('Notice starting team realtime stream:', err);
  }

  return () => {
    disposed = true;
    if (eventSource) {
      eventSource.close();
    }
    if (supabaseChannel && supabase) {
      supabase.removeChannel(supabaseChannel);
    }
  };
}

export async function deleteRealtimeProfile(id: string): Promise<{ success?: boolean; error?: string }> {
  try {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('profiles').delete().eq('id', id);
      if (!error) return { success: true };
    }

    const res = await fetch(`/api/team/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) {
      return { error: data.error || 'Não foi possível remover este utilizador.' };
    }
    return { success: true };
  } catch (err: any) {
    return { error: err?.message || 'Erro de comunicação ao remover perfil.' };
  }
}
