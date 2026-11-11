import {
  Campaign,
  CartaContemplada,
  Integration,
  Lead,
  OutboundTargetProfile,
  SystemMetrics,
  User,
  WhatsAppChat,
} from '../types';
import { calculateLeadPipelineMetrics } from './leadsService';

export const DEMO_SESSION_STORAGE_KEY = 'leadfinder_demo_mode';

export function isDemoModeEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(DEMO_SESSION_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setDemoModeEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    if (enabled) {
      window.localStorage.setItem(DEMO_SESSION_STORAGE_KEY, 'true');
    } else {
      window.localStorage.removeItem(DEMO_SESSION_STORAGE_KEY);
    }
  } catch {
    // Ignore storage quota / privacy mode restrictions
  }
}

export function isDemoUser(user: User | null | undefined): boolean {
  if (!user) return false;
  return (
    user.id === 'demo-evaluator-1' ||
    user.email?.trim().toLowerCase() === 'demo@leadfinder.ai' ||
    user.tenantId === 'tenant-demo'
  );
}

export const DEMO_USER: User = {
  id: 'demo-evaluator-1',
  name: 'Avaliador (Conta Demo)',
  email: 'demo@leadfinder.ai',
  role: 'gestor',
  avatar:
    'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150',
  tenantId: 'tenant-demo',
  companyId: 'comp-demo',
  companyName: 'Horizonte Consórcios (Demonstração)',
  phone: '(11) 99800-2026',
  specialties: ['Imóvel', 'Automóvel', 'Carta Contemplada'],
  region: 'Brasil (Ambiente Demo)',
  activeLeadsCount: 6,
  conversionRate: 22.4,
  available: true,
  planId: 'enterprise',
  planName: 'Plano Enterprise (Demo)',
  maxSellersLimit: 999999,
};

