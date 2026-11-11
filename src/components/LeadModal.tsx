import React, { useState } from 'react';
import { X, UserPlus, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import { ConsorcioProduct, Lead, User } from '../types';

interface LeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (leadData: Partial<Lead>) => Promise<void>;
  sellers: User[];
  editLead?: Lead | null;
}

const PRODUCTS: ConsorcioProduct[] = [
  'Imóvel',
  'Automóvel',
  'Motocicleta',
  'Caminhão',
  'Máquinas Agrícolas',
  'Construção/Reforma',
  'Investimento Imobiliário',
  'Carta Contemplada',
  'Serviços',
];

export const LeadModal: React.FC<LeadModalProps> = ({
  isOpen,
  onClose,
  onSave,
  sellers,
  editLead,
}) => {
  const [name, setName] = useState(editLead?.name || '');
  const [phone, setPhone] = useState(editLead?.phone || '');
  const [email, setEmail] = useState(editLead?.email || '');
  const [city, setCity] = useState(editLead?.city || 'São Paulo');
  const [state, setState] = useState(editLead?.state || 'SP');
  const [product, setProduct] = useState<ConsorcioProduct>(editLead?.product || 'Imóvel');
  const [targetValue, setTargetValue] = useState<number>(editLead?.targetValue || 350000);
  const [installmentBudget, setInstallmentBudget] = useState<number>(editLead?.installmentBudget || 2500);
  const [purchaseTimeline, setPurchaseTimeline] = useState<any>(
    editLead?.purchaseTimeline || 'Curto prazo (1 a 3 meses)'
  );
  const [urgency, setUrgency] = useState<'Alta' | 'Média' | 'Baixa'>(editLead?.urgency || 'Alta');
  const [interestedInContemplada, setInterestedInContemplada] = useState<boolean>(
    editLead?.interestedInContemplada ?? false
  );
  const [sellerId, setSellerId] = useState(editLead?.sellerId || sellers[0]?.id || '');
  const [consent, setConsent] = useState(editLead?.consent ?? true);
  const [objections, setObjections] = useState(editLead?.objections?.join(', ') || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setError('Nome e telefone são campos obrigatórios.');
      return;
    }

    if (!consent) {
      setError('É obrigatório registrar o consentimento do titular para conformidade com a LGPD.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const chosenSeller = sellers.find((s) => s.id === sellerId) || sellers[0];

      await onSave({
        name,
        phone,
        email,
        city,
        state,
        product,
        targetValue: Number(targetValue),
        installmentBudget: Number(installmentBudget),
        purchaseTimeline,
        urgency,
        interestedInContemplada,
        sellerId: chosenSeller?.id || '',
        sellerName: chosenSeller?.name || 'Consultor Responsável',
        consent,
        objections: objections ? objections.split(',').map((o) => o.trim()).filter(Boolean) : [],
        source: editLead ? editLead.source : 'Cadastro Manual CRM',
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar lead.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {editLead ? 'Editar Dados do Lead' : 'Cadastrar Novo Lead Qualificado'}
              </h2>
              <p className="text-xs text-slate-400">
                Informações para processamento e análise automática do Gemini
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nome Completo *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Carlos Silva"
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Telefone / WhatsApp *
              </label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(11) 98765-4321"
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="carlos@exemplo.com.br"
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Cidade
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="São Paulo"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Estado
                </label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value.toUpperCase())}
                  maxLength={2}
                  placeholder="SP"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 text-center uppercase focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-4">
            <h3 className="text-xs font-bold text-blue-400 tracking-wider uppercase">
              Parâmetros de Crédito & Consórcio
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Produto Desejado
                </label>
                <select
                  value={product}
                  onChange={(e) => setProduct(e.target.value as ConsorcioProduct)}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  {PRODUCTS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Prazo de Compra
                </label>
                <select
                  value={purchaseTimeline}
                  onChange={(e) => setPurchaseTimeline(e.target.value as any)}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="Imediato (até 30 dias)">Imediato (até 30 dias)</option>
                  <option value="Curto prazo (1 a 3 meses)">Curto prazo (1 a 3 meses)</option>
                  <option value="Médio prazo (3 a 6 meses)">Médio prazo (3 a 6 meses)</option>
                  <option value="Longo prazo (acima de 6 meses)">Longo prazo (acima de 6 meses)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Valor Pretendido do Bem (R$)
                </label>
                <input
                  type="number"
                  value={targetValue}
                  onChange={(e) => setTargetValue(Number(e.target.value))}
                  step="5000"
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Capacidade Parcela Mensal (R$)
                </label>
                <input
                  type="number"
                  value={installmentBudget}
                  onChange={(e) => setInstallmentBudget(Number(e.target.value))}
                  step="100"
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6 pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={interestedInContemplada}
                  onChange={(e) => setInterestedInContemplada(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0 w-4 h-4"
                />
                <span className="font-medium text-amber-400">Interesse em Carta Contemplada (Liberação Rápida)</span>
              </label>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Urgência:</span>
                {(['Alta', 'Média', 'Baixa'] as const).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setUrgency(lvl)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                      urgency === lvl
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Objeções ou Dúvidas Comerciais Registradas
              </label>
              <input
                type="text"
                value={objections}
                onChange={(e) => setObjections(e.target.value)}
                placeholder="Ex: Quer lance embutido, Dúvida sobre lance livre, Comparando com banco"
                className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Vendedor Responsável
              </label>
              <select
                value={sellerId}
                onChange={(e) => setSellerId(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-blue-500"
              >
                {sellers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.role === 'master' || s.role === 'admin_master' ? 'Master' : s.specialties[0] || 'Vendas'})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center pt-5">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5 rounded border-slate-700 bg-slate-900 text-emerald-600 focus:ring-0 w-4 h-4"
                />
                <span className="text-xs text-slate-400 leading-tight">
                  <strong className="text-slate-200">Consentimento LGPD:</strong> O titular autorizou expressamente o contato comercial para ofertas de consórcios.
                </span>
              </label>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Salvando...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{editLead ? 'Atualizar Lead' : 'Cadastrar e Salvar'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
