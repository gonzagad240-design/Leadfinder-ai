import React, { useEffect, useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  ArrowUpRight,
  Lock,
  Database,
  Building,
  Users,
} from 'lucide-react';
import { AuthPermissions, User } from '../types';
import { NavViewId } from '../components/Sidebar';
import { formatBRL } from '../services/leadsService';

interface TenantSummary {
  tenantId: string;
  companyName: string;
  planName: string;
  gestorCount: number;
  sellersCount: number;
  leadsCount: number;
  mrr: number;
  status: string;
}

interface MasterOverviewResponse {
  stats: {
    activeCompanies: number;
    totalMrr: number;
    totalGmv: number;
    totalProfiles: number;
    totalLeads: number;
  };
  tenants: TenantSummary[];
  profiles: User[];
}

interface AdminMasterViewProps {
  currentUser: User | null;
  permissions: AuthPermissions;
  onNavigate?: (view: NavViewId) => void;
}

export const AdminMasterView: React.FC<AdminMasterViewProps> = ({
  currentUser,
  permissions,
  onNavigate,
}) => {
  const [overview, setOverview] = useState<MasterOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await fetch('/api/admin/master-overview', {
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(
          data.error || 'Acesso bloqueado ao Painel Master SaaS.'
        );
        return;
      }
      setOverview(data);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro ao carregar dados do Painel Master.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (permissions.isMaster && permissions.canAccessAdminMaster) {
      fetchOverview();
    } else {
      setLoading(false);
    }
  }, [permissions.isMaster, permissions.canAccessAdminMaster]);

  if (!permissions.isMaster || !permissions.canAccessAdminMaster) {
    return (
      <div className="max-w-xl mx-auto mt-16 p-8 rounded-3xl bg-slate-900 border border-rose-500/30 text-center space-y-4">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-white">Acesso Estritamente Bloqueado</h2>
        <p className="text-xs text-slate-400">
          O Painel Administrativo Master SaaS exige privilégio <code className="text-rose-300">role = &apos;master&apos;</code> verificado diretamente na tabela <code className="text-rose-300">public.profiles</code>.
        </p>
      </div>
    );
  }

  const formattedGmv = formatBRL(overview?.stats.totalGmv || 0);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-in fade-in duration-300">
      {/* Verified Master Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-950 border border-amber-500/30 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-[10px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5" />
              Painel Administrativo Master SaaS
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-bold text-emerald-300 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              role: {currentUser?.role} | tenant_id: NULL
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">
            Gestão Global da Plataforma &amp; Multi-Tenants
          </h1>
          <p className="text-xs text-slate-400">
            Sessão verificada em <code className="text-amber-300">public.profiles</code> para{' '}
            <strong className="text-slate-200">{currentUser?.email}</strong> com privilégios irrestritos sobre todas as corretoras e configurações globais.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={fetchOverview}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar Base Real</span>
          </button>

          {onNavigate && (
            <>
              <button
                onClick={() => onNavigate('dashboard')}
                className="flex items-center gap-1 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/25 transition-all cursor-pointer"
              >
                <span>Dashboard Operacional</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onNavigate('settings')}
                className="flex items-center gap-1 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold transition-all cursor-pointer"
              >
                <span>Configurações &amp; APIs</span>
              </button>
            </>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
          {errorMsg}
        </div>
      )}

      {/* Real Database KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Empresas Ativas (Tenants)
            </span>
            <Building className="w-4 h-4 text-blue-400" />
          </div>
          <h3 className="text-2xl font-black text-white mt-1">
            {loading ? '...' : `${overview?.stats.activeCompanies || 0} corretora(s)`}
          </h3>
          <p className="text-[11px] text-emerald-400 mt-1">Lido ao vivo de public.profiles</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            MRR Estimado (Tenants)
          </span>
          <h3 className="text-2xl font-black text-amber-400 mt-1">
            {loading ? '...' : `R$ ${(overview?.stats.totalMrr || 0).toLocaleString('pt-BR')}`}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">Faturamento mensal das contas ativas</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            GMV em Leads na Base
          </span>
          <h3 className="text-2xl font-black text-emerald-400 mt-1">
            {loading ? '...' : formattedGmv}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">
            {overview?.stats.totalLeads || 0} leads em carteira global
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Usuários em Profiles
            </span>
            <Users className="w-4 h-4 text-cyan-400" />
          </div>
          <h3 className="text-2xl font-black text-cyan-400 mt-1">
            {loading ? '...' : `${overview?.stats.totalProfiles || 0} contas`}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">Master, Gestores e Vendedores</p>
        </div>
      </div>

      {/* Real Companies & Subscriptions Table */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-amber-400" />
            Empresas &amp; Assinaturas Cadastradas (PostgreSQL)
          </h3>
          {onNavigate && (
            <button
              onClick={() => onNavigate('team')}
              className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold cursor-pointer"
            >
              Gerenciar Equipes →
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase bg-slate-950/30">
                <th className="py-3 px-4">Tenant ID</th>
                <th className="py-3 px-4">Empresa / Corretora</th>
                <th className="py-3 px-4">Plano Ativo</th>
                <th className="py-3 px-4">Gestores / Vendedores</th>
                <th className="py-3 px-4">Leads</th>
                <th className="py-3 px-4">Mensalidade</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {(overview?.tenants || []).map((t) => (
                <tr key={t.tenantId} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">{t.tenantId}</td>
                  <td className="py-3.5 px-4 font-bold text-white">{t.companyName}</td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-blue-500/10 text-blue-300 border border-blue-500/20">
                      {t.planName}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-300">
                    {t.gestorCount} gestor(es) • {t.sellersCount} vendedor(es)
                  </td>
                  <td className="py-3.5 px-4 text-slate-300">{t.leadsCount} oportunidades</td>
                  <td className="py-3.5 px-4 font-bold font-mono text-emerald-400">
                    R$ {t.mrr.toLocaleString('pt-BR')}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                      {t.status}
                    </span>
                  </td>
                </tr>
              ))}
              {!loading && (!overview?.tenants || overview.tenants.length === 0) && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-500">
                    Nenhum tenant empresarial encontrado na tabela profiles.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Profiles Database Verification Table */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 bg-slate-950/50">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Contas &amp; Papéis Registrados em public.profiles
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase bg-slate-950/30">
                <th className="py-3 px-4">Nome</th>
                <th className="py-3 px-4">E-mail</th>
                <th className="py-3 px-4">Coluna role</th>
                <th className="py-3 px-4">Coluna tenant_id</th>
                <th className="py-3 px-4">Empresa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {(overview?.profiles || []).map((p) => {
                const isRowMaster = p.role === 'master' || p.role === 'admin_master';
                const isRowGestor = p.role === 'gestor' || p.role === 'empresa';
                return (
                  <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-bold text-white">{p.name}</td>
                    <td className="py-3 px-4 text-slate-300 font-mono text-[11px]">{p.email}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          isRowMaster
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : isRowGestor
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}
                      >
                        {p.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px]">
                      {p.tenantId === null || p.tenantId === undefined ? (
                        <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                          NULL (Global)
                        </span>
                      ) : (
                        <span className="text-slate-400">{p.tenantId}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-400">{p.companyName}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
