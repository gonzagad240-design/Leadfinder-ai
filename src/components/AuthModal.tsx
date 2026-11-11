import React, { useState } from 'react';
import { X, Lock, ShieldCheck, Loader2, AlertCircle } from 'lucide-react';
import { AuthPermissions, User } from '../types';
import { NavViewId } from './Sidebar';
import { loginWithEmail, registerUserAccount } from '../services/authService';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: 'modal' | 'gate';
  onAuthSuccess: (result: {
    user: User;
    permissions: AuthPermissions;
    redirectView: NavViewId;
  }) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  mode = 'modal',
  onAuthSuccess,
}) => {
  const [tab, setTab] = useState<'login' | 'register' | 'recovery'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [role, setRole] = useState<'vendedor' | 'gestor'>('vendedor');
  const [recoverySent, setRecoverySent] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setFeedbackMsg(null);
    setIsSubmitting(true);

    try {
      const res = await loginWithEmail(email, password);
      if (res.error || !res.user) {
        setFeedbackMsg(res.error || 'Falha na autenticação. Verifique o e-mail e a senha cadastrados.');
        return;
      }

      onAuthSuccess({
        user: res.user,
        permissions: res.permissions,
        redirectView: res.redirectView,
      });
      setPassword('');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) {
      setFeedbackMsg('Preencha nome completo, e-mail corporativo e senha.');
      return;
    }

    setFeedbackMsg(null);
    setIsSubmitting(true);

    try {
      const res = await registerUserAccount({
        name,
        email,
        password,
        role,
        companyName: companyName.trim() || undefined,
      });

      if (res.error || !res.user) {
        setFeedbackMsg(res.error || 'Não foi possível concluir o cadastro.');
        return;
      }

      onAuthSuccess({
        user: res.user,
        permissions: res.permissions,
        redirectView: res.redirectView,
      });
      setPassword('');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecoverySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRecoverySent(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Autenticação Segura • Tabela Profiles</h3>
              <p className="text-[11px] text-slate-400">LeadFinder AI SaaS Enterprise</p>
            </div>
          </div>
          {mode !== 'gate' && (
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-slate-800 bg-slate-950/30 text-xs font-semibold">
          <button
            onClick={() => {
              setTab('login');
              setFeedbackMsg(null);
            }}
            className={`flex-1 py-3 text-center border-b-2 transition-all cursor-pointer ${
              tab === 'login' ? 'border-blue-500 text-blue-400 bg-slate-900' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            1. Login
          </button>
          <button
            onClick={() => {
              setTab('register');
              setFeedbackMsg(null);
            }}
            className={`flex-1 py-3 text-center border-b-2 transition-all cursor-pointer ${
              tab === 'register' ? 'border-blue-500 text-blue-400 bg-slate-900' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            2. Cadastro
          </button>
          <button
            onClick={() => {
              setTab('recovery');
              setFeedbackMsg(null);
            }}
            className={`flex-1 py-3 text-center border-b-2 transition-all cursor-pointer ${
              tab === 'recovery' ? 'border-blue-500 text-blue-400 bg-slate-900' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            3. Recuperar Senha
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {feedbackMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{feedbackMsg}</span>
            </div>
          )}

          {tab === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  E-mail Cadastrado em Profiles
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu.email@empresa.com.br"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Senha de Acesso
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 cursor-pointer transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{isSubmitting ? 'Autenticando na Base...' : 'Entrar na Plataforma'}</span>
              </button>
            </form>
          )}

          {tab === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nome Completo
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Amanda Ferreira"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  E-mail Corporativo
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="amanda@empresa.com.br"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Senha
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Corretora / Empresa
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Nome da corretora"
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Perfil Corporativo
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'vendedor' | 'gestor')}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="vendedor">Vendedor (Carteira pessoal, Kanban, Simulador e WhatsApp)</option>
                  <option value="gestor">Gestor (Equipe, Limites de Plano, Campanhas e Métricas)</option>
                </select>
                <p className="text-[10px] text-slate-500 mt-1">
                  Contas Master SaaS são gerenciadas exclusivamente pela tabela <code className="text-slate-400">public.profiles</code> no banco de dados.
                </p>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 cursor-pointer transition-all mt-2 flex items-center justify-center gap-2"
              >
                {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{isSubmitting ? 'Criando Perfil...' : 'Cadastrar e Entrar'}</span>
              </button>
            </form>
          )}

          {tab === 'recovery' && (
            <div className="space-y-4">
              {recoverySent ? (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-2">
                  <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto" />
                  <p className="text-xs font-bold text-white">Instruções Enviadas!</p>
                  <p className="text-[11px] text-slate-300">
                    Se o e-mail estiver cadastrado em <code className="text-emerald-300">public.profiles</code>, você receberá um link seguro para redefinição de senha em alguns minutos.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleRecoverySubmit} className="space-y-3">
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Informe seu e-mail cadastrado para receber as instruções de recuperação de acesso da sua conta.
                  </p>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      E-mail Cadastrado
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu.email@empresa.com.br"
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 cursor-pointer transition-all"
                  >
                    Enviar Link de Recuperação
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
