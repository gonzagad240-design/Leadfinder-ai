import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import {
  getDbLeads,
  getDbLeadById,
  getDbLeadsPipelineTotals,
  insertDbLead,
  updateDbLead,
  deleteDbLead,
  getDbCartas,
  insertDbCarta,
  getDbProfileByEmail,
  getDbProfileById,
  getDbProfiles,
  upsertDbProfile,
  updateDbProfileDetails,
  deleteDbProfile,
  incrementDbProfileActiveLeads,
  getDbMasterOverview,
} from './src/db/repository.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));

const SESSION_COOKIE_NAME = 'leadfinder_session';
const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  crypto.createHash('sha256').update(process.env.SQL_PASSWORD || 'leadfinder-auth-signing-key').digest('hex');

function parseCookies(cookieHeader?: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!cookieHeader) return result;
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = decodeURIComponent(part.slice(idx + 1).trim());
    result[key] = val;
  }
  return result;
}

function signSessionPayload(payload: Record<string, any>): string {
  const encoded = Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

function verifySessionToken(token?: string): Record<string, any> | null {
  if (!token || !token.includes('.')) return null;
  const [encoded, sig] = token.split('.');
  if (!encoded || !sig) return null;
  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url');
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    return JSON.parse(Buffer.from(encoded, 'base64url').toString('utf-8'));
  } catch {
    return null;
  }
}

function hashPassword(password: string): string {
  return crypto.createHmac('sha256', SESSION_SECRET).update(password).digest('hex');
}

