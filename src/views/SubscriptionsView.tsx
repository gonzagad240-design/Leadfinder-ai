import React, { useState } from 'react';
import {
  CreditCard,
  CheckCircle2,
  Sparkles,
  Zap,
  ShieldCheck,
  Building,
  ArrowRight,
  QrCode,
  Check,
  Lock
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { SaaSPlan } from '../types';

const PLANS: SaaSPlan[] = [
  {
    id: 'basic',
    name: 'Basic',
    tagline: 'Ideal para corretores autônomos iniciando na prospecção de consórcios.',
    priceMonthly: 147,
    priceAnnual: 119,
    maxLeadsMonth: 100,
    maxSellers: 1,
    aiIncluded: false,
    whatsappIncluded: false,
    hunterIncluded: false,
    customIntegrations: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'Para corretores de alta performance que utilizam o Gemini para qualificação.',
    priceMonthly: 297,
    priceAnnual: 237,
    maxLeadsMonth: 500,
    maxSellers: 3,
    aiIncluded: true,
    whatsappIncluded: true,
    hunterIncluded: true,
    customIntegrations: false,
    popular: true,
  },
  {
    id: 'business',
    name: 'Business',
    tagline: 'Para corretoras e concessionárias com equipe comercial e captação ativa.',
    priceMonthly: 597,
    priceAnnual: 477,
    maxLeadsMonth: 2000,
    maxSellers: 10,
    aiIncluded: true,
    whatsappIncluded: true,
    hunterIncluded: true,
    customIntegrations: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    tagline: 'Grandes administradoras com múltiplos escritórios e conexões via API dedicadas.',
    priceMonthly: 1290,
    priceAnnual: 990,
    maxLeadsMonth: 'Ilimitado',
    maxSellers: 'Ilimitado',
    aiIncluded: true,
    whatsappIncluded: true,
    hunterIncluded: true,
    customIntegrations: true,
  },
];

export const SubscriptionsView: React.FC = () => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [activePlan, setActivePlan] = useState<string>('business');
  const [checkoutPlan, setCheckoutPlan] = useState<SaaSPlan | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit_card'>('pix');
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);

  const handleOpenCheckout = (plan: SaaSPlan) => {
    setCheckoutPlan(plan);
    setCheckoutSuccess(false);
  };

  const handleConfirmPayment = () => {
    setCheckoutSuccess(true);
    setActivePlan(checkoutPlan?.id || 'pro');
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });
    setTimeout(() => {
      setCheckoutPlan(null);
    }, 2500);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-[10px] font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5" />
              SaaS Multi-tenant & Faturamento
            </span>
            <span className="text-xs text-slate-500">•</span>
            <span className="text-xs text-slate-400">Checkout Oficial Mercado Pago</span>
          </div>
          <h1 className="text-xl md:text-2xl font-extrabold text-white tracking-tight mt-1">
            Planos de Assinatura & Limites de Utilização
          </h1>
          <p className="text-xs text-slate-400">
            Escolha o plano ideal para sua operação comercial de consórcios e cartas contempladas.
          </p>
        </div>

        {/* Monthly vs Annual Toggle */}
        <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-2xl border border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              billingCycle === 'monthly' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Mensal
          </button>
          <button
            onClick={() => setBillingCycle('annual')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              billingCycle === 'annual' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>Anual</span>
            <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 text-[9px] font-bold">
              -20%
            </span>
          </button>
        </div>
      </div>

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {PLANS.map((plan) => {
          const isCurrent = activePlan === plan.id;
          const price = billingCycle === 'annual' ? plan.priceAnnual : plan.priceMonthly;

          return (
            <div
              key={plan.id}
              className={`p-6 rounded-3xl border transition-all flex flex-col justify-between relative shadow-xl ${
                plan.popular
                  ? 'bg-gradient-to-b from-blue-950/40 via-slate-900 to-slate-950 border-blue-500/50 ring-1 ring-blue-500/30'
                  : 'bg-slate-900 border-slate-800'
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-[10px] tracking-wider uppercase shadow-md">
                  Mais Popular
                </span>
              )}

              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-extrabold text-white">{plan.name}</h3>
                  <p className="text-[11px] text-slate-400 mt-1 min-h-[34px] leading-tight">
                    {plan.tagline}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-800">
                  <div className="flex items-baseline gap-1">
                    <span className="text-xs text-slate-400">R$</span>
                    <span className="text-3xl font-black text-white font-mono">{price}</span>
                    <span className="text-xs text-slate-400">/mês</span>
                  </div>
                  {billingCycle === 'annual' && (
                    <span className="text-[10px] text-emerald-400 font-medium">Cobrado anualmente</span>
                  )}
                </div>

                {/* Features list */}
                <div className="space-y-2.5 pt-3 border-t border-slate-800 text-xs">
                  <div className="flex items-center gap-2 text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                    <span>Até <strong>{plan.maxLeadsMonth}</strong> leads/mês</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                    <span>Até <strong>{plan.maxSellers}</strong> vendedores</span>
                  </div>
                  <div className={`flex items-center gap-2 ${plan.aiIncluded ? 'text-slate-300' : 'text-slate-600'}`}>
                    <CheckCircle2 className={`w-4 h-4 ${plan.aiIncluded ? 'text-blue-400' : 'text-slate-600'} shrink-0`} />
                    <span>Gemini 3.8 Copilot & Qualificador</span>
                  </div>
                  <div className={`flex items-center gap-2 ${plan.whatsappIncluded ? 'text-slate-300' : 'text-slate-600'}`}>
                    <CheckCircle2 className={`w-4 h-4 ${plan.whatsappIncluded ? 'text-blue-400' : 'text-slate-600'} shrink-0`} />
                    <span>WhatsApp Business API</span>
                  </div>
                  <div className={`flex items-center gap-2 ${plan.hunterIncluded ? 'text-slate-300' : 'text-slate-600'}`}>
                    <CheckCircle2 className={`w-4 h-4 ${plan.hunterIncluded ? 'text-blue-400' : 'text-slate-600'} shrink-0`} />
                    <span>AI Lead Hunter</span>
                  </div>
                </div>
              </div>

              <div className="pt-6">
                <button
                  onClick={() => handleOpenCheckout(plan)}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isCurrent
                      ? 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-750'
                      : plan.popular
                      ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30'
                      : 'bg-slate-800 hover:bg-slate-750 text-white'
                  }`}
                >
                  {isCurrent ? 'Plano Atual' : 'Contratar Plano'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Checkout Modal Mock with Mercado Pago */}
      {checkoutPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Assinar Plano {checkoutPlan.name}</h3>
                  <p className="text-[11px] text-slate-400">Processado com segurança via Mercado Pago</p>
                </div>
              </div>
              <button onClick={() => setCheckoutPlan(null)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            {checkoutSuccess ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-white">Assinatura Ativada com Sucesso!</h4>
                <p className="text-xs text-slate-300">
                  Seu plano {checkoutPlan.name} agora está ativo com todos os recursos e limites liberados.
                </p>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-white">{checkoutPlan.name} ({billingCycle === 'annual' ? 'Anual' : 'Mensal'})</p>
                    <p className="text-[11px] text-slate-400">Renovação automática com cancelamento a qualquer momento</p>
                  </div>
                  <strong className="text-base font-extrabold text-blue-400 font-mono">
                    R$ {billingCycle === 'annual' ? checkoutPlan.priceAnnual : checkoutPlan.priceMonthly}/mês
                  </strong>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-2">Método de Pagamento</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('pix')}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        paymentMethod === 'pix'
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 font-bold'
                          : 'border-slate-800 bg-slate-950 text-slate-400'
                      }`}
                    >
                      <QrCode className="w-4 h-4 mb-1" />
                      <span>Pix Instantâneo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('credit_card')}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        paymentMethod === 'credit_card'
                          ? 'border-blue-500 bg-blue-500/10 text-blue-400 font-bold'
                          : 'border-slate-800 bg-slate-950 text-slate-400'
                      }`}
                    >
                      <CreditCard className="w-4 h-4 mb-1" />
                      <span>Cartão de Crédito</span>
                    </button>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Ambiente criptografado 256-bit com garantia de conformidade fiscal e LGPD.</span>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setCheckoutPlan(null)}
                    className="px-4 py-2 bg-slate-800 rounded-xl text-slate-300"
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmPayment}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/30"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Confirmar Pagamento</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
