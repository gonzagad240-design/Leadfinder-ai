import React, { useState } from 'react';
import {
  KanbanSquare,
  Plus,
  Flame,
  MessageSquare,
  ArrowRight,
  Sparkles,
  Phone,
  Clock,
  Filter,
  DollarSign,
  ChevronRight,
  CheckCircle2
} from 'lucide-react';
import { CrmStage, Lead, User } from '../types';

interface CrmKanbanViewProps {
  leads: Lead[];
  sellers: User[];
  onSelectLead: (lead: Lead) => void;
  onUpdateStatus: (leadId: string, newStatus: CrmStage) => Promise<void>;
  onOpenNewLeadModal: () => void;
  onQualifyWithGemini: (leadId: string) => Promise<void>;
}

const COLUMNS: { id: CrmStage; label: string; headerColor: string }[] = [
  { id: 'novo', label: 'Novo Lead', headerColor: 'border-blue-500 text-blue-400' },
  { id: 'qualificado', label: 'Qualificado (IA)', headerColor: 'border-cyan-500 text-cyan-400' },
  { id: 'primeiro_contato', label: 'Primeiro Contato', headerColor: 'border-amber-500 text-amber-400' },
  { id: 'em_negociacao', label: 'Em Negociação', headerColor: 'border-indigo-500 text-indigo-400' },
  { id: 'proposta_enviada', label: 'Proposta Enviada', headerColor: 'border-purple-500 text-purple-400' },
  { id: 'aguardando_resposta', label: 'Aguardando', headerColor: 'border-orange-500 text-orange-400' },
  { id: 'venda_concluida', label: 'Venda Concluída', headerColor: 'border-emerald-500 text-emerald-400' },
  { id: 'perdido', label: 'Perdido', headerColor: 'border-rose-500 text-rose-400' },
];