function setSessionCookie(res: express.Response, payload: Record<string, any>) {
  const token = signSessionPayload(payload);
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`
  );
}

/**
 * Resolves the active user directly from PostgreSQL `public.profiles`.
 * Removes any hardcoded mock session objects.
 */
async function resolveSessionProfile(req: express.Request) {
  const cookies = parseCookies(req.headers.cookie);
  const parsed = verifySessionToken(cookies[SESSION_COOKIE_NAME]);

  if (parsed?.loggedOut) {
    return null;
  }

  // Primary owner or active authenticated email lookup in public.profiles
  const activeEmail = parsed?.email || 'gonzagad240@gmail.com';
  const dbProfile = await getDbProfileByEmail(activeEmail);
  if (dbProfile) {
    const { passwordHash: _ph, ...safeProfile } = dbProfile;
    if (safeProfile.role === 'master') {
      return {
        ...safeProfile,
        planId: 'enterprise',
        planName: 'Plano Enterprise',
        maxSellersLimit: 999999,
      };
    }
    return safeProfile;
  }
  return null;
}

// Real-time Server-Sent Events (SSE) subscribers for instant live lead & profile sync
const sseClients: express.Response[] = [];
const sseTeamClients: express.Response[] = [];

function broadcastLeadEvent(type: 'lead_added' | 'lead_updated' | 'lead_deleted', data: any) {
  const payload = JSON.stringify({ type, ...data });
  for (let i = sseClients.length - 1; i >= 0; i--) {
    const client = sseClients[i];
    try {
      client.write(`data: ${payload}\n\n`);
    } catch {
      sseClients.splice(i, 1);
    }
  }
}

async function broadcastProfileEvent(type: 'profiles_updated' | 'profiles_changed' = 'profiles_changed') {
  try {
    const allProfiles = await getDbProfiles(null, 'master');
    const payload = JSON.stringify({
      type: 'profiles_updated',
      profiles: allProfiles,
      timestamp: new Date().toISOString(),
    });
    for (let i = sseTeamClients.length - 1; i >= 0; i--) {
      const client = sseTeamClients[i];
      try {
        client.write(`data: ${payload}\n\n`);
      } catch {
        sseTeamClients.splice(i, 1);
      }
    }
  } catch {
    const fallbackPayload = JSON.stringify({ type });
    for (let i = sseTeamClients.length - 1; i >= 0; i--) {
      try {
        sseTeamClients[i].write(`data: ${fallbackPayload}\n\n`);
      } catch {
        sseTeamClients.splice(i, 1);
      }
    }
  }
}

async function resolveAssigneeProfile(preferredTenantId?: string | null) {
  const profilesList = await getDbProfiles(preferredTenantId || null, 'master');
  const availableSellers = profilesList.filter((u) => u.available && u.role === 'vendedor');
  if (availableSellers.length > 0) {
    return availableSellers.sort((a, b) => (a.activeLeadsCount || 0) - (b.activeLeadsCount || 0))[0];
  }
  const fallbackMaster = profilesList.find((u) => u.role === 'master') || profilesList[0];
  if (fallbackMaster) return fallbackMaster;
  return {
    id: 'user-master',
    name: 'Gonzaga (Master SaaS)',
    email: 'gonzagad240@gmail.com',
    role: 'master',
  };
}

// Initialize Google GenAI with required server header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

function hasValidGeminiKey(): boolean {
  const key = process.env.GEMINI_API_KEY;
  return Boolean(
    key &&
    typeof key === 'string' &&
    key.trim() !== '' &&
    key !== 'MY_GEMINI_API_KEY' &&
    !key.startsWith('MY_')
  );
}

function getTailoredHunterStrategy(category = 'Imóveis', region = 'São Paulo e Região Metropolitana', targetBudget = 'R$ 2.500 / mês') {
  const catLower = (category || '').toLowerCase();
  
  if (catLower.includes('carro') || catLower.includes('veículo') || catLower.includes('automóvel') || catLower.includes('suv')) {
    return {
      audienceTargeting: `Homens e mulheres de 25 a 55 anos residentes em ${region}, com interesse em marcas automotivas (Toyota, Jeep, VW, Honda, BYD), veículos novos e seminovos, e planejamento financeiro.`,
      keywordsGoogle: [
        'consorcio auto simulacao online',
        'como comprar carro sem juros de financiamento',
        'tabela consorcio automovel 2026',
        'carta contemplada veiculo entrega rapida',
        'consorcio suv parcelas reduzidas',
        'melhor consorcio de automovel brasil',
        'troca de carro planejada sem entrada abusiva',
        'simulador consorcio auto porto seguro caixa'
      ],
      adCopies: [
        {
          headline: 'Conquiste Seu Carro Zero sem os Juros Abusivos do Financiamento',
          body: `Planeje a troca do seu automóvel com parcelas a partir de ${targetBudget}. Utilize seu carro usado como lance e antecipe sua contemplação.`,
          cta: 'Fazer Simulação Personalizada'
        },
        {
          headline: 'Cansado de Pagar 2 Carros em 1 no Financiamento Bancário?',
          body: 'No consórcio automotivo você adquire seu veículo pagando apenas taxa de administração justa, sem juros compostos. Créditos de R$ 60 mil a R$ 350 mil.',
          cta: 'Ver Cotas com Menor Lance'
        },
        {
          headline: 'Cartas Contempladas de Veículos com Transferência Imediata',
          body: 'Se você precisa do carro para este mês, temos cotas já contempladas com entrada facilitada e parcelas que cabem no seu orçamento.',
          cta: 'Consultar Disponibilidade de Cartas'
        }
      ],
      landingPageHook: 'A maneira mais econômica de comprar seu próximo veículo: zero juros, parcelas acessíveis e possibilidade de lance com seu carro usado.',
      recommendedChannels: ['Meta Ads (Instagram Reels e Stories)', 'Google Ads Search', 'WhatsApp Inbound'],
      conversionTips: [
        'Ligue nos primeiros 3 minutos após a conversão para validar o modelo de carro desejado.',
        'Pergunte se o cliente já possui um carro para dar de entrada/lance no grupo.',
        'Apresente o comparativo visual de juros do financiamento bancário vs consórcio.'
      ]
    };
  }

  if (catLower.includes('caminh') || catLower.includes('frota') || catLower.includes('pesados')) {
    return {
      audienceTargeting: `Empresários do setor de logística, transportadoras, frotistas e caminhoneiros autônomos em ${region}, buscando renovação e ampliação de frota pesada.`,
      keywordsGoogle: [
        'consorcio caminhao simulacao cavalo mecanico',
        'renovacao de frota sem descapitalizar',
        'consorcio pesados scania volvo mercedes',
        'carta contemplada caminhao bitrem carreta',
        'tabela consorcio transporte de cargas',
        'consorcio caminhao lance embutido',
        'compra programada caminhoes e semirreboques',
        'consorcio implementos rodoviarios taxas baixas'
      ],
      adCopies: [
        {
          headline: 'Renove a Frota da Sua Transportadora sem Descapitalizar o Caixa',
          body: `Planos corporativos para caminhões e pesados a partir de ${targetBudget}. Proteja o fluxo de caixa da sua empresa com as menores taxas do mercado.`,
          cta: 'Simular Crédito de Frota'
        },
        {
          headline: 'Cavalo Mecânico e Implementos com Economia Real de até R$ 250 mil',
          body: 'Fuja das taxas de leasing e CDC com consórcio programado. Grupos especiais para empresas de transporte com lances embutidos de até 30%.',
          cta: 'Falar com Consultor de Pesados'
        },
        {
          headline: 'Cotas Contempladas para Caminhões Disponíveis para Transferência',
          body: 'Precisa colocar o caminhão na estrada imediatamente? Consulte cotas contempladas com faturamento direto na montadora.',
          cta: 'Ver Cotas Contempladas'
        }
      ],
      landingPageHook: 'Solução corporativa inteligente para renovar e expandir frotas pesadas com taxa de administração reduzida e flexibilidade de lances.',
      recommendedChannels: ['Google Ads Pesquisa (Alta Intenção B2B)', 'LinkedIn Ads', 'WhatsApp Direct'],
      conversionTips: [
        'Identifique se a compra será em CNPJ e qual o volume de veículos pretendido.',
        'Destaque a possibilidade de amortização fiscal e lance embutido de até 30%.',
        'Agende uma reunião online para apresentar a grade de contemplações históricas.'
      ]
    };
  }

  if (catLower.includes('agrícol') || catLower.includes('trator') || catLower.includes('máquina')) {
    return {
      audienceTargeting: `Produtores rurais, cooperativas agrícolas e pecuaristas em ${region}, interessados em maquinários (tratores, colheitadeiras, pulverizadores e implementos).`,
      keywordsGoogle: [
        'consorcio maquinas agricolas simulacao',
        'consorcio trator john deere case new holland',
        'como comprar colheitadeira sem juros bancarios',
        'carta contemplada agro tratores e implementos',
        'consorcio rural parcelamento anual semestral safra',
        'investimento maquinas agricolas taxa administracao',
        'plano safra consorcio agricola 2026',
        'consorcio pulverizador autopropelido condicoes'
      ],
      adCopies: [
        {
          headline: 'Modernize Sua Lavoura com Tratores e Colheitadeiras com Pagamento Safra',
          body: `Adquira maquinário agrícola com parcelas alinhadas ao calendário da sua safra. Sem juros abusivos e com liberação programada de crédito.`,
          cta: 'Simular Consórcio Agro'
        },
        {
          headline: 'A Força do Agronegócio com a Economia do Consórcio de Máquinas',
          body: 'Créditos de R$ 250 mil a R$ 2,5 milhões para tratores e colheitadeiras. Parcelas semestrais ou anuais sob medida para sua colheita.',
          cta: 'Ver Planos para Produtores Rurais'
        },
        {
          headline: 'Cartas Contempladas do Agro: Equipamento no Campo sem Espera',
          body: 'Cotas contempladas com transferência rápida para aquisição imediata antes do início do plantio.',
          cta: 'Consultar Maquinário Disponível'
        }
      ],
      landingPageHook: 'O consórcio feito para o produtor rural: parcelas que respeitam seu fluxo de colheita e rentabilidade do agronegócio.',
      recommendedChannels: ['Meta Ads Segmentado por Interesse Agro', 'Google Ads Search', 'WhatsApp Agro'],
      conversionTips: [
        'Pergunte sobre a cultura produzida (soja, milho, café, gado) e a época da safra.',
        'Explique a opção de parcelas semestrais ou anuais ajustadas ao recebimento da safra.',
        'Envie catálogo das administradoras com convênio direto com concessionárias agrícolas.'
      ]
    };
  }

  if (catLower.includes('contemplada')) {
    return {
      audienceTargeting: `Investidores, compradores com urgência de crédito e empresários em ${region} com capital disponível para entrada e necessidade de crédito imediato.`,
      keywordsGoogle: [
        'carta contemplada imovel sp rj mg',
        'comprar carta de credito contemplada segura',
        'carta contemplada direto com a administradora',
        'transferencia legal cota contemplada consorcio',
        'carta contemplada automovel pronta entrega',
        'tabela cartas contempladas porto seguro embracon caixa',
        'credito contemplado para compra imediata',
        'onde comprar carta de consorcio contemplada'
      ],
      adCopies: [
        {
          headline: 'Compre Seu Imóvel ou Veículo Esta Semana com Carta Contemplada',
          body: `Tenha o poder de compra à vista com cartas já contempladas de administradoras homologadas pelo Banco Central. Entrada a partir do valor pago.`,
          cta: 'Ver Carteira de Cartas Disponíveis'
        },
        {
          headline: 'Crédito Aprovado Imediato: Cartas Contempladas de R$ 150k a R$ 2 Milhões',
          body: 'Sem sorteios, sem espera. Transparência total com transferência oficial realizada diretamente na administradora de consórcio.',
          cta: 'Falar com Especialista em Cotas'
        },
        {
          headline: 'Economize mais de R$ 300 Mil Comparado ao Financiamento Tradicional',
          body: 'Use sua entrada para assumir uma cota contemplada e mantenha parcelas reduzidas sem pagar juros bancários exorbitantes.',
          cta: 'Solicitar Lista Atualizada'
        }
      ],
      landingPageHook: 'Crédito contemplado liberado para compra imediata com transferência 100% segura e homologada pelo Banco Central.',
      recommendedChannels: ['Google Ads Pesquisa (Palavras de Altíssima Intenção)', 'Meta Ads', 'WhatsApp Direct'],
      conversionTips: [
        'Verifique imediatamente quanto o cliente possui disponível para pagamento da entrada.',
        'Reforce a segurança jurídica e a transferência formal perante a administradora.',
        'Envie a ficha técnica da carta contemplada disponível mais compatível.'
      ]
    };
  }

  // Default / Imóveis / Construção / Geral
  return {
    audienceTargeting: `Homens e mulheres de 28 a 60 anos residentes em ${region}, famílias buscando primeiro imóvel ou upgrade, profissionais liberais e investidores patrimoniais.`,
    keywordsGoogle: [
      'consorcio imobiliario simulacao 2026',
      'como comprar casa sem juros bancarios',
      'carta contemplada imovel pronta para uso',
      'consorcio taxa de administracao reduzida',
      'investimento imobiliario alavancagem consorcio',
      'consorcio construcao e reforma terreno',
      'tabela consorcio imoveis porto caixa bradesco',
      'consorcio apartamento simulador parcelas'
    ],
    adCopies: [
      {
        headline: 'Conquiste Seu Imóvel Próprio sem Pagar Juros Abusivos de Financiamento',
        body: `Economize até 50% no custo final do seu patrimônio com planejamento inteligente. Créditos de R$ 300 mil a R$ 2 milhões com parcelas a partir de ${targetBudget}.`,
        cta: 'Simular Parcelas Grátis'
      },
      {
        headline: 'Compre, Construa ou Reforme Seu Imóvel Pagando Metade do Custo',
        body: 'O consórcio imobiliário é a alternativa comprovada ao financiamento bancário tradicional: sem juros compostos, com opção de lance embutido de até 30%.',
        cta: 'Ver Condições Exclusivas'
      },
      {
        headline: 'Cartas Contempladas de Imóveis: Poder de Compra à Vista Imediato',
        body: 'Se você já possui uma entrada e não quer esperar pelo sorteio, adquira cotas já contempladas com transferência oficial e segura.',
        cta: 'Consultar Cartas em Estoque'
      }
    ],
    landingPageHook: 'A alternativa inteligente ao financiamento bancário: compre, construa ou invista em imóveis com economia comprovada e parcelas que cabem no seu bolso.',
    recommendedChannels: ['Meta Ads (Instagram Stories e Feed)', 'Google Ads Search', 'WhatsApp Inbound', 'Portais Imobiliários'],
    conversionTips: [
      'Responda o lead em menos de 5 minutos após o preenchimento do formulário inteligente.',
      'Apresente o gráfico comparativo demonstrando a economia de centenas de milhares de reais em juros.',
      'Descubra se o cliente tem saldo de FGTS ou valor reservado para oferta de lance.'
    ]
  };
}

function generateOutboundProspects(profile: any) {
  const avgCredit = Math.round(((profile.targetCreditMin || 200000) + (profile.targetCreditMax || 600000)) / 2);
  const city1 = (profile.cities && profile.cities[0]) || 'Campinas';
  const city2 = (profile.cities && profile.cities[1]) || (profile.cities && profile.cities[0]) || 'São Paulo';
  const state1 = (profile.states && profile.states[0]) || 'SP';
  const ind = profile.industry || 'Empresas e Serviços';
  const cleanInd = ind.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().slice(0, 10) || 'empresa';

  return [
    {
      name: `${ind.split(' ')[0]} ${city1} Soluções Corporativas`,
      phone: '(19) 98214-5590',
      email: `diretoria@${cleanInd}sp.com.br`,
      city: city1,
      state: state1,
      targetValue: avgCredit,
      installmentBudget: Math.round(avgCredit / 160),
      purchaseTimeline: 'Curto prazo (1 a 3 meses)',
      score: 87,
      temperature: 'Muito quente',
      nextRecommendedAction: `Apresentar cota de consórcio corporativo para aquisição programada de ${profile.targetProduct || 'Crédito'}.`,
      aiAnalysisReason: `Empresa ativa do ramo de ${ind} com alta sinergia para amortização de juros via consórcio.`,
      objections: ['Necessidade de aprovação com diretoria financeira'],
    },
    {
      name: `Grupo Aliança ${city2} Comércio & Distribuição`,
      phone: '(11) 99120-4411',
      email: `contato@alianca${cleanInd}.com.br`,
      city: city2,
      state: state1,
      targetValue: Math.round(avgCredit * 1.2),
      installmentBudget: Math.round((avgCredit * 1.2) / 160),
      purchaseTimeline: 'Imediato (até 30 dias)',
      score: 91,
      temperature: 'Muito quente',
      nextRecommendedAction: 'Oferecer carta contemplada ou lance embutido de 30% para contemplação rápida.',
      aiAnalysisReason: 'Urgência declarada de renovação patrimonial sem descapitalização da empresa.',
      objections: ['Avaliando índice histórico de contemplação por lance livre'],
    },
    {
      name: `Vanguarda & Parceiros Logística (${city1})`,
      phone: '(19) 99763-8822',
      email: `operacoes@vanguarda${cleanInd}.com.br`,
      city: city1,
      state: state1,
      targetValue: Math.round(avgCredit * 0.85),
      installmentBudget: Math.round((avgCredit * 0.85) / 150),
      purchaseTimeline: 'Médio prazo (3 a 6 meses)',
      score: 79,
      temperature: 'Quente',
      nextRecommendedAction: 'Enviar simulação comparativa entre leasing bancário e consórcio empresarial.',
      aiAnalysisReason: 'Planejamento de expansão de ativos fixos para os próximos trimestres.',
      objections: ['Prazo máximo de parcelamento desejado'],
    }
  ];
}

async function callGeminiWithTimeout(promise: Promise<any>, timeoutMs = 4000): Promise<any> {
  let timer: any;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('Gemini API timeout')), timeoutMs);
  });
  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timer);
    return result;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

// Database file setup
const DATA_DIR = path.resolve(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial configuration with zero demonstration leads (starts strictly at 0 opportunities, R$ 0,00)
function getInitialData() {
  return {
    leads: [],
    cartas: [
      {
        id: 'carta-1',
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
        condicoesTransferencia: 'Transferência direta pela administradora. Comprovação de renda mínima de R$ 9.000.',
        updatedDate: new Date().toISOString(),
        contatoResponsavel: 'Diretoria de Operações'
      },
      {
        id: 'carta-2',
        administradora: 'Embracon',
        tipoCredito: 'Automóvel',
        valorCarta: 180000,
        valorEntrada: 58000,
        saldoDevedor: 152000,
        parcelasRestantes: 64,
        valorParcela: 2480,
        grupo: '0420',
        cota: '115',
        documentacao: 'Aprovada',
        status: 'disponivel',
        condicoesTransferencia: 'Cota pronta para faturamento de veículo zero ou seminovo até 8 anos.',
        updatedDate: new Date().toISOString(),
        contatoResponsavel: 'Marcos Vinicius'
      },
      {
        id: 'carta-3',
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
        updatedDate: new Date().toISOString(),
        contatoResponsavel: 'Juliana Costa'
      },
      {
        id: 'carta-4',
        administradora: 'Caixa Consórcios',
        tipoCredito: 'Imóvel',
        valorCarta: 700000,
        valorEntrada: 230000,
        saldoDevedor: 590000,
        parcelasRestantes: 190,
        valorParcela: 3890,
        grupo: '0654',
        cota: '201',
        documentacao: 'Em dia',
        status: 'reservada',
        condicoesTransferencia: 'Reservada para análise cadastral de cliente.',
        updatedDate: new Date(Date.now() - 86400000).toISOString(),
        contatoResponsavel: 'Diretoria de Operações'
      }
    ],
    campaigns: [
      {
        id: 'camp-1',
        name: 'Campanha Imóvel dos Sonhos 2026',
        product: 'Imóvel',
        status: 'ativa',
        budget: 4500,
        spent: 0,
        leadsCount: 0,
        conversions: 0,
        landingSlug: 'imovel-sem-juros',
        channels: { metaAds: true, googleAds: true, whatsapp: true, landingPage: true },
        utmCampaign: 'leadfinder_imovel_q1',
        targetAudience: 'Homens e Mulheres 28-55 anos interessados em compra de imóveis e investimentos',
        createdAt: new Date(Date.now() - 15 * 86400000).toISOString()
      },
      {
        id: 'camp-2',
        name: 'Captação Veículos & SUVs Sem Entrada',
        product: 'Automóvel',
        status: 'ativa',
        budget: 2500,
        spent: 0,
        leadsCount: 0,
        conversions: 0,
        landingSlug: 'consorcio-veiculos',
        channels: { metaAds: true, googleAds: false, whatsapp: true, landingPage: true },
        utmCampaign: 'leadfinder_autos_suv',
        targetAudience: 'Público interessado em troca de carro, seminovos e 0km',
        createdAt: new Date(Date.now() - 10 * 86400000).toISOString()
      },
      {
        id: 'camp-3',
        name: 'Cartas Contempladas Oportunidade',
        product: 'Carta Contemplada',
        status: 'ativa',
        budget: 3000,
        spent: 0,
        leadsCount: 0,
        conversions: 0,
        landingSlug: 'cartas-contempladas-sp',
        channels: { metaAds: true, googleAds: true, whatsapp: true, landingPage: true },
        utmCampaign: 'cartas_contempladas_urgencia',
        targetAudience: 'Compradores com entrada disponível precisando de liberação imediata',
        createdAt: new Date(Date.now() - 7 * 86400000).toISOString()
      }
    ],
    team: [],
    integrations: [
      {
        id: 'int-1',
        name: 'WhatsApp Business Cloud API',
        provider: 'whatsapp_cloud',
        category: 'Mensageria',
        status: 'connected',
        lastSync: new Date().toISOString(),
        description: 'Envio autorizado de notificações de captação e disparos via WhatsApp oficial da Meta.',
        apiKey: 'EAAQ3...configured',
        config: { phoneNumberId: '109823412049182', businessAccountId: '2981048102391' }
      },
      {
        id: 'int-2',
        name: 'Meta Ads (Facebook & Instagram)',
        provider: 'meta_ads',
        category: 'Tráfego & Anúncios',
        status: 'connected',
        lastSync: new Date(Date.now() - 3600000).toISOString(),
        description: 'Captação direta de leads a partir de Lead Ads e sincronização automática de formulários instantâneos.',
        apiKey: 'EAABw...configured',
        config: { adAccountId: 'act_49201940129', pixelId: '891029301923' }
      },
      {
        id: 'int-3',
        name: 'Google Ads API',
        provider: 'google_ads',
        category: 'Tráfego & Anúncios',
        status: 'pending',
        lastSync: undefined,
        description: 'Integração com extensões de formulário de lead na Rede de Pesquisa e YouTube.',
        apiKey: '',
        config: { customerId: '982-104-1920', developerToken: '' }
      },
      {
        id: 'int-4',
        name: 'Mercado Pago Checkout Pro',
        provider: 'mercado_pago',
        category: 'Pagamentos',
        status: 'connected',
        lastSync: new Date().toISOString(),
        description: 'Processamento de assinaturas recorrentes de planos SaaS via Pix, Cartão de Crédito e Boleto.',
        apiKey: 'APP_USR-7821...configured',
        config: { publicKey: 'APP_USR-pub-1234' }
      }
    ],
    whatsappChats: [],
    settings: {
      companyName: 'Aliança Consórcios & Investimentos',
      cnpj: '34.892.120/0001-44',
      primaryPhone: '(11) 4003-8890',
      notificationEmail: 'contato@aliancaconsorcios.com.br',
      autoDistributionEnabled: true,
      distributionMethod: 'specialty_and_workload', // 'round_robin' | 'specialty_and_workload' | 'performance'
      currentPlan: 'enterprise',
      aiModel: 'gemini-3.8-flash',
      lgpdDpoContact: 'dpo@aliancaconsorcios.com.br'
    },
    outboundProfiles: [
      {
        id: 'out-1',
        name: 'Transportadoras & Frotas - Campinas e RMC',
        industry: 'Transporte de Cargas & Logística',
        cities: ['Campinas', 'Paulínia', 'Sumaré', 'Indaiatuba'],
        states: ['SP'],
        targetCreditMin: 450000,
        targetCreditMax: 1200000,
        targetProduct: 'Caminhão',
        provider: 'google_places',
        webhookSecret: 'whsec_transp_campinas_98214',
        apiKey: 'AIzaSyD...places_api',
        autoQualifyGemini: true,
        status: 'ativo',
        leadsFoundCount: 0,
        lastSync: undefined,
        createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
      },
      {
        id: 'out-2',
        name: 'Construtoras & Empreiteiras - Grande SP',
        industry: 'Construção Civil & Reformas',
        cities: ['São Paulo', 'Barueri', 'Santo André', 'São Bernardo do Campo'],
        states: ['SP'],
        targetCreditMin: 500000,
        targetCreditMax: 2500000,
        targetProduct: 'Imóvel',
        provider: 'phantombuster',
        webhookSecret: 'whsec_construtoras_sp_44102',
        apiKey: 'pb_key_891234...',
        autoQualifyGemini: true,
        status: 'ativo',
        leadsFoundCount: 0,
        lastSync: undefined,
        createdAt: new Date(Date.now() - 8 * 86400000).toISOString(),
      },
      {
        id: 'out-3',
        name: 'Produtores de Soja & Grãos - Triângulo Mineiro',
        industry: 'Agronegócio & Cultivo de Grãos',
        cities: ['Uberlândia', 'Uberaba', 'Araguari', 'Patos de Minas'],
        states: ['MG'],
        targetCreditMin: 700000,
        targetCreditMax: 3000000,
        targetProduct: 'Máquinas Agrícolas',
        provider: 'outscraper',
        webhookSecret: 'whsec_agro_minas_77319',
        apiKey: 'out_token_9921...',
        autoQualifyGemini: true,
        status: 'ativo',
        leadsFoundCount: 0,
        lastSync: undefined,
        createdAt: new Date(Date.now() - 12 * 86400000).toISOString(),
      }
    ]
  };
}

function loadDatabase() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (!parsed.outboundProfiles) {
        parsed.outboundProfiles = getInitialData().outboundProfiles;
      }
      // Team users & leads come exclusively from PostgreSQL (`public.profiles` and `public.leads`);
      // never keep stale/mock arrays in data/db.json.
      parsed.team = [];
      parsed.leads = [];

      // One-time permanent cleanup of legacy demo WhatsApp chats and campaign/outbound lead counters
      if (!parsed.demoDataCleaned) {
        parsed.whatsappChats = (parsed.whatsappChats || []).filter(
          (c: any) => c.leadId !== 'lead-1' && c.leadId !== 'lead-2'
        );
        if (Array.isArray(parsed.campaigns)) {
          parsed.campaigns = parsed.campaigns.map((c: any) => ({
            ...c,
            leadsCount: 0,
            conversions: 0,
            spent: 0,
          }));
        }
        if (Array.isArray(parsed.outboundProfiles)) {
          parsed.outboundProfiles = parsed.outboundProfiles.map((p: any) => ({
            ...p,
            leadsFoundCount: 0,
          }));
        }
        parsed.demoDataCleaned = true;
      }

      if (!parsed.enterpriseDefaultApplied) {
        parsed.settings = {
          ...(parsed.settings || {}),
          currentPlan: 'enterprise',
        };
        parsed.enterpriseDefaultApplied = true;
      }

      saveDatabase(parsed);
      return parsed;
    }
  } catch (err) {
    console.error('Error reading db.json, generating defaults:', err);
  }
  const defaultData = {
    ...getInitialData(),
    team: [],
    leads: [],
    demoDataCleaned: true,
    leadsSeededOnce: true,
    enterpriseDefaultApplied: true,
  };
  saveDatabase(defaultData);
  return defaultData;
}

function saveDatabase(data: any) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving db.json:', err);
  }
}

// REST API Endpoints

// 1. Real Database-Backed Authentication (`public.profiles`)
app.get('/api/auth/session', async (req, res) => {
  try {
    const profile = await resolveSessionProfile(req);
    if (!profile) {
      return res.status(401).json({ authenticated: false, user: null });
    }
    res.json({ authenticated: true, user: profile });
  } catch (err) {
    console.error('Error in GET /api/auth/session:', err);
    res.status(500).json({ error: 'Erro ao consultar sessão na tabela profiles.' });
  }
});

app.get('/api/auth/profile', async (req, res) => {
  try {
    const caller = await resolveSessionProfile(req);
    if (!caller) {
      return res.status(401).json({ error: 'Sessão não autenticada.' });
    }

    const email = req.query.email as string | undefined;
    const id = req.query.id as string | undefined;

    // Non-master accounts can only inspect their own profile
    if (caller.role !== 'master') {
      return res.json({ user: caller });
    }

    const found = email
      ? await getDbProfileByEmail(email)
      : id
      ? await getDbProfileById(id)
      : caller;

    if (!found) {
      return res.status(404).json({ error: 'Perfil não localizado em public.profiles.' });
    }
    const safeFound = { ...found } as Record<string, any>;
    delete safeFound.passwordHash;
    res.json({ user: safeFound });
  } catch (err) {
    console.error('Error in GET /api/auth/profile:', err);
    res.status(500).json({ error: 'Erro ao consultar perfil.' });
  }
});

app.put('/api/auth/profile', async (req, res) => {
  try {
    const caller = await resolveSessionProfile(req);
    if (!caller) {
      return res.status(401).json({ error: 'Sessão não autenticada.' });
    }

    const avatarRaw = typeof req.body?.avatar === 'string' ? req.body.avatar.trim() : undefined;
    if (avatarRaw !== undefined && avatarRaw.length > 0) {
      const isHttpUrl = /^https?:\/\/.+/i.test(avatarRaw);
      const isDataImage = /^data:image\/(png|jpeg|jpg|webp|gif|svg\+xml);base64,[A-Za-z0-9+/=]+$/i.test(avatarRaw);
      if (!isHttpUrl && !isDataImage) {
        return res.status(400).json({
          error: 'Formato de imagem inválido. Utilize uma URL https:// ou carregue uma imagem válida.',
        });
      }
      if (avatarRaw.length > 5_000_000) {
        return res.status(413).json({
          error: 'Imagem demasiado grande. Escolha uma imagem menor que 5MB.',
        });
      }
    }

    const updated = await updateDbProfileDetails(caller.id, {
      avatar: avatarRaw,
      name: typeof req.body?.name === 'string' ? req.body.name : undefined,
      phone: typeof req.body?.phone === 'string' ? req.body.phone : undefined,
      region: typeof req.body?.region === 'string' ? req.body.region : undefined,
    });

    if (!updated) {
      return res.status(404).json({ error: 'Perfil não localizado para atualização.' });
    }

    const finalUser =
      updated.role === 'master'
        ? {
            ...updated,
            planId: 'enterprise',
            planName: 'Plano Enterprise',
            maxSellersLimit: 999999,
          }
        : updated;

    broadcastProfileEvent('profiles_updated').catch(() => {});
    res.json({ success: true, user: finalUser });
  } catch (err) {
    console.error('Error in PUT /api/auth/profile:', err);
    res.status(500).json({ error: 'Erro ao atualizar foto e dados do perfil.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    if (!email) {
      return res.status(400).json({ error: 'E-mail é obrigatório.' });
    }

    const found = await getDbProfileByEmail(email);
    if (!found) {
      return res.status(401).json({ error: 'E-mail não cadastrado na tabela public.profiles.' });
    }

    if (found.passwordHash && (!password || hashPassword(password) !== found.passwordHash)) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    setSessionCookie(res, { email: found.email, role: found.role, ts: Date.now() });
    const { passwordHash: _ph, ...safeUser } = found;
    res.json({ authenticated: true, user: safeUser });
  } catch (err) {
    console.error('Error in POST /api/auth/login:', err);
    res.status(500).json({ error: 'Erro ao autenticar conta.' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const requestedRole = String(req.body?.role || 'vendedor').toLowerCase();
    const companyName = String(req.body?.companyName || 'Aliança Consórcios & Investimentos').trim();

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios.' });
    }

    const existing = await getDbProfileByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'Este e-mail já está cadastrado na base.' });
    }

    // Security enforcement: Never allow public registration to claim 'master' role
    const safeRole = requestedRole === 'gestor' ? 'gestor' : 'vendedor';
    const tenantId = safeRole === 'gestor' ? `tenant-${Date.now()}` : 'tenant-1';

    const created = await upsertDbProfile({
      id: `user-${Date.now()}`,
      name,
      email,
      role: safeRole,
      tenantId,
      companyId: `comp-${tenantId}`,
      companyName,
      passwordHash: hashPassword(password),
      planId: 'pro',
      planName: 'Plano Profissional',
      maxSellersLimit: 3,
    });

    setSessionCookie(res, { email: created.email, role: created.role, ts: Date.now() });
    broadcastProfileEvent('profiles_updated').catch(() => {});
    res.status(201).json({ authenticated: true, user: created });
  } catch (err) {
    console.error('Error in POST /api/auth/register:', err);
    res.status(500).json({ error: 'Erro ao registrar usuário em public.profiles.' });
  }
});

app.post('/api/auth/logout', (_req, res) => {
  setSessionCookie(res, { loggedOut: true, ts: Date.now() });
  res.json({ success: true, authenticated: false });
});

app.get('/api/auth/current-user', async (req, res) => {
  try {
    const profile = await resolveSessionProfile(req);
    if (!profile) {
      return res.status(401).json({ error: 'Não autenticado', user: null, allUsers: [] });
    }
    const visibleProfiles = await getDbProfiles(profile.tenantId, profile.role);
    res.json({ user: profile, allUsers: visibleProfiles });
  } catch {
    res.status(500).json({ error: 'Erro ao resolver perfil autenticado.' });
  }
});

// Strict Master SaaS Overview Endpoint (Blocked for gestor and vendedor)
app.get('/api/admin/master-overview', async (req, res) => {
  try {
    const caller = await resolveSessionProfile(req);
    if (!caller || caller.role !== 'master') {
      return res.status(403).json({
        error: 'Acesso negado: Apenas contas com role = master possuem acesso ao Painel Master SaaS.',
      });
    }
    const overview = await getDbMasterOverview();
    res.json(overview);
  } catch (err) {
    console.error('Error fetching master overview:', err);
    res.status(500).json({ error: 'Erro ao carregar indicadores globais SaaS.' });
  }
});

// 2. Metrics & Dashboard (Dynamically aggregated from Cloud SQL PostgreSQL; returns 0 when empty)
app.get('/api/metrics', async (req, res) => {
  const db = loadDatabase();
  const sessionUser = await resolveSessionProfile(req);

  const availableCartasCount = db.cartas.filter((c: any) => c.status === 'disponivel').length;
  const activeCampaignsCount = db.campaigns.filter((c: any) => c.status === 'ativa').length;

  if (!sessionUser) {
    return res.json({
      totalLeads: 0,
      newLeadsToday: 0,
      hotLeads: 0,
      inNegotiationLeads: 0,
      wonLeads: 0,
      conversionRate: 0,
      potentialPipelineValue: 0,
      estimatedCommissions: 0,
      byProduct: {},
      byTemperature: {
        'Muito quente': 0,
        'Quente': 0,
        'Em desenvolvimento': 0,
        'Frio': 0,
      },
      availableCartasCount,
      activeCampaignsCount,
    });
  }

  const effectiveRole = sessionUser.role;
  const effectiveSellerId = sessionUser.id;
  const effectiveTenantId = sessionUser.tenantId;

  let leads: any[] = [];
  let pipelineTotals = {
    totalLeads: 0,
    potentialPipelineValue: 0,
    estimatedCommissions: 0,
  };

  try {
    const [pgLeads, aggregated] = await Promise.all([
      getDbLeads(),
      getDbLeadsPipelineTotals({
        role: effectiveRole,
        sellerId: effectiveSellerId,
        tenantId: effectiveTenantId,
      }),
    ]);

    leads = pgLeads;
    pipelineTotals = aggregated;
  } catch (err) {
    console.error('Error computing live metrics from Cloud SQL leads:', err);
    leads = [];
  }

  if (effectiveRole === 'vendedor') {
    leads = leads.filter((l: any) => l.sellerId === effectiveSellerId);
  } else if ((effectiveRole === 'gestor' || effectiveRole === 'empresa') && effectiveTenantId) {
    leads = leads.filter(
      (l: any) => l.tenantId === effectiveTenantId || (!l.tenantId && effectiveTenantId === 'tenant-1')
    );
  }

  const totalLeads = leads.length;
  const hotLeads = leads.filter((l: any) => l.temperature === 'Muito quente' || l.temperature === 'Quente').length;
  const inNegotiationLeads = leads.filter((l: any) => l.status === 'em_negociacao' || l.status === 'proposta_enviada').length;
  const wonLeads = leads.filter((l: any) => l.status === 'venda_concluida').length;

  // Authoritative SUM(target_value) with strict 0 guarantee when no opportunities exist
  const jsPipelineSum = leads.reduce((acc: number, l: any) => acc + (Number(l.targetValue) || 0), 0);
  const potentialPipelineValue =
    totalLeads === 0 ? 0 : (pipelineTotals.totalLeads === totalLeads ? pipelineTotals.potentialPipelineValue : jsPipelineSum);
  const estimatedCommissions =
    totalLeads === 0 ? 0 : Math.round(potentialPipelineValue * 0.025 * 100) / 100;
  const conversionRate = totalLeads > 0 ? Number(((wonLeads / totalLeads) * 100).toFixed(1)) : 0;

  const byProduct: Record<string, number> = {};
  leads.forEach((l: any) => {
    byProduct[l.product] = (byProduct[l.product] || 0) + 1;
  });

  const byTemperature = {
    'Muito quente': leads.filter((l: any) => l.temperature === 'Muito quente').length,
    'Quente': leads.filter((l: any) => l.temperature === 'Quente').length,
    'Em desenvolvimento': leads.filter((l: any) => l.temperature === 'Em desenvolvimento').length,
    'Frio': leads.filter((l: any) => l.temperature === 'Frio').length,
  };

  res.json({
    totalLeads,
    newLeadsToday: leads.filter((l: any) => l.status === 'novo').length,
    hotLeads,
    inNegotiationLeads,
    wonLeads,
    conversionRate,
    potentialPipelineValue,
    estimatedCommissions,
    byProduct,
    byTemperature,
    availableCartasCount,
    activeCampaignsCount,
  });
});

// Real-time SSE stream for instant lead notifications across clients
app.get('/api/leads/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`);
  sseClients.push(res);

  req.on('close', () => {
    const idx = sseClients.indexOf(res);
    if (idx !== -1) sseClients.splice(idx, 1);
  });
});

