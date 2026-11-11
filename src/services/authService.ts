import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { AuthPermissions, User, UserRole } from '../types';
import { NavViewId } from '../components/Sidebar';

export const MASTER_ALLOWED_VIEWS: NavViewId[] = [
  'admin_master',
  'dashboard',
  'lead_hunter',
  'outbound_prospecting',
  'leads_database',
  'crm_kanban',
  'ai_assistant',
  'campaigns',
  'cartas_contempladas',
  'products_consorcio',
  'simulators',
  'whatsapp',
  'landing_preview',
  'reports',
  'team',
  'subscriptions',
  'settings',
  'lgpd_compliance',
];

export const GESTOR_ALLOWED_VIEWS: NavViewId[] = [
  'dashboard',
  'lead_hunter',
  'outbound_prospecting',
  'leads_database',
  'crm_kanban',
  'ai_assistant',
  'campaigns',
  'cartas_contempladas',
  'products_consorcio',
  'simulators',
  'whatsapp',
  'landing_preview',
  'reports',
  'team',
  'subscriptions',
  'settings',
  'lgpd_compliance',
];

export const VENDEDOR_ALLOWED_VIEWS: NavViewId[] = [
  'dashboard',
  'leads_database',
  'crm_kanban',
  'ai_assistant',
  'cartas_contempladas',
  'products_consorcio',
  'simulators',
  'whatsapp',
];

/**
 * Normalizes a database row from public.profiles (Supabase or Cloud SQL PostgreSQL)
 * ensuring the role column is respected verbatim.
 */
function mapProfileRowToUser(row: any): User {
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
      (isMaster ? 'LeadFinder AI Global (SaaS Master)' : 'Aliança Consórcios & Investimentos'),
    phone: row.phone || '',
    specialties: Array.isArray(row.specialties) ? row.specialties : [],
    region: row.region || 'Brasil',
    activeLeadsCount: Number(row.active_leads_count ?? row.activeLeadsCount ?? 0),
    conversionRate: Number(row.conversion_rate ?? row.conversionRate ?? 0),
    available: Boolean(row.available ?? true),
    planId: row.plan_id || row.planId || (isMaster ? 'enterprise' : 'pro'),
    planName: row.plan_name || row.planName || (isMaster ? 'Plano Enterprise' : 'Plano Profissional'),
    maxSellersLimit: isMaster ? 999999 : Number(row.max_sellers_limit ?? row.maxSellersLimit ?? 3),
  };
}

/**
 * Initialization function that verifies whether the authenticated profile has `role: 'master'`
 * from the `profiles` database table and forces unrestricted full privileges in global app state.
 */
export function initializeMasterPrivileges(profile: User | null): {
  user: User | null;
  permissions: AuthPermissions;
  redirectView: NavViewId;
} {
  if (!profile) {
    return {
      user: null,
      permissions: {
        isAuthenticated: false,
        isMaster: false,
        isGestor: false,
        isVendedor: false,
        hasFullAccess: false,
        canAccessAdminMaster: false,
        canManageAllTenants: false,
        canManageGlobalBilling: false,
        canManageTeam: false,
        canConfigureApis: false,
        canViewFinancials: false,
        bypassPlanLimits: false,
        allowedViews: [],
      },
      redirectView: 'dashboard',
    };
  }

  const normalizedRole = String(profile.role || '').toLowerCase().trim();
  const isMaster = normalizedRole === 'master' || normalizedRole === 'admin_master';
  const isGestor = !isMaster && (normalizedRole === 'gestor' || normalizedRole === 'empresa');
  const isVendedor = !isMaster && !isGestor;

  if (isMaster) {
    const elevatedUser: User = {
      ...profile,
      role: 'master',
      tenantId: null,
      companyId: null,
      maxSellersLimit: 999999,
      planId: 'enterprise',
      planName: 'Plano Enterprise (Master Global)',
    };

    return {
      user: elevatedUser,
      permissions: {
        isAuthenticated: true,
        isMaster: true,
        isGestor: false,
        isVendedor: false,
        hasFullAccess: true,
        canAccessAdminMaster: true,
        canManageAllTenants: true,
        canManageGlobalBilling: true,
        canManageTeam: true,
        canConfigureApis: true,
        canViewFinancials: true,
        bypassPlanLimits: true,
        allowedViews: [...MASTER_ALLOWED_VIEWS],
      },
      redirectView: 'admin_master',
    };
  }

  if (isGestor) {
    return {
      user: { ...profile, role: 'gestor' },
      permissions: {
        isAuthenticated: true,
        isMaster: false,
        isGestor: true,
        isVendedor: false,
        hasFullAccess: false,
        canAccessAdminMaster: false, // Explicitly blocked from Painel Master SaaS
        canManageAllTenants: false,
        canManageGlobalBilling: false,
        canManageTeam: true,
        canConfigureApis: true,
        canViewFinancials: true,
        bypassPlanLimits: false,
        allowedViews: [...GESTOR_ALLOWED_VIEWS],
      },
      redirectView: 'dashboard',
    };
  }

  return {
    user: { ...profile, role: 'vendedor' },
    permissions: {
      isAuthenticated: true,
      isMaster: false,
      isGestor: false,
      isVendedor: true,
      hasFullAccess: false,
      canAccessAdminMaster: false,
      canManageAllTenants: false,
      canManageGlobalBilling: false,
      canManageTeam: false,
      canConfigureApis: false,
      canViewFinancials: false,
      bypassPlanLimits: false,
      allowedViews: [...VENDEDOR_ALLOWED_VIEWS],
    },
    redirectView: 'dashboard',
  };
}

