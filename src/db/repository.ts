import { desc, eq, isNull, sql } from 'drizzle-orm';
import { db } from './index.ts';
import { leads, cartas, campaigns, outboundProfiles, profiles } from './schema.ts';
import type { Lead, CartaContemplada, User, UserRole } from '../types.ts';

function mapRowToUser(r: typeof profiles.$inferSelect): User {
  return {
    id: r.id,
    email: r.email,
    name: r.name,
    role: (r.role as UserRole) || 'vendedor',
    avatar: r.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    tenantId: r.tenantId ?? null,
    companyId: r.companyId ?? null,
    companyName: r.companyName || (r.role === 'master' ? 'LeadFinder AI Global (SaaS Master)' : 'Aliança Consórcios & Investimentos'),
    phone: r.phone || '',
    specialties: Array.isArray(r.specialties) ? (r.specialties as string[]) : [],
    region: r.region || 'Brasil',
    activeLeadsCount: Number(r.activeLeadsCount ?? 0),
    conversionRate: Number(r.conversionRate ?? 0),
    available: Boolean(r.available ?? true),
    planId: r.planId || (r.role === 'master' ? 'enterprise' : 'pro'),
    planName: r.planName || (r.role === 'master' ? 'Plano Enterprise' : 'Plano Profissional'),
    maxSellersLimit: r.role === 'master' ? 999999 : Number(r.maxSellersLimit ?? 3),
  };
}

export async function getDbProfileByEmail(email: string): Promise<(User & { passwordHash?: string | null }) | null> {
  try {
    const normalized = email.trim().toLowerCase();
    const rows = await db
      .select()
      .from(profiles)
      .where(sql`LOWER(${profiles.email}) = ${normalized}`)
      .limit(1);
    if (!rows[0]) return null;
    return {
      ...mapRowToUser(rows[0]),
      passwordHash: rows[0].passwordHash,
    };
  } catch (error) {
    console.error('Failed to query profile by email from Cloud SQL:', error);
    return null;
  }
}

export async function getDbProfileById(id: string): Promise<(User & { passwordHash?: string | null }) | null> {
  try {
    const rows = await db.select().from(profiles).where(eq(profiles.id, id)).limit(1);
    if (!rows[0]) return null;
    return {
      ...mapRowToUser(rows[0]),
      passwordHash: rows[0].passwordHash,
    };
  } catch (error) {
    console.error('Failed to query profile by id from Cloud SQL:', error);
    return null;
  }
}

export async function getDbProfiles(tenantId?: string | null, role?: string): Promise<User[]> {
  try {
    const isMaster = role === 'master' || role === 'admin_master' || tenantId === null;
    const rows = isMaster
      ? await db.select().from(profiles)
      : await db.select().from(profiles).where(eq(profiles.tenantId, tenantId || 'tenant-1'));

    const priority: Record<string, number> = {
      master: 0,
      admin_master: 0,
      gestor: 1,
      empresa: 1,
      vendedor: 2,
    };

    return rows
      .map(mapRowToUser)
      .sort((a, b) => (priority[a.role] ?? 9) - (priority[b.role] ?? 9));
  } catch (error) {
    console.error('Failed to list profiles from Cloud SQL:', error);
    return [];
  }
}

export async function deleteDbProfile(id: string): Promise<{ deleted: boolean; reason?: string }> {
  const existing = await getDbProfileById(id);
  if (!existing) {
    return { deleted: false, reason: 'Usuário não encontrado em public.profiles.' };
  }
  if (existing.role === 'master' || existing.email.toLowerCase() === 'gonzagad240@gmail.com') {
    return { deleted: false, reason: 'O utilizador Master (gonzagad240@gmail.com) não pode ser removido.' };
  }
  await db.delete(profiles).where(eq(profiles.id, id));
  return { deleted: true };
}

export async function incrementDbProfileActiveLeads(id: string): Promise<void> {
  try {
    await db
      .update(profiles)
      .set({
        activeLeadsCount: sql`COALESCE(${profiles.activeLeadsCount}, 0) + 1`,
        updatedAt: new Date(),
      })
      .where(eq(profiles.id, id));
  } catch (error) {
    console.error('Failed to increment profile active leads count:', error);
  }
}

