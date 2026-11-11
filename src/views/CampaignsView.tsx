import React, { useState } from 'react';
import {
  Megaphone,
  Plus,
  Copy,
  Check,
  ExternalLink,
  Layers,
  Sparkles,
  TrendingUp,
  Share2,
  Globe
} from 'lucide-react';
import { Campaign, ConsorcioProduct } from '../types';

interface CampaignsViewProps {
  campaigns: Campaign[];
  onCreateCampaign: (campData: Partial<Campaign>) => Promise<void>;
  onNavigate: (view: any) => void;
}

export const CampaignsView: React.FC<CampaignsViewProps> = ({
  campaigns,
  onCreateCampaign,
  onNavigate,
}) => {
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [product, setProduct] = useState<ConsorcioProduct>('Imóvel');
  const [budget, setBudget] = useState(2000);
  const [landingSlug, setLandingSlug] = useState('');

  const handleCopyLink = (slug: string) => {
    const url = `${window.location.origin}/?landing=${slug}&utm_source=meta_ads&utm_campaign=leadfinder_ai`;
    navigator.clipboard.writeText(url);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2500);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const finalSlug = landingSlug.trim() || `captacao-${Date.now().toString().slice(-4)}`;
    await onCreateCampaign({
      name,
      product,
      budget: Number(budget),
      landingSlug: finalSlug,
      targetAudience: 'Público qualificado via Meta Ads & Google Ads',
    });
    setIsModalOpen(false);
    setName('');
    setLandingSlug('');
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-[10px] font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
              <Megaphone className="w-3.5 h-3.5" />
              Mídia & Captação Automática
            </span>
            <span className="text-xs text-slate-500">•</span>
            <span className="text-xs text-slate-400">{campaigns.length} campanhas ativas</span>
          </div>
          <h1 className="text-xl md:text-2xl font-extrabold text-white tracking-tight mt-1">
            Campanhas, Links Exclusivos & Landing Pages
          </h1>
          <p className="text-xs text-slate-400">
            Gere links de formulários inteligentes para captar leads via Meta Ads, Google Ads e WhatsApp.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onNavigate('landing_preview')}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5"
          >
            <Globe className="w-3.5 h-3.5 text-blue-400" />
            <span>Ver Formulário Público</span>
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 cursor-pointer transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Campanha</span>
          </button>
        </div>
      </div>

      {/* Campaigns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {campaigns.map((camp) => (
          <div
            key={camp.id}
            className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all space-y-4 shadow-lg flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">
                  {camp.product}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {camp.status}
                </span>
              </div>
              <h3 className="text-sm font-bold text-white">{camp.name}</h3>
              <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                Público: {camp.targetAudience}
              </p>
            </div>

            {/* Metrics Snapshot */}
            <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-center text-xs">
              <div>
                <span className="text-[9px] text-slate-500 uppercase block">Leads</span>
                <strong className="text-base font-extrabold text-white">{camp.leadsCount}</strong>
              </div>
              <div>
                <span className="text-[9px] text-slate-500 uppercase block">Vendas</span>
                <strong className="text-base font-extrabold text-emerald-400">{camp.conversions}</strong>
              </div>
              <div>
                <span className="text-[9px] text-slate-500 uppercase block">Verba</span>
                <strong className="text-xs font-bold text-slate-300">
                  R$ {camp.spent}/{camp.budget}
                </strong>
              </div>
            </div>

            {/* Link Box */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                Link Exclusivo de Captação:
              </span>
              <div className="flex items-center justify-between gap-2 text-xs">
                <code className="text-[11px] font-mono text-blue-300 truncate">
                  /?landing={camp.landingSlug}
                </code>
                <button
                  onClick={() => handleCopyLink(camp.landingSlug)}
                  className="p-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white transition-all shrink-0 cursor-pointer"
                  title="Copiar link rastreado"
                >
                  {copiedSlug === camp.landingSlug ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* New Campaign Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white">Criar Nova Campanha de Captação</h3>
            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nome da Campanha</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Consórcio Imobiliário Q2"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Produto Principal</label>
                <select
                  value={product}
                  onChange={(e) => setProduct(e.target.value as ConsorcioProduct)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200"
                >
                  <option value="Imóvel">Imóvel</option>
                  <option value="Automóvel">Automóvel</option>
                  <option value="Caminhão">Caminhão</option>
                  <option value="Máquinas Agrícolas">Máquinas Agrícolas</option>
                  <option value="Carta Contemplada">Carta Contemplada</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Slug do Link Exclusivo</label>
                <input
                  type="text"
                  value={landingSlug}
                  onChange={(e) => setLandingSlug(e.target.value)}
                  placeholder="Ex: imovel-sp-2026"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 rounded-xl text-slate-300 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold"
                >
                  Criar e Gerar Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
