import React, { useState } from 'react';
import {
  Sparkles,
  Send,
  Bot,
  User,
  Copy,
  Check,
  Flame,
  Award,
  HelpCircle,
  Lightbulb,
  TrendingUp,
  FileSpreadsheet
} from 'lucide-react';
import { Lead } from '../types';

interface AiAssistantViewProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

const SHORTCUT_QUESTIONS = [
  'Quais são meus leads mais quentes?',
  'Quem devo atender hoje com urgência?',
  'Quais clientes querem comprar imóveis?',
  'Quais clientes procuram cartas contempladas?',
  'Crie um roteiro para vender uma carta de crédito de R$ 300 mil.',
  'Analise meu funil de vendas e aponte melhorias.',
  'Crie uma mensagem comercial irresistível para WhatsApp sobre lance embutido.',
];

export const AiAssistantView: React.FC<AiAssistantViewProps> = ({
  leads,
  onSelectLead,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm-init',
      sender: 'assistant',
      text: `Olá! Sou seu Consultor Comercial e Mentor de Consórcios equipado com o **Google Gemini 3.8 Flash**.
Tenho acesso em tempo real aos seus **${leads.length} leads**, cartas contempladas disponíveis e métricas do funil.

Como posso acelerar suas vendas hoje? Escolha uma das perguntas rápidas abaixo ou digite sua dúvida.`,
      timestamp: 'Agora mesmo',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: 'Agora mesmo',
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ message: text }),
      });

      let replyText = 'Não consegui obter uma resposta do modelo no momento.';
      if (res.ok) {
        const ct = res.headers.get('content-type') || '';
        if (ct.includes('application/json')) {
          const data = await res.json();
          replyText = data.reply || replyText;
        }
      }

      const assistantMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        sender: 'assistant',
        text: replyText,
        timestamp: 'Agora mesmo',
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error('Error querying Gemini chat:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          sender: 'assistant',
          text: 'Ocorreu uma instabilidade na conexão com o servidor. Por favor, tente novamente.',
          timestamp: 'Agora mesmo',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 border border-blue-500/30 shadow-xl flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/40 text-[10px] font-bold text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              IA Treinada em Consórcios Brasil
            </span>
            <span className="text-xs text-slate-500">•</span>
            <span className="text-xs text-emerald-400 font-medium">Gemini 3.8 Flash</span>
          </div>
          <h1 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">
            Consultor Comercial & Copilot Gemini
          </h1>
          <p className="text-xs text-slate-400">
            Pergunte sobre seus leads, crie scripts de alta conversão, simule estratégias de lance e supere objeções.
          </p>
        </div>
      </div>

      {/* Suggested Questions Pill Carousel */}
      <div className="space-y-2">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
          Perguntas Frequentes & Atalhos Inteligentes:
        </span>
        <div className="flex flex-wrap gap-2">
          {SHORTCUT_QUESTIONS.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(q)}
              disabled={isLoading}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-blue-500/40 text-slate-300 text-xs font-medium transition-all text-left cursor-pointer disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Conversation Box */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col h-[580px] overflow-hidden">
        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex items-start gap-3 ${
                m.sender === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {m.sender === 'assistant' && (
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-md">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-2xl rounded-2xl p-4 text-xs leading-relaxed space-y-2 relative group ${
                  m.sender === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-none'
                    : 'bg-slate-950/80 border border-slate-800 text-slate-200 rounded-tl-none'
                }`}
              >
                <div className="whitespace-pre-wrap font-sans">{m.text}</div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-800/40 text-[10px] text-slate-400">
                  <span>{m.timestamp}</span>
                  {m.sender === 'assistant' && (
                    <button
                      onClick={() => copyToClipboard(m.id, m.text)}
                      className="p-1 hover:text-white rounded hover:bg-slate-800 transition-colors"
                      title="Copiar texto"
                    >
                      {copiedId === m.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              {m.sender === 'user' && (
                <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shrink-0 animate-pulse">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs text-blue-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping"></span>
                <span>Gemini 3.8 Flash analisando dados comerciais e gerando resposta...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/50">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Pergunte ao Gemini sobre seus leads, propostas, roteiros de ligação ou estratégias de lance..."
              disabled={isLoading}
              className="flex-1 px-4 py-3 bg-slate-900 border border-slate-800 rounded-2xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isLoading || !inputText.trim()}
              className="px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50 shrink-0"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Enviar</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