export const CrmKanbanView: React.FC<CrmKanbanViewProps> = ({
  leads,
  sellers,
  onSelectLead,
  onUpdateStatus,
  onOpenNewLeadModal,
  onQualifyWithGemini,
}) => {
  const [selectedSeller, setSelectedSeller] = useState<string>('all');
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);

  const filteredLeads = selectedSeller === 'all'
    ? leads
    : leads.filter((l) => l.sellerId === selectedSeller);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    setDraggedLeadId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetStage: CrmStage) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('text/plain') || draggedLeadId;
    if (leadId) {
      await onUpdateStatus(leadId, targetStage);
    }
    setDraggedLeadId(null);
  };

  // Quick move to next logical stage
  const getNextStage = (curr: CrmStage): CrmStage => {
    const sequence: CrmStage[] = [
      'novo',
      'qualificado',
      'primeiro_contato',
      'em_negociacao',
      'proposta_enviada',
      'aguardando_resposta',
      'venda_concluida',
    ];
    const idx = sequence.indexOf(curr);
    return idx !== -1 && idx < sequence.length - 1 ? sequence[idx + 1] : 'venda_concluida';
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Top Bar */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-[10px] font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
              <KanbanSquare className="w-3.5 h-3.5" />
              Pipeline Comercial Interativo
            </span>
            <span className="text-xs text-slate-500">•</span>
            <span className="text-xs text-slate-400">8 Etapas de Conversão</span>
          </div>
          <h1 className="text-xl md:text-2xl font-extrabold text-white tracking-tight mt-1">
            CRM Inteligente de Consórcios
          </h1>
          <p className="text-xs text-slate-400">
            Arraste os cards entre as colunas para atualizar as etapas. A IA sugere ações prioritárias em cada negociação.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Seller Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedSeller}
              onChange={(e) => setSelectedSeller(e.target.value)}
              className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-blue-500"
            >
              <option value="all">Todos os Vendedores</option>
              {sellers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.specialties[0] || 'Vendas'})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={onOpenNewLeadModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar Lead</span>
          </button>
        </div>
      </div>

      {/* Kanban Board Container (Scrollable Horizontally) */}
      <div className="overflow-x-auto pb-4">
        <div className="flex items-start gap-4 min-w-[1400px]">
          {COLUMNS.map((col) => {
            const columnLeads = filteredLeads.filter((l) => l.status === col.id);
            const totalValue = columnLeads.reduce((acc, l) => acc + (Number(l.targetValue) || 0), 0);

            return (
              <div
                key={col.id}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.id)}
                className="w-72 shrink-0 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col max-h-[78vh] shadow-lg"
              >
                {/* Column Header */}
                <div className={`p-3.5 border-b border-slate-800/90 border-t-2 ${col.headerColor} bg-slate-950/40 rounded-t-2xl`}>
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-xs text-slate-200 truncate">{col.label}</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 font-mono">
                      {columnLeads.length}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 font-mono">
                    R$ {(totalValue / 1000).toLocaleString('pt-BR')}k em cotas
                  </p>
                </div>

                {/* Column Body Cards */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[220px]">
                  {columnLeads.map((lead) => {
                    const isHot = lead.temperature === 'Muito quente' || lead.temperature === 'Quente';
                    const cleanPhone = lead.phone.replace(/\D/g, '');

                    return (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, lead.id)}
                        onClick={() => onSelectLead(lead)}
                        className={`p-3.5 rounded-xl bg-slate-950 border transition-all cursor-grab active:cursor-grabbing hover:border-blue-500/50 shadow-md space-y-2 group relative ${
                          isHot
                            ? 'border-slate-800 hover:shadow-rose-950/20'
                            : 'border-slate-800/80 hover:shadow-blue-950/20'
                        }`}
                      >
                        {/* Top Badges */}
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10px] font-semibold text-blue-400 truncate">
                            {lead.product}
                          </span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider flex items-center gap-0.5 ${
                              lead.temperature === 'Muito quente'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : lead.temperature === 'Quente'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {isHot && <Flame className="w-2.5 h-2.5 fill-current" />}
                            {lead.score} pts
                          </span>
                        </div>

                        {/* Lead Name & City */}
                        <div>
                          <h4 className="font-bold text-slate-100 text-xs group-hover:text-blue-400 transition-colors">
                            {lead.name}
                          </h4>
                          <p className="text-[10px] text-slate-400 font-mono">{lead.phone}</p>
                        </div>

                        {/* Values */}
                        <div className="pt-1 flex items-center justify-between text-[11px] border-t border-slate-900">
                          <div>
                            <span className="text-[9px] text-slate-500 uppercase block">Crédito</span>
                            <span className="font-bold text-slate-200">
                              R$ {(lead.targetValue / 1000).toLocaleString('pt-BR')}k
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[9px] text-slate-500 uppercase block">Parcela</span>
                            <span className="font-semibold text-emerald-400">
                              R$ {lead.installmentBudget.toLocaleString('pt-BR')}
                            </span>
                          </div>
                        </div>

                        {/* Next recommended action pill */}
                        {lead.nextRecommendedAction && (
                          <div className="p-1.5 rounded-lg bg-blue-950/40 border border-blue-900/30 text-[10px] text-slate-300 line-clamp-2">
                            <strong className="text-blue-400">IA:</strong> {lead.nextRecommendedAction}
                          </div>
                        )}

                        {/* Footer Quick Controls */}
                        <div
                          className="pt-1 flex items-center justify-between border-t border-slate-900 text-[10px]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="text-slate-500 truncate max-w-[80px]">
                            {lead.sellerName.split(' ')[0]}
                          </span>

                          <div className="flex items-center gap-1.5">
                            <a
                              href={`https://wa.me/55${cleanPhone}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 rounded bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white transition-colors"
                              title="Abrir WhatsApp"
                            >
                              <MessageSquare className="w-3 h-3" />
                            </a>

                            {col.id !== 'venda_concluida' && col.id !== 'perdido' && (
                              <button
                                onClick={() => onUpdateStatus(lead.id, getNextStage(col.id))}
                                className="p-1 rounded bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white transition-colors"
                                title="Avançar etapa no funil"
                              >
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {columnLeads.length === 0 && (
                    <div className="h-28 border border-dashed border-slate-800 rounded-xl flex items-center justify-center text-[11px] text-slate-600">
                      Arraste um lead aqui
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
