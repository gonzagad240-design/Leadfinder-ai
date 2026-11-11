import React, { useRef, useState } from 'react';
import {
  Search,
  Filter,
  Download,
  Upload,
  Flame,
  Plus,
  Sparkles,
  AlertTriangle,
  ChevronDown,
  Trash2,
  ExternalLink,
  MessageSquare,
  ShieldCheck,
  CheckCircle2,
  ArrowUpDown
} from 'lucide-react';
import { ConsorcioProduct, CrmStage, Lead, LeadTemperature, User } from '../types';

interface LeadsDatabaseViewProps {
  leads: Lead[];
  sellers: User[];
  onSelectLead: (lead: Lead) => void;
  onOpenNewLeadModal: () => void;
  onImportLeads?: (rows: Partial<Lead>[]) => Promise<number>;
  onQualifyWithGemini: (leadId: string) => Promise<void>;
  onBatchQualify: () => Promise<void>;
  onDeleteLead: (leadId: string) => Promise<void>;
}

const PRODUCTS: (ConsorcioProduct | 'all')[] = [
  'all',
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

const TEMPERATURES: (LeadTemperature | 'all')[] = [
  'all',
  'Muito quente',
  'Quente',
  'Em desenvolvimento',
  'Frio',
];

const STAGES: { id: CrmStage | 'all'; label: string }[] = [
  { id: 'all', label: 'Todos os Status' },
  { id: 'novo', label: 'Novo Lead' },
  { id: 'qualificado', label: 'Qualificado' },
  { id: 'primeiro_contato', label: 'Primeiro Contato' },
  { id: 'em_negociacao', label: 'Em Negociação' },
  { id: 'proposta_enviada', label: 'Proposta Enviada' },
  { id: 'aguardando_resposta', label: 'Aguardando' },
  { id: 'venda_concluida', label: 'Venda Concluída' },
  { id: 'perdido', label: 'Perdido' },
];

export const LeadsDatabaseView: React.FC<LeadsDatabaseViewProps> = ({
  leads,
  sellers,
  onSelectLead,
  onOpenNewLeadModal,
  onImportLeads,
  onQualifyWithGemini,
  onBatchQualify,
  onDeleteLead,
}) => {
  const [search, setSearch] = useState('');
  const [productFilter, setProductFilter] = useState<string>('all');
  const [tempFilter, setTempFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sellerFilter, setSellerFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'score' | 'value' | 'newest'>('score');
  const [isBatchQualifying, setIsBatchQualifying] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importFeedback, setImportFeedback] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filtered leads
  const filtered = leads
    .filter((lead) => {
      if (search) {
        const s = search.toLowerCase();
        const matchName = lead.name.toLowerCase().includes(s);
        const matchPhone = lead.phone.includes(s);
        const matchCity = lead.city?.toLowerCase().includes(s);
        const matchEmail = lead.email?.toLowerCase().includes(s);
        if (!matchName && !matchPhone && !matchCity && !matchEmail) return false;
      }

      if (productFilter !== 'all' && lead.product !== productFilter) return false;
      if (tempFilter !== 'all' && lead.temperature !== tempFilter) return false;
      if (statusFilter !== 'all' && lead.status !== statusFilter) return false;
      if (sellerFilter !== 'all' && lead.sellerId !== sellerFilter) return false;

      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'score') return (b.score || 0) - (a.score || 0);
      if (sortBy === 'value') return (b.targetValue || 0) - (a.targetValue || 0);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const handleExport = (format: 'csv' | 'json') => {
    window.open(`/api/leads/export?format=${format}`, '_blank');
  };

  const handleBatchQualifyClick = async () => {
    setIsBatchQualifying(true);
    await onBatchQualify();
    setIsBatchQualifying(false);
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onImportLeads) return;

    try {
      setIsImporting(true);
      setImportFeedback(null);
      const text = await file.text();
      let parsedRows: Partial<Lead>[] = [];

      if (file.name.toLowerCase().endsWith('.json')) {
        const raw = JSON.parse(text);
        const arr = Array.isArray(raw) ? raw : Array.isArray(raw?.leads) ? raw.leads : [];
        parsedRows = arr;
      } else {
        // Parse CSV (comma or semicolon delimited)
        const lines = text
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter(Boolean);
        if (lines.length > 1) {
          const delimiter = lines[0].includes(';') && !lines[0].includes(',') ? ';' : ',';
          const headers = lines[0]
            .split(delimiter)
            .map((h) => h.replace(/^"|"$/g, '').trim().toLowerCase());
          for (let i = 1; i < lines.length; i++) {
            const cols = lines[i]
              .split(delimiter)
              .map((c) => c.replace(/^"|"$/g, '').trim());
            const obj: Record<string, string> = {};
            headers.forEach((h, idx) => {
              obj[h] = cols[idx] || '';
            });
            parsedRows.push({
              name: obj.nome || obj.name || 'Lead Importado',
              phone: obj.telefone || obj.phone || '',
              email: obj.email || '',
              city: obj.cidade || obj.city || 'São Paulo',
              state: obj.estado || obj.state || 'SP',
              product: (obj.produto || obj.product || 'Imóvel') as ConsorcioProduct,
              targetValue:
                Number(String(obj['valor pretendido'] || obj.valor || obj.targetvalue || obj.target_value || '0').replace(/[^\d.,-]/g, '').replace(',', '.')) || 0,
              installmentBudget:
                Number(String(obj['parcela maxima'] || obj.parcela || obj.installmentbudget || obj.installment_budget || '0').replace(/[^\d.,-]/g, '').replace(',', '.')) || 0,
              source: obj.origem || obj.source || `Importação (${file.name})`,
            });
          }
        }
      }

      if (parsedRows.length > 0) {
        const count = await onImportLeads(parsedRows);
        setImportFeedback(`${count} registro(s) importado(s) com sucesso.`);
      } else {
        setImportFeedback('Nenhum registro válido encontrado no arquivo.');
      }
    } catch {
      setImportFeedback('Não foi possível ler o arquivo selecionado.');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-[10px] font-bold text-blue-400 uppercase tracking-wider">
              Base Persistente de Oportunidades
            </span>
            <span className="text-xs text-slate-500">•</span>
            <span className="text-xs text-slate-400 font-mono">{filtered.length} leads listados</span>
          </div>
          <h1 className="text-xl md:text-2xl font-extrabold text-white tracking-tight mt-1">
            Banco de Leads & Oportunidades Comerciais
          </h1>
          <p className="text-xs text-slate-400">
            Filtre, ordene, detecte duplicados e qualifique leads com o modelo Gemini 3.8 Flash.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleBatchQualifyClick}
            disabled={isBatchQualifying}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md transition-all cursor-pointer disabled:opacity-50"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isBatchQualifying ? 'animate-spin' : ''}`} />
            <span>{isBatchQualifying ? 'Qualificando...' : 'Qualificar Pendentes com Gemini'}</span>
          </button>

          <div className="flex items-center gap-1">
            <button
              onClick={() => handleExport('csv')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-semibold transition-all cursor-pointer"
              title="Exportar dados com consentimento LGPD em CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>CSV</span>
            </button>
            <button
              onClick={() => handleExport('json')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-semibold transition-all cursor-pointer"
              title="Exportar dados em JSON"
            >
              <span>JSON</span>
            </button>
          </div>

          {onImportLeads && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.json"
                onChange={handleFileImport}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                title="Importar leads via CSV ou JSON"
              >
                <Upload className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isImporting ? 'Importando...' : 'Importar CSV/JSON'}</span>
              </button>
            </>
          )}

          <button
            onClick={onOpenNewLeadModal}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 cursor-pointer transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Lead</span>
          </button>
        </div>
      </div>

      {importFeedback && (
        <div className="px-4 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium">
          {importFeedback}
        </div>
      )}

      {/* Filters Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-2.5">
          {/* Search */}
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, telefone, cidade ou e-mail..."
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Product Filter */}
          <div>
            <select
              value={productFilter}
              onChange={(e) => setProductFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              {PRODUCTS.map((p) => (
                <option key={p} value={p}>
                  {p === 'all' ? 'Todos os Produtos' : p}
                </option>
              ))}
            </select>
          </div>

          {/* Temperature Filter */}
          <div>
            <select
              value={tempFilter}
              onChange={(e) => setTempFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              {TEMPERATURES.map((t) => (
                <option key={t} value={t}>
                  {t === 'all' ? 'Todas Temperaturas' : t}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              {STAGES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="score">Pontuação IA (Maior)</option>
              <option value="value">Valor Pretendido (Maior)</option>
              <option value="newest">Mais Recentes</option>
            </select>
          </div>
        </div>
      </div>

      {/* Leads Table */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/70 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Pontuação / IA</th>
                <th className="py-3 px-4">Nome & Contato</th>
                <th className="py-3 px-4">Produto & Local</th>
                <th className="py-3 px-4">Valor & Parcela</th>
                <th className="py-3 px-4">Etapa Funil</th>
                <th className="py-3 px-4">Vendedor</th>
                <th className="py-3 px-4">Consentimento</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filtered.map((lead) => {
                const isHot = lead.temperature === 'Muito quente' || lead.temperature === 'Quente';
                const cleanPhone = lead.phone.replace(/\D/g, '');

                return (
                  <tr
                    key={lead.id}
                    onClick={() => onSelectLead(lead)}
                    className="hover:bg-slate-800/50 cursor-pointer transition-colors group"
                  >
                    {/* Score / Temperature */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                            lead.score >= 80
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                              : lead.score >= 60
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                              : 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                          }`}
                        >
                          {lead.score}
                        </div>
                        <div>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase ${
                              lead.temperature === 'Muito quente'
                                ? 'bg-rose-500/20 text-rose-300'
                                : lead.temperature === 'Quente'
                                ? 'bg-amber-500/20 text-amber-300'
                                : lead.temperature === 'Em desenvolvimento'
                                ? 'bg-blue-500/20 text-blue-300'
                                : 'bg-slate-700 text-slate-300'
                            }`}
                          >
                            {isHot && <Flame className="w-2.5 h-2.5 fill-current" />}
                            {lead.temperature}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Name & Contact */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white group-hover:text-blue-400 transition-colors">
                            {lead.name}
                          </span>
                          {lead.duplicateOf && (
                            <span
                              className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-bold flex items-center gap-1"
                              title="Possível telefone duplicado com outro lead"
                            >
                              <AlertTriangle className="w-2.5 h-2.5" />
                              Duplicado
                            </span>
                          )}
                        </div>
                        <p className="font-mono text-slate-400 text-[11px]">{lead.phone}</p>
                        {lead.email && <p className="text-slate-500 text-[10px] truncate max-w-[150px]">{lead.email}</p>}
                      </div>
                    </td>

                    {/* Product & City */}
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-200">{lead.product}</p>
                      <p className="text-slate-400 text-[11px]">
                        {lead.city} - {lead.state}
                      </p>
                      <span className="text-[10px] text-slate-500">{lead.purchaseTimeline}</span>
                    </td>

                    {/* Value & Installment */}
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-100">
                        R$ {lead.targetValue.toLocaleString('pt-BR')}
                      </p>
                      <p className="text-emerald-400 font-semibold text-[11px]">
                        R$ {lead.installmentBudget.toLocaleString('pt-BR')}/mês
                      </p>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700 capitalize">
                        {lead.status.replace('_', ' ')}
                      </span>
                    </td>

                    {/* Seller */}
                    <td className="py-3.5 px-4">
                      <span className="text-slate-300 font-medium">{lead.sellerName}</span>
                    </td>

                    {/* LGPD Consent */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 text-emerald-400 text-[11px]">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Autorizado</span>
                      </div>
                      <span className="text-[9px] text-slate-500">
                        {new Date(lead.consentDate).toLocaleDateString('pt-BR')}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <a
                          href={`https://wa.me/55${cleanPhone}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white transition-colors"
                          title="Abrir WhatsApp oficial"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </a>

                        <button
                          onClick={() => onQualifyWithGemini(lead.id)}
                          className="p-1.5 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white transition-colors cursor-pointer"
                          title="Requalificar com Gemini 3.8 Flash"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => onDeleteLead(lead.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="Excluir lead (LGPD)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="p-12 text-center space-y-2">
            <p className="text-xs font-semibold text-slate-300">
              {leads.length === 0
                ? 'Nenhuma oportunidade registrada na base de dados.'
                : 'Nenhum lead encontrado com os filtros atuais.'}
            </p>
            <p className="text-[11px] text-slate-500">
              {leads.length === 0
                ? 'Adicione um novo lead manualmente ou importe um arquivo CSV/JSON para iniciar os cálculos.'
                : 'Tente ajustar a busca ou os parâmetros de produto/temperatura.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
