import React, { useState } from 'react';
import {
  Radar,
  Plus,
  Play,
  Sparkles,
  CheckCircle2,
  Copy,
  Check,
  Building2,
  MapPin,
  DollarSign,
  Layers,
  ArrowRight,
  ExternalLink,
  Flame,
  Globe,
  Radio,
  FileCode,
  ShieldCheck,
  Clock,
  Trash2,
  AlertCircle,
  X
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ConsorcioProduct, Lead, OutboundProvider, OutboundTargetProfile } from '../types';

interface OutboundProspectingViewProps {
  profiles: OutboundTargetProfile[];
  onAddProfile: (profileData: Partial<OutboundTargetProfile>) => Promise<void>;
  onDeleteProfile: (id: string) => Promise<void>;
  onSelectLead: (lead: Lead) => void;
  onNavigate: (view: any) => void;
  onRefreshAllData: () => Promise<void>;
}

const INDUSTRIES = [
  'Transporte de Cargas & Logística',
  'Construção Civil & Reformas',
  'Agronegócio & Cultivo de Grãos',
  'Clínicas Médicas & Laboratórios',
  'Indústria Metalúrgica & Manufatura',
  'Comércio Varejista & Franquias',
  'Imobiliárias & Investidores',
  'Serviços de Tecnologia & Telecom',
  'Hotelaria & Gastronomia',
  'Concessionárias & Frotas Leves',
];

const PRODUCTS: ConsorcioProduct[] = [
  'Imóvel',
  'Automóvel',
  'Caminhão',
  'Máquinas Agrícolas',
  'Construção/Reforma',
  'Investimento Imobiliário',
  'Carta Contemplada',
];

