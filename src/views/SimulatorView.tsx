import React, { useState } from 'react';
import {
  Calculator,
  TrendingDown,
  Building2,
  Car,
  Truck,
  Tractor,
  Layers,
  Sparkles,
  ShieldAlert,
  CheckCircle2,
  Info
} from 'lucide-react';
import { ConsorcioProduct } from '../types';

export const SimulatorView: React.FC = () => {
  const [selectedProduct, setSelectedProduct] = useState<ConsorcioProduct>('Imóvel');
  const [creditValue, setCreditValue] = useState<number>(450000);
  const [termMonths, setTermMonths] = useState<number>(180);
  const [adminRate, setAdminRate] = useState<number>(18); // 18% total admin fee
  const [reserveFundRate, setReserveFundRate] = useState<number>(2); // 2% reserve fund
  const [insuranceRateMonthly, setInsuranceRateMonthly] = useState<number>(0.038); // 0.038% monthly insurance
  const [bankInterestRateAnnual, setBankInterestRateAnnual] = useState<number>(11.5); // 11.5% a.a. bank financing

  // Consortium Calculations
  const totalAdminFee = creditValue * (adminRate / 100);
  const totalReserveFund = creditValue * (reserveFundRate / 100);
  const totalConsortiumCost = creditValue + totalAdminFee + totalReserveFund;
  const baseMonthlyInstallment = totalConsortiumCost / termMonths;
  const monthlyInsurance = creditValue * (insuranceRateMonthly / 100);
  const totalMonthlyInstallment = Math.round(baseMonthlyInstallment + monthlyInsurance);

  // Bank Loan / Financing Calculations (SAC or Price approximation at 11.5% a.a. over same term)
  const monthlyBankRate = bankInterestRateAnnual / 100 / 12;
  const bankInstallment =
    (creditValue * (monthlyBankRate * Math.pow(1 + monthlyBankRate, termMonths))) /
    (Math.pow(1 + monthlyBankRate, termMonths) - 1);
  const totalBankCost = Math.round(bankInstallment * termMonths);
  const estimatedSavings = Math.max(0, totalBankCost - totalConsortiumCost);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-in fade-in duration-300">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-[10px] font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
              <Calculator className="w-3.5 h-3.5" />
              Simulador Financeiro Oficial
            </span>
            <span className="text-xs text-slate-500">•</span>
            <span className="text-xs text-slate-400">Consórcio vs. Financiamento</span>
          </div>
          <h1 className="text-xl md:text-2xl font-extrabold text-white tracking-tight mt-1">
            Simulador de Consórcios & Economia em Juros
          </h1>
          <p className="text-xs text-slate-400">
            Apresente ao cliente o comparativo exato demonstrando a economia sem cobrança de juros compostos.
          </p>
        </div>
      </div>

      {/* Product Category Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            { id: 'Imóvel', label: 'Imóveis', icon: Building2, defaultVal: 500000, defaultMonths: 180 },
            { id: 'Automóvel', label: 'Veículos & SUVs', icon: Car, defaultVal: 150000, defaultMonths: 80 },
            { id: 'Caminhão', label: 'Caminhões & Frotas', icon: Truck, defaultVal: 650000, defaultMonths: 100 },
            { id: 'Máquinas Agrícolas', label: 'Agro & Máquinas', icon: Tractor, defaultVal: 800000, defaultMonths: 120 },
            { id: 'Serviços', label: 'Serviços & Viagens', icon: Layers, defaultVal: 50000, defaultMonths: 48 },
          ] as const
        ).map((item) => {
          const Icon = item.icon;
          const isSel = selectedProduct === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setSelectedProduct(item.id);
                setCreditValue(item.defaultVal);
                setTermMonths(item.defaultMonths);
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isSel
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 border border-blue-400'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Grid: Parameters + Results */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Simulation Inputs */}
        <div className="lg:col-span-6 p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-5">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            Parâmetros da Cota
          </h2>

          <div className="space-y-4 text-xs">
            {/* Credit slider */}
            <div>
              <div className="flex justify-between font-semibold text-slate-300 mb-1">
                <span>Valor do Crédito Desejado:</span>
                <span className="text-blue-400 font-bold text-sm">
                  R$ {creditValue.toLocaleString('pt-BR')}
                </span>
              </div>
              <input
                type="range"
                min={30000}
                max={2500000}
                step={10000}
                value={creditValue}
                onChange={(e) => setCreditValue(Number(e.target.value))}
                className="w-full accent-blue-500 cursor-pointer"
              />
            </div>

            {/* Term Months */}
            <div>
              <div className="flex justify-between font-semibold text-slate-300 mb-1">
                <span>Prazo Total do Grupo:</span>
                <span className="text-slate-200 font-bold text-sm">{termMonths} meses</span>
              </div>
              <input
                type="range"
                min={24}
                max={240}
                step={12}
                value={termMonths}
                onChange={(e) => setTermMonths(Number(e.target.value))}
                className="w-full accent-blue-500 cursor-pointer"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">
                  Taxa Adm Total (%)
                </label>
                <input
                  type="number"
                  value={adminRate}
                  onChange={(e) => setAdminRate(Number(e.target.value))}
                  step="0.5"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">
                  Fundo de Reserva (%)
                </label>
                <input
                  type="number"
                  value={reserveFundRate}
                  onChange={(e) => setReserveFundRate(Number(e.target.value))}
                  step="0.5"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold">
                Taxa Anual Média do Financiamento Bancário para Comparação (%)
              </label>
              <input
                type="number"
                value={bankInterestRateAnnual}
                onChange={(e) => setBankInterestRateAnnual(Number(e.target.value))}
                step="0.5"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Comparative Results */}
        <div className="lg:col-span-6 space-y-4">
          {/* Winner Callout: Total Savings */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-emerald-950/60 to-slate-900 border border-emerald-500/30 shadow-xl space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
              <TrendingDown className="w-4 h-4" />
              <span>Economia Total no Consórcio</span>
            </div>
            <p className="text-3xl font-black text-emerald-300 font-mono">
              R$ {estimatedSavings.toLocaleString('pt-BR')}
            </p>
            <p className="text-xs text-slate-300 leading-relaxed">
              Diferença absoluta que o comprador deixa de pagar aos bancos em comparação a um financiamento no mesmo prazo.
            </p>
          </div>

          {/* Side by side cards */}
          <div className="grid grid-cols-2 gap-3">
            {/* Consórcio Card */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-blue-500/30 space-y-2 text-xs">
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block">
                No Consórcio
              </span>
              <p className="text-xl font-bold text-white font-mono">
                R$ {totalMonthlyInstallment.toLocaleString('pt-BR')}/mês
              </p>
              <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 space-y-1">
                <p>Custo Total: <strong>R$ {totalConsortiumCost.toLocaleString('pt-BR')}</strong></p>
                <p>Taxa Total: <strong>{adminRate}% diluída</strong></p>
                <p className="text-emerald-400 font-semibold">Sem juros compostos</p>
              </div>
            </div>

            {/* Financiamento Card */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                No Financiamento Bancário
              </span>
              <p className="text-xl font-bold text-rose-400 font-mono">
                R$ {Math.round(bankInstallment).toLocaleString('pt-BR')}/mês
              </p>
              <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 space-y-1">
                <p>Custo Total: <strong>R$ {totalBankCost.toLocaleString('pt-BR')}</strong></p>
                <p>Juros: <strong>{bankInterestRateAnnual}% a.a.</strong></p>
                <p className="text-rose-400 font-semibold">Paga quase o dobro do bem</p>
              </div>
            </div>
          </div>

          {/* Legal Compliance Disclaimer (Section 11 requirement) */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
            <div className="flex items-center gap-1.5 text-amber-400 font-bold">
              <Info className="w-3.5 h-3.5" />
              <span>Aviso Legal & Diretrizes Regulatórias:</span>
            </div>
            <p className="leading-relaxed">
              Os valores apresentados constituem estimativas matemáticas simuladas para orientação do cliente. O consórcio é regido pela Lei Federal nº 11.795/2008 e fiscalizado pelo Banco Central do Brasil. A contemplação ocorre estritamente por sorteio ou lance nas assembleias mensais da administradora, inexistindo garantia de data pré-fixada.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
