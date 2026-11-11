import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Flame,
  CheckCircle,
  Clock,
  MessageSquare,
  ShieldCheck,
  TrendingUp,
  Award,
  ChevronRight,
  Plus,
  Send,
  Trash2,
  ExternalLink,
  DollarSign
} from 'lucide-react';
import { CrmStage, Lead, User } from '../types';

interface LeadDetailDrawerProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  onQualifyWithGemini: (leadId: string) => Promise<void>;
  onUpdateStatus: (leadId: string, newStatus: CrmStage) => Promise<void>;
  onAddTask: (leadId: string, taskTitle: string, dueDate: string) => Promise<void>;
  onAddNote: (leadId: string, noteText: string) => Promise<void>;
  onDeleteLead: (leadId: string) => Promise<void>;
  onOpenMatchmaker: (lead: Lead) => void;
  isQualifying?: boolean;
}

const CRM_STAGES: { id: CrmStage; label: string; color: string }[] = [
  { id: 'novo', label: 'Novo Lead', color: 'bg-blue-500/20 text-blue-400' },
  { id: 'qualificado', label: 'Qualificado', color: 'bg-cyan-500/20 text-cyan-400' },
  { id: 'primeiro_contato', label: 'Primeiro Contato', color: 'bg-amber-500/20 text-amber-400' },
  { id: 'em_negociacao', label: 'Em Negociação', color: 'bg-indigo-500/20 text-indigo-400' },
  { id: 'proposta_enviada', label: 'Proposta Enviada', color: 'bg-purple-500/20 text-purple-400' },
  { id: 'aguardando_resposta', label: 'Aguardando', color: 'bg-orange-500/20 text-orange-400' },
  { id: 'venda_concluida', label: 'Venda Concluída', color: 'bg-emerald-500/20 text-emerald-400' },
  { id: 'perdido', label: 'Perdido', color: 'bg-rose-500/20 text-rose-400' },
];

