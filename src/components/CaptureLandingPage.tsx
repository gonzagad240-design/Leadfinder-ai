import React, { useState } from 'react';
import {
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  TrendingDown,
  ArrowRight,
  Calculator,
  Lock,
  Building2,
  Car,
  Truck,
  Tractor,
  Home,
  Check,
  Copy,
  ExternalLink
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Campaign, ConsorcioProduct, Lead } from '../types';

interface CaptureLandingPageProps {
  campaigns: Campaign[];
  onLeadCaptured: () => void;
  onDemoCaptureLead?: (leadData: Partial<Lead>) => void;
}

export const CaptureLandingPage: React.FC<CaptureLandingPageProps> = ({
  campaigns,
  onLeadCaptured,
  onDemoCaptureLead,
}) => {
  const [selectedProduct, setSelectedProduct] = useState<ConsorcioProduct>('Imóvel');
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>(campaigns[0]?.id || '');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('SP');
  const [targetValue, setTargetValue] = useState<number>(350000);
  const [installmentBudget, setInstallmentBudget] = useState<number>(2400);
  const [purchaseTimeline, setPurchaseTimeline] = useState('Curto prazo (1 a 3 meses)');
  const [interestedInContemplada, setInterestedInContemplada] = useState(false);
  const [consent, setConsent] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Dynamic estimate: Consortium vs Bank Loan
  const interestSaved = Math.round(targetValue * 0.72); // Typical interest delta over 180 months

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !consent) return;

    try {
      setIsSubmitting(true);

      if (onDemoCaptureLead) {
        onDemoCaptureLead({
          name,
          phone,
          email,
          city: city || 'São Paulo',
          state: state || 'SP',
          product: selectedProduct,
          targetValue,
          installmentBudget,
          purchaseTimeline: purchaseTimeline as Lead['purchaseTimeline'],
          interestedInContemplada,
          source: campaigns.find((c) => c.id === selectedCampaignId)?.name || 'Landing Page Demo',
        });
        setSubmittedSuccess(true);
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
        onLeadCaptured();
        return;
      }

      const res = await fetch('/api/capture/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone,
          email,
          city,
          state,
          product: selectedProduct,
          targetValue,
          installmentBudget,
          purchaseTimeline,
          interestedInContemplada,
          campaignId: selectedCampaignId,
          campaignName: campaigns.find((c) => c.id === selectedCampaignId)?.name || 'Landing Page Oficial',
        }),
      });

      if (res.ok) {
        setSubmittedSuccess(true);
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
        onLeadCaptured();
      }
    } catch (err) {
      console.error('Error submitting capture form:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyShareableLink = () => {
    const slug = campaigns.find((c) => c.id === selectedCampaignId)?.landingSlug || 'consorcio-oficial';
    const url = `${window.location.origin}/?landing=${slug}&utm_source=meta_ads&utm_campaign=leadfinder_ai`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-in fade-in">
      {/* Top Banner & Link Generator Tool */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
            Pré-visualização do Link Público de Captação
          </span>
          <h2 className="text-sm font-bold text-slate-200">
            Página de Captura Inteligente com Qualificação em Tempo Real
          </h2>
          <p className="text-xs text-slate-400">
            Quando o cliente preenche, o lead entra no CRM e a IA Gemini calcula a pontuação na hora.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={selectedCampaignId}
            onChange={(e) => setSelectedCampaignId(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-blue-500"
          >
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                Campanha: {c.name} ({c.product})
              </option>
            ))}
          </select>

          <button
            onClick={copyShareableLink}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-md transition-all shrink-0"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedLink ? 'Link Copiado!' : 'Copiar Link'}</span>
          </button>
        </div>
      </div>

      {/* Actual Landing Page Simulation Container */}
      <div className="rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 shadow-2xl overflow-hidden p-6 md:p-10">
        {/* Hero Section */}
        <div className="text-center max-w-2xl mx-auto space-y-4 mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Simulação e Atendimento Personalizado sem Juros</span>
          </div>

          <h1 className="text-2xl md:text-4xl font-extrabold text-white tracking-tight leading-tight">
            Planeje a Conquista do Seu Bem com a Menor Taxa do Mercado
          </h1>

          <p className="text-sm text-slate-300 leading-relaxed">
            Consórcios imobiliários, veículos e cartas de crédito com consultoria autorizada.
            Descubra planos sob medida para seu orçamento mensal com economia comprovada frente ao financiamento.
          </p>
        </div>

        {/* Product Selector Tabs */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
          {(
            [
              { id: 'Imóvel', label: 'Imóveis & Terrenos', icon: Building2 },
              { id: 'Automóvel', label: 'Carros & SUVs', icon: Car },
              { id: 'Caminhão', label: 'Caminhões & Frotas', icon: Truck },
              { id: 'Máquinas Agrícolas', label: 'Agro & Máquinas', icon: Tractor },
              { id: 'Construção/Reforma', label: 'Construção & Reforma', icon: Home },
            ] as const
          ).map((item) => {
            const Icon = item.icon;
            const isSel = selectedProduct === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedProduct(item.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isSel
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 border border-blue-400'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Form & Simulator Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Value & Comparison Simulator */}
          <div className="lg:col-span-5 p-6 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-6">
            <div>
              <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                <Calculator className="w-3.5 h-3.5" /> Estimativa em Tempo Real
              </span>
              <h3 className="text-base font-bold text-white mt-1">
                Economia Inteligente vs Financiamento
              </h3>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs text-slate-300 font-semibold mb-1">
                  <span>Valor do Bem / Crédito:</span>
                  <span className="text-blue-400 font-bold text-sm">
                    R$ {targetValue.toLocaleString('pt-BR')}
                  </span>
                </div>
                <input
                  type="range"
                  min={50000}
                  max={2000000}
                  step={25000}
                  value={targetValue}
                  onChange={(e) => setTargetValue(Number(e.target.value))}
                  className="w-full accent-blue-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-300 font-semibold mb-1">
                  <span>Sua Meta de Parcela Mensal:</span>
                  <span className="text-emerald-400 font-bold text-sm">
                    R$ {installmentBudget.toLocaleString('pt-BR')}
                  </span>
                </div>
                <input
                  type="range"
                  min={800}
                  max={25000}
                  step={200}
                  value={installmentBudget}
                  onChange={(e) => setInstallmentBudget(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Savings Callout */}
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                <TrendingDown className="w-4 h-4" />
                <span>Economia Estimada em Juros:</span>
              </div>
              <p className="text-2xl font-extrabold text-emerald-300 font-mono">
                R$ {interestSaved.toLocaleString('pt-BR')}
              </p>
              <p className="text-[11px] text-slate-400 leading-tight">
                Em relação ao Custo Efetivo Total (CET) de financiamento bancário padrão com juros compostos.
              </p>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                <span>Zero juros — apenas taxa de administração diluída</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                <span>Opções de lances embutidos de até 30% da própria carta</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                <span>Regulamentado e fiscalizado pelo Banco Central do Brasil</span>
              </div>
            </div>
          </div>

          {/* Right: The Capture Form */}
          <div className="lg:col-span-7 p-6 md:p-8 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
            {submittedSuccess ? (
              <div className="py-12 text-center space-y-4 animate-in zoom-in-95">
                <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-white">Solicitação Recebida com Sucesso!</h3>
                <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                  Obrigado, <strong className="text-white">{name}</strong>. Nossa inteligência artificial já
                  analisou seus parâmetros de crédito para <strong>{selectedProduct}</strong>.
                  Um de nossos consultores especializados entrará em contato via WhatsApp no número <strong>{phone}</strong> em instantes.
                </p>
                <div className="pt-4">
                  <button
                    onClick={() => {
                      setSubmittedSuccess(false);
                      setName('');
                      setPhone('');
                      setEmail('');
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors"
                  >
                    Fazer Nova Simulação
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="border-b border-slate-800 pb-3 mb-4">
                  <h3 className="text-base font-bold text-white">Preencha Seus Dados para Receber a Proposta</h3>
                  <p className="text-xs text-slate-400">
                    Atendimento rápido, seguro e sem compromisso.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Seu Nome Completo *
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: Carlos Eduardo"
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      WhatsApp com DDD *
                    </label>
                    <input
                      type="text"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(11) 98765-4321"
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      E-mail Principal
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="carlos@exemplo.com.br"
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Sua Cidade
                      </label>
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="São Paulo"
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        UF
                      </label>
                      <input
                        type="text"
                        value={state}
                        onChange={(e) => setState(e.target.value.toUpperCase())}
                        maxLength={2}
                        placeholder="SP"
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 text-center uppercase focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Quando Pretende Realizar a Compra?
                    </label>
                    <select
                      value={purchaseTimeline}
                      onChange={(e) => setPurchaseTimeline(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                    >
                      <option value="Imediato (até 30 dias)">Imediato (até 30 dias)</option>
                      <option value="Curto prazo (1 a 3 meses)">Curto prazo (1 a 3 meses)</option>
                      <option value="Médio prazo (3 a 6 meses)">Médio prazo (3 a 6 meses)</option>
                      <option value="Longo prazo (acima de 6 meses)">Longo prazo (acima de 6 meses)</option>
                    </select>
                  </div>

                  <div className="flex items-center pt-5">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                      <input
                        type="checkbox"
                        checked={interestedInContemplada}
                        onChange={(e) => setInterestedInContemplada(e.target.checked)}
                        className="rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-0 w-4 h-4"
                      />
                      <span className="font-semibold text-amber-400">
                        Tenho interesse em Carta Já Contemplada
                      </span>
                    </label>
                  </div>
                </div>

                {/* LGPD Consent Checkbox */}
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      required
                      checked={consent}
                      onChange={(e) => setConsent(e.target.checked)}
                      className="mt-0.5 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0 w-4 h-4 shrink-0"
                    />
                    <span className="text-[11px] text-slate-400 leading-snug">
                      Autorizo o recebimento de contato comercial e simulações via WhatsApp e E-mail por consultores autorizados, de acordo com as diretrizes da LGPD (Lei nº 13.709/2018). Meus dados estão protegidos e não serão compartilhados com terceiros.
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !consent}
                  className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-sm shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>Processando e Qualificando...</span>
                  ) : (
                    <>
                      <span>Quero Minha Proposta Personalizada</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
