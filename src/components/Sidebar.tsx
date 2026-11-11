import React from 'react';
import {
  LayoutDashboard,
  Compass,
  Users,
  KanbanSquare,
  Sparkles,
  Megaphone,
  Award,
  Layers,
  Calculator,
  MessageSquare,
  BarChart3,
  UserCog,
  CreditCard,
  Settings,
  ShieldAlert,
  Globe,
  FileCheck2,
  ChevronLeft,
  ChevronRight,
  Flame,
  Zap,
  Radar
} from 'lucide-react';
import { AuthPermissions, UserRole } from '../types';

export type NavViewId =
  | 'dashboard'
  | 'lead_hunter'
  | 'outbound_prospecting'
  | 'leads_database'
  | 'crm_kanban'
  | 'ai_assistant'
  | 'campaigns'
  | 'cartas_contempladas'
  | 'products_consorcio'
  | 'simulators'
  | 'whatsapp'
  | 'reports'
  | 'team'
  | 'subscriptions'
  | 'settings'
  | 'admin_master'
  | 'landing_preview'
  | 'lgpd_compliance';

interface SidebarProps {
  currentView: NavViewId;
  onNavigate: (view: NavViewId) => void;
  userRole?: UserRole;
  permissions?: AuthPermissions;
  collapsed: boolean;
  onToggleCollapse: () => void;
  hotLeadsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  userRole = 'vendedor',
  permissions,
  collapsed,
  onToggleCollapse,
  hotLeadsCount = 0,
}) => {
  const isMaster = permissions
    ? permissions.isMaster && permissions.canAccessAdminMaster
    : userRole === 'master' || userRole === 'admin_master';
  const isGestor = permissions
    ? permissions.isGestor
    : userRole === 'gestor' || userRole === 'empresa';
  const isVendedor = !isMaster && !isGestor;

  const navSections = isVendedor
    ? [
        {
          title: 'MINHA CARTEIRA & VENDAS',
          items: [
            { id: 'dashboard', label: 'Meu Painel', icon: LayoutDashboard },
            { id: 'leads_database', label: 'Meus Leads Atribuídos', icon: Users, count: hotLeadsCount > 0 ? hotLeadsCount : undefined },
            { id: 'crm_kanban', label: 'Meu Funil CRM', icon: KanbanSquare },
            { id: 'ai_assistant', label: 'Gemini Copilot', icon: Sparkles, highlight: true },
          ],
        },
        {
          title: 'PRODUTOS & ATENDIMENTO',
          items: [
            { id: 'cartas_contempladas', label: 'Cartas Contempladas', icon: Award, badge: 'Match' },
            { id: 'products_consorcio', label: 'Tabela de Produtos', icon: Layers },
            { id: 'simulators', label: 'Simulador Financeiro', icon: Calculator },
            { id: 'whatsapp', label: 'Meu WhatsApp Leads', icon: MessageSquare },
          ],
        },
      ]
    : [
        {
          title: isMaster ? 'OPERAÇÃO GLOBAL & IA' : 'COMERCIAL & IA',
          items: [
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'lead_hunter', label: 'AI Lead Hunter', icon: Compass, badge: 'IA' },
            { id: 'outbound_prospecting', label: 'Prospecção Automática', icon: Radar, badge: 'Outbound' },
            { id: 'leads_database', label: 'Banco de Leads', icon: Users, count: hotLeadsCount > 0 ? hotLeadsCount : undefined },
            { id: 'crm_kanban', label: 'CRM Comercial', icon: KanbanSquare },
            { id: 'ai_assistant', label: 'Gemini Copilot', icon: Sparkles, highlight: true },
          ],
        },
        {
          title: 'CAPTAÇÃO & MERCADO',
          items: [
            { id: 'campaigns', label: 'Campanhas & Links', icon: Megaphone },
            { id: 'cartas_contempladas', label: 'Cartas Contempladas', icon: Award, badge: 'Match' },
            { id: 'products_consorcio', label: 'Produtos Consórcio', icon: Layers },
            { id: 'simulators', label: 'Simulador Financeiro', icon: Calculator },
            { id: 'whatsapp', label: 'WhatsApp & Bot', icon: MessageSquare },
            { id: 'landing_preview', label: 'Página de Captura', icon: Globe },
          ],
        },
        {
          title: isMaster ? 'ADMINISTRAÇÃO MASTER' : 'GESTÃO DA EMPRESA',
          items: [
            { id: 'reports', label: 'Relatórios & ROI', icon: BarChart3 },
            { id: 'team', label: 'Equipe & Vendedores', icon: UserCog },
            { id: 'subscriptions', label: 'Planos & Assinatura', icon: CreditCard },
            { id: 'settings', label: 'Configurações & APIs', icon: Settings },
            { id: 'lgpd_compliance', label: 'LGPD & Privacidade', icon: FileCheck2 },
            ...(isMaster
              ? [{ id: 'admin_master', label: 'Admin Master SaaS', icon: ShieldAlert, badge: 'Master' }]
              : []),
          ],
        },
      ];

  return (
    <aside
      className={`h-screen bg-slate-950 border-r border-slate-800/80 flex flex-col justify-between transition-all duration-300 z-40 relative select-none ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Top Header & Brand Logo */}
      <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 p-0.5 shadow-md shadow-blue-500/20 flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Zap className="w-5 h-5 text-blue-400 fill-blue-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                  LeadFinder
                </span>
                <span className="px-1.5 py-0.2 rounded-md bg-blue-600/20 border border-blue-500/30 text-[10px] font-bold text-blue-400">
                  AI
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Consórcios & Crédito</p>
            </div>
          </div>
        ) : (
          <div className="mx-auto w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center shadow-md shadow-blue-500/20">
            <Zap className="w-5 h-5 text-white fill-white" />
          </div>
        )}

        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors hidden md:block"
          title={collapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navSections.map((section, idx) => (
          <div key={idx} className="space-y-1">
            {!collapsed && (
              <p className="px-3 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                {section.title}
              </p>
            )}
            <div className="space-y-0.5 pt-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id as NavViewId)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all group relative cursor-pointer ${
                      isActive
                        ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 shadow-sm shadow-blue-900/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80 border border-transparent'
                    }`}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                        isActive
                          ? 'text-blue-400'
                          : item.highlight
                          ? 'text-amber-400'
                          : 'text-slate-400 group-hover:text-slate-200'
                      }`}
                    />

                    {!collapsed && (
                      <span className="truncate text-left flex-1">{item.label}</span>
                    )}

                    {!collapsed && item.badge && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        {item.badge}
                      </span>
                    )}

                    {!collapsed && item.count && (
                      <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        <Flame className="w-2.5 h-2.5 fill-rose-400" />
                        {item.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Status Box */}
      {!collapsed ? (
        <div className="p-3 m-3 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Gemini 3.8 Flash
            </span>
            <span className="text-[10px] font-mono text-emerald-400 font-medium">Online</span>
          </div>

          <div className="pt-1 border-t border-slate-800/80 flex items-center justify-between">
            <span className="text-[9px] text-slate-400 uppercase font-semibold">Nível de Acesso</span>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
              isMaster
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : isGestor
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
            }`}>
              {isMaster ? 'Master SaaS' : isGestor ? 'Gestor' : 'Vendedor'}
            </span>
          </div>
        </div>
      ) : (
        <div className="p-3 text-center">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block animate-pulse" title="Gemini 3.8 Flash Online"></span>
        </div>
      )}
    </aside>
  );
};