export const LeadDetailDrawer: React.FC<LeadDetailDrawerProps> = ({
  lead,
  isOpen,
  onClose,
  onQualifyWithGemini,
  onUpdateStatus,
  onAddTask,
  onAddNote,
  onDeleteLead,
  onOpenMatchmaker,
  isQualifying = false,
}) => {
  const [newNote, setNewNote] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!isOpen || !lead) return null;

  const handleAddNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    setIsSubmittingNote(true);
    await onAddNote(lead.id, newNote.trim());
    setNewNote('');
    setIsSubmittingNote(false);
  };

  const handleAddTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    await onAddTask(lead.id, newTaskTitle.trim(), new Date(Date.now() + 86400000).toISOString());
    setNewTaskTitle('');
  };

  const cleanPhone = lead.phone.replace(/\D/g, '');
  const whatsappUrl = `https://wa.me/55${cleanPhone}?text=Ol%C3%A1%20${encodeURIComponent(
    lead.name
  )},%20sou%20consultor%20especialista%20em%20cons%C3%B3rcios%20da%20LeadFinder%20AI.%20Vi%20seu%20interesse%20na%20cota%20de%20${encodeURIComponent(
    lead.product
  )}!`;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl h-full bg-slate-900 border-l border-slate-800 flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-right duration-300">
        {/* Drawer Header */}
        <div className="p-6 border-b border-slate-800 bg-slate-950/60 flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-500">{lead.id}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                  lead.temperature === 'Muito quente'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : lead.temperature === 'Quente'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : lead.temperature === 'Em desenvolvimento'
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                }`}
              >
                <Flame className="w-3 h-3 fill-current" />
                {lead.temperature} ({lead.score} pts)
              </span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">{lead.name}</h2>
            <p className="text-xs text-slate-400 flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-slate-500" />
              {lead.city} - {lead.state} • Responsável: <strong className="text-slate-200">{lead.sellerName}</strong>
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Quick Bar */}
        <div className="px-6 py-3 border-b border-slate-800 bg-slate-900/40 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-all"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Chamar no WhatsApp</span>
            </a>

            <button
              onClick={() => onOpenMatchmaker(lead)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition-all cursor-pointer"
            >
              <Award className="w-3.5 h-3.5 text-indigo-400" />
              <span>Buscar Cartas Compatíveis</span>
            </button>
          </div>

          <button
            onClick={() => onQualifyWithGemini(lead.id)}
            disabled={isQualifying}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-blue-900/30 cursor-pointer transition-all disabled:opacity-50"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isQualifying ? 'animate-spin' : ''}`} />
            <span>{isQualifying ? 'Analisando...' : 'Requalificar com Gemini'}</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* CRM Stage Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Etapa Atual no Funil Comercial
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {CRM_STAGES.map((st) => (
                <button
                  key={st.id}
                  onClick={() => onUpdateStatus(lead.id, st.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all text-center border ${
                    lead.status === st.id
                      ? `${st.color} border-current shadow-sm`
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* Gemini AI Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-950/40 via-indigo-950/30 to-slate-900 border border-blue-500/30 relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-600/30 flex items-center justify-center text-blue-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-blue-300">Diagnóstico IA Gemini 3.8</h4>
                  <p className="text-[10px] text-slate-400">Qualificação algorítmica para consórcio</p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-lg font-extrabold text-white font-mono">{lead.score}</span>
                <span className="text-[10px] text-slate-400">/100</span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <p className="font-semibold text-slate-300 mb-1">Por que esta pontuação?</p>
                <p className="text-slate-400 leading-relaxed">{lead.aiAnalysisReason}</p>
              </div>

              <div className="p-3 rounded-xl bg-blue-600/10 border border-blue-500/20">
                <p className="font-semibold text-blue-300 mb-1 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Próxima Ação Comercial Recomendada:
                </p>
                <p className="text-slate-200 font-medium leading-relaxed">
                  {lead.nextRecommendedAction}
                </p>
              </div>

              {lead.objections && lead.objections.length > 0 && (
                <div className="pt-1">
                  <p className="text-[11px] font-semibold text-slate-400 mb-1">Objeções Identificadas:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {lead.objections.map((obj, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px]"
                      >
                        {obj}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Financial & Contract Spec */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                Valor do Crédito
              </span>
              <p className="text-lg font-bold text-white mt-1">
                R$ {lead.targetValue.toLocaleString('pt-BR')}
              </p>
              <span className="text-[11px] text-blue-400 font-medium">{lead.product}</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                Orçamento Mensal
              </span>
              <p className="text-lg font-bold text-emerald-400 mt-1">
                R$ {lead.installmentBudget.toLocaleString('pt-BR')}
              </p>
              <span className="text-[11px] text-slate-400 font-medium">{lead.purchaseTimeline}</span>
            </div>
          </div>

          {/* Contact Details */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2 text-xs">
            <h4 className="font-bold text-slate-300 uppercase tracking-wider text-[11px] mb-2">
              Dados do Contato & Origem
            </h4>
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-2 text-slate-400">
                <Phone className="w-3.5 h-3.5" /> Telefone:
              </span>
              <span className="font-mono font-medium">{lead.phone}</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-2 text-slate-400">
                <Mail className="w-3.5 h-3.5" /> E-mail:
              </span>
              <span className="font-medium truncate max-w-[200px]">{lead.email || 'Não informado'}</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-2 text-slate-400">
                <Calendar className="w-3.5 h-3.5" /> Data de Entrada:
              </span>
              <span>{new Date(lead.createdAt).toLocaleDateString('pt-BR')}</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-slate-400">Origem da Captação:</span>
              <span className="text-blue-400 font-medium">{lead.source}</span>
            </div>
            <div className="flex items-center justify-between text-slate-300 pt-1 border-t border-slate-800/80">
              <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" /> Consentimento LGPD:
              </span>
              <span className="text-[11px] text-slate-400">Registrado em {new Date(lead.consentDate).toLocaleDateString('pt-BR')}</span>
            </div>
          </div>

          {/* Tasks / Reminders */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">
                Tarefas & Lembretes
              </h4>
            </div>

            <form onSubmit={handleAddTaskSubmit} className="flex gap-2">
              <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Ex: Ligar amanhã para apresentar simulação"
                className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Adicionar
              </button>
            </form>

            <div className="space-y-2">
              {lead.tasks && lead.tasks.length > 0 ? (
                lead.tasks.map((t) => (
                  <div
                    key={t.id}
                    className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <span className="text-slate-300">{t.title}</span>
                    <span className="text-[10px] text-amber-400 font-semibold uppercase">{t.priority}</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 italic">Nenhuma tarefa agendada para este lead.</p>
              )}
            </div>
          </div>

          {/* History / Notes Log */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">
              Histórico de Interações & Notas
            </h4>

            <form onSubmit={handleAddNoteSubmit} className="flex gap-2">
              <input
                type="text"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Adicionar nota comercial sobre a ligação..."
                className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={isSubmittingNote}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-xl text-xs font-semibold cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>

            <div className="space-y-2">
              {lead.history && lead.history.length > 0 ? (
                lead.history.map((h) => (
                  <div
                    key={h.id}
                    className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/80 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span className="font-semibold text-slate-400">{h.author}</span>
                      <span>{new Date(h.date).toLocaleString('pt-BR')}</span>
                    </div>
                    <p className="text-slate-300 leading-snug">{h.description}</p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 italic">Nenhuma interação registrada ainda.</p>
              )}
            </div>
          </div>

          {/* LGPD Deletion Option */}
          <div className="pt-6 border-t border-slate-800/80">
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="text-xs text-rose-400/80 hover:text-rose-400 flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Excluir lead (Conformidade com a LGPD)</span>
              </button>
            ) : (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-2">
                <p className="text-xs text-rose-300">
                  Tem certeza que deseja apagar permanentemente os dados de {lead.name}? Esta ação é irreversível.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onDeleteLead(lead.id)}
                    className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold"
                  >
                    Confirmar Exclusão
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="px-3 py-1 bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