export async function upsertDbProfile(
  profileData: Partial<User> & { id: string; email: string; name: string; passwordHash?: string | null }
): Promise<User> {
  const normalizedEmail = profileData.email.trim().toLowerCase();
  const safeRole = (profileData.role || 'vendedor') as string;
  const resolvedTenantId = safeRole === 'master' ? null : (profileData.tenantId ?? 'tenant-1');

  await db
    .insert(profiles)
    .values({
      id: profileData.id,
      email: normalizedEmail,
      name: profileData.name,
      role: safeRole,
      tenantId: resolvedTenantId,
      companyId: safeRole === 'master' ? null : (profileData.companyId ?? 'comp-1'),
      companyName:
        profileData.companyName ||
        (safeRole === 'master' ? 'LeadFinder AI Global (SaaS Master)' : 'Aliança Consórcios & Investimentos'),
      avatar: profileData.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      phone: profileData.phone || '',
      specialties: profileData.specialties || ['Imóvel'],
      region: profileData.region || 'Brasil',
      planId: profileData.planId || (safeRole === 'master' ? 'enterprise' : 'pro'),
      planName: profileData.planName || (safeRole === 'master' ? 'Plano Enterprise' : 'Plano Profissional'),
      maxSellersLimit: safeRole === 'master' ? 999999 : (profileData.maxSellersLimit ?? 3),
      activeLeadsCount: profileData.activeLeadsCount ?? 0,
      conversionRate: profileData.conversionRate ?? 0,
      available: profileData.available ?? true,
      passwordHash: profileData.passwordHash ?? null,
    })
    .onConflictDoUpdate({
      target: profiles.email,
      set: {
        name: profileData.name,
        role: safeRole,
        tenantId: resolvedTenantId,
        companyId: safeRole === 'master' ? null : (profileData.companyId ?? 'comp-1'),
        companyName:
          profileData.companyName ||
          (safeRole === 'master' ? 'LeadFinder AI Global (SaaS Master)' : 'Aliança Consórcios & Investimentos'),
        planId: profileData.planId || (safeRole === 'master' ? 'enterprise' : 'pro'),
        planName: profileData.planName || (safeRole === 'master' ? 'Plano Enterprise' : 'Plano Profissional'),
        maxSellersLimit: safeRole === 'master' ? 999999 : (profileData.maxSellersLimit ?? 3),
        ...(profileData.avatar !== undefined ? { avatar: profileData.avatar } : {}),
        updatedAt: new Date(),
      },
    });

  const saved = await getDbProfileByEmail(normalizedEmail);
  if (!saved) throw new Error('Falha ao recuperar perfil salvo em public.profiles.');
  return saved;
}

export async function updateDbProfileDetails(
  id: string,
  updates: {
    avatar?: string;
    name?: string;
    phone?: string;
    region?: string;
  }
): Promise<User | null> {
  const existing = await getDbProfileById(id);
  if (!existing) return null;

  const patch: Record<string, any> = { updatedAt: new Date() };
  if (typeof updates.avatar === 'string' && updates.avatar.trim()) {
    patch.avatar = updates.avatar.trim();
  }
  if (typeof updates.name === 'string' && updates.name.trim()) {
    patch.name = updates.name.trim();
  }
  if (typeof updates.phone === 'string') {
    patch.phone = updates.phone.trim();
  }
  if (typeof updates.region === 'string' && updates.region.trim()) {
    patch.region = updates.region.trim();
  }

  await db.update(profiles).set(patch).where(eq(profiles.id, id));
  const refreshed = await getDbProfileById(id);
  if (!refreshed) return null;
  const { passwordHash: _ph, ...safeUser } = refreshed;
  return safeUser;
}

export async function getDbLeads(): Promise<Lead[]> {
  try {
    const rows = await db.select().from(leads).orderBy(desc(leads.createdAt));
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      phone: r.phone,
      email: r.email,
      city: r.city,
      state: r.state,
      product: r.product as any,
      targetValue: Number(r.targetValue),
      installmentBudget: Number(r.installmentBudget),
      purchaseTimeline: r.purchaseTimeline as any,
      source: r.source,
      score: r.score ?? 50,
      temperature: (r.temperature as any) ?? 'Em desenvolvimento',
      status: (r.status as any) ?? 'novo',
      sellerId: r.sellerId || '',
      sellerName: r.sellerName || '',
      tenantId: r.tenantId || 'tenant-1',
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      consent: Boolean(r.consent),
      consentDate: r.consentDate || r.createdAt,
      consentIp: r.consentIp || undefined,
      objections: Array.isArray(r.objections) ? (r.objections as string[]) : [],
      nextRecommendedAction: r.nextRecommendedAction || '',
      aiAnalysisReason: r.aiAnalysisReason || '',
      history: Array.isArray(r.history) ? (r.history as any[]) : [],
      tasks: Array.isArray(r.tasks) ? (r.tasks as any[]) : [],
      duplicateOf: r.duplicateOf || undefined,
      urgency: (r.urgency as any) || 'Média',
      interestedInContemplada: Boolean(r.interestedInContemplada),
    }));
  } catch (error) {
    console.error('Failed to get leads from Cloud SQL:', error);
    throw new Error('Falha ao consultar banco de dados de leads.', { cause: error });
  }
}

