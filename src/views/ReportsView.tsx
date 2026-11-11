import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Award,
  Users,
  Flame,
  Calendar,
  Layers,
  CheckCircle2,
  PieChart
} from 'lucide-react';
import { Campaign, Lead, SystemMetrics, User } from '../types';
import { calculateLeadPipelineMetrics, formatBRL } from '../services/leadsService';

interface ReportsViewProps {
  metrics: SystemMetrics | null;
  leads: Lead[];
  campaigns: Campaign[];
  sellers: User[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  metrics: _metrics,
  leads,
  campaigns,
  sellers,
}) => {
  const [period, setPeriod] = useState<'dia' | 'semana' | 'mes'>('mes');

  const {
    potentialPipelineValue,
    estimatedCommissions,
    wonCount,
    conversionRate,
  } = calculateLeadPipelineMetrics(leads);

  // Breakdown calculations
  const sellerStats = sellers.map((s) => {
    const sLeads = leads.filter((l) => l.sellerId === s.id);
    const sWon = sLeads.filter((l) => l.status === 'venda_concluida').length;
    const sVolume = sLeads.reduce((acc, l) => acc + (Number(l.targetValue) || 0), 0);
    const conv = sLeads.length > 0 ? ((sWon / sLeads.length) * 100).toFixed(1) : '0.0';
    return {
      seller: s,
      leadsCount: sLeads.length,
      wonCount: sWon,
      volume: sVolume,
      conversionRate: conv,
    };
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-[10px] font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5" />
              Inteligência de Vendas & ROI
            </span>
            <span className="text-xs text-slate-500">•</span>
            <span className="text-xs text-slate-400">Desempenho Comercial Consolidado</span>
          </div>
          <h1 className="text-xl md:text-2xl font-extrabold text-white tracking-tight mt-1">
            Relatórios, Conversão & Comissões
          </h1>
          <p className="text-xs text-slate-400">
            Acompanhe o funil de vendas, desempenho individual da equipe e retorno de campanhas.
          </p>
        </div>

        {/* Period toggle */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-2xl border border-slate-800">
          {(['dia', 'semana', 'mes'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all cursor-pointer ${
                period === p
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {p === 'dia' ? 'Diário' : p === 'semana' ? 'Semanal' : 'Mensal'}
            </button>
          ))}
        </div>
      </div>

      {/* Main KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Taxa Geral de Conversão
          </span>
          <h3 className="text-2xl font-black text-emerald-400 mt-1">
            {conversionRate}%
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">Leads fechados vs total captado</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Comissões Estimadas (2.5%)
          </span>
          <h3 className="text-2xl font-black text-amber-400 mt-1">
            {formatBRL(estimatedCommissions)}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">Receita prevista da corretora</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Volume Total do Pipeline
          </span>
          <h3 className="text-2xl font-black text-white mt-1">
            {formatBRL(potentialPipelineValue)}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">Soma dos créditos em negociação</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Vendas Concluídas
          </span>
          <h3 className="text-2xl font-black text-cyan-400 mt-1">
            {wonCount} cotas
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">Contratos emitidos no período</p>
        </div>
      </div>

      {/* Grid: Seller Performance Leaderboard + Campaign ROI */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Seller Leaderboard */}
        <div className="lg:col-span-7 p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                <span>Desempenho por Vendedor</span>
              </h2>
              <p className="text-xs text-slate-400">
                Volume de crédito sob gestão e taxa individual de fechamento
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {sellerStats.map((item, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={item.seller.avatar}
                    alt={item.seller.name}
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-blue-500/20"
                  />
                  <div>
                    <h4 className="font-bold text-slate-100 text-xs">{item.seller.name}</h4>
                    <p className="text-[10px] text-slate-400">
                      {item.seller.specialties.join(', ')} • {item.seller.region}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6 text-right text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block font-semibold">Leads</span>
                    <strong className="text-slate-200">{item.leadsCount}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block font-semibold">Volume</span>
                    <strong className="text-emerald-400">
                      R$ {(item.volume / 1000).toLocaleString('pt-BR')}k
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block font-semibold">Conversão</span>
                    <span className="px-2 py-0.5 rounded font-bold text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 text-[10px]">
                      {item.conversionRate}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Campaign Conversion Matrix */}
        <div className="lg:col-span-5 p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span>Resultados por Campanha</span>
            </h2>
            <p className="text-xs text-slate-400">
              Captação de leads e custo por conversão
            </p>
          </div>

          <div className="space-y-3">
            {campaigns.map((camp) => {
              const convRate = camp.leadsCount > 0 ? ((camp.conversions / camp.leadsCount) * 100).toFixed(1) : '0';
              return (
                <div
                  key={camp.id}
                  className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">{camp.name}</span>
                    <span className="text-emerald-400 font-bold">{convRate}% conv.</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-emerald-400 h-full rounded-full"
                      style={{ width: `${Math.min(Number(convRate) * 4, 100)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 pt-1">
                    <span>{camp.leadsCount} leads captados</span>
                    <span>{camp.conversions} cotas vendidas</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
