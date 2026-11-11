import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Plus,
  ShieldAlert,
  Sparkles,
  ChevronDown,
  LogOut,
  KeyRound,
  ShieldCheck,
  Camera,
} from 'lucide-react';
import { AuthPermissions, User } from '../types';

interface NavbarProps {
  currentUser: User | null;
  permissions: AuthPermissions;
  onOpenNewLeadModal: () => void;
  onOpenAiAssistant: () => void;
  onOpenAdminMaster: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenAuthModal: () => void;
  onOpenProfileSettings: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  permissions,
  onOpenNewLeadModal,
  onOpenAiAssistant,
  onOpenAdminMaster,
  searchQuery,
  onSearchChange,
  onOpenAuthModal,
  onOpenProfileSettings,
  onLogout,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const isMaster = permissions.isMaster;
  const isGestor = permissions.isGestor;

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-4 md:px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Left: Global Search */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Pesquisar leads, telefones, produtos, cartas ou cidades..."
            className="w-full pl-10 pr-4 py-2 bg-slate-950/60 border border-slate-750 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
          />
        </div>
      </div>

      {/* Right: Quick Actions & Verified Account Menu (No test role switcher in production) */}
      <div className="flex items-center gap-3">
        {isMaster && (
          <button
            onClick={onOpenAdminMaster}
            className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 text-xs font-bold transition-all cursor-pointer"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Painel Master SaaS</span>
          </button>
        )}

        <button
          onClick={onOpenAiAssistant}
          className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600/20 to-indigo-600/20 border border-blue-500/30 text-blue-400 hover:text-blue-300 hover:border-blue-500/60 text-xs font-semibold transition-all shadow-sm shadow-blue-900/20 cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
          <span>Gemini 3.8 Copilot</span>
        </button>

        <button
          onClick={onOpenNewLeadModal}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs md:text-sm shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden md:inline">Cadastrar Lead</span>
        </button>

        {/* Authenticated User Profile Menu */}
        <div ref={menuRef} className="relative flex items-center gap-2 pl-2 border-l border-slate-800">
          <button
            onClick={() => setMenuOpen((prev) => !prev)}
            className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-slate-800/80 transition-all text-left cursor-pointer"
          >
            <img
              src={
                currentUser?.avatar ||
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'
              }
              alt={currentUser?.name || 'Usuário'}
              className={`w-8 h-8 rounded-full object-cover ring-2 ${
                isMaster
                  ? 'ring-amber-500/50'
                  : isGestor
                  ? 'ring-purple-500/40'
                  : 'ring-blue-500/30'
              }`}
            />
            <div className="hidden lg:block text-xs leading-tight">
              <p className="font-semibold text-slate-200 truncate max-w-[160px]">
                {currentUser?.name || 'Sessão não autenticada'}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={`inline-block px-1.5 py-0.2 rounded text-[9px] uppercase font-bold tracking-wider ${
                    isMaster
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : isGestor
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  {isMaster ? 'Master SaaS' : isGestor ? 'Gestor' : 'Vendedor'}
                </span>
                <span className="text-[9px] text-slate-400 font-medium truncate max-w-[140px]">
                  {isMaster
                    ? 'Enterprise • Acesso Global'
                    : currentUser?.planName?.replace('Plano ', '') || 'Enterprise'}
                </span>
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden lg:block" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 w-72 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl py-2 z-50">
              <div className="px-4 py-2.5 border-b border-slate-800/80 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-white truncate">
                    {currentUser?.name || 'Conta não conectada'}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                      isMaster
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : isGestor
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    role: {currentUser?.role || 'guest'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 truncate">{currentUser?.email}</p>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 pt-0.5">
                  <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span className="truncate">
                    {isMaster
                      ? 'tenant_id: NULL • Plano Enterprise Global'
                      : `${currentUser?.companyName} (${currentUser?.tenantId})`}
                  </span>
                </div>
              </div>

              <div className="p-2 space-y-1">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenProfileSettings();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-blue-300 hover:bg-blue-500/10 transition-colors cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5 text-blue-400" />
                  <span>Alterar Foto &amp; Perfil</span>
                </button>

                {permissions.canAccessAdminMaster && (
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenAdminMaster();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-amber-300 hover:bg-amber-500/10 transition-colors cursor-pointer"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Abrir Painel Master SaaS</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenAuthModal();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5 text-blue-400" />
                  <span>Trocar Conta / Autenticar</span>
                </button>

                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onLogout();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Encerrar Sessão</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