export async function getDbLeadById(leadId: string): Promise<Lead | null> {
  try {
    const rows = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
    const r = rows[0];
    if (!r) return null;
    return {
      id: r.id,
      name: r.name,
      phone: r.phone,
      email: r.email,
      city: r.city,
      state: r.state,
      product: r.product as any,
      targetValue: Number(r.targetValue),
      installmentBudget: Number(r.installmentBudget),
      purchaseTimeline: r.purchaseTimeline as any,
      source: r.source,
      score: r.score ?? 50,
      temperature: (r.temperature as any) ?? 'Em desenvolvimento',
      status: (r.status as any) ?? 'novo',
      sellerId: r.sellerId || '',
      sellerName: r.sellerName || '',
      tenantId: r.tenantId || 'tenant-1',
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      consent: Boolean(r.consent),
      consentDate: r.consentDate || r.createdAt,
      consentIp: r.consentIp || undefined,
      objections: Array.isArray(r.objections) ? (r.objections as string[]) : [],
      nextRecommendedAction: r.nextRecommendedAction || '',
      aiAnalysisReason: r.aiAnalysisReason || '',
      history: Array.isArray(r.history) ? (r.history as any[]) : [],
      tasks: Array.isArray(r.tasks) ? (r.tasks as any[]) : [],
      duplicateOf: r.duplicateOf || undefined,
      urgency: (r.urgency as any) || 'Média',
      interestedInContemplada: Boolean(r.interestedInContemplada),
    };
  } catch (error) {
    console.error('Failed to query lead by id from Cloud SQL:', error);
    return null;
  }
}

export async function insertDbLead(lead: Lead): Promise<Lead> {
  try {
    await db
      .insert(leads)
      .values({
        id: lead.id,
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        city: lead.city,
        state: lead.state,
        product: lead.product,
        targetValue: lead.targetValue,
        installmentBudget: lead.installmentBudget,
        purchaseTimeline: lead.purchaseTimeline,
        source: lead.source,
        score: lead.score,
        temperature: lead.temperature,
        status: lead.status,
        sellerId: lead.sellerId,
        sellerName: lead.sellerName,
        tenantId: lead.tenantId || 'tenant-1',
        createdAt: lead.createdAt,
        updatedAt: lead.updatedAt,
        consent: lead.consent,
        consentDate: lead.consentDate,
        consentIp: lead.consentIp,
        objections: lead.objections,
        nextRecommendedAction: lead.nextRecommendedAction,
        aiAnalysisReason: lead.aiAnalysisReason,
        urgency: lead.urgency,
        interestedInContemplada: lead.interestedInContemplada,
        history: lead.history,
        tasks: lead.tasks,
        duplicateOf: lead.duplicateOf,
      })
      .onConflictDoUpdate({
        target: leads.id,
        set: {
          name: lead.name,
          phone: lead.phone,
          email: lead.email,
          city: lead.city,
          state: lead.state,
          product: lead.product,
          targetValue: lead.targetValue,
          installmentBudget: lead.installmentBudget,
          purchaseTimeline: lead.purchaseTimeline,
          source: lead.source,
          score: lead.score,
          temperature: lead.temperature,
          status: lead.status,
          sellerId: lead.sellerId,
          sellerName: lead.sellerName,
          tenantId: lead.tenantId || 'tenant-1',
          updatedAt: lead.updatedAt,
          objections: lead.objections,
          nextRecommendedAction: lead.nextRecommendedAction,
          aiAnalysisReason: lead.aiAnalysisReason,
          urgency: lead.urgency,
          interestedInContemplada: lead.interestedInContemplada,
          history: lead.history,
          tasks: lead.tasks,
        },
      });

    return lead;
  } catch (error) {
    console.error('Failed to insert lead into Cloud SQL:', error);
    throw new Error('Falha ao salvar lead no banco de dados.', { cause: error });
  }
}

