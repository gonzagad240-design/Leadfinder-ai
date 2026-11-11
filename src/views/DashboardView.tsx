import React from 'react';
import {
  Users,
  Flame,
  TrendingUp,
  DollarSign,
  Award,
  Clock,
  Sparkles,
  ArrowRight,
  ChevronRight,
  Layers,
} from 'lucide-react';
import { Lead, SystemMetrics, User } from '../types';
import { calculateLeadPipelineMetrics, formatBRL } from '../services/leadsService';

interface DashboardViewProps {
  metrics: SystemMetrics | null;
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  onNavigate: (view: any) => void;
  onQualifyWithGemini: (leadId: string) => Promise<void>;
  currentUser: User | null;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  metrics,
  leads,
  onSelectLead,
  onNavigate,
  currentUser,
}) => {
  const allHotLeads = leads.filter(
    (l) => l.temperature === 'Muito quente' || l.temperature === 'Quente'
  );
  const hotLeads = allHotLeads.slice(0, 6);

  const pendingAttention = leads
    .filter((l) => l.status === 'novo' || l.status === 'primeiro_contato')
    .slice(0, 4);

  // Dynamic real-time database calculations from stored leads (SUM of targetValue)
  // Returns exact 0 / R$ 0,00 when no opportunities are registered.
  const {
    potentialPipelineValue,
    estimatedCommissions,
    conversionRate,
  } = calculateLeadPipelineMetrics(leads);

  const formattedPipelineVolume = formatBRL(potentialPipelineValue);
  const formattedCommissions = formatBRL(estimatedCommissions);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Welcome & Top Status Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-blue-950/40 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-[10px] font-bold text-blue-400 tracking-wider uppercase">
              Plataforma Comercial Ativa
            </span>
            <span className="text-xs text-slate-500">•</span>
            <span className="text-xs text-slate-400">
              {new Date().toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">
            Olá, {currentUser?.name || 'Gestor'}! Boas-vindas ao LeadFinder AI
          </h1>
          <p className="text-xs text-slate-400 max-w-xl">
            Sua central de captação e inteligência de vendas para consórcios e cartas contempladas.
            O motor Gemini 3.8 está monitorando oportunidades em tempo real.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {currentUser?.role === 'vendedor' ? (
            <>
              <button
                onClick={() => onNavigate('crm_kanban')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
              >
                <span>Meu Funil CRM</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onNavigate('simulators')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold border border-slate-700 transition-all cursor-pointer"
              >
                <span>Simulador de Crédito</span>
              </button>
            </>
          ) : currentUser?.role === 'master' || currentUser?.role === 'admin_master' ? (
            <>
              <button
                onClick={() => onNavigate('admin_master')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 text-white text-xs font-bold shadow-lg shadow-amber-600/30 transition-all cursor-pointer"
              >
                <Award className="w-4 h-4" />
                <span>Painel Master SaaS</span>
              </button>
              <button
                onClick={() => onNavigate('lead_hunter')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold border border-slate-700 transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
                <span>AI Hunter</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => onNavigate('lead_hunter')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-cyan-300" />
                <span>AI Lead Hunter</span>
              </button>
              <button
                onClick={() => onNavigate('crm_kanban')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold border border-slate-700 transition-all cursor-pointer"
              >
                <span>Ver Funil CRM</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Leads */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {currentUser?.role === 'vendedor' ? 'Minha Carteira de Leads' : 'Total de Oportunidades'}
            </span>
            <h3 className="text-2xl font-extrabold text-white mt-1">
              {leads.length}
            </h3>
            <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              {currentUser?.role === 'vendedor'
                ? `${leads.filter((l) => l.status === 'novo').length} novos atribuídos`
                : `${leads.filter((l) => l.status === 'novo').length} captados hoje`}
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Hot Leads */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md flex items-center justify-between relative overflow-hidden">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {currentUser?.role === 'vendedor' ? 'Meus Leads Quentes' : 'Leads Quentes (IA)'}
            </span>
            <h3 className="text-2xl font-extrabold text-rose-400 mt-1 flex items-center gap-2">
              <span>{allHotLeads.length}</span>
              <Flame
                className={`w-5 h-5 ${
                  allHotLeads.length > 0
                    ? 'fill-rose-500 text-rose-500 animate-bounce'
                    : 'text-slate-600'
                }`}
              />
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">
              Score 60 a 100 no Gemini
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <Flame className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Volume em Negociação (Dynamic SUM of leads credit values, R$ 0,00 when empty) */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              {currentUser?.role === 'vendedor' ? 'Leads em Atendimento' : 'Volume em Negociação'}
            </span>
            <h3 className="text-xl lg:text-2xl font-extrabold text-emerald-400 mt-1 truncate">
              {currentUser?.role === 'vendedor'
                ? leads.filter((l) => l.status === 'em_negociacao' || l.status === 'proposta_enviada').length
                : formattedPipelineVolume}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">
              {currentUser?.role === 'vendedor'
                ? 'Oportunidades ativas na carteira'
                : leads.length > 0
                ? `Soma de crédito (${leads.length} oportunidades)`
                : 'Nenhuma oportunidade registrada'}
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            {currentUser?.role === 'vendedor' ? (
              <TrendingUp className="w-5 h-5" />
            ) : (
              <DollarSign className="w-5 h-5" />
            )}
          </div>
        </div>

        {/* Card 4: Comissões Estimadas (Dynamic 2.5% over SUM, R$ 0,00 when empty) */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              {currentUser?.role === 'vendedor' ? 'Minha Taxa de Conversão' : 'Comissões Estimadas'}
            </span>
            <h3 className="text-xl lg:text-2xl font-extrabold text-amber-400 mt-1 truncate">
              {currentUser?.role === 'vendedor'
                ? `${conversionRate}%`
                : formattedCommissions}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">
              {currentUser?.role === 'vendedor'
                ? 'Performance calculada da carteira'
                : 'Taxa média de 2,5% sobre cotas'}
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <Award className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Grid: Priority Hot Leads + Funnel Health */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Top Hot Leads with Gemini Score */}
        <div className="lg:col-span-8 p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Flame className="w-4 h-4 text-rose-500 fill-rose-500" />
                <span>Oportunidades de Alta Temperatura (Prioridade Máxima)</span>
              </h2>
              <p className="text-xs text-slate-400">
                Classificados com score superior a 60 pela IA Gemini com base em capacidade de pagamento e urgência
              </p>
            </div>
            <button
              onClick={() => onNavigate('leads_database')}
              className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>Ver todos ({leads.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {hotLeads.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-950/50 border border-dashed border-slate-800 text-center space-y-2">
              <p className="text-sm font-semibold text-slate-300">
                Nenhuma oportunidade registrada no momento
              </p>
              <p className="text-xs text-slate-500">
                Cadastre novos leads ou execute a Prospecção Outbound para popular os cálculos de crédito e comissão em tempo real.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {hotLeads.map((lead) => (
                <div
                  key={lead.id}
                  onClick={() => onSelectLead(lead)}
                  className="p-3.5 rounded-2xl bg-slate-950/60 hover:bg-slate-800/60 border border-slate-800/80 hover:border-blue-500/40 transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 group"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500/20 to-orange-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 font-bold text-xs shrink-0">
                      {lead.score}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">
                          {lead.name}
                        </h4>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          {lead.temperature}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {lead.product} • Crédito:{' '}
                        <strong className="text-slate-200">
                          {formatBRL(lead.targetValue)}
                        </strong>{' '}
                        • Parcela:{' '}
                        <strong className="text-emerald-400">
                          {formatBRL(lead.installmentBudget)}
                        </strong>
                      </p>
                      <p className="text-[11px] text-slate-500 italic mt-0.5 line-clamp-1">
                        {lead.nextRecommendedAction}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                    <span className="text-[10px] text-slate-400 font-medium">
                      {(lead.sellerName || '').split(' ')[0]}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectLead(lead);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/20 text-xs font-semibold transition-all cursor-pointer"
                    >
                      Atender
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Quick Action Hub & Funnel Status */}
        <div className="lg:col-span-4 space-y-6">
          {/* Gemini AI Advisor Callout */}
          <div className="p-6 rounded-3xl bg-gradient-to-b from-blue-950/60 to-slate-900 border border-blue-500/30 shadow-xl space-y-3 relative overflow-hidden">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-600/30 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <Sparkles className="w-4 h-4 animate-spin-slow" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Gemini 3.8 Copilot</h3>
                <p className="text-[10px] text-blue-300">Inteligência Comercial Ativa</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {allHotLeads.length > 0 ? (
                <>
                  &quot;Você possui <strong>{allHotLeads.length} leads prioritários</strong> com alto
                  potencial de lance ou adesão imediata. Recomendo abordar primeiro os clientes de
                  maior score hoje.&quot;
                </>
              ) : (
                '"Sem leads quentes pendentes no momento. Cadastre ou importe oportunidades para iniciar a qualificação automática."'
              )}
            </p>

            <button
              onClick={() => onNavigate('ai_assistant')}
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <span>Abrir Chat com o Consultor IA</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick Capture Landing Page Link */}
          <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Captação Automática
              </h4>
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            </div>
            <p className="text-xs text-slate-400">
              Gere links de formulários personalizados para divulgar em anúncios do Meta Ads ou grupos de WhatsApp.
            </p>
            <button
              onClick={() => onNavigate('landing_preview')}
              className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer border border-slate-700"
            >
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <span>Ver Página de Captura Pública</span>
            </button>
          </div>

          {/* New Leads Needing First Contact */}
          <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Aguardando 1º Contato ({pendingAttention.length})</span>
            </h4>
            {pendingAttention.length === 0 ? (
              <p className="text-xs text-slate-500">
                Nenhum lead aguardando primeiro contato.
              </p>
            ) : (
              <div className="space-y-2">
                {pendingAttention.map((l) => (
                  <div
                    key={l.id}
                    onClick={() => onSelectLead(l)}
                    className="p-2.5 rounded-xl bg-slate-950/60 hover:bg-slate-800 border border-slate-800 text-xs flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div>
                      <p className="font-semibold text-slate-200">{l.name}</p>
                      <p className="text-[10px] text-slate-500">
                        {l.product} • {l.city}
                      </p>
                    </div>
                    <span className="text-[10px] text-blue-400 font-medium">Atender</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