export function getInitialDemoDataset(): {
  team: User[];
  leads: Lead[];
  cartas: CartaContemplada[];
  campaigns: Campaign[];
  whatsappChats: WhatsAppChat[];
  integrations: Integration[];
  outboundProfiles: OutboundTargetProfile[];
  metrics: SystemMetrics;
} {
  const now = Date.now();
  const hoursAgo = (h: number) => new Date(now - h * 3600000).toISOString();
  const daysAgo = (d: number) => new Date(now - d * 86400000).toISOString();

  const team: User[] = [
    { ...DEMO_USER },
    {
      id: 'demo-seller-1',
      name: 'Lucas Almeida (Demo)',
      email: 'lucas.demo@leadfinder.ai',
      role: 'vendedor',
      avatar:
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      tenantId: 'tenant-demo',
      companyId: 'comp-demo',
      companyName: 'Horizonte Consórcios (Demonstração)',
      phone: '(11) 99123-4401',
      specialties: ['Imóvel', 'Carta Contemplada'],
      region: 'São Paulo Capital',
      activeLeadsCount: 2,
      conversionRate: 24.5,
      available: true,
      planId: 'enterprise',
      planName: 'Plano Enterprise (Demo)',
      maxSellersLimit: 999999,
    },
    {
      id: 'demo-seller-2',
      name: 'Beatriz Monteiro (Demo)',
      email: 'beatriz.demo@leadfinder.ai',
      role: 'vendedor',
      avatar:
        'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
      tenantId: 'tenant-demo',
      companyId: 'comp-demo',
      companyName: 'Horizonte Consórcios (Demonstração)',
      phone: '(11) 99455-8820',
      specialties: ['Automóvel', 'Investimento Imobiliário'],
      region: 'Campinas e Interior SP',
      activeLeadsCount: 2,
      conversionRate: 19.8,
      available: true,
      planId: 'enterprise',
      planName: 'Plano Enterprise (Demo)',
      maxSellersLimit: 999999,
    },
    {
      id: 'demo-seller-3',
      name: 'Henrique Bastos (Demo)',
      email: 'henrique.demo@leadfinder.ai',
      role: 'vendedor',
      avatar:
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      tenantId: 'tenant-demo',
      companyId: 'comp-demo',
      companyName: 'Horizonte Consórcios (Demonstração)',
      phone: '(34) 99710-3319',
      specialties: ['Caminhão', 'Máquinas Agrícolas'],
      region: 'Triângulo Mineiro e Centro-Oeste',
      activeLeadsCount: 2,
      conversionRate: 27.1,
      available: true,
      planId: 'enterprise',
      planName: 'Plano Enterprise (Demo)',
      maxSellersLimit: 999999,
    },
  ];

  const leads: Lead[] = [
    {
      id: 'demo-lead-1',
      name: 'Marcelo Tavares Engenharia',
      phone: '(11) 98841-2201',
      email: 'marcelo@tavareseng.com.br',
      city: 'São Paulo',
      state: 'SP',
      product: 'Imóvel',
      targetValue: 650000,
      installmentBudget: 4200,
      purchaseTimeline: 'Imediato (até 30 dias)',
      source: 'Meta Ads • Imóvel Sem Juros',
      score: 92,
      temperature: 'Muito quente',
      status: 'em_negociacao',
      sellerId: 'demo-seller-1',
      sellerName: 'Lucas Almeida (Demo)',
      tenantId: 'tenant-demo',
      createdAt: hoursAgo(3),
      updatedAt: hoursAgo(1),
      consent: true,
      consentDate: hoursAgo(3),
      objections: ['Quer agilidade na contemplação em até 60 dias'],
      nextRecommendedAction: 'Apresentar estratégia de lance embutido de 25% + grupo de média baixa.',
      aiAnalysisReason: 'Parcela compatível com crédito de R$ 650k e intenção imediata confirmada.',
      urgency: 'Alta',
      interestedInContemplada: true,
      history: [
        {
          id: 'dh-1',
          date: hoursAgo(2),
          type: 'ai_qualification',
          description: 'Gemini 3.8 pontuou 92/100 devido à alta capacidade de parcela e urgência.',
          author: 'Gemini Copilot',
        },
        {
          id: 'dh-2',
          date: hoursAgo(1),
          type: 'contact',
          description: 'Proposta de carta contemplada de R$ 450k + complemento enviada no WhatsApp.',
          author: 'Lucas Almeida (Demo)',
        },
      ],
      tasks: [
        {
          id: 'dt-1',
          title: 'Confirmar reserva da cota Porto Seguro grupo 0812',
          dueDate: new Date(now + 86400000).toISOString().split('T')[0],
          completed: false,
          priority: 'alta',
        },
      ],
    },
    {
      id: 'demo-lead-2',
      name: 'TransLogística Paulista Ltda',
      phone: '(19) 99210-7780',
      email: 'frota@translogisticapaulista.com.br',
      city: 'Campinas',
      state: 'SP',
      product: 'Caminhão',
      targetValue: 720000,
      installmentBudget: 7400,
      purchaseTimeline: 'Curto prazo (1 a 3 meses)',
      source: 'Prospecção Outbound • Google Places',
      score: 88,
      temperature: 'Muito quente',
      status: 'proposta_enviada',
      sellerId: 'demo-seller-3',
      sellerName: 'Henrique Bastos (Demo)',
      tenantId: 'tenant-demo',
      createdAt: hoursAgo(7),
      updatedAt: hoursAgo(2),
      consent: true,
      consentDate: hoursAgo(7),
      objections: ['Comparando taxa administrativa frente ao FINAME'],
      nextRecommendedAction: 'Enviar comparativo de economia de R$ 218 mil frente ao financiamento.',
      aiAnalysisReason: 'Empresa com receita ativa buscando renovação de 2 cavalos mecânicos.',
      urgency: 'Alta',
      interestedInContemplada: false,
      history: [
        {
          id: 'dh-3',
          date: hoursAgo(4),
          type: 'status_change',
          description: 'Simulação corporativa de 100 meses enviada para diretoria financeira.',
          author: 'Henrique Bastos (Demo)',
        },
      ],
      tasks: [],
    },
    {
      id: 'demo-lead-3',
      name: 'Camila & Rodrigo Arquitetura',
      phone: '(11) 97732-5410',
      email: 'camila@arquiteturacriativa.com.br',
      city: 'Barueri',
      state: 'SP',
      product: 'Automóvel',
      targetValue: 185000,
      installmentBudget: 2600,
      purchaseTimeline: 'Curto prazo (1 a 3 meses)',
      source: 'Landing Page Oficial',
      score: 79,
      temperature: 'Quente',
      status: 'qualificado',
      sellerId: 'demo-seller-2',
      sellerName: 'Beatriz Monteiro (Demo)',
      tenantId: 'tenant-demo',
      createdAt: hoursAgo(12),
      updatedAt: hoursAgo(5),
      consent: true,
      consentDate: hoursAgo(12),
      objections: ['Avaliando dar SUV atual como lance livre'],
      nextRecommendedAction: 'Agendar call de 15 minutos para simular lance com seminovo.',
      aiAnalysisReason: 'Possui veículo quitado avaliado em R$ 75 mil para ofertar na primeira assembleia.',
      urgency: 'Média',
      interestedInContemplada: true,
      history: [],
      tasks: [],
    },
    {
      id: 'demo-lead-4',
      name: 'Agropecuária Boa Vista',
      phone: '(34) 99645-1900',
      email: 'compras@agroboavista.agr.br',
      city: 'Uberlândia',
      state: 'MG',
      product: 'Máquinas Agrícolas',
      targetValue: 940000,
      installmentBudget: 9500,
      purchaseTimeline: 'Curto prazo (1 a 3 meses)',
      source: 'Google Ads Search',
      score: 84,
      temperature: 'Muito quente',
      status: 'venda_concluida',
      sellerId: 'demo-seller-3',
      sellerName: 'Henrique Bastos (Demo)',
      tenantId: 'tenant-demo',
      createdAt: daysAgo(3),
      updatedAt: hoursAgo(6),
      consent: true,
      consentDate: daysAgo(3),
      objections: [],
      nextRecommendedAction: 'Acompanhar faturamento do trator junto à concessionária.',
      aiAnalysisReason: 'Cota fechada com plano sazonal semestral alinhado à safra.',
      urgency: 'Alta',
      interestedInContemplada: false,
      history: [
        {
          id: 'dh-4',
          date: hoursAgo(6),
          type: 'status_change',
          description: 'Contrato de R$ 940.000 assinado e compensado.',
          author: 'Henrique Bastos (Demo)',
        },
      ],
      tasks: [],
    },
    {
      id: 'demo-lead-5',
      name: 'Eduardo Nogueira Santos',
      phone: '(21) 98119-6044',
      email: 'eduardo.nogueira@gmail.com',
      city: 'Niterói',
      state: 'RJ',
      product: 'Carta Contemplada',
      targetValue: 450000,
      installmentBudget: 3100,
      purchaseTimeline: 'Imediato (até 30 dias)',
      source: 'WhatsApp Inbound Bot',
      score: 74,
      temperature: 'Quente',
      status: 'primeiro_contato',
      sellerId: 'demo-seller-1',
      sellerName: 'Lucas Almeida (Demo)',
      tenantId: 'tenant-demo',
      createdAt: daysAgo(1),
      updatedAt: hoursAgo(8),
      consent: true,
      consentDate: daysAgo(1),
      objections: ['Validando valor de entrada de R$ 135 mil'],
      nextRecommendedAction: 'Enviar checklist documental para transferência de cota contemplada.',
      aiAnalysisReason: 'Busca imóvel residencial pronto com liquidez imediata.',
      urgency: 'Alta',
      interestedInContemplada: true,
      history: [],
      tasks: [],
    },
    {
      id: 'demo-lead-6',
      name: 'Juliana & Fernando Investimentos',
      phone: '(41) 99520-8112',
      email: 'contato@jfinvestimentos.com.br',
      city: 'Curitiba',
      state: 'PR',
      product: 'Investimento Imobiliário',
      targetValue: 320000,
      installmentBudget: 1950,
      purchaseTimeline: 'Médio prazo (3 a 6 meses)',
      source: 'Meta Ads • Renda Passiva',
      score: 56,
      temperature: 'Em desenvolvimento',
      status: 'novo',
      sellerId: 'demo-seller-2',
      sellerName: 'Beatriz Monteiro (Demo)',
      tenantId: 'tenant-demo',
      createdAt: hoursAgo(1),
      updatedAt: hoursAgo(1),
      consent: true,
      consentDate: hoursAgo(1),
      objections: ['Estudando alavancagem patrimonial com aluguel'],
      nextRecommendedAction: 'Enviar estudo de rentabilidade com aluguel pagando a parcela pós-contemplação.',
      aiAnalysisReason: 'Perfil investidor de médio prazo, ideal para nutrição consultiva.',
      urgency: 'Média',
      interestedInContemplada: false,
      history: [],
      tasks: [],
    },
  ];

  const cartas: CartaContemplada[] = [
    {
      id: 'demo-carta-1',
      administradora: 'Porto Seguro Consórcios',
      tipoCredito: 'Imóvel',
      valorCarta: 450000,
      valorEntrada: 135000,
      saldoDevedor: 395000,
      parcelasRestantes: 168,
      valorParcela: 2850,
      grupo: '0812',
      cota: '342',
      documentacao: 'Aprovada',
      status: 'disponivel',
      condicoesTransferencia:
        'Transferência direta pela administradora. Comprovação de renda mínima de R$ 9.000.',
      updatedDate: hoursAgo(2),
      contatoResponsavel: 'Lucas Almeida (Demo)',
    },
    {
      id: 'demo-carta-2',
      administradora: 'Embracon',
      tipoCredito: 'Automóvel',
      valorCarta: 185000,
      valorEntrada: 58000,
      saldoDevedor: 152000,
      parcelasRestantes: 64,
      valorParcela: 2480,
      grupo: '0420',
      cota: '115',
      documentacao: 'Aprovada',
      status: 'disponivel',
      condicoesTransferencia:
        'Cota pronta para faturamento de veículo zero ou seminovo até 8 anos.',
      updatedDate: daysAgo(1),
      contatoResponsavel: 'Beatriz Monteiro (Demo)',
    },
    {
      id: 'demo-carta-3',
      administradora: 'Rodobens',
      tipoCredito: 'Caminhão',
      valorCarta: 680000,
      valorEntrada: 210000,
      saldoDevedor: 580000,
      parcelasRestantes: 96,
      valorParcela: 6950,
      grupo: '1098',
      cota: '054',
      documentacao: 'Aprovada',
      status: 'disponivel',
      condicoesTransferencia: 'Aceita PJ com mais de 2 anos de constituição.',
      updatedDate: daysAgo(2),
      contatoResponsavel: 'Henrique Bastos (Demo)',
    },
    {
      id: 'demo-carta-4',
      administradora: 'Caixa Consórcios',
      tipoCredito: 'Carta Contemplada',
      valorCarta: 700000,
      valorEntrada: 230000,
      saldoDevedor: 590000,
      parcelasRestantes: 190,
      valorParcela: 3890,
      grupo: '0654',
      cota: '201',
      documentacao: 'Em dia',
      status: 'reservada',
      condicoesTransferencia: 'Reservada para análise cadastral em andamento.',
      updatedDate: daysAgo(2),
      contatoResponsavel: 'Diretoria Demo',
    },
  ];

  const campaigns: Campaign[] = [
    {
      id: 'demo-camp-1',
      name: 'Campanha Imóvel Sem Juros 2026 (Demo)',
      product: 'Imóvel',
      status: 'ativa',
      budget: 4500,
      spent: 1890,
      leadsCount: 38,
      conversions: 5,
      landingSlug: 'imovel-sem-juros-demo',
      channels: {
        metaAds: true,
        googleAds: true,
        whatsapp: true,
        landingPage: true,
      },
      utmCampaign: 'demo_imovel_q1',
      targetAudience: 'Pessoas e empresas interessadas em crédito imobiliário de R$ 300k a R$ 1M',
      createdAt: daysAgo(12),
    },
    {
      id: 'demo-camp-2',
      name: 'Frotas Pesadas & Agro (Demo)',
      product: 'Caminhão',
      status: 'ativa',
      budget: 3500,
      spent: 1420,
      leadsCount: 24,
      conversions: 4,
      landingSlug: 'frotas-pesadas-demo',
      channels: {
        metaAds: false,
        googleAds: true,
        whatsapp: true,
        landingPage: true,
      },
      utmCampaign: 'demo_frotas_b2b',
      targetAudience: 'Transportadoras, operadores logísticos e produtores rurais',
      createdAt: daysAgo(7),
    },
    {
      id: 'demo-camp-3',
      name: 'Cartas Contempladas Liquidez Imediata (Demo)',
      product: 'Carta Contemplada',
      status: 'ativa',
      budget: 2800,
      spent: 980,
      leadsCount: 19,
      conversions: 3,
      landingSlug: 'cartas-contempladas-demo',
      channels: {
        metaAds: true,
        googleAds: true,
        whatsapp: true,
        landingPage: true,
      },
      utmCampaign: 'demo_contempladas',
      targetAudience: 'Compradores com recurso para entrada buscando liberação imediata',
      createdAt: daysAgo(4),
    },
  ];

  const whatsappChats: WhatsAppChat[] = [
    {
      id: 'demo-chat-1',
      leadId: 'demo-lead-1',
      leadName: 'Marcelo Tavares Engenharia',
      phone: '(11) 98841-2201',
      product: 'Imóvel • R$ 650.000',
      status: 'qualificado_ia',
      optOut: false,
      lastMessage: 'Perfeito! Pode me enviar os valores da carta contemplada de 450 mil?',
      lastMessageTime: hoursAgo(1),
      messages: [
        {
          id: 'dm-1',
          sender: 'bot',
          text: 'Olá Marcelo! Recebemos sua simulação de consórcio imobiliário. Você busca liberação imediata ou planejada?',
          timestamp: hoursAgo(3),
          automated: true,
        },
        {
          id: 'dm-2',
          sender: 'lead',
          text: 'Busco liberação em até 30 dias para fechar um imóvel comercial em SP.',
          timestamp: hoursAgo(2),
        },
        {
          id: 'dm-3',
          sender: 'seller',
          text: 'Excelente! Temos uma cota contemplada Porto Seguro de R$ 450k com transferência imediata e podemos compor os R$ 200k extras.',
          timestamp: hoursAgo(1.5),
        },
        {
          id: 'dm-4',
          sender: 'lead',
          text: 'Perfeito! Pode me enviar os valores da carta contemplada de 450 mil?',
          timestamp: hoursAgo(1),
        },
      ],
    },
    {
      id: 'demo-chat-2',
      leadId: 'demo-lead-5',
      leadName: 'Eduardo Nogueira Santos',
      phone: '(21) 98119-6044',
      product: 'Carta Contemplada • R$ 450.000',
      status: 'em_atendimento',
      optOut: false,
      lastMessage: 'Tenho R$ 140 mil em conta para dar de entrada ainda esta semana.',
      lastMessageTime: hoursAgo(4),
      messages: [
        {
          id: 'dm-5',
          sender: 'lead',
          text: 'Olá, vi o anúncio de cartas contempladas para imóveis no RJ.',
          timestamp: hoursAgo(5),
        },
        {
          id: 'dm-6',
          sender: 'bot',
          text: 'Bem-vindo Eduardo! Para agilizar o match, qual o valor aproximado disponível para entrada?',
          timestamp: hoursAgo(4.5),
          automated: true,
        },
        {
          id: 'dm-7',
          sender: 'lead',
          text: 'Tenho R$ 140 mil em conta para dar de entrada ainda esta semana.',
          timestamp: hoursAgo(4),
        },
      ],
    },
  ];

  const integrations: Integration[] = [
    {
      id: 'demo-int-1',
      name: 'WhatsApp Business Cloud API',
      provider: 'whatsapp_cloud',
      category: 'Mensageria',
      status: 'connected',
      lastSync: hoursAgo(1),
      description: 'Integração demonstrativa de atendimento e triagem automática via WhatsApp.',
      apiKey: 'DEMO-WA-TOKEN-PREVIEW',
      config: { phoneNumberId: 'demo-phone-109', businessAccountId: 'demo-waba-298' },
    },
    {
      id: 'demo-int-2',
      name: 'Meta Ads (Facebook & Instagram)',
      provider: 'meta_ads',
      category: 'Tráfego & Anúncios',
      status: 'connected',
      lastSync: hoursAgo(2),
      description: 'Captura demonstrativa de Lead Ads de consórcios imobiliários e automóveis.',
      apiKey: 'DEMO-META-TOKEN-PREVIEW',
      config: { adAccountId: 'act_demo_9910', pixelId: '8910002211' },
    },
    {
      id: 'demo-int-3',
      name: 'Google Ads API',
      provider: 'google_ads',
      category: 'Tráfego & Anúncios',
      status: 'pending',
      description: 'Extensão demonstrativa de formulários de pesquisa para frotas e agro.',
      apiKey: '',
      config: { customerId: '900-120-4500' },
    },
    {
      id: 'demo-int-4',
      name: 'Mercado Pago Checkout Pro',
      provider: 'mercado_pago',
      category: 'Pagamentos',
      status: 'connected',
      lastSync: hoursAgo(3),
      description: 'Checkout demonstrativo de assinatura SaaS em ambiente sandbox.',
      apiKey: 'DEMO-MP-TOKEN-PREVIEW',
      config: { publicKey: 'DEMO-MP-PUBLIC-KEY' },
    },
  ];

  const outboundProfiles: OutboundTargetProfile[] = [
    {
      id: 'demo-out-1',
      name: 'Transportadoras & Frotas (Demo SP)',
      industry: 'Transporte de Cargas & Logística',
      cities: ['Campinas', 'Paulínia', 'Sumaré'],
      states: ['SP'],
      targetCreditMin: 450000,
      targetCreditMax: 1200000,
      targetProduct: 'Caminhão',
      provider: 'google_places',
      webhookSecret: 'demo_whsec_transp_sp',
      autoQualifyGemini: true,
      status: 'ativo',
      leadsFoundCount: 14,
      lastSync: hoursAgo(2),
      createdAt: daysAgo(5),
    },
    {
      id: 'demo-out-2',
      name: 'Construtoras & Incorporadoras (Demo)',
      industry: 'Construção Civil & Reformas',
      cities: ['São Paulo', 'Barueri', 'Alphaville'],
      states: ['SP'],
      targetCreditMin: 500000,
      targetCreditMax: 2000000,
      targetProduct: 'Imóvel',
      provider: 'phantombuster',
      webhookSecret: 'demo_whsec_construtoras',
      autoQualifyGemini: true,
      status: 'ativo',
      leadsFoundCount: 9,
      lastSync: hoursAgo(6),
      createdAt: daysAgo(8),
    },
  ];

  const metrics = buildDemoMetrics(leads, cartas, campaigns);

  return {
    team,
    leads,
    cartas,
    campaigns,
    whatsappChats,
    integrations,
    outboundProfiles,
    metrics,
  };
}

export function buildDemoMetrics(
  leadsList: Lead[],
  cartasList: CartaContemplada[] = [],
  campaignsList: Campaign[] = []
): SystemMetrics {
  const {
    potentialPipelineValue,
    estimatedCommissions,
    wonCount,
    conversionRate,
  } = calculateLeadPipelineMetrics(leadsList);

  const hotLeads = leadsList.filter(
    (l) => l.temperature === 'Muito quente' || l.temperature === 'Quente'
  ).length;

  const inNegotiationLeads = leadsList.filter(
    (l) => l.status === 'em_negociacao' || l.status === 'proposta_enviada'
  ).length;

  const newLeadsToday = leadsList.filter(
    (l) => l.status === 'novo' || l.status === 'qualificado'
  ).length;

  return {
    totalLeads: leadsList.length,
    newLeadsToday,
    hotLeads,
    inNegotiationLeads,
    wonLeads: wonCount,
    conversionRate,
    potentialPipelineValue,
    estimatedCommissions,
    ...(cartasList.length >= 0 ? {} : {}),
    ...(campaignsList.length >= 0 ? {} : {}),
  };
}