export async function updateDbLead(leadId: string, partial: Partial<Lead>): Promise<void> {
  try {
    const valuesToUpdate: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };

    if (partial.name !== undefined) valuesToUpdate.name = partial.name;
    if (partial.phone !== undefined) valuesToUpdate.phone = partial.phone;
    if (partial.email !== undefined) valuesToUpdate.email = partial.email;
    if (partial.city !== undefined) valuesToUpdate.city = partial.city;
    if (partial.state !== undefined) valuesToUpdate.state = partial.state;
    if (partial.product !== undefined) valuesToUpdate.product = partial.product;
    if (partial.targetValue !== undefined) valuesToUpdate.targetValue = partial.targetValue;
    if (partial.installmentBudget !== undefined) valuesToUpdate.installmentBudget = partial.installmentBudget;
    if (partial.purchaseTimeline !== undefined) valuesToUpdate.purchaseTimeline = partial.purchaseTimeline;
    if (partial.status !== undefined) valuesToUpdate.status = partial.status;
    if (partial.score !== undefined) valuesToUpdate.score = partial.score;
    if (partial.temperature !== undefined) valuesToUpdate.temperature = partial.temperature;
    if (partial.sellerId !== undefined) valuesToUpdate.sellerId = partial.sellerId;
    if (partial.sellerName !== undefined) valuesToUpdate.sellerName = partial.sellerName;
    if (partial.tenantId !== undefined) valuesToUpdate.tenantId = partial.tenantId;
    if (partial.objections !== undefined) valuesToUpdate.objections = partial.objections;
    if (partial.nextRecommendedAction !== undefined) valuesToUpdate.nextRecommendedAction = partial.nextRecommendedAction;
    if (partial.aiAnalysisReason !== undefined) valuesToUpdate.aiAnalysisReason = partial.aiAnalysisReason;
    if (partial.history !== undefined) valuesToUpdate.history = partial.history;
    if (partial.tasks !== undefined) valuesToUpdate.tasks = partial.tasks;
    if (partial.urgency !== undefined) valuesToUpdate.urgency = partial.urgency;
    if (partial.interestedInContemplada !== undefined) valuesToUpdate.interestedInContemplada = partial.interestedInContemplada;

    await db.update(leads).set(valuesToUpdate).where(eq(leads.id, leadId));
  } catch (error) {
    console.error('Failed to update lead in Cloud SQL:', error);
    throw new Error('Falha ao atualizar lead no banco de dados.', { cause: error });
  }
}

export async function deleteDbLead(leadId: string): Promise<void> {
  try {
    await db.delete(leads).where(eq(leads.id, leadId));
  } catch (error) {
    console.error('Failed to delete lead from Cloud SQL:', error);
    throw new Error('Falha ao excluir lead do banco de dados.', { cause: error });
  }
}

export async function getDbLeadsPipelineTotals(options?: {
  role?: string;
  sellerId?: string | null;
  tenantId?: string | null;
}): Promise<{
  totalLeads: number;
  potentialPipelineValue: number;
  estimatedCommissions: number;
}> {
  try {
    const role = String(options?.role || 'vendedor').toLowerCase();
    const isMaster = role === 'master' || role === 'admin_master';
    const isGestor = role === 'gestor' || role === 'empresa';

    let rows: { totalCredit: number; leadsCount: number }[];

    if (isMaster) {
      rows = await db
        .select({
          totalCredit: sql<number>`COALESCE(SUM(${leads.targetValue}), 0)`,
          leadsCount: sql<number>`COUNT(*)::int`,
        })
        .from(leads);
    } else if (isGestor) {
      const tid = options?.tenantId || 'tenant-1';
      rows = await db
        .select({
          totalCredit: sql<number>`COALESCE(SUM(${leads.targetValue}), 0)`,
          leadsCount: sql<number>`COUNT(*)::int`,
        })
        .from(leads)
        .where(eq(leads.tenantId, tid));
    } else {
      const sid = options?.sellerId || '__unassigned__';
      rows = await db
        .select({
          totalCredit: sql<number>`COALESCE(SUM(${leads.targetValue}), 0)`,
          leadsCount: sql<number>`COUNT(*)::int`,
        })
        .from(leads)
        .where(eq(leads.sellerId, sid));
    }

    const totalCredit = Number(rows[0]?.totalCredit ?? 0) || 0;
    const totalLeads = Number(rows[0]?.leadsCount ?? 0) || 0;
    const estimatedCommissions =
      totalLeads > 0 ? Math.round(totalCredit * 0.025 * 100) / 100 : 0;

    return {
      totalLeads,
      potentialPipelineValue: totalLeads > 0 ? totalCredit : 0,
      estimatedCommissions,
    };
  } catch (error) {
    console.error('Failed to aggregate SUM(target_value) from Cloud SQL leads:', error);
    return {
      totalLeads: 0,
      potentialPipelineValue: 0,
      estimatedCommissions: 0,
    };
  }
}