export const OutboundProspectingView: React.FC<OutboundProspectingViewProps> = ({
  profiles,
  onAddProfile,
  onDeleteProfile,
  onSelectLead,
  onNavigate,
  onRefreshAllData,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [runningProfileId, setRunningProfileId] = useState<string | null>(null);
  const [copiedSecret, setCopiedSecret] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [recentFoundLeads, setRecentFoundLeads] = useState<Lead[]>([]);
  const [successFeedback, setSuccessFeedback] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [industry, setIndustry] = useState(INDUSTRIES[0]);
  const [citiesInput, setCitiesInput] = useState('Campinas, Paulínia, Sumaré');
  const [statesInput, setStatesInput] = useState('SP');
  const [targetCreditMin, setTargetCreditMin] = useState<number>(400000);
  const [targetCreditMax, setTargetCreditMax] = useState<number>(1200000);
  const [targetProduct, setTargetProduct] = useState<ConsorcioProduct>('Caminhão');
  const [provider, setProvider] = useState<OutboundProvider>('google_places');
  const [apiKey, setApiKey] = useState('');
  const [autoQualifyGemini, setAutoQualifyGemini] = useState(true);

  const webhookEndpointUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/outbound/webhook-inbound`
    : 'https://seusite.com/api/outbound/webhook-inbound';

  const handleCopy = (text: string, isSecret = false, secretId = '') => {
    navigator.clipboard.writeText(text);
    if (isSecret) {
      setCopiedSecret(secretId);
      setTimeout(() => setCopiedSecret(null), 2500);
    } else {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2500);
    }
  };

  const handleRunSearch = async (profile: OutboundTargetProfile) => {
    try {
      setRunningProfileId(profile.id);
      setSuccessFeedback(null);
      const res = await fetch(`/api/outbound/run-search/${profile.id}`, {
        method: 'POST',
        headers: { Accept: 'application/json' },
      });

      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }

      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('application/json')) {
        throw new Error('Non-JSON response');
      }

      const data = await res.json();

      if (data.leads && data.leads.length > 0) {
        setRecentFoundLeads(data.leads);
        setSuccessFeedback(data.message || `${data.leads.length} novos leads prospectados e qualificados!`);
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
        await onRefreshAllData();
      }
    } catch (err) {
      console.error('Error running search:', err);
    } finally {
      setRunningProfileId(null);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const cities = citiesInput.split(',').map((c) => c.trim()).filter(Boolean);
    const states = statesInput.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);

    await onAddProfile({
      name,
      industry,
      cities,
      states,
      targetCreditMin: Number(targetCreditMin),
      targetCreditMax: Number(targetCreditMax),
      targetProduct,
      provider,
      apiKey,
      autoQualifyGemini,
      status: 'ativo',
    });

    setIsModalOpen(false);
    setName('');
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 border border-blue-500/30 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/40 text-[10px] font-bold text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
              <Radar className="w-3.5 h-3.5 text-blue-400 animate-spin-slow" />
              Prospecção Automática Outbound
            </span>
            <span className="text-xs text-slate-500">•</span>
            <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Gemini Copilot Qualificador
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">
            Prospecção Automática & Conectores de Dados (Outbound)
          </h1>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Defina o Perfil de Cliente Ideal (ICP), integre via API ou Webhook com <strong>PhantomBuster, Outscraper ou Google Places API</strong>. Os leads prospectados entram automaticamente no Banco de Leads e o Gemini Copilot faz o diagnóstico e qualificação imediata.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 cursor-pointer transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Perfil de Busca (ICP)</span>
        </button>
      </div>

      {/* Real-time Discovery Notice / Success feedback */}
      {successFeedback && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{successFeedback}</span>
          </div>
          <button
            onClick={() => onNavigate('leads_database')}
            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all"
          >
            Ver no Banco de Leads
          </button>
        </div>
      )}

      {/* Discovered Leads Preview Box (if recently executed) */}
      {recentFoundLeads.length > 0 && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-blue-500/30 shadow-xl space-y-4 animate-in slide-in-from-top-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>Leads Recém-Encontrados e Qualificados pelo Gemini Copilot</span>
              </h2>
              <p className="text-xs text-slate-400">
                Inseridos automaticamente no Banco de Leads prontos para abordagem comercial
              </p>
            </div>
            <button
              onClick={() => onNavigate('leads_database')}
              className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
            >
              <span>Abrir no Banco de Leads</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {recentFoundLeads.map((lead) => (
              <div
                key={lead.id}
                onClick={() => onSelectLead(lead)}
                className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-blue-500/50 transition-all cursor-pointer space-y-2 group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs group-hover:text-blue-400 transition-colors">
                    {lead.name}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                    <Flame className="w-3 h-3 fill-current" />
                    {lead.score} pts
                  </span>
                </div>

                <p className="text-[11px] text-slate-400">
                  {lead.city} - {lead.state} • <strong className="text-slate-200">{lead.product}</strong>
                </p>

                <div className="flex justify-between text-xs pt-1 border-t border-slate-800">
                  <span className="text-slate-400">Crédito Alvo:</span>
                  <strong className="text-emerald-400">R$ {lead.targetValue.toLocaleString('pt-BR')}</strong>
                </div>

                <div className="p-2 rounded-lg bg-blue-950/30 border border-blue-900/30 text-[10px] text-slate-300 line-clamp-2">
                  <strong className="text-blue-400">IA:</strong> {lead.nextRecommendedAction}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Webhook & Data Sources Integration Documentation */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Radio className="w-4 h-4 text-emerald-400" />
              <span>Conector Universal de Webhook / API de Prospecção</span>
            </h2>
            <p className="text-xs text-slate-400">
              Envie dados extraídos do PhantomBuster, Outscraper, Google Places ou Zapier direto para cá.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500 uppercase font-mono">Endpoint Inbound:</span>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-blue-300 font-mono">
              <span className="truncate max-w-[280px]">{webhookEndpointUrl}</span>
              <button
                onClick={() => handleCopy(webhookEndpointUrl)}
                className="text-slate-400 hover:text-white"
                title="Copiar URL do Webhook"
              >
                {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Integration Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <strong className="text-white">PhantomBuster</strong>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-500/20 text-blue-300">
                Pronto
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              Configure seu Phantom (Google Maps Search ou LinkedIn Scraper) para enviar o webhook POST ao finalizar a busca.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <strong className="text-white">Outscraper API</strong>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300">
                Pronto
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              Extração de empresas por ramo e cidade via Google Maps com telefone, e-mail e CNPJ sincronizados no CRM.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <strong className="text-white">Google Places API</strong>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-500/20 text-indigo-300">
                Pronto
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              Busca nativa de estabelecimentos comerciais geolocalizados por praça de atuação e enquadramento de consórcio.
            </p>
          </div>
        </div>
      </div>

      {/* Configured Outbound Profiles */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-400" />
            <span>Perfis de Clientes Ideais (ICP) Configurados ({profiles.length})</span>
          </h2>
          <span className="text-xs text-slate-500">
            Clique em &quot;Executar Prospecção&quot; para acionar a busca e qualificação
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {profiles.map((profile) => {
            const isRunning = runningProfileId === profile.id;

            return (
              <div
                key={profile.id}
                className="p-5 rounded-3xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all shadow-xl space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20 uppercase tracking-wider">
                      {profile.provider.replace('_', ' ')}
                    </span>
                    <button
                      onClick={() => onDeleteProfile(profile.id)}
                      className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                      title="Excluir perfil"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <h3 className="text-sm font-bold text-white leading-tight">{profile.name}</h3>
                  <p className="text-xs text-blue-400 font-medium">{profile.industry}</p>
                </div>

                {/* Parameters specs */}
                <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[11px] flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-500" /> Cidades:
                    </span>
                    <span className="text-slate-200 font-medium truncate max-w-[150px]">
                      {profile.cities.join(', ')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[11px] flex items-center gap-1">
                      <DollarSign className="w-3 h-3 text-emerald-400" /> Faixa de Crédito:
                    </span>
                    <span className="text-emerald-400 font-semibold text-[11px]">
                      R$ {(profile.targetCreditMin / 1000).toFixed(0)}k - {(profile.targetCreditMax / 1000).toFixed(0)}k
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[11px]">Produto Alvo:</span>
                    <span className="text-blue-300 font-medium">{profile.targetProduct}</span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                    <span className="text-slate-400 text-[10px]">Leads Prospectados:</span>
                    <strong className="text-white text-xs">{profile.leadsFoundCount || 0} captados</strong>
                  </div>
                </div>

                {/* Secret key for webhook */}
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-mono truncate max-w-[170px]">
                    {profile.webhookSecret}
                  </span>
                  <button
                    onClick={() => handleCopy(profile.webhookSecret, true, profile.id)}
                    className="p-1 text-slate-400 hover:text-white transition-colors"
                    title="Copiar Secret do Webhook"
                  >
                    {copiedSecret === profile.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                {/* Action button: Proactively run search */}
                <button
                  onClick={() => handleRunSearch(profile)}
                  disabled={isRunning}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                >
                  <Play className={`w-3.5 h-3.5 fill-current ${isRunning ? 'animate-spin' : ''}`} />
                  <span>{isRunning ? 'Buscando & Qualificando...' : 'Executar Prospecção Agora'}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* New Outbound Profile Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Radar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Novo Perfil de Prospecção Outbound</h3>
                  <p className="text-[11px] text-slate-400">Defina os parâmetros do cliente ideal e integre via API/Webhook</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Nome do Perfil de Prospecção *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Frotistas e Transportadoras - RMC Campinas"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Ramo de Atividade (Segmento)
                  </label>
                  <select
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200"
                  >
                    {INDUSTRIES.map((ind, i) => (
                      <option key={i} value={ind}>
                        {ind}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Produto de Consórcio Alvo
                  </label>
                  <select
                    value={targetProduct}
                    onChange={(e) => setTargetProduct(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200"
                  >
                    {PRODUCTS.map((prod, i) => (
                      <option key={i} value={prod}>
                        {prod}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Cidades Alvo (separadas por vírgula)
                  </label>
                  <input
                    type="text"
                    value={citiesInput}
                    onChange={(e) => setCitiesInput(e.target.value)}
                    placeholder="Campinas, Paulínia, Sumaré"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    UF(s)
                  </label>
                  <input
                    type="text"
                    value={statesInput}
                    onChange={(e) => setStatesInput(e.target.value)}
                    placeholder="SP, MG"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Crédito Mínimo Pretendido (R$)
                  </label>
                  <input
                    type="number"
                    value={targetCreditMin}
                    onChange={(e) => setTargetCreditMin(Number(e.target.value))}
                    step={25000}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Crédito Máximo Pretendido (R$)
                  </label>
                  <input
                    type="number"
                    value={targetCreditMax}
                    onChange={(e) => setTargetCreditMax(Number(e.target.value))}
                    step={50000}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Ferramenta de Busca / Provedor
                  </label>
                  <select
                    value={provider}
                    onChange={(e) => setProvider(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200"
                  >
                    <option value="google_places">Google Places API (Geolocalizada)</option>
                    <option value="phantombuster">PhantomBuster (Maps & LinkedIn Scraper)</option>
                    <option value="outscraper">Outscraper (Business Data API)</option>
                    <option value="custom_webhook">Webhook Personalizado (Zapier / Make / n8n)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    API Key / Token (Opcional)
                  </label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Chave oficial da ferramenta..."
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 font-mono"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={autoQualifyGemini}
                    onChange={(e) => setAutoQualifyGemini(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0 w-4 h-4"
                  />
                  <span className="font-semibold text-xs text-blue-400">
                    Iniciar qualificação automática com Gemini Copilot assim que o lead for capturado
                  </span>
                </label>
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
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-md cursor-pointer"
                >
                  Salvar Perfil Outbound
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