/**
 * Fetches user profile directly from `public.profiles` (via Supabase if configured,
 * and via real PostgreSQL backend API backed by Drizzle ORM).
 */
export async function fetchProfileFromDatabase(identifier: {
  id?: string;
  email?: string;
}): Promise<User | null> {
  // 1. If external Supabase project is configured via VITE_SUPABASE_URL/KEY, query Supabase `profiles` directly
  if (isSupabaseConfigured && supabase) {
    let query = supabase.from('profiles').select('*');
    if (identifier.id) {
      query = query.eq('id', identifier.id);
    } else if (identifier.email) {
      query = query.eq('email', identifier.email.toLowerCase());
    }
    const { data, error } = await query.maybeSingle();
    if (!error && data) {
      return mapProfileRowToUser(data);
    }
  }

  // 2. Query real backend PostgreSQL `public.profiles` table
  const params = new URLSearchParams();
  if (identifier.email) params.set('email', identifier.email);
  if (identifier.id) params.set('id', identifier.id);

  const res = await fetch(`/api/auth/profile?${params.toString()}`, {
    credentials: 'include',
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.user ? mapProfileRowToUser(data.user) : null;
}

/**
 * Initializes authenticated session directly from the database (`public.profiles`).
 * Removes any hardcoded mock session state.
 */
export async function initializeAuthSession(): Promise<{
  user: User | null;
  permissions: AuthPermissions;
  redirectView: NavViewId;
}> {
  try {
    // 1. Check Supabase active Auth session if configured
    if (isSupabaseConfigured && supabase) {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        const profile =
          (await fetchProfileFromDatabase({ id: session.user.id })) ||
          (session.user.email
            ? await fetchProfileFromDatabase({ email: session.user.email })
            : null);

        if (profile) {
          return initializeMasterPrivileges(profile);
        }
      }
    }

    // 2. Fetch live session & profile from PostgreSQL `public.profiles`
    const res = await fetch('/api/auth/session', {
      credentials: 'include',
    });

    if (!res.ok) {
      return initializeMasterPrivileges(null);
    }

    const data = await res.json();
    if (!data.authenticated || !data.user) {
      return initializeMasterPrivileges(null);
    }

    const dbProfile = mapProfileRowToUser(data.user);
    return initializeMasterPrivileges(dbProfile);
  } catch (err) {
    console.error('Error initializing auth session from profiles table:', err);
    return initializeMasterPrivileges(null);
  }
}

export async function loginWithEmail(
  email: string,
  password: string
): Promise<{
  user: User | null;
  permissions: AuthPermissions;
  redirectView: NavViewId;
  error?: string;
}> {
  try {
    const cleanEmail = email.trim().toLowerCase();

    // If Supabase Auth is configured, authenticate with Supabase and read `profiles.role`
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        return { ...initializeMasterPrivileges(null), error: error.message };
      }

      if (data.user) {
        const profile =
          (await fetchProfileFromDatabase({ id: data.user.id })) ||
          (await fetchProfileFromDatabase({ email: cleanEmail }));

        if (!profile) {
          return {
            ...initializeMasterPrivileges(null),
            error: 'Perfil não encontrado na tabela public.profiles.',
          };
        }

        // Synchronize backend cookie session with verified profile
        await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email: cleanEmail, password }),
        }).catch(() => {});

        return initializeMasterPrivileges(profile);
      }
    }

    // Authenticate directly against PostgreSQL `public.profiles` via backend session endpoint
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email: cleanEmail, password }),
    });

    const payload = await res.json();
    if (!res.ok || !payload.user) {
      return {
        ...initializeMasterPrivileges(null),
        error: payload.error || 'E-mail ou senha inválidos na tabela profiles.',
      };
    }

    return initializeMasterPrivileges(mapProfileRowToUser(payload.user));
  } catch (err: any) {
    return {
      ...initializeMasterPrivileges(null),
      error: err?.message || 'Erro de comunicação ao autenticar.',
    };
  }
}

export async function registerUserAccount(params: {
  name: string;
  email: string;
  password: string;
  role: 'gestor' | 'vendedor';
  companyName?: string;
}): Promise<{
  user: User | null;
  permissions: AuthPermissions;
  redirectView: NavViewId;
  error?: string;
}> {
  try {
    const cleanEmail = params.email.trim().toLowerCase();

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: params.password,
        options: {
          data: { name: params.name, role: params.role },
        },
      });
      if (error) {
        return { ...initializeMasterPrivileges(null), error: error.message };
      }
      if (data.user) {
        // Insert/read profile row with safe non-master role
        await supabase.from('profiles').upsert({
          id: data.user.id,
          email: cleanEmail,
          name: params.name,
          role: params.role,
          tenant_id: params.role === 'gestor' ? `tenant-${Date.now()}` : 'tenant-1',
        });
      }
    }

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        name: params.name,
        email: cleanEmail,
        password: params.password,
        role: params.role, // Server strictly rejects 'master' on public registration
        companyName: params.companyName,
      }),
    });

    const payload = await res.json();
    if (!res.ok || !payload.user) {
      return {
        ...initializeMasterPrivileges(null),
        error: payload.error || 'Não foi possível criar conta.',
      };
    }

    return initializeMasterPrivileges(mapProfileRowToUser(payload.user));
  } catch (err: any) {
    return {
      ...initializeMasterPrivileges(null),
      error: err?.message || 'Erro ao registrar conta.',
    };
  }
}

export async function logoutAuthSession(): Promise<void> {
  try {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
  } catch (err) {
    console.error('Error during logout:', err);
  }
}
