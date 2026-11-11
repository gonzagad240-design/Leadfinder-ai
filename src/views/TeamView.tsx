import React, { useEffect, useState } from 'react';
import {
  UserCog,
  Plus,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Shuffle,
  X,
  Lock,
  ArrowUpRight,
  ShieldCheck,
  RefreshCw,
  Trash2,
  Database,
  Radio,
} from 'lucide-react';
import { ConsorcioProduct, User } from '../types';
import {
  fetchRealtimeProfiles,
  subscribeToProfilesRealtime,
  deleteRealtimeProfile,
} from '../services/teamService';

interface TeamViewProps {
  team: User[];
  currentUser: User | null;
  onAddMember: (memberData: Partial<User>) => Promise<any>;
  onTriggerAutoDistribution: () => Promise<{ distributedCount: number }>;
  onNavigate?: (view: any) => void;
  onTeamSync?: (profiles: User[]) => void;
}

export const TeamView: React.FC<TeamViewProps> = ({
  team,
  currentUser,
  onAddMember,
  onTriggerAutoDistribution,
  onNavigate,
  onTeamSync,
}) => {
  const [liveProfiles, setLiveProfiles] = useState<User[]>(team);
  const [isSyncing, setIsSyncing] = useState(true);
  const [isDistributing, setIsDistributing] = useState(false);
  const [distributionResult, setDistributionResult] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New member form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [region, setRegion] = useState('Sudeste (SP, RJ, MG)');
  const [specialty, setSpecialty] = useState<ConsorcioProduct>('Imóvel');
  const [newRole, setNewRole] = useState<'vendedor' | 'gestor'>('vendedor');

  const isMaster =
    currentUser?.role === 'master' || currentUser?.role === 'admin_master';
  const isVendedor = currentUser?.role === 'vendedor';

  // Fetch and subscribe in real time directly to `public.profiles` (no mock arrays)
  const syncFromProfilesTable = async () => {
    setIsSyncing(true);
    try {
      const profiles = await fetchRealtimeProfiles(currentUser);
      setLiveProfiles(profiles);
      if (onTeamSync) onTeamSync(profiles);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (isVendedor) return;
    syncFromProfilesTable();

    const unsubscribe = subscribeToProfilesRealtime(currentUser, (updated) => {
      setLiveProfiles(updated);
      if (onTeamSync) onTeamSync(updated);
    });

    return () => {
      unsubscribe();
    };
  }, [currentUser?.id, currentUser?.role, currentUser?.tenantId]);

  const sellers = liveProfiles.filter((u) => u.role === 'vendedor');
  const maxSellers = isMaster ? 999 : currentUser?.maxSellersLimit || 3;
  const planName = currentUser?.planName || 'Plano Profissional';
  const isLimitReached = !isMaster && sellers.length >= maxSellers;
  const quotaPercent = isMaster
    ? 0
    : Math.min(100, Math.round((sellers.length / maxSellers) * 100));

  const handleRunDistribution = async () => {
    try {
      setIsDistributing(true);
      setDistributionResult(null);
      setErrorMessage(null);
      const res = await onTriggerAutoDistribution();
      setDistributionResult(
        `Distribuição concluída! ${res.distributedCount} novos leads foram direcionados aos vendedores reais cadastrados.`
      );
      await syncFromProfilesTable();
    } catch (err: any) {
      setErrorMessage(
        err?.message || 'Nenhum vendedor cadastrado em public.profiles para receber leads.'
      );
    } finally {
      setIsDistributing(false);
    }
  };

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setErrorMessage(null);

    try {
      const res = await onAddMember({
        name,
        email,
        phone,
        region,
        role: isMaster ? newRole : 'vendedor',
        tenantId: currentUser?.tenantId || 'tenant-1',
        companyId: currentUser?.companyId || 'comp-1',
        companyName:
          currentUser?.companyName && isMaster
            ? 'Aliança Consórcios & Investimentos'
            : currentUser?.companyName || 'Aliança Consórcios & Investimentos',
        specialties: [specialty],
        avatar:
          'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      });

      if (res && res.error) {
        setErrorMessage(res.error);
        return;
      }

      setIsAddModalOpen(false);
      setName('');
      setEmail('');
      setPhone('');
      setNewRole('vendedor');
      await syncFromProfilesTable();
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao cadastrar perfil em public.profiles');
    }
  };

  const handleDeleteMember = async (member: User) => {
    setErrorMessage(null);
    const res = await deleteRealtimeProfile(member.id);
    if (res.error) {
      setErrorMessage(res.error);
      return;
    }
    await syncFromProfilesTable();
  };

  if (isVendedor) {
    return (
      <div className="max-w-xl mx-auto mt-16 p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-4">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-white">Acesso Restrito à Gestão</h2>
        <p className="text-xs text-slate-400">
          O gerenciamento de equipe e a distribuição automática de leads são exclusivos para os perfis Gestor e Master.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-[10px] font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
              <UserCog className="w-3.5 h-3.5" />
              Equipe &amp; Perfis • public.profiles
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-bold text-emerald-400 flex items-center gap-1">
              <Radio className="w-3 h-3 animate-pulse" />
              Sincronização em Tempo Real
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-extrabold text-white tracking-tight mt-1.5">
            Equipe Comercial &amp; Contas Autenticadas
          </h1>
          <p className="text-xs text-slate-400">
            Listagem direta em tempo real da tabela <code className="text-blue-300">public.profiles</code> — sem utilizadores fictícios de demonstração.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={syncFromProfilesTable}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold cursor-pointer transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>

          <button
            onClick={handleRunDistribution}
            disabled={isDistributing || sellers.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 cursor-pointer transition-all disabled:opacity-50"
          >
            <Shuffle className={`w-3.5 h-3.5 ${isDistributing ? 'animate-spin' : ''}`} />
            <span>{isDistributing ? 'Distribuindo...' : 'Distribuir Leads'}</span>
          </button>

          <button
            onClick={() => {
              if (isLimitReached) {
                if (onNavigate) onNavigate('subscriptions');
              } else {
                setErrorMessage(null);
                setIsAddModalOpen(true);
              }
            }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
              isLimitReached
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30'
            }`}
          >
            {isLimitReached ? (
              <>
                <Lock className="w-4 h-4 text-amber-400" />
                <span>Limite Atingido (Upgrade)</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Adicionar Utilizador</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Plan Quota and Limit Lock Indicator */}
      <div
        className={`p-5 rounded-2xl border transition-all ${
          isLimitReached
            ? 'bg-amber-950/20 border-amber-500/40'
            : 'bg-slate-900/90 border-slate-800'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-400" />
                {planName}
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                  isLimitReached
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}
              >
                {liveProfiles.length} conta(s) em public.profiles
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {isMaster ? (
                'Modo SaaS Master: Acesso global para visualizar e cadastrar utilizadores reais diretamente na tabela public.profiles.'
              ) : (
                <>
                  Seu plano permite até{' '}
                  <strong className="text-slate-200">{maxSellers} vendedores</strong> ativos
                  simultaneamente ({sellers.length} cadastrados na base).
                </>
              )}
            </p>
          </div>

          {!isMaster && (
            <div className="flex items-center gap-4">
              <div className="w-40 space-y-1">
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Cota de Consultores</span>
                  <span className="font-bold text-slate-200">
                    {sellers.length} / {maxSellers}
                  </span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isLimitReached
                        ? 'bg-rose-500'
                        : quotaPercent > 66
                        ? 'bg-amber-500'
                        : 'bg-blue-500'
                    }`}
                    style={{ width: `${quotaPercent}%` }}
                  />
                </div>
              </div>

              {onNavigate && (
                <button
                  onClick={() => onNavigate('subscriptions')}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/20 cursor-pointer transition-all shrink-0"
                >
                  <span>{isLimitReached ? 'Fazer Upgrade de Plano' : 'Ver Planos'}</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {errorMessage && !isAddModalOpen && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {distributionResult && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{distributionResult}</span>
        </div>
      )}

      {/* Real Database Profiles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {liveProfiles.map((member) => {
          const isMemberMaster =
            member.role === 'master' || member.role === 'admin_master';
          const isMemberGestor =
            member.role === 'gestor' || member.role === 'empresa';
          const canDelete = !isMemberMaster && member.email.toLowerCase() !== 'gonzagad240@gmail.com';

          return (
            <div
              key={member.id}
              className={`p-5 rounded-2xl bg-slate-900 border transition-all space-y-4 shadow-lg flex flex-col justify-between ${
                isMemberMaster
                  ? 'border-amber-500/40 shadow-amber-900/10'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={member.avatar}
                      alt={member.name}
                      className={`w-12 h-12 rounded-2xl object-cover ring-2 shrink-0 ${
                        isMemberMaster ? 'ring-amber-500/40' : 'ring-blue-500/20'
                      }`}
                    />
                    <div className="min-w-0">
                      <h3 className="font-bold text-white text-sm truncate">
                        {member.name}
                      </h3>
                      <p className="text-[11px] text-slate-400 truncate font-mono">
                        {member.email}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                            isMemberMaster
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : isMemberGestor
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          role: {member.role}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[9px] font-mono">
                          {member.tenantId === null
                            ? 'tenant_id: NULL'
                            : `tenant: ${member.tenantId}`}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {canDelete && (
                      <button
                        onClick={() => handleDeleteMember(member)}
                        title="Remover de public.profiles"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        member.available ? 'bg-emerald-500' : 'bg-slate-600'
                      }`}
                      title={
                        member.available
                          ? 'Disponível para novos leads'
                          : 'Indisponível'
                      }
                    />
                  </div>
                </div>

                <div className="mt-3 space-y-1.5 text-xs text-slate-300">
                  <p className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="truncate">{member.region}</span>
                  </p>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {member.specialties.map((spec, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-300 text-[10px] font-semibold"
                      >
                        {spec}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Workload Stats */}
              <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-center text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                    Leads Ativos
                  </span>
                  <strong className="text-base font-extrabold text-white">
                    {member.activeLeadsCount}
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                    Taxa Conversão
                  </span>
                  <strong className="text-base font-extrabold text-emerald-400">
                    {member.conversionRate}%
                  </strong>
                </div>
              </div>
            </div>
          );
        })}

        {/* Informational card when only Master profile exists in public.profiles */}
        {sellers.length === 0 && (
          <div className="p-6 rounded-2xl bg-slate-900/50 border border-dashed border-slate-700 flex flex-col items-center justify-center text-center space-y-3 min-h-[220px]">
            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400">
              <Database className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white">
                Nenhum vendedor adicional cadastrado
              </h3>
              <p className="text-xs text-slate-400 max-w-xs">
                Os perfis fictícios foram removidos. Apenas as contas reais da tabela{' '}
                <code className="text-blue-300">public.profiles</code> são listadas aqui.
              </p>
            </div>
            <button
              onClick={() => {
                setErrorMessage(null);
                setIsAddModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 text-xs font-semibold transition-all cursor-pointer"
            >
              Cadastrar Novo Consultor na Base
            </button>
          </div>
        )}
      </div>

      {/* Add Member Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">
                Cadastrar Utilizador em public.profiles
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSaveMember} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Nome Completo
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Gabriela Toledo"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  E-mail Corporativo
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="gabriela@empresa.com.br"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200"
                />
              </div>

              {isMaster && (
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Nível de Acesso (role)
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as 'vendedor' | 'gestor')}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200"
                  >
                    <option value="vendedor">Vendedor (Carteira &amp; CRM)</option>
                    <option value="gestor">Gestor (Equipe &amp; Campanhas)</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Telefone / WhatsApp
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(11) 98765-4321"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Região de Atuação
                </label>
                <input
                  type="text"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  placeholder="Ex: Grande São Paulo e Interior"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Especialidade Primária
                </label>
                <select
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200"
                >
                  <option value="Imóvel">Imóveis</option>
                  <option value="Automóvel">Automóveis &amp; SUVs</option>
                  <option value="Caminhão">Caminhões &amp; Pesados</option>
                  <option value="Máquinas Agrícolas">Máquinas Agrícolas</option>
                  <option value="Carta Contemplada">Cartas Contempladas</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 rounded-xl text-slate-300 font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold cursor-pointer"
                >
                  Salvar em Profiles
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
