import React, { useState } from 'react';
import {
  Award,
  Plus,
  Sparkles,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Search,
  Filter,
  ArrowRight,
  TrendingUp,
  X,
  FileCheck,
  AlertCircle
} from 'lucide-react';
import { CartaContemplada, ConsorcioProduct, Lead } from '../types';

interface CartasContempladasViewProps {
  cartas: CartaContemplada[];
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  onAddCarta: (cartaData: Partial<CartaContemplada>) => Promise<void>;
  onUpdateCarta: (id: string, cartaData: Partial<CartaContemplada>) => Promise<void>;
  onDeleteCarta: (id: string) => Promise<void>;
}

export const CartasContempladasView: React.FC<CartasContempladasViewProps> = ({
  cartas,
  leads,
  onSelectLead,
  onAddCarta,
  onUpdateCarta,
  onDeleteCarta,
}) => {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [matchLeadId, setMatchLeadId] = useState<string>('');
  const [matchedResults, setMatchedResults] = useState<any[] | null>(null);
  const [isMatching, setIsMatching] = useState(false);

  // Form states for new Carta
  const [administradora, setAdministradora] = useState('Porto Seguro Consórcios');
  const [tipoCredito, setTipoCredito] = useState<ConsorcioProduct>('Imóvel');
  const [valorCarta, setValorCarta] = useState(400000);
  const [valorEntrada, setValorEntrada] = useState(120000);
  const [saldoDevedor, setSaldoDevedor] = useState(350000);
  const [parcelasRestantes, setParcelasRestantes] = useState(160);
  const [valorParcela, setValorParcela] = useState(2650);
  const [grupo, setGrupo] = useState('0850');
  const [cota, setCota] = useState('112');
  const [condicoesTransferencia, setCondicoesTransferencia] = useState(
    'Transferência rápida mediante análise cadastral padrão da administradora.'
  );

  const filtered = cartas.filter((c) => {
    if (search) {
      const s = search.toLowerCase();
      const matchAdmin = c.administradora.toLowerCase().includes(s);
      const matchGrupo = c.grupo.includes(s);
      const matchCota = c.cota.includes(s);
      if (!matchAdmin && !matchGrupo && !matchCota) return false;
    }
    if (filterType !== 'all' && c.tipoCredito !== filterType) return false;
    if (filterStatus !== 'all' && c.status !== filterStatus) return false;
    return true;
  });

  const handleRunMatchmaker = async () => {
    if (!matchLeadId) return;
    const lead = leads.find((l) => l.id === matchLeadId);
    if (!lead) return;

    try {
      setIsMatching(true);
      const res = await fetch('/api/cartas/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: lead.id,
          targetValue: lead.targetValue,
          maxDownPayment: lead.installmentBudget * 40, // Estimated max down payment
          maxInstallment: lead.installmentBudget,
          product: lead.product,
        }),
      });
      const data = await res.json();
      setMatchedResults(data);
    } catch (err) {
      console.error('Error running matchmaker:', err);
    } finally {
      setIsMatching(false);
    }
  };

  const handleSaveNewCarta = async (e: React.FormEvent) => {
    e.preventDefault();
    await onAddCarta({
      administradora,
      tipoCredito,
      valorCarta: Number(valorCarta),
      valorEntrada: Number(valorEntrada),
      saldoDevedor: Number(saldoDevedor),
      parcelasRestantes: Number(parcelasRestantes),
      valorParcela: Number(valorParcela),
      grupo,
      cota,
      documentacao: 'Aprovada',
      status: 'disponivel',
      condicoesTransferencia,
    });
    setIsAddModalOpen(false);
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5" />
              Carteira de Cotas Contempladas
            </span>
            <span className="text-xs text-slate-500">•</span>
            <span className="text-xs text-slate-400 font-mono">{filtered.length} cotas cadastradas</span>
          </div>
          <h1 className="text-xl md:text-2xl font-extrabold text-white tracking-tight mt-1">
            Cartas Contempladas & Algoritmo Matchmaker
          </h1>
          <p className="text-xs text-slate-400">
            Cruze o perfil de interessados com cotas disponíveis para faturamento ou transferência imediata.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Nova Carta</span>
        </button>
      </div>

      {/* Matchmaker Box: Find best match for a lead */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-950/60 via-slate-900 to-slate-900 border border-indigo-500/30 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Motor Inteligente de Correspondência (Matchmaker)
            </span>
            <h3 className="text-sm font-bold text-white mt-0.5">
              Encontrar a Carta Contemplada Ideal para um Cliente
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={matchLeadId}
              onChange={(e) => setMatchLeadId(e.target.value)}
              className="px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500 min-w-[260px]"
            >
              <option value="">Selecione um lead para buscar cartas...</option>
              {leads.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} — {l.product} (R$ {(l.targetValue / 1000).toFixed(0)}k)
                </option>
              ))}
            </select>

            <button
              onClick={handleRunMatchmaker}
              disabled={!matchLeadId || isMatching}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all disabled:opacity-50 shrink-0"
            >
              {isMatching ? 'Cruzando Dados...' : 'Buscar Melhores Matches'}
            </button>
          </div>
        </div>

        {/* Matchmaker Results display */}
        {matchedResults && (
          <div className="pt-2 border-t border-slate-800/80 space-y-3">
            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
              Oportunidades Compatíveis Identificadas:
            </span>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {matchedResults.map((m: any, idx: number) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-slate-950/80 border border-indigo-500/20 hover:border-indigo-500/50 transition-all space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">{m.carta.administradora}</span>
                    <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {m.matchScore}% Match
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-1 text-[11px]">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Crédito:</span>
                      <strong className="text-slate-200">R$ {m.carta.valorCarta.toLocaleString('pt-BR')}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Entrada:</span>
                      <strong className="text-emerald-400">R$ {m.carta.valorEntrada.toLocaleString('pt-BR')}</strong>
                    </div>
                  </div>

                  <div className="space-y-1 pt-1 border-t border-slate-800 text-[10px] text-slate-400">
                    {m.reasons.map((r: string, rIdx: number) => (
                      <p key={rIdx} className="flex items-center gap-1 text-slate-300">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span>{r}</span>
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Cartas Table & Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((carta) => (
          <div
            key={carta.id}
            className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all space-y-3.5 shadow-lg flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">
                  {carta.tipoCredito}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    carta.status === 'disponivel'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : carta.status === 'reservada'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-slate-700 text-slate-400'
                  }`}
                >
                  {carta.status === 'disponivel' ? 'Disponível' : carta.status === 'reservada' ? 'Reservada' : 'Transferida'}
                </span>
              </div>

              <h3 className="text-sm font-bold text-white">{carta.administradora}</h3>
              <p className="text-[11px] text-slate-400">
                Grupo: <strong className="text-slate-300">{carta.grupo}</strong> • Cota: <strong className="text-slate-300">{carta.cota}</strong> • Doc: <strong className="text-emerald-400">{carta.documentacao}</strong>
              </p>
            </div>

            {/* Financial Highlights */}
            <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">Crédito Líquido</span>
                <strong className="text-base font-extrabold text-white">
                  R$ {(carta.valorCarta / 1000).toLocaleString('pt-BR')}k
                </strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">Entrada Solicitada</span>
                <strong className="text-base font-extrabold text-emerald-400">
                  R$ {(carta.valorEntrada / 1000).toLocaleString('pt-BR')}k
                </strong>
              </div>

              <div className="pt-1 border-t border-slate-800/80">
                <span className="text-[10px] text-slate-500 block">Parcela Atual:</span>
                <span className="font-semibold text-slate-300">R$ {carta.valorParcela.toLocaleString('pt-BR')}</span>
              </div>
              <div className="pt-1 border-t border-slate-800/80">
                <span className="text-[10px] text-slate-500 block">Restam:</span>
                <span className="font-semibold text-slate-300">{carta.parcelasRestantes} meses</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
              {carta.condicoesTransferencia}
            </p>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
              <span className="text-[10px] text-slate-500">
                Atualizado em {new Date(carta.updatedDate).toLocaleDateString('pt-BR')}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    onUpdateCarta(carta.id, {
                      status: carta.status === 'disponivel' ? 'reservada' : 'disponivel',
                    })
                  }
                  className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-slate-800 hover:bg-slate-750 text-slate-300 transition-colors"
                >
                  {carta.status === 'disponivel' ? 'Reservar' : 'Disponibilizar'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Carta Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Cadastrar Carta Contemplada</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewCarta} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Administradora</label>
                  <input
                    type="text"
                    required
                    value={administradora}
                    onChange={(e) => setAdministradora(e.target.value)}
                    placeholder="Ex: Porto Seguro, Embracon, Rodobens"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Tipo de Crédito</label>
                  <select
                    value={tipoCredito}
                    onChange={(e) => setTipoCredito(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200"
                  >
                    <option value="Imóvel">Imóvel</option>
                    <option value="Automóvel">Automóvel</option>
                    <option value="Caminhão">Caminhão</option>
                    <option value="Máquinas Agrícolas">Máquinas Agrícolas</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Valor do Crédito (R$)</label>
                  <input
                    type="number"
                    required
                    value={valorCarta}
                    onChange={(e) => setValorCarta(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Valor de Entrada (R$)</label>
                  <input
                    type="number"
                    required
                    value={valorEntrada}
                    onChange={(e) => setValorEntrada(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Grupo</label>
                  <input
                    type="text"
                    required
                    value={grupo}
                    onChange={(e) => setGrupo(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Cota</label>
                  <input
                    type="text"
                    required
                    value={cota}
                    onChange={(e) => setCota(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Parcelas Restantes</label>
                  <input
                    type="number"
                    required
                    value={parcelasRestantes}
                    onChange={(e) => setParcelasRestantes(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Valor da Parcela (R$)</label>
                  <input
                    type="number"
                    required
                    value={valorParcela}
                    onChange={(e) => setValorParcela(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Condições de Transferência</label>
                <textarea
                  value={condicoesTransferencia}
                  onChange={(e) => setCondicoesTransferencia(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 rounded-xl text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold"
                >
                  Salvar Carta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