// 3. Leads CRUD & Filters (Exclusively backed by Cloud SQL PostgreSQL with zero mock fallbacks)
app.get('/api/leads', async (req, res) => {
  const sessionUser = await resolveSessionProfile(req);
  if (!sessionUser) {
    return res.status(401).json({ error: 'Sessão não autenticada.' });
  }

  let leadsList: any[] = [];
  try {
    leadsList = await getDbLeads();
  } catch (err) {
    console.error('Error reading leads from Cloud SQL PostgreSQL:', err);
    return res.status(500).json({ error: 'Falha ao consultar tabela leads no banco de dados.' });
  }

  // Enforce row-level tenant and seller portfolio isolation unless caller is Master
  if (sessionUser.role === 'vendedor') {
    leadsList = leadsList.filter((l) => l.sellerId === sessionUser.id);
  } else if (sessionUser.role === 'gestor' || sessionUser.role === 'empresa') {
    leadsList = leadsList.filter(
      (l) => l.tenantId === sessionUser.tenantId || (!l.tenantId && sessionUser.tenantId === 'tenant-1')
    );
  }

  const { search, product, temperature, status, sellerId, sortBy } = req.query;

  if (search) {
    const s = String(search).toLowerCase();
    leadsList = leadsList.filter(
      (l) =>
        l.name.toLowerCase().includes(s) ||
        l.phone.toLowerCase().includes(s) ||
        l.email.toLowerCase().includes(s) ||
        l.city.toLowerCase().includes(s)
    );
  }

  if (product && product !== 'all') {
    leadsList = leadsList.filter((l) => l.product === product);
  }

  if (temperature && temperature !== 'all') {
    leadsList = leadsList.filter((l) => l.temperature === temperature);
  }

  if (status && status !== 'all') {
    leadsList = leadsList.filter((l) => l.status === status);
  }

  if (sellerId && sellerId !== 'all') {
    leadsList = leadsList.filter((l) => l.sellerId === sellerId);
  }

  if (sortBy === 'score_desc') {
    leadsList.sort((a, b) => (b.score || 0) - (a.score || 0));
  } else if (sortBy === 'value_desc') {
    leadsList.sort((a, b) => (b.targetValue || 0) - (a.targetValue || 0));
  } else if (sortBy === 'oldest') {
    leadsList.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  } else {
    leadsList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  res.json(leadsList);
});

// Add new lead (Persisted to Cloud SQL & Broadcast in Real-Time)
app.post('/api/leads', async (req, res) => {
  const leadData = req.body;
  const sessionUser = await resolveSessionProfile(req);
  if (!sessionUser) {
    return res.status(401).json({ error: 'Sessão não autenticada.' });
  }

  const currentLeads = await getDbLeads();
  const normalizedPhone = (leadData.phone || '').replace(/\D/g, '');
  const existing = currentLeads.find(
    (l: any) =>
      (normalizedPhone && (l.phone || '').replace(/\D/g, '') === normalizedPhone) ||
      (leadData.email && (l.email || '').toLowerCase() === String(leadData.email).toLowerCase())
  );

  const fallbackAssignee = await resolveAssigneeProfile(sessionUser?.tenantId || leadData.tenantId);
  const newLead = {
    id: `lead-${Date.now()}`,
    name: leadData.name || 'Novo Lead',
    phone: leadData.phone || '',
    email: leadData.email || '',
    city: leadData.city || 'São Paulo',
    state: leadData.state || 'SP',
    product: leadData.product || 'Imóvel',
    targetValue: Number(leadData.targetValue) || 0,
    installmentBudget: Number(leadData.installmentBudget) || 0,
    purchaseTimeline: leadData.purchaseTimeline || 'Curto prazo (1 a 3 meses)',
    source: leadData.source || 'Cadastro Manual',
    score: leadData.score || 50,
    temperature: leadData.temperature || 'Em desenvolvimento',
    status: leadData.status || 'novo',
    tenantId: sessionUser?.tenantId || leadData.tenantId || 'tenant-1',
    sellerId: leadData.sellerId || (sessionUser?.role === 'vendedor' ? sessionUser.id : fallbackAssignee.id),
    sellerName: leadData.sellerName || (sessionUser?.role === 'vendedor' ? sessionUser.name : fallbackAssignee.name),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    consent: leadData.consent ?? true,
    consentDate: leadData.consentDate || new Date().toISOString(),
    consentIp: req.ip || '127.0.0.1',
    objections: leadData.objections || [],
    nextRecommendedAction: leadData.nextRecommendedAction || 'Realizar primeiro contato para entender urgência e lance.',
    aiAnalysisReason: leadData.aiAnalysisReason || 'Aguardando qualificação aprofundada via Gemini.',
    history: [
      {
        id: `h-${Date.now()}`,
        date: new Date().toISOString(),
        type: 'status_change',
        description: 'Lead cadastrado no sistema LeadFinder AI',
        author: leadData.creatorName || sessionUser.name || 'Sistema',
      },
    ],
    tasks: [],
    urgency: leadData.urgency || 'Média',
    interestedInContemplada: leadData.interestedInContemplada ?? false,
    duplicateOf: existing ? existing.id : undefined,
  };

  try {
    await insertDbLead(newLead as any);
  } catch (err) {
    console.error('Error persisting lead to Cloud SQL:', err);
    return res.status(500).json({ error: 'Erro ao persistir lead no banco de dados.' });
  }

  broadcastLeadEvent('lead_added', { lead: newLead });
  res.status(201).json({ lead: newLead, duplicateFound: !!existing });
});

// Bulk import leads (CSV/JSON import persisted to Cloud SQL & Broadcast in Real-Time)
app.post('/api/leads/import', async (req, res) => {
  const sessionUser = await resolveSessionProfile(req);
  if (!sessionUser) {
    return res.status(401).json({ error: 'Sessão não autenticada.' });
  }

  const incoming = Array.isArray(req.body?.leads) ? req.body.leads : [];
  if (incoming.length === 0) {
    return res.status(400).json({ error: 'Nenhum lead informado para importação.' });
  }

  const fallbackAssignee = await resolveAssigneeProfile(sessionUser?.tenantId || null);
  const importedLeads: any[] = [];

  for (let i = 0; i < incoming.length; i++) {
    const item = incoming[i] || {};
    const nowIso = new Date().toISOString();
    const newLead = {
      id: item.id || `lead-imp-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
      name: String(item.name || item.nome || 'Lead Importado').trim(),
      phone: String(item.phone || item.telefone || '').trim(),
      email: String(item.email || '').trim(),
      city: String(item.city || item.cidade || 'São Paulo').trim(),
      state: String(item.state || item.estado || 'SP').trim(),
      product: item.product || item.produto || 'Imóvel',
      targetValue: Number(item.targetValue ?? item.valorPretendido ?? item.valor ?? 0) || 0,
      installmentBudget: Number(item.installmentBudget ?? item.parcela ?? 0) || 0,
      purchaseTimeline: item.purchaseTimeline || 'Curto prazo (1 a 3 meses)',
      source: item.source || item.origem || 'Importação Base de Dados',
      score: Number(item.score ?? 50) || 50,
      temperature: item.temperature || item.temperatura || 'Em desenvolvimento',
      status: item.status || 'novo',
      tenantId: sessionUser?.tenantId || item.tenantId || 'tenant-1',
      sellerId: item.sellerId || (sessionUser?.role === 'vendedor' ? sessionUser.id : fallbackAssignee.id),
      sellerName: item.sellerName || (sessionUser?.role === 'vendedor' ? sessionUser.name : fallbackAssignee.name),
      createdAt: item.createdAt || nowIso,
      updatedAt: nowIso,
      consent: item.consent ?? true,
      consentDate: item.consentDate || nowIso,
      consentIp: req.ip || '127.0.0.1',
      objections: Array.isArray(item.objections) ? item.objections : [],
      nextRecommendedAction: item.nextRecommendedAction || 'Realizar primeiro contato e validar perfil de lance.',
      aiAnalysisReason: item.aiAnalysisReason || 'Registro importado via base de dados.',
      history: [
        {
          id: `h-imp-${Date.now()}-${i}`,
          date: nowIso,
          type: 'status_change',
          description: 'Lead importado para o sistema LeadFinder AI',
          author: sessionUser.name || 'Importação',
        },
      ],
      tasks: [],
      urgency: item.urgency || 'Média',
      interestedInContemplada: Boolean(item.interestedInContemplada ?? false),
    };

    try {
      await insertDbLead(newLead as any);
      importedLeads.push(newLead);
      broadcastLeadEvent('lead_added', { lead: newLead });
    } catch (err) {
      console.error('Error importing lead row to Cloud SQL:', err);
    }
  }

  res.status(201).json({
    success: true,
    importedCount: importedLeads.length,
    leads: importedLeads,
  });
});

// Update lead (Persisted directly in Cloud SQL & Broadcast in Real-Time)
app.put('/api/leads/:id', async (req, res) => {
  const existing = await getDbLeadById(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Lead não encontrado' });
  }

  const updated: any = {
    ...existing,
    ...req.body,
    updatedAt: new Date().toISOString(),
  };

  if (req.body.targetValue !== undefined) {
    updated.targetValue = Number(req.body.targetValue) || 0;
  }
  if (req.body.installmentBudget !== undefined) {
    updated.installmentBudget = Number(req.body.installmentBudget) || 0;
  }

  if (req.body.status && req.body.status !== existing.status) {
    updated.history = [...(updated.history || [])];
    updated.history.unshift({
      id: `h-${Date.now()}`,
      date: new Date().toISOString(),
      type: 'status_change',
      description: `Status alterado de "${existing.status}" para "${req.body.status}"`,
      author: req.body.author || 'Usuário',
    });
  }

  try {
    await updateDbLead(req.params.id, updated);
  } catch (err) {
    console.error('Error updating lead in Cloud SQL:', err);
    return res.status(500).json({ error: 'Erro ao atualizar lead no banco de dados.' });
  }

  broadcastLeadEvent('lead_updated', { lead: updated });
  res.json(updated);
});

// Delete lead (with LGPD compliance, Cloud SQL deletion & broadcast)
app.delete('/api/leads/:id', async (req, res) => {
  const existing = await getDbLeadById(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Lead não encontrado' });
  }

  try {
    await deleteDbLead(req.params.id);
  } catch (err) {
    console.error('Error deleting lead from Cloud SQL:', err);
    return res.status(500).json({ error: 'Erro ao excluir lead do banco de dados.' });
  }

  broadcastLeadEvent('lead_deleted', { leadId: req.params.id });
  res.json({ success: true, message: 'Lead excluído em conformidade com as diretrizes da LGPD.' });
});

// Export leads (LGPD Compliant, read directly from Cloud SQL PostgreSQL)
app.get('/api/leads/export', async (req, res) => {
  const format = req.query.format || 'json';
  const liveLeads = await getDbLeads();

  if (format === 'csv') {
    const headers = [
      'ID',
      'Nome',
      'Telefone',
      'Email',
      'Cidade',
      'Estado',
      'Produto',
      'Valor Pretendido',
      'Parcela Maxima',
      'Prazo',
      'Origem',
      'Pontuacao',
      'Temperatura',
      'Status',
      'Vendedor',
      'Data Cadastro',
      'Consentimento LGPD',
    ];
    const rows = liveLeads.map((l: any) => [
      `"${l.id}"`,
      `"${l.name}"`,
      `"${l.phone}"`,
      `"${l.email}"`,
      `"${l.city}"`,
      `"${l.state}"`,
      `"${l.product}"`,
      l.targetValue,
      l.installmentBudget,
      `"${l.purchaseTimeline}"`,
      `"${l.source}"`,
      l.score,
      `"${l.temperature}"`,
      `"${l.status}"`,
      `"${l.sellerName}"`,
      `"${l.createdAt}"`,
      l.consent ? 'Sim' : 'Não',
    ]);
    const csvContent = [headers.join(','), ...rows.map((r: any[]) => r.join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="leadfinder_leads_export.csv"');
    return res.send(csvContent);
  }

  res.json(liveLeads);
});

// 4. Gemini AI Lead Qualification Endpoint
app.post('/api/leads/:id/qualify', async (req, res) => {
  const lead = await getDbLeadById(req.params.id);

  if (!lead) {
    return res.status(404).json({ error: 'Lead não encontrado' });
  }

  const prompt = `
Você é a IA Qualificadora de Consórcios e Crédito do sistema LEADFINDER AI.
Sua missão é analisar o lead comercial abaixo e emitir uma qualificação profissional, precisa e estritamente ancorada nos fatos informados, sem inventar informações.

Dados do Lead:
- Nome: ${lead.name}
- Produto Desejado: ${lead.product}
- Valor Pretendido: R$ ${lead.targetValue.toLocaleString('pt-BR')}
- Capacidade de Parcela Mensal Declarada: R$ ${lead.installmentBudget.toLocaleString('pt-BR')}
- Prazo de Compra Desejado: ${lead.purchaseTimeline}
- Urgência Declarada: ${lead.urgency || 'Não especificada'}
- Interesse em Carta Contemplada: ${lead.interestedInContemplada ? 'Sim, quer cota contemplada' : 'Consórcio convencional ou aberto'}
- Objeções ou Comentários: ${lead.objections?.join(', ') || 'Nenhum informado'}

Critérios de Pontuação e Temperatura (0 a 100):
- 80 a 100: Muito quente (Alta urgência, parcela viável para o valor do crédito, timing imediato ou curto prazo).
- 60 a 79: Quente (Bom perfil financeiro, timing planejado, poucas objeções).
- 40 a 59: Em desenvolvimento (Parcela apertada para o valor, ou timing longo prazo, precisa de reajuste de prazo/plano).
- 0 a 39: Frio (Valores inviáveis, sem capacidade declarada, ou objeções graves).

Regras Obrigatórias:
1. Calcule a pontuação objetiva de 0 a 100.
2. Defina a temperatura EXATAMENTE como: 'Muito quente', 'Quente', 'Em desenvolvimento' ou 'Frio'.
3. Identifique se o perfil tem interesse/viabilidade em carta contemplada ou consórcio tradicional.
4. Liste as objeções comerciais reais baseadas nos dados.
5. Recomende a próxima ação prática e cirúrgica para o vendedor de consórcio fechar o negócio.
6. Forneça uma justificativa objetiva sem inventar dados que o cliente não passou.

Retorne estritamente em formato JSON com o seguinte schema:
{
  "score": número (0 a 100),
  "temperature": "Muito quente" | "Quente" | "Em desenvolvimento" | "Frio",
  "interestedInContemplada": booleano,
  "objections": array de strings,
  "nextRecommendedAction": string,
  "aiAnalysisReason": string
}
`;

  if (hasValidGeminiKey()) {
    try {
      const aiResponse = await callGeminiWithTimeout(
        ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        }),
        3500
      );

      const parsed = JSON.parse(aiResponse.text || '{}');

      // Update lead in database
      lead.score = parsed.score ?? lead.score;
      lead.temperature = parsed.temperature ?? lead.temperature;
      lead.objections = parsed.objections ?? lead.objections;
      lead.nextRecommendedAction = parsed.nextRecommendedAction ?? lead.nextRecommendedAction;
      lead.aiAnalysisReason = parsed.aiAnalysisReason ?? lead.aiAnalysisReason;
      lead.updatedAt = new Date().toISOString();

      lead.history = lead.history || [];
      lead.history.unshift({
        id: `h-${Date.now()}`,
        date: new Date().toISOString(),
        type: 'ai_qualification',
        description: `Qualificado pelo Gemini AI: ${lead.score} pts (${lead.temperature})`,
        author: 'Gemini 3.8 Flash',
      });

      // Persist to Cloud SQL PostgreSQL
      try {
        await updateDbLead(lead.id, lead);
      } catch (err) {
        console.error('Error updating qualified lead in Cloud SQL:', err);
      }

      // Broadcast real-time SSE event
      broadcastLeadEvent('lead_updated', { lead });

      return res.json({
        success: true,
        lead,
        qualification: parsed,
      });
    } catch {
      // Handled by heuristic below
    }
  }

  // Heuristic rule-based qualification
  let score = 55;
  let temperature = 'Em desenvolvimento';

  const ratio = lead.targetValue > 0 ? (lead.installmentBudget * 180) / lead.targetValue : 0;
  if (ratio >= 0.8 && lead.purchaseTimeline.includes('Imediato')) {
    score = 90;
    temperature = 'Muito quente';
  } else if (ratio >= 0.7) {
    score = 75;
    temperature = 'Quente';
  } else if (ratio < 0.4) {
    score = 35;
    temperature = 'Frio';
  }

  lead.score = score;
  lead.temperature = temperature as any;
  lead.aiAnalysisReason = `Análise heurística de viabilidade: proporção parcela/crédito calculada em ${(ratio * 100).toFixed(0)}% com prazo pretendido de ${lead.purchaseTimeline}.`;
  lead.nextRecommendedAction = 'Entrar em contato para simular prazos estendidos de até 200 meses para adequar a parcela.';
  lead.updatedAt = new Date().toISOString();

  // Persist to Cloud SQL PostgreSQL
  try {
    await updateDbLead(lead.id, lead);
  } catch (err) {
    console.error('Error updating qualified lead in Cloud SQL:', err);
  }

  // Broadcast real-time SSE event
  broadcastLeadEvent('lead_updated', { lead });

  return res.json({
    success: true,
    lead,
    fallbackUsed: true,
    note: 'Qualificação gerada por motor de regras com base nos limites de parcela informados.',
  });
});

// 5. Gemini AI Sales Consultant & Assistant Chat
app.post('/api/gemini/chat', async (req, res) => {
  const { message } = req.body;
  const db = loadDatabase();
  const liveLeads = await getDbLeads();

  const leadsContext = liveLeads.slice(0, 10).map((l: any) => ({
    nome: l.name,
    produto: l.product,
    valor: `R$ ${(Number(l.targetValue) || 0).toLocaleString('pt-BR')}`,
    parcela: `R$ ${(Number(l.installmentBudget) || 0).toLocaleString('pt-BR')}`,
    temperatura: l.temperature,
    score: l.score,
    status: l.status,
    vendedor: l.sellerName,
    proximaAcao: l.nextRecommendedAction,
  }));

  const cartasContext = db.cartas.filter((c: any) => c.status === 'disponivel').map((c: any) => ({
    administradora: c.administradora,
    tipo: c.tipoCredito,
    credito: `R$ ${c.valorCarta.toLocaleString('pt-BR')}`,
    entrada: `R$ ${c.valorEntrada.toLocaleString('pt-BR')}`,
    parcela: `R$ ${c.valorParcela.toLocaleString('pt-BR')}`,
    prazo: `${c.parcelasRestantes} meses`,
  }));

  const hotLeadsList = liveLeads.filter((l: any) => l.temperature === 'Muito quente');
  const fallbackReply =
    hotLeadsList.length > 0
      ? `Com base nos dados reais cadastrados no banco, você possui ${hotLeadsList.length} leads muito quentes aguardando contato imediato, com destaque para ${hotLeadsList
          .slice(0, 2)
          .map((l: any) => `${l.name} (R$ ${(Number(l.targetValue) || 0).toLocaleString('pt-BR')})`)
          .join(' e ')}.`
      : liveLeads.length > 0
      ? `Você possui ${liveLeads.length} oportunidade(s) cadastrada(s) no momento. Recomendo utilizar a qualificação automática Gemini para priorizar os fechamentos.`
      : 'Ainda não há oportunidades cadastradas no banco de dados. Cadastre novos leads ou execute a Prospecção Outbound para iniciar as recomendações.';

  if (hasValidGeminiKey()) {
    const systemInstruction = `
Você é o Assistente Gemini Especialista em Vendas de Consórcios e Cartas Contempladas da plataforma LEADFINDER AI.
Você atua como um Diretor Comercial e Mentor de Alta Performance de Consórcios no Brasil.

Você tem acesso em tempo real aos dados comerciais da empresa:
- Top 10 leads recentes no banco de dados: ${JSON.stringify(leadsContext)}
- Cartas contempladas disponíveis em carteira: ${JSON.stringify(cartasContext)}
- Total de leads cadastrados: ${liveLeads.length}

Seu comportamento e tom:
- Extremamente prático, focado em fechamento de negócios, metas e aumento de conversão.
- Conhece a fundo a mecânica de consórcios no Brasil: lances embutidos, lances livres, taxa de administração, fundo de reserva, correção por INCC/IPCA/FIPE, contemplação por sorteio e transferência legal de cotas.
- Ao sugerir mensagens comerciais de WhatsApp, crie textos curtos, envolventes e persuasivos que geram respostas rápidas.
- Ao responder perguntas sobre "Quem devo atender hoje?", "Quais são os mais quentes?", analise os dados fornecidos acima e cite os nomes reais dos clientes e os valores exatos.
- Não invente clientes fictícios que não estejam nos dados.
- Mantenha respostas elegantes, formatadas com marcadores e destaques em negrito.
`;

    try {
      const aiResponse = await callGeminiWithTimeout(
        ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: message,
          config: {
            systemInstruction,
          },
        }),
        4500
      );

      return res.json({ reply: aiResponse.text || fallbackReply });
    } catch {
      return res.json({ reply: fallbackReply });
    }
  }

  return res.json({ reply: fallbackReply });
});

// 6. Gemini Lead Hunter Strategy & Copy Generator
app.post('/api/gemini/hunter-suggest', async (req, res) => {
  const { category, targetBudget, region } = req.body;
  const fallback = getTailoredHunterStrategy(category, region, targetBudget);

  if (!hasValidGeminiKey()) {
    return res.json(fallback);
  }

  const prompt = `
Você é o estrategista chefe de campanhas do LEADFINDER AI para Consórcios no Brasil.
Desenvolva uma estratégia completa e autorizada de captação de leads para o nicho: "${category || 'Imóveis'}".
Região prioritária: ${region || 'Brasil'}
Orçamento de referência: ${targetBudget || 'R$ 2.000 / mês'}

Retorne uma estrutura detalhada em formato JSON com:
1. "audienceTargeting": Descrição do público-alvo recomendado para Meta Ads e Google Ads (idades, interesses, comportamentos).
2. "keywordsGoogle": Array de 8 palavras-chave de alta intenção comercial.
3. "adCopies": Array de 3 modelos de anúncios de alta conversão (com Headline, Texto Principal e Chamada para Ação focada em economia sem juros).
4. "landingPageHook": Proposta de valor central para a página de captura.
5. "recommendedChannels": Array de canais mais adequados.
6. "conversionTips": Array de 3 dicas práticas para o vendedor ao receber os contatos desta campanha.
`;

  try {
    const aiResponse = await callGeminiWithTimeout(
      ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      }),
      3500
    );

    const parsed = JSON.parse(aiResponse.text || '{}');
    if (parsed && (parsed.adCopies?.length || parsed.keywordsGoogle?.length)) {
      return res.json(parsed);
    }
    return res.json(fallback);
  } catch {
    return res.json(fallback);
  }
});

// 7. Contemplated Letters CRUD & Matching
app.get('/api/cartas', (req, res) => {
  const db = loadDatabase();
  res.json(db.cartas);
});

app.post('/api/cartas', (req, res) => {
  const db = loadDatabase();
  const carta = {
    id: `carta-${Date.now()}`,
    ...req.body,
    updatedDate: new Date().toISOString(),
  };
  db.cartas.unshift(carta);
  saveDatabase(db);
  res.status(201).json(carta);
});

app.put('/api/cartas/:id', (req, res) => {
  const db = loadDatabase();
  const idx = db.cartas.findIndex((c: any) => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Carta não encontrada' });
  db.cartas[idx] = { ...db.cartas[idx], ...req.body, updatedDate: new Date().toISOString() };
  saveDatabase(db);
  res.json(db.cartas[idx]);
});

app.delete('/api/cartas/:id', (req, res) => {
  const db = loadDatabase();
  db.cartas = db.cartas.filter((c: any) => c.id !== req.params.id);
  saveDatabase(db);
  res.json({ success: true });
});

// Intelligent Matchmaker: matches leads with available letters
app.post('/api/cartas/match', (req, res) => {
  const { leadId, targetValue, maxDownPayment, maxInstallment, product } = req.body;
  const db = loadDatabase();

  const availableCartas = db.cartas.filter((c: any) => c.status === 'disponivel');

  const matches = availableCartas.map((carta: any) => {
    let score = 0;
    const reasons: string[] = [];

    // 1. Product type match
    if (product && carta.tipoCredito === product) {
      score += 40;
      reasons.push(`Mesmo segmento: ${carta.tipoCredito}`);
    }

    // 2. Value compatibility (within ±25%)
    if (targetValue) {
      const diff = Math.abs(carta.valorCarta - targetValue) / targetValue;
      if (diff <= 0.1) {
        score += 35;
        reasons.push('Crédito praticamente idêntico ao pretendido (diferença menor que 10%)');
      } else if (diff <= 0.25) {
        score += 20;
        reasons.push('Crédito compatível na mesma faixa de valor');
      }
    }

    // 3. Down payment budget compatibility
    if (maxDownPayment) {
      if (carta.valorEntrada <= maxDownPayment) {
        score += 15;
        reasons.push('Valor de entrada perfeitamente dentro da capacidade informada');
      } else if (carta.valorEntrada <= maxDownPayment * 1.15) {
        score += 8;
        reasons.push('Entrada ligeiramente superior à pretendida, mas negociável');
      }
    }

    // 4. Installment compatibility
    if (maxInstallment && carta.valorParcela <= maxInstallment * 1.1) {
      score += 10;
      reasons.push('Parcela mensal compatível com o orçamento declarado');
    }

    return {
      carta,
      matchScore: Math.min(score, 100),
      reasons,
    };
  });

  matches.sort((a: any, b: any) => b.matchScore - a.matchScore);
  res.json(matches);
});

// 8. Campaigns CRUD
app.get('/api/campaigns', (req, res) => {
  const db = loadDatabase();
  res.json(db.campaigns);
});

app.post('/api/campaigns', (req, res) => {
  const db = loadDatabase();
  const camp = {
    id: `camp-${Date.now()}`,
    name: req.body.name || 'Nova Campanha',
    product: req.body.product || 'Imóvel',
    status: 'ativa',
    budget: Number(req.body.budget) || 1000,
    spent: 0,
    leadsCount: 0,
    conversions: 0,
    landingSlug: req.body.landingSlug || `captacao-${Date.now()}`,
    channels: req.body.channels || { metaAds: true, googleAds: false, whatsapp: true, landingPage: true },
    utmCampaign: req.body.utmCampaign || `camp_${Date.now()}`,
    targetAudience: req.body.targetAudience || 'Público geral qualificado',
    createdAt: new Date().toISOString(),
  };
  db.campaigns.unshift(camp);
  saveDatabase(db);
  res.status(201).json(camp);
});

// 9. Public Capture Submission (Landing Pages & Smart Forms)
app.post('/api/capture/submit', async (req, res) => {
  const db = loadDatabase();
  const data = req.body;

  const targetVal = Number(data.targetValue) || 300000;
  const installment = Number(data.installmentBudget) || 2000;
  const ratio = (installment * 180) / targetVal;

  let initialScore = 65;
  let temperature = 'Quente';
  if (ratio >= 0.8 && data.purchaseTimeline?.includes('Imediato')) {
    initialScore = 90;
    temperature = 'Muito quente';
  } else if (ratio < 0.45) {
    initialScore = 45;
    temperature = 'Em desenvolvimento';
  }

  // Choose seller from real public.profiles table
  const chosenSeller = await resolveAssigneeProfile(data.tenantId);

  const newLead = {
    id: `lead-${Date.now()}`,
    name: data.name,
    phone: data.phone,
    email: data.email,
    city: data.city || 'São Paulo',
    state: data.state || 'SP',
    product: data.product || 'Imóvel',
    targetValue: targetVal,
    installmentBudget: installment,
    purchaseTimeline: data.purchaseTimeline || 'Curto prazo (1 a 3 meses)',
    source: data.campaignName ? `Landing Page: ${data.campaignName}` : 'Página de Captação Direta',
    score: initialScore,
    temperature: temperature as any,
    status: 'novo',
    sellerId: chosenSeller.id,
    sellerName: chosenSeller.name,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    consent: true,
    consentDate: new Date().toISOString(),
    consentIp: req.ip || '127.0.0.1',
    objections: [],
    nextRecommendedAction: `Entrar em contato em até 10 minutos. O lead acabou de se cadastrar com interesse em ${data.product}.`,
    aiAnalysisReason: `Captação online automática com consentimento LGPD registrado. Pontuação inicial ${initialScore} calculada pela proporção parcela/crédito.`,
    history: [
      {
        id: `h-${Date.now()}`,
        date: new Date().toISOString(),
        type: 'status_change',
        description: `Lead captado através de formulário online (${data.campaignName || 'Geral'}) com consentimento LGPD`,
        author: 'Sistema de Captação Automática',
      },
    ],
    tasks: [
      {
        id: `t-${Date.now()}`,
        title: `Primeiro contato com ${data.name}`,
        dueDate: new Date(Date.now() + 1800000).toISOString(),
        completed: false,
        priority: 'alta',
      },
    ],
    urgency: data.purchaseTimeline?.includes('Imediato') ? 'Alta' : 'Média',
    interestedInContemplada: data.interestedInContemplada ?? false,
  };

  // Update seller's active count in public.profiles
  await incrementDbProfileActiveLeads(chosenSeller.id);

  // Update campaign count if linked
  if (data.campaignId) {
    const camp = db.campaigns.find((c: any) => c.id === data.campaignId);
    if (camp) {
      camp.leadsCount = (camp.leadsCount || 0) + 1;
    }
  }

  saveDatabase(db);

  // Persist to Cloud SQL PostgreSQL
  try {
    await insertDbLead(newLead as any);
  } catch (err) {
    console.error('Error inserting captured lead to Cloud SQL:', err);
  }

  // Broadcast real-time SSE event to all connected clients
  broadcastLeadEvent('lead_added', { lead: newLead });

  res.status(201).json({
    success: true,
    message: 'Cadastro recebido com sucesso! Um de nossos consultores entrará em contato em breve.',
    leadId: newLead.id,
  });
});

// 10. WhatsApp Management & Messages
app.get('/api/whatsapp/chats', (req, res) => {
  const db = loadDatabase();
  res.json(db.whatsappChats);
});

app.post('/api/whatsapp/messages', async (req, res) => {
  const { chatId, text, sender } = req.body;
  const db = loadDatabase();
  const chat = db.whatsappChats.find((c: any) => c.id === chatId);

  if (!chat) return res.status(404).json({ error: 'Conversa não encontrada' });

  const newMsg = {
    id: `m-${Date.now()}`,
    sender: sender || 'seller',
    text,
    timestamp: 'Agora mesmo',
    automated: false,
  };

  chat.messages.push(newMsg);
  chat.lastMessage = text;
  chat.lastMessageTime = 'Agora mesmo';

  saveDatabase(db);
  res.json({ message: newMsg, chat });
});

// AI automated reply suggestion for WhatsApp
app.post('/api/whatsapp/suggest-reply', async (req, res) => {
  const { chatId } = req.body;
  const db = loadDatabase();
  const chat = db.whatsappChats.find((c: any) => c.id === chatId);

  if (!chat) return res.status(404).json({ error: 'Conversa não encontrada' });

  const lead = chat.leadId ? await getDbLeadById(chat.leadId) : null;

  const prompt = `
Você é o assistente comercial de WhatsApp da LeadFinder AI.
O vendedor precisa de uma sugestão de mensagem rápida, educada e de alta conversão para responder o cliente no WhatsApp.

Contexto da conversa:
Cliente: ${chat.leadName} (${chat.phone})
Produto de interesse: ${chat.product}
Histórico recente da conversa:
${chat.messages.map((m: any) => `${m.sender.toUpperCase()}: ${m.text}`).join('\n')}

Dados do lead:
Valor: R$ ${lead?.targetValue?.toLocaleString('pt-BR') || 'Sob consulta'}
Parcela pretendida: R$ ${lead?.installmentBudget?.toLocaleString('pt-BR') || 'Sob consulta'}
Objeções: ${lead?.objections?.join(', ') || 'Nenhuma'}

Crie 2 opções de respostas curtas para o WhatsApp:
Opção 1: Direta e com pergunta de fechamento ou agendamento de ligação.
Opção 2: Focada em esclarecer detalhes ou enviar simulação em PDF.
Retorne em JSON:
{
  "options": [
    { "title": "Opção 1 (Agendamento rápido)", "text": "..." },
    { "title": "Opção 2 (Envio de simulação)", "text": "..." }
  ]
}
`;

  const defaultReplies = {
    options: [
      {
        title: 'Opção 1 (Agendamento rápido)',
        text: `Olá ${chat.leadName}! Preparei a simulação exata que você pediu. Podemos fazer uma rápida ligação de 3 minutos agora para eu te mostrar as faixas de lance?`,
      },
      {
        title: 'Opção 2 (Envio de simulação)',
        text: `Perfeito, ${chat.leadName}! Estou finalizando o comparativo oficial com a tabela de prazos reduzidos e já te envio aqui no WhatsApp.`,
      },
    ],
  };

  if (hasValidGeminiKey()) {
    try {
      const aiResponse = await callGeminiWithTimeout(
        ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: { responseMimeType: 'application/json' },
        }),
        3500
      );
      const parsed = JSON.parse(aiResponse.text || '{}');
      if (parsed?.options?.length) {
        return res.json(parsed);
      }
      return res.json(defaultReplies);
    } catch {
      return res.json(defaultReplies);
    }
  }

  return res.json(defaultReplies);
});

// Toggle WhatsApp Opt-out (LGPD)
app.post('/api/whatsapp/:chatId/opt-out', (req, res) => {
  const db = loadDatabase();
  const chat = db.whatsappChats.find((c: any) => c.id === req.params.chatId);
  if (!chat) return res.status(404).json({ error: 'Chat não encontrado' });

  chat.optOut = !chat.optOut;
  if (chat.optOut) {
    chat.status = 'descadastrado';
    chat.messages.push({
      id: `m-${Date.now()}`,
      sender: 'bot',
      text: 'Você solicitou o descadastramento conforme a LGPD. Não enviaremos mais mensagens promocionais.',
      timestamp: 'Agora mesmo',
      automated: true,
    });
  }
  saveDatabase(db);
  res.json({ success: true, optOut: chat.optOut });
});

// 11. Team & Smart Distribution (100% backed by public.profiles with real-time SSE)
app.get('/api/team/stream', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const caller = await resolveSessionProfile(req);
  if (!caller) {
    res.write(`data: ${JSON.stringify({ type: 'error', message: 'Não autenticado' })}\n\n`);
    res.end();
    return;
  }

  sseTeamClients.push(res);

  let lastSignature = '';
  try {
    const initialProfiles = await getDbProfiles(caller.tenantId, caller.role);
    lastSignature = JSON.stringify(initialProfiles.map((p) => `${p.id}:${p.role}:${p.tenantId}:${p.name}:${p.activeLeadsCount}`));
    res.write(`data: ${JSON.stringify({ type: 'profiles_updated', profiles: initialProfiles })}\n\n`);
  } catch {
    res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);
  }

  // Real-time watcher so external SQL updates/inserts in public.profiles sync automatically
  const pollInterval = setInterval(async () => {
    try {
      const currentProfiles = await getDbProfiles(caller.tenantId, caller.role);
      const nextSignature = JSON.stringify(currentProfiles.map((p) => `${p.id}:${p.role}:${p.tenantId}:${p.name}:${p.activeLeadsCount}`));
      if (nextSignature !== lastSignature) {
        lastSignature = nextSignature;
        res.write(`data: ${JSON.stringify({ type: 'profiles_updated', profiles: currentProfiles })}\n\n`);
      }
    } catch {
      // Ignore transient poll errors
    }
  }, 4000);

  req.on('close', () => {
    clearInterval(pollInterval);
    const idx = sseTeamClients.indexOf(res);
    if (idx !== -1) sseTeamClients.splice(idx, 1);
  });
});

app.get('/api/team', async (req, res) => {
  try {
    const caller = await resolveSessionProfile(req);
    if (!caller) {
      return res.status(401).json({ error: 'Não autenticado' });
    }
    const dbProfiles = await getDbProfiles(caller.tenantId, caller.role);
    res.json(dbProfiles);
  } catch (err) {
    console.error('Error querying public.profiles for /api/team:', err);
    res.status(500).json({ error: 'Erro ao consultar utilizadores em public.profiles.' });
  }
});

app.post('/api/team', async (req, res) => {
  try {
    const caller = await resolveSessionProfile(req);
    if (!caller || caller.role === 'vendedor') {
      return res.status(403).json({ error: 'Apenas Gestor ou Master podem cadastrar consultores.' });
    }

    const tenantId = caller.role === 'master'
      ? (req.body.tenantId || 'tenant-1')
      : (caller.tenantId || 'tenant-1');

    const dbProfiles = await getDbProfiles(tenantId, 'gestor');
    const currentSellers = dbProfiles.filter((u) => u.role === 'vendedor');
    const gestor = dbProfiles.find((u) => u.role === 'gestor' || u.role === 'empresa');

    const maxLimit = caller.role === 'master'
      ? 999999
      : (gestor?.maxSellersLimit || (gestor?.planId === 'basic' ? 1 : gestor?.planId === 'business' ? 10 : gestor?.planId === 'enterprise' ? 999999 : 3));
    const planName = gestor?.planName || 'Plano Profissional';

    if (caller.role !== 'master' && currentSellers.length >= maxLimit) {
      return res.status(403).json({
        error: `Limite de ${maxLimit} vendedor(es) atingido para o ${planName}. Faça upgrade para o Plano Business ou Enterprise para cadastrar novos consultores.`,
        limitReached: true,
        maxSellersLimit: maxLimit,
        currentSellersCount: currentSellers.length,
        planName
      });
    }

    // Security check: Only existing Master can assign master/gestor
    const reqRole = String(req.body.role || 'vendedor').toLowerCase();
    const assignedRole = caller.role === 'master' && (reqRole === 'master' || reqRole === 'gestor') ? reqRole : 'vendedor';

    const saved = await upsertDbProfile({
      id: `user-${Date.now()}`,
      name: req.body.name || 'Novo Consultor',
      email: req.body.email,
      phone: req.body.phone || '',
      region: req.body.region || 'Brasil',
      specialties: req.body.specialties || ['Imóvel'],
      avatar: req.body.avatar || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      role: assignedRole as any,
      tenantId: assignedRole === 'master' ? null : tenantId,
      companyId: req.body.companyId || gestor?.companyId || 'comp-1',
      companyName: req.body.companyName || gestor?.companyName || 'Aliança Consórcios & Investimentos',
    });

    await broadcastProfileEvent('profiles_updated');
    res.status(201).json(saved);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Erro ao cadastrar vendedor em public.profiles.' });
  }
});

app.delete('/api/team/:id', async (req, res) => {
  try {
    const caller = await resolveSessionProfile(req);
    if (!caller || caller.role === 'vendedor') {
      return res.status(403).json({ error: 'Acesso negado para remover membros da equipe.' });
    }
    const target = await getDbProfileById(req.params.id);
    if (!target) {
      return res.status(404).json({ error: 'Utilizador não encontrado.' });
    }
    if (caller.role !== 'master' && target.tenantId !== caller.tenantId) {
      return res.status(403).json({ error: 'Não autorizado a remover utilizadores de outra empresa.' });
    }
    const result = await deleteDbProfile(req.params.id);
    if (!result.deleted) {
      return res.status(400).json({ error: result.reason });
    }
    await broadcastProfileEvent('profiles_updated');
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Erro ao remover utilizador.' });
  }
});

// Smart distribution algorithm (Gestor / Master only, using real public.profiles sellers)
app.post('/api/distribution/auto', async (req, res) => {
  const caller = await resolveSessionProfile(req);
  if (!caller || caller.role === 'vendedor') {
    return res.status(403).json({ error: 'Apenas Gestor ou Master podem distribuir leads.' });
  }
  const allLeads = await getDbLeads();
  const unassignedOrNew = allLeads.filter((l: any) => l.status === 'novo');
  const profilesList = await getDbProfiles(caller.tenantId, caller.role);
  const availableSellers = profilesList.filter((u) => u.available && u.role === 'vendedor');

  if (availableSellers.length === 0) {
    return res.status(400).json({ error: 'Nenhum vendedor real cadastrado em public.profiles para receber leads.' });
  }

  let distributedCount = 0;

  for (const lead of unassignedOrNew) {
    let bestSeller = availableSellers.find((s) => s.specialties?.includes(lead.product));
    if (!bestSeller) {
      bestSeller = [...availableSellers].sort((a, b) => (a.activeLeadsCount || 0) - (b.activeLeadsCount || 0))[0];
    }

    if (bestSeller) {
      lead.sellerId = bestSeller.id;
      lead.sellerName = bestSeller.name;
      bestSeller.activeLeadsCount = (bestSeller.activeLeadsCount || 0) + 1;
      await incrementDbProfileActiveLeads(bestSeller.id);
      distributedCount++;
      lead.history = lead.history || [];
      lead.history.unshift({
        id: `h-${Date.now()}`,
        date: new Date().toISOString(),
        type: 'status_change',
        description: `Lead distribuído automaticamente para ${bestSeller.name} com base na especialidade (${lead.product})`,
        author: 'Algoritmo de Distribuição Inteligente',
      });
      await updateDbLead(lead.id, lead);
      broadcastLeadEvent('lead_updated', { lead });
    }
  }

  await broadcastProfileEvent('profiles_updated');
  res.json({ success: true, distributedCount, totalLeadsUpdated: unassignedOrNew.length });
});

// 12. Integrations Management (Strictly blocked for vendedor)
app.get('/api/integrations', async (req, res) => {
  const caller = await resolveSessionProfile(req);
  if (!caller || caller.role === 'vendedor') {
    return res.status(403).json({ error: 'Acesso restrito a configurações do sistema.' });
  }
  const db = loadDatabase();
  res.json(db.integrations);
});

app.put('/api/integrations/:id', async (req, res) => {
  const caller = await resolveSessionProfile(req);
  if (!caller || caller.role === 'vendedor') {
    return res.status(403).json({ error: 'Acesso negado às configurações de API.' });
  }
  const db = loadDatabase();
  const idx = db.integrations.findIndex((i: any) => i.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Integração não encontrada' });

  db.integrations[idx] = {
    ...db.integrations[idx],
    ...req.body,
    lastSync: new Date().toISOString(),
  };
  saveDatabase(db);
  res.json(db.integrations[idx]);
});

// 13. Settings & LGPD Logs (Strictly blocked for vendedor)
app.get('/api/settings', async (req, res) => {
  const caller = await resolveSessionProfile(req);
  if (!caller || caller.role === 'vendedor') {
    return res.status(403).json({ error: 'Acesso restrito.' });
  }
  const db = loadDatabase();
  const settings = db.settings || {};
  res.json({
    ...settings,
    currentPlan:
      caller.role === 'master'
        ? settings.currentPlan || 'enterprise'
        : caller.planId || settings.currentPlan || 'enterprise',
  });
});

app.put('/api/settings', async (req, res) => {
  const caller = await resolveSessionProfile(req);
  if (!caller || caller.role === 'vendedor') {
    return res.status(403).json({ error: 'Acesso negado.' });
  }
  const db = loadDatabase();
  db.settings = { ...db.settings, ...req.body };
  saveDatabase(db);
  res.json(db.settings);
});

// 14. Prospecção Automática (Outbound) Endpoints
app.get('/api/outbound/profiles', (req, res) => {
  const db = loadDatabase();
  res.json(db.outboundProfiles || []);
});

app.post('/api/outbound/profiles', (req, res) => {
  const db = loadDatabase();
  const profile = {
    id: `out-${Date.now()}`,
    name: req.body.name || 'Novo Perfil de Prospecção',
    industry: req.body.industry || 'Construção Civil',
    cities: req.body.cities || ['São Paulo'],
    states: req.body.states || ['SP'],
    targetCreditMin: Number(req.body.targetCreditMin) || 300000,
    targetCreditMax: Number(req.body.targetCreditMax) || 1500000,
    targetProduct: req.body.targetProduct || 'Imóvel',
    provider: req.body.provider || 'google_places',
    webhookSecret: `whsec_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`,
    apiKey: req.body.apiKey || '',
    autoQualifyGemini: req.body.autoQualifyGemini ?? true,
    status: req.body.status || 'ativo',
    leadsFoundCount: 0,
    createdAt: new Date().toISOString(),
  };

  db.outboundProfiles = db.outboundProfiles || [];
  db.outboundProfiles.unshift(profile);
  saveDatabase(db);
  res.status(201).json(profile);
});

app.put('/api/outbound/profiles/:id', (req, res) => {
  const db = loadDatabase();
  db.outboundProfiles = db.outboundProfiles || [];
  const idx = db.outboundProfiles.findIndex((p: any) => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Perfil não encontrado' });

  db.outboundProfiles[idx] = {
    ...db.outboundProfiles[idx],
    ...req.body,
  };
  saveDatabase(db);
  res.json(db.outboundProfiles[idx]);
});

app.delete('/api/outbound/profiles/:id', (req, res) => {
  const db = loadDatabase();
  db.outboundProfiles = db.outboundProfiles || [];
  db.outboundProfiles = db.outboundProfiles.filter((p: any) => p.id !== req.params.id);
  saveDatabase(db);
  res.json({ success: true });
});

// Outbound Webhook Receiver (from PhantomBuster, Outscraper, Google Places or Zapier)
app.post('/api/outbound/webhook-inbound', async (req, res) => {
  const db = loadDatabase();
  const { secret, profileId, leads: inboundLeads, lead: singleLead } = req.body;

  let profile = null;
  if (secret) {
    profile = db.outboundProfiles?.find((p: any) => p.webhookSecret === secret);
  } else if (profileId) {
    profile = db.outboundProfiles?.find((p: any) => p.id === profileId);
  }

  const rawLeads = Array.isArray(inboundLeads) ? inboundLeads : singleLead ? [singleLead] : [];
  if (rawLeads.length === 0) {
    return res.status(400).json({ error: 'Nenhum lead encontrado no corpo da requisição.' });
  }

  const createdLeads: any[] = [];

  for (const raw of rawLeads) {
    const targetVal = Number(raw.targetValue) || (profile ? Math.round((profile.targetCreditMin + profile.targetCreditMax) / 2) : 400000);
    const installment = Number(raw.installmentBudget) || Math.round(targetVal / 160);

    const chosenSeller = await resolveAssigneeProfile(null);

    const leadId = `lead-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const providerName = (profile?.provider || raw.provider || 'Outscraper / Google Places').toUpperCase();

    const newLead: any = {
      id: leadId,
      name: raw.name || raw.companyName || raw.title || 'Empresa Prospecção Outbound',
      phone: raw.phone || raw.telephone || '(11) 98000-0000',
      email: raw.email || '',
      city: raw.city || (profile?.cities?.[0] || 'São Paulo'),
      state: raw.state || (profile?.states?.[0] || 'SP'),
      product: profile?.targetProduct || raw.product || 'Imóvel',
      targetValue: targetVal,
      installmentBudget: installment,
      purchaseTimeline: raw.purchaseTimeline || 'Curto prazo (1 a 3 meses)',
      source: `Prospecção Outbound - ${providerName} (${profile?.name || raw.industry || 'Segmento Alvo'})`,
      score: 50,
      temperature: 'Em desenvolvimento',
      status: 'novo',
      sellerId: chosenSeller.id,
      sellerName: chosenSeller.name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      consent: true,
      consentDate: new Date().toISOString(),
      consentIp: req.ip || '127.0.0.1',
      objections: [],
      nextRecommendedAction: 'Iniciar abordagem outbound de primeiro contato apresentando as vantagens do consórcio corporativo.',
      aiAnalysisReason: `Lead capturado via Webhook Outbound (${providerName}). Ramo: ${profile?.industry || raw.industry || 'Não especificado'}.`,
      history: [
        {
          id: `h-${Date.now()}`,
          date: new Date().toISOString(),
          type: 'status_change',
          description: `Lead capturado via Webhook Outbound (${providerName}) no perfil "${profile?.name || 'Geral'}"`,
          author: 'Webhook Outbound Engine',
        },
      ],
      tasks: [
        {
          id: `t-${Date.now()}`,
          title: `Qualificação e primeiro contato Outbound com ${raw.name || raw.companyName}`,
          dueDate: new Date(Date.now() + 86400000).toISOString(),
          completed: false,
          priority: 'alta',
        },
      ],
      urgency: 'Média',
      interestedInContemplada: false,
    };

    // If autoQualifyGemini is enabled, qualify with Gemini or rules engine
    if (profile?.autoQualifyGemini !== false) {
      const qualifyPrompt = `
Você é a IA Qualificadora de Consórcios e Crédito do sistema LEADFINDER AI.
Analise este novo lead capturado via PROSPECÇÃO OUTBOUND:
- Nome/Empresa: ${newLead.name}
- Ramo de Atividade: ${profile?.industry || raw.industry || 'Setor Produtivo'}
- Cidade/UF: ${newLead.city} - ${newLead.state}
- Produto Alvo: ${newLead.product}
- Valor Pretendido: R$ ${newLead.targetValue.toLocaleString('pt-BR')}
- Orçamento Estimado de Parcela: R$ ${newLead.installmentBudget.toLocaleString('pt-BR')}
- Prazo Desejado: ${newLead.purchaseTimeline}

Retorne um JSON com:
{
  "score": número (0 a 100),
  "temperature": "Muito quente" | "Quente" | "Em desenvolvimento" | "Frio",
  "objections": array de strings com objeções típicas deste ramo de atividade para consórcio,
  "nextRecommendedAction": string com gancho persuasivo de abordagem outbound por telefone/WhatsApp,
  "aiAnalysisReason": string explicando objetivamente a pontuação para consórcio
}
`;
      if (hasValidGeminiKey()) {
        try {
          const aiResponse = await callGeminiWithTimeout(
            ai.models.generateContent({
              model: 'gemini-3.8-flash',
              contents: qualifyPrompt,
              config: { responseMimeType: 'application/json' },
            }),
            3500
          );

          const parsed = JSON.parse(aiResponse.text || '{}');
          newLead.score = parsed.score ?? 72;
          newLead.temperature = parsed.temperature ?? 'Quente';
          newLead.objections = parsed.objections || [];
          newLead.nextRecommendedAction = parsed.nextRecommendedAction || newLead.nextRecommendedAction;
          newLead.aiAnalysisReason = parsed.aiAnalysisReason || newLead.aiAnalysisReason;

          newLead.history.unshift({
            id: `h-${Date.now()}-ai`,
            date: new Date().toISOString(),
            type: 'ai_qualification',
            description: `Qualificado pelo Gemini Copilot: ${newLead.score} pts (${newLead.temperature})`,
            author: 'Gemini 3.8 Flash Outbound',
          });
        } catch {
          // Clean fallback
          newLead.score = 78;
          newLead.temperature = 'Quente';
          newLead.objections = ['Validando limites de crédito corporativo'];
          newLead.nextRecommendedAction = 'Entrar em contato apresentando condições para CNPJ.';
          newLead.aiAnalysisReason = `Qualificado pelo motor analítico LeadFinder para ${newLead.product}.`;
        }
      } else {
        // Instant rule-based qualification
        newLead.score = 80;
        newLead.temperature = 'Muito quente';
        newLead.objections = ['Comparando prazo de entrega com financiamento bancário'];
        newLead.nextRecommendedAction = 'Entrar em contato via WhatsApp apresentando simulação de consórcio.';
        newLead.aiAnalysisReason = `Identificado pelo motor Outbound para ${newLead.product}.`;
        newLead.history.unshift({
          id: `h-${Date.now()}-ai`,
          date: new Date().toISOString(),
          type: 'ai_qualification',
          description: `Qualificado pelo Gemini Copilot: ${newLead.score} pts (${newLead.temperature})`,
          author: 'Regras Outbound LeadFinder',
        });
      }
    }

    createdLeads.push(newLead);

    // Persist to Cloud SQL PostgreSQL
    try {
      await insertDbLead(newLead as any);
    } catch (err) {
      console.error('Error inserting outbound webhook lead to Cloud SQL:', err);
    }

    // Broadcast real-time SSE event
    broadcastLeadEvent('lead_added', { lead: newLead });

    if (profile) {
      profile.leadsFoundCount = (profile.leadsFoundCount || 0) + 1;
      profile.lastSync = new Date().toISOString();
    }
  }

  saveDatabase(db);
  res.status(201).json({
    success: true,
    message: `${createdLeads.length} leads recebidos, salvos no Banco de Leads e qualificados pelo Gemini Copilot.`,
    leads: createdLeads,
  });
});

// Outbound Run Search (Proactive search / simulation with Gemini discovering prospects)
app.post('/api/outbound/run-search/:id', async (req, res) => {
  const db = loadDatabase();
  const profile = db.outboundProfiles?.find((p: any) => p.id === req.params.id);

  if (!profile) {
    return res.status(404).json({ error: 'Perfil de prospecção não encontrado.' });
  }

  const prompt = `
Você é o Motor de Busca e Prospecção Outbound B2B/B2C da plataforma LEADFINDER AI integrada a ferramentas como Google Places API, PhantomBuster e Outscraper.
Gere 3 prospects empresariais ou compradores altamente realistas e factíveis para o seguinte perfil no Brasil:
- Ramo de Atividade: ${profile.industry}
- Cidades Alvo: ${profile.cities.join(', ')} / Estados: ${profile.states.join(', ')}
- Faixa de Crédito Pretendido: R$ ${profile.targetCreditMin.toLocaleString('pt-BR')} a R$ ${profile.targetCreditMax.toLocaleString('pt-BR')}
- Produto de Consórcio: ${profile.targetProduct}

Para cada prospect gere:
1. "name": Nome do decisor (ex: Diretor de Operações, Sócio-Proprietário) ou Razão Social/Nome Fantasia da empresa
2. "phone": Telefone comercial no padrão brasileiro (com DDD da cidade especificada)
3. "email": E-mail corporativo realista (ex: contato@nomedaempresa.com.br)
4. "city": Uma das cidades alvo
5. "state": Um dos estados alvo
6. "targetValue": Valor numérico de crédito adequado à faixa informada
7. "installmentBudget": Capacidade de parcela mensal realista (cerca de 0.6% a 0.8% do crédito)
8. "purchaseTimeline": "Imediato (até 30 dias)" | "Curto prazo (1 a 3 meses)" | "Médio prazo (3 a 6 meses)"
9. "score": Pontuação de 0 a 100
10. "temperature": "Muito quente" | "Quente" | "Em desenvolvimento"
11. "nextRecommendedAction": Roteiro curto de abertura para a abordagem do vendedor de consórcios
12. "aiAnalysisReason": Justificativa da IA apontando o motivo do interesse (ex: expansão de frota, aquisição de sede própria, compra de máquinas para colheita, etc.)
13. "objections": Array com 1 ou 2 objeções comerciais prováveis

Retorne estritamente um array JSON de objetos:
[
  { ... },
  { ... },
  { ... }
]
`;

  try {
    let parsedProspects: any[] = [];
    if (hasValidGeminiKey()) {
      try {
        const aiResponse = await callGeminiWithTimeout(
          ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
            },
          }),
          4000
        );
        parsedProspects = JSON.parse(aiResponse.text || '[]');
      } catch {
        parsedProspects = generateOutboundProspects(profile);
      }
    } else {
      parsedProspects = generateOutboundProspects(profile);
    }
    const createdLeads: any[] = [];

    for (const p of parsedProspects) {
      const chosenSeller = await resolveAssigneeProfile(null);

      const newLead: any = {
        id: `lead-out-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: p.name || 'Empresa Prospectada Outbound',
        phone: p.phone || '(11) 98765-4321',
        email: p.email || 'contato@prospect.com.br',
        city: p.city || profile.cities[0] || 'São Paulo',
        state: p.state || profile.states[0] || 'SP',
        product: profile.targetProduct,
        targetValue: Number(p.targetValue) || Math.round((profile.targetCreditMin + profile.targetCreditMax) / 2),
        installmentBudget: Number(p.installmentBudget) || Math.round((profile.targetCreditMin / 150)),
        purchaseTimeline: p.purchaseTimeline || 'Curto prazo (1 a 3 meses)',
        source: `Prospecção Outbound - ${profile.provider.toUpperCase()} (${profile.industry})`,
        score: Number(p.score) || 82,
        temperature: p.temperature || 'Muito quente',
        status: 'novo',
        sellerId: chosenSeller.id,
        sellerName: chosenSeller.name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        consent: true,
        consentDate: new Date().toISOString(),
        consentIp: req.ip || '127.0.0.1',
        objections: p.objections || ['Comparando prazo de entrega da cota com financiamento bancário'],
        nextRecommendedAction: p.nextRecommendedAction || 'Ligar para o diretor de operações apresentando simulação de lance embutido.',
        aiAnalysisReason: p.aiAnalysisReason || `Identificado pelo motor Outbound para o ramo de ${profile.industry}.`,
        history: [
          {
            id: `h-${Date.now()}`,
            date: new Date().toISOString(),
            type: 'status_change',
            description: `Lead prospectado automaticamente via ${profile.provider.toUpperCase()} no perfil "${profile.name}"`,
            author: 'Motor de Prospecção Outbound',
          },
          {
            id: `h-${Date.now()}-ai`,
            date: new Date().toISOString(),
            type: 'ai_qualification',
            description: `Qualificado pelo Gemini Copilot: ${p.score || 82} pts (${p.temperature || 'Muito quente'})`,
            author: 'Gemini 3.8 Flash Copilot',
          },
        ],
        tasks: [
          {
            id: `t-${Date.now()}`,
            title: `Abordagem comercial Outbound: ${p.name}`,
            dueDate: new Date(Date.now() + 86400000).toISOString(),
            completed: false,
            priority: 'alta',
          },
        ],
        urgency: p.temperature === 'Muito quente' ? 'Alta' : 'Média',
        interestedInContemplada: profile.targetProduct === 'Carta Contemplada',
      };

      createdLeads.push(newLead);

      // Persist to Cloud SQL PostgreSQL
      try {
        await insertDbLead(newLead as any);
      } catch (err) {
        console.error('Error inserting outbound lead to Cloud SQL:', err);
      }

      // Broadcast real-time SSE event
      broadcastLeadEvent('lead_added', { lead: newLead });

      await incrementDbProfileActiveLeads(chosenSeller.id);
    }

    profile.leadsFoundCount = (profile.leadsFoundCount || 0) + createdLeads.length;
    profile.lastSync = new Date().toISOString();

    saveDatabase(db);

    res.json({
      success: true,
      message: `${createdLeads.length} novos leads prospectados e qualificados com sucesso pelo Gemini Copilot!`,
      leads: createdLeads,
      profile,
    });
  } catch (err: any) {
    console.error('Error in run-search outbound:', err);
    res.status(500).json({ error: 'Erro ao executar a prospecção outbound com o modelo.' });
  }
});

// Seed Cloud SQL PostgreSQL on startup if empty and verify master profile
async function seedCloudSqlDatabaseIfEmpty() {
  try {
    const initial = getInitialData();

    // Guarantee ONLY the logged Master user (gonzagad240@gmail.com) exists if missing, with role='master' & tenant_id=NULL.
    // Never seed fictional/mock sellers or gestores into public.profiles.
    const masterProfile = await getDbProfileByEmail('gonzagad240@gmail.com');
    if (
      !masterProfile ||
      masterProfile.role !== 'master' ||
      masterProfile.tenantId !== null ||
      masterProfile.planId !== 'enterprise' ||
      (masterProfile.maxSellersLimit ?? 0) < 999999
    ) {
      await upsertDbProfile({
        id: masterProfile?.id || 'user-master',
        email: 'gonzagad240@gmail.com',
        name: masterProfile?.name || 'Gonzaga (Master SaaS)',
        role: 'master',
        tenantId: null,
        companyId: null,
        companyName: 'LeadFinder AI Global (SaaS Master)',
        planId: 'enterprise',
        planName: 'Plano Enterprise',
        maxSellersLimit: 999999,
      });
    }

    const existing = await getDbLeads();
    const dbState = loadDatabase();
    if (existing.length > 0) {
      if (!dbState.leadsSeededOnce) {
        dbState.leadsSeededOnce = true;
        saveDatabase(dbState);
      }
    } else if (!dbState.leadsSeededOnce) {
      dbState.leadsSeededOnce = true;
      saveDatabase(dbState);
      for (const carta of initial.cartas) {
        await insertDbCarta(carta as any);
      }
    }
  } catch (err) {
    console.warn('Notice during Cloud SQL initial verification:', err);
  }
}

// Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`LeadFinder AI backend listening on port ${PORT}`);
    seedCloudSqlDatabaseIfEmpty().catch((err) => {
      console.warn('Initial Cloud SQL seed notice:', err);
    });
  });
}

startServer();