export async function getDbCartas(): Promise<CartaContemplada[]> {
  try {
    const rows = await db.select().from(cartas);
    return rows.map((r) => ({
      id: r.id,
      administradora: r.administradora,
      tipoCredito: r.tipoCredito as any,
      valorCarta: Number(r.valorCarta),
      valorEntrada: Number(r.valorEntrada),
      saldoDevedor: Number(r.saldoDevedor),
      parcelasRestantes: Number(r.parcelasRestantes),
      valorParcela: Number(r.valorParcela),
      grupo: r.grupo || '',
      cota: r.cota || '',
      documentacao: (r.documentacao as any) || 'Em dia',
      status: (r.status as any) || 'disponivel',
      condicoesTransferencia: r.condicoesTransferencia || '',
      updatedDate: r.updatedDate || new Date().toISOString(),
      contatoResponsavel: r.contatoResponsavel || undefined,
    }));
  } catch (error) {
    console.error('Failed to fetch cartas from Cloud SQL:', error);
    return [];
  }
}

export async function insertDbCarta(carta: CartaContemplada): Promise<void> {
  try {
    await db
      .insert(cartas)
      .values({
        id: carta.id,
        administradora: carta.administradora,
        tipoCredito: carta.tipoCredito,
        valorCarta: carta.valorCarta,
        valorEntrada: carta.valorEntrada,
        saldoDevedor: carta.saldoDevedor,
        parcelasRestantes: carta.parcelasRestantes,
        valorParcela: carta.valorParcela,
        grupo: carta.grupo,
        cota: carta.cota,
        documentacao: carta.documentacao,
        status: carta.status,
        condicoesTransferencia: carta.condicoesTransferencia,
        updatedDate: carta.updatedDate,
        contatoResponsavel: carta.contatoResponsavel,
      })
      .onConflictDoUpdate({
        target: cartas.id,
        set: {
          status: carta.status,
          valorEntrada: carta.valorEntrada,
          valorParcela: carta.valorParcela,
          updatedDate: carta.updatedDate,
        },
      });
  } catch (error) {
    console.error('Failed to insert carta in Cloud SQL:', error);
  }
}

export async function getDbMasterOverview() {
  try {
    const [allProfiles, allLeads, allCartas] = await Promise.all([
      db.select().from(profiles),
      db.select().from(leads),
      db.select().from(cartas),
    ]);

    const mappedProfiles = allProfiles.map(mapRowToUser);
    const totalGmv = allLeads.reduce((acc, l) => acc + Number(l.targetValue || 0), 0);

    // Group non-master accounts by tenant_id
    const tenantMap = new Map<
      string,
      {
        tenantId: string;
        companyName: string;
        planName: string;
        gestorCount: number;
        sellersCount: number;
        leadsCount: number;
        status: string;
        mrr: number;
      }
    >();

    const planPrices: Record<string, number> = {
      basic: 147,
      pro: 297,
      business: 597,
      enterprise: 1290,
    };

    for (const p of mappedProfiles) {
      if (p.role === 'master' || !p.tenantId) continue;
      const tid = p.tenantId;
      const existing = tenantMap.get(tid) || {
        tenantId: tid,
        companyName: p.companyName || `Empresa ${tid}`,
        planName: (p.planName || 'Pro').replace('Plano ', ''),
        gestorCount: 0,
        sellersCount: 0,
        leadsCount: 0,
        status: 'Ativo',
        mrr: planPrices[p.planId || 'pro'] || 297,
      };

      if (p.role === 'gestor' || p.role === 'empresa') {
        existing.gestorCount += 1;
        existing.companyName = p.companyName || existing.companyName;
        existing.planName = (p.planName || 'Pro').replace('Plano ', '');
        existing.mrr = planPrices[p.planId || 'pro'] || 297;
      } else {
        existing.sellersCount += 1;
      }
      tenantMap.set(tid, existing);
    }

    for (const l of allLeads) {
      const tid = l.tenantId || 'tenant-1';
      const existing = tenantMap.get(tid);
      if (existing) {
        existing.leadsCount += 1;
      }
    }

    const tenants = Array.from(tenantMap.values());
    const totalMrr = tenants.reduce((acc, t) => acc + t.mrr, 0);

    return {
      stats: {
        activeCompanies: tenants.length,
        totalMrr,
        totalGmv,
        totalProfiles: mappedProfiles.length,
        totalLeads: allLeads.length,
        totalCartas: allCartas.length,
      },
      tenants,
      profiles: mappedProfiles,
    };
  } catch (error) {
    console.error('Failed to get master overview from Cloud SQL:', error);
    throw error;
  }
}
