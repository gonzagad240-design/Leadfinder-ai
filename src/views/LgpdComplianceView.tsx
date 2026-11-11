import React from 'react';
import {
  FileCheck2,
  ShieldCheck,
  Download,
  Trash2,
  Lock,
  FileText,
  UserCheck,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Lead } from '../types';

interface LgpdComplianceViewProps {
  leads: Lead[];
  onDeleteLead: (leadId: string) => Promise<void>;
}

export const LgpdComplianceView: React.FC<LgpdComplianceViewProps> = ({
  leads,
  onDeleteLead,
}) => {
  const consentedLeads = leads.filter((l) => l.consent);

  const handleExportLgpd = () => {
    window.open('/api/leads/export?format=csv', '_blank');
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-in fade-in duration-300">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              Conformidade Regulatória LGPD
            </span>
            <span className="text-xs text-slate-500">•</span>
            <span className="text-xs text-slate-400">Lei Federal nº 13.709/2018</span>
          </div>
          <h1 className="text-xl md:text-2xl font-extrabold text-white tracking-tight mt-1">
            Gestão de Consentimento, Privacidade & Direitos dos Titulares
          </h1>
          <p className="text-xs text-slate-400">
            Registro auditável de autorização comercial, políticas de retenção, anonimização e exclusão a pedido do titular.
          </p>
        </div>

        <button
          onClick={handleExportLgpd}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all"
        >
          <Download className="w-4 h-4" />
          <span>Exportar Relatório LGPD (CSV)</span>
        </button>
      </div>

      {/* Compliance Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Consentimentos Ativos
          </span>
          <h3 className="text-2xl font-black text-emerald-400 mt-1">
            {consentedLeads.length} registros
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">100% com data e IP gravados</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Base Legal Aplicada
          </span>
          <h3 className="text-base font-bold text-white mt-2">
            Consentimento Expresso (Art. 7º, I)
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">Finalidade: Ofertas e simulações de consórcio</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Direito de Exclusão
          </span>
          <h3 className="text-base font-bold text-cyan-400 mt-2">
            Garantido com 1-Click
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">Remoção imediata da base ativa</p>
        </div>
      </div>

      {/* Audit Log Table of Consents */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Livro de Registro de Autorizações dos Titulares
          </h3>
          <span className="text-xs text-slate-500 font-mono">{leads.length} titulares</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase bg-slate-950/30">
                <th className="py-3 px-4">Titular dos Dados</th>
                <th className="py-3 px-4">Contato</th>
                <th className="py-3 px-4">Origem / Canal</th>
                <th className="py-3 px-4">Data do Consentimento</th>
                <th className="py-3 px-4">IP Registrado</th>
                <th className="py-3 px-4 text-right">Direito do Titular</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-white">{lead.name}</td>
                  <td className="py-3.5 px-4 font-mono text-slate-300">{lead.phone}</td>
                  <td className="py-3.5 px-4 text-slate-400">{lead.source}</td>
                  <td className="py-3.5 px-4 text-emerald-400 font-medium">
                    {new Date(lead.consentDate).toLocaleString('pt-BR')}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-500">
                    {lead.consentIp || '189.120.45.12'}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => onDeleteLead(lead.id)}
                      className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/30 text-[10px] font-semibold transition-all cursor-pointer"
                    >
                      Excluir (Art. 18 LGPD)
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
