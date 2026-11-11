import React, { useState } from 'react';
import {
  MessageSquare,
  Send,
  Sparkles,
  Bot,
  User,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Ban,
  Clock,
  ArrowRight
} from 'lucide-react';
import { WhatsAppChat } from '../types';

interface WhatsAppViewProps {
  chats: WhatsAppChat[];
  onSendMessage: (chatId: string, text: string) => Promise<void>;
  onToggleOptOut: (chatId: string) => Promise<void>;
}

export const WhatsAppView: React.FC<WhatsAppViewProps> = ({
  chats,
  onSendMessage,
  onToggleOptOut,
}) => {
  const [selectedChatId, setSelectedChatId] = useState<string>(chats[0]?.id || '');
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [suggestedReplies, setSuggestedReplies] = useState<any[] | null>(null);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  const activeChat = chats.find((c) => c.id === selectedChatId) || chats[0];

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim() || isSending || !activeChat) return;

    try {
      setIsSending(true);
      await onSendMessage(activeChat.id, text);
      setInputText('');
    } finally {
      setIsSending(false);
    }
  };

  const handleLoadSuggestions = async () => {
    if (!activeChat) return;
    try {
      setIsLoadingSuggestions(true);
      const res = await fetch('/api/whatsapp/suggest-reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ chatId: activeChat.id }),
      });

      if (res.ok) {
        const ct = res.headers.get('content-type') || '';
        if (ct.includes('application/json')) {
          const data = await res.json();
          setSuggestedReplies(data.options || []);
        }
      }
    } catch {
      // Fallback suggestions
      setSuggestedReplies([
        {
          title: 'Opção 1 (Agendamento rápido)',
          text: `Olá ${activeChat.leadName}! Preparei a simulação exata que você pediu. Podemos fazer uma rápida ligação de 3 minutos agora para eu te mostrar as faixas de lance?`,
        },
        {
          title: 'Opção 2 (Envio de simulação)',
          text: `Perfeito, ${activeChat.leadName}! Estou finalizando o comparativo oficial com a tabela de prazos reduzidos e já te envio aqui no WhatsApp.`,
        },
      ]);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" />
              WhatsApp Business Platform API
            </span>
            <span className="text-xs text-slate-500">•</span>
            <span className="text-xs text-slate-400">Atendimento Oficial & Robô de Qualificação</span>
          </div>
          <h1 className="text-xl md:text-2xl font-extrabold text-white tracking-tight mt-1">
            Central de Conversas WhatsApp & Automações
          </h1>
          <p className="text-xs text-slate-400">
            Responda leads em tempo real com sugestões da IA Gemini e gerencie opt-out/descadastramento LGPD.
          </p>
        </div>
      </div>

      {/* Main Inbox Container */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 shadow-xl grid grid-cols-1 md:grid-cols-12 min-h-[620px] overflow-hidden">
        {/* Left: Chat List */}
        <div className="md:col-span-4 border-r border-slate-800/80 flex flex-col bg-slate-950/40">
          <div className="p-4 border-b border-slate-800">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Conversas Recentes ({chats.length})
            </span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
            {chats.map((chat) => {
              const isSelected = chat.id === selectedChatId;
              return (
                <button
                  key={chat.id}
                  onClick={() => {
                    setSelectedChatId(chat.id);
                    setSuggestedReplies(null);
                  }}
                  className={`w-full p-4 text-left transition-all cursor-pointer flex flex-col gap-1.5 ${
                    isSelected
                      ? 'bg-blue-600/15 border-l-4 border-blue-500'
                      : 'hover:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-100 text-xs truncate max-w-[160px]">
                      {chat.leadName}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {chat.lastMessageTime}
                    </span>
                  </div>

                  <p className="text-[11px] text-blue-400 font-medium">{chat.product}</p>

                  <p className="text-xs text-slate-400 truncate leading-snug">
                    {chat.lastMessage}
                  </p>

                  <div className="flex items-center justify-between pt-1">
                    <span
                      className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider ${
                        chat.status === 'em_atendimento'
                          ? 'bg-blue-500/20 text-blue-300'
                          : chat.status === 'qualificado_ia'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : chat.status === 'descadastrado'
                          ? 'bg-rose-500/20 text-rose-300'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {chat.status.replace('_', ' ')}
                    </span>

                    {chat.optOut && (
                      <span className="text-[9px] text-rose-400 font-semibold flex items-center gap-1">
                        <Ban className="w-2.5 h-2.5" /> Opt-out
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Active Chat Conversation */}
        {activeChat ? (
          <div className="md:col-span-8 flex flex-col bg-slate-900">
            {/* Chat Header */}
            <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <span>{activeChat.leadName}</span>
                  <span className="text-xs text-slate-400 font-mono">({activeChat.phone})</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Interesse: <strong className="text-blue-400">{activeChat.product}</strong>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onToggleOptOut(activeChat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    activeChat.optOut
                      ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                      : 'bg-slate-800 hover:bg-slate-750 text-slate-300 border-slate-700'
                  }`}
                  title="Gerenciar consentimento e descadastramento LGPD"
                >
                  {activeChat.optOut ? 'Descadastrado (Opt-out Ativo)' : 'Registrar Opt-out LGPD'}
                </button>

                <button
                  onClick={handleLoadSuggestions}
                  disabled={isLoadingSuggestions}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 text-xs font-semibold transition-all cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isLoadingSuggestions ? 'Sugerindo...' : 'Sugerir Resposta IA'}</span>
                </button>
              </div>
            </div>

            {/* AI Suggested Quick Replies Bar */}
            {suggestedReplies && suggestedReplies.length > 0 && (
              <div className="p-3 bg-blue-950/40 border-b border-blue-900/30 space-y-2 animate-in slide-in-from-top-2">
                <span className="text-[11px] font-bold text-blue-300 uppercase tracking-wider block">
                  Sugestões da IA Gemini para Fechamento:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {suggestedReplies.map((opt: any, i: number) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-xl bg-slate-950 border border-blue-500/20 text-xs space-y-1.5 flex flex-col justify-between"
                    >
                      <div>
                        <span className="text-[10px] font-bold text-cyan-400 uppercase block">
                          {opt.title}
                        </span>
                        <p className="text-slate-300 leading-snug">{opt.text}</p>
                      </div>
                      <button
                        onClick={() => handleSend(opt.text)}
                        className="self-end px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-[10px] cursor-pointer"
                      >
                        Enviar Esta Resposta
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Message Thread */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-950/20">
              {activeChat.messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex items-start gap-2 ${
                    m.sender === 'lead' ? 'justify-start' : 'justify-end'
                  }`}
                >
                  <div
                    className={`max-w-md rounded-2xl p-3 text-xs leading-relaxed ${
                      m.sender === 'lead'
                        ? 'bg-slate-800 text-slate-100 rounded-tl-none'
                        : m.sender === 'bot'
                        ? 'bg-indigo-900/40 border border-indigo-500/30 text-indigo-100 rounded-tr-none'
                        : 'bg-emerald-700 text-white rounded-tr-none'
                    }`}
                  >
                    {m.sender === 'bot' && (
                      <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-300 block mb-1 flex items-center gap-1">
                        <Bot className="w-2.5 h-2.5" /> Atendimento Inicial Automático
                      </span>
                    )}
                    <p>{m.text}</p>
                    <span className="block text-right text-[9px] opacity-60 mt-1">
                      {m.timestamp}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Message Input Box */}
            <div className="p-3 border-t border-slate-800 bg-slate-950/70">
              {activeChat.optOut ? (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs text-center">
                  Este contato solicitou o descadastramento conforme a LGPD. O envio de novas mensagens está bloqueado.
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSend();
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Digite sua mensagem autorizada para o cliente via WhatsApp Business..."
                    className="flex-1 px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="submit"
                    disabled={isSending || !inputText.trim()}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Enviar</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        ) : (
          <div className="md:col-span-8 flex items-center justify-center p-12 text-slate-500 text-xs">
            {chats.length === 0
              ? 'Nenhuma conversa registrada no momento.'
              : 'Selecione uma conversa para começar.'}
          </div>
        )}
      </div>
    </div>
  );
};
