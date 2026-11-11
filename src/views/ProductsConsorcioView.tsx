import React from 'react';
import {
  Building2,
  Car,
  Bike,
  Truck,
  Tractor,
  Home,
  TrendingUp,
  Award,
  Layers,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Percent
} from 'lucide-react';
import { ConsorcioProduct } from '../types';

interface ProductInfo {
  product: ConsorcioProduct;
  icon: any;
  title: string;
  creditRange: string;
  maxTerm: string;
  avgAdminFee: string;
  embeddedBid: string; // Lance embutido
  description: string;
  targetAudience: string;
  highlights: string[];
}

const PRODUCTS_DATA: ProductInfo[] = [
  {
    product: 'Imóvel',
    icon: Building2,
    title: 'Consórcio Imobiliário Residencial & Comercial',
    creditRange: 'R$ 150.000 a R$ 2.500.000',
    maxTerm: 'Até 240 meses (20 anos)',
    avgAdminFee: '15% a 20% diluída no prazo',
    embeddedBid: 'Até 30% da própria carta',
    description: 'Aquisição de casas, apartamentos novos ou usados, terrenos, salas comerciais ou quitação de financiamento bancário com FGTS.',
    targetAudience: 'Famílias em busca de residência própria, investidores para renda de locação e empresários.',
    highlights: ['Permite uso do FGTS para lance ou quitação', 'Sem juros compostos de tabela Price/SAC', 'Taxa de administração linear'],
  },
  {
    product: 'Automóvel',
    icon: Car,
    title: 'Consórcio de Veículos Leves & SUVs',
    creditRange: 'R$ 50.000 a R$ 350.000',
    maxTerm: 'Até 100 meses',
    avgAdminFee: '12% a 16% total',
    embeddedBid: 'Até 25% a 30%',
    description: 'Compra de carros novos ou seminovos com até 8 a 10 anos de fabricação, sem necessidade de entrada imediata.',
    targetAudience: 'Profissionais que buscam trocar de carro periodicamente ou adquirir o primeiro veículo.',
    highlights: ['Liberdade de escolha da marca e modelo', 'Opção de faturar com desconto à vista', 'Lance fixo e lance livre'],
  },
  {
    product: 'Caminhão',
    icon: Truck,
    title: 'Consórcio de Pesados, Caminhões & Ônibus',
    creditRange: 'R$ 250.000 a R$ 1.500.000',
    maxTerm: 'Até 120 meses',
    avgAdminFee: '10% a 15% total',
    embeddedBid: 'Até 30%',
    description: 'Renovação e ampliação de frotas para transportadoras e caminhoneiros autônomos sem comprometer o fluxo de caixa.',
    targetAudience: 'Transportadoras, operadores logísticos e motoristas rodoviários.',
    highlights: ['Condições especiais para frotas PJ', 'Possibilidade de lance com o veículo usado', 'Grupos com alto índice de contemplação'],
  },
  {
    product: 'Máquinas Agrícolas',
    icon: Tractor,
    title: 'Consórcio de Máquinas Agrícolas & Tratores',
    creditRange: 'R$ 300.000 a R$ 3.000.000',
    maxTerm: 'Até 120 meses',
    avgAdminFee: '9% a 14% total',
    embeddedBid: 'Até 30%',
    description: 'Colheitadeiras, tratores, implementos agrícolas e sistemas de irrigação para produtores rurais de pequeno a grande porte.',
    targetAudience: 'Produtores rurais, cooperativas agropecuárias e agroindústrias.',
    highlights: ['Parcelas anuais ou semestrais conforme a safra', 'Menor custo efetivo frente a linhas bancárias', 'Validade para equipamentos novos ou usados'],
  },
  {
    product: 'Construção/Reforma',
    icon: Home,
    title: 'Consórcio para Construção & Reforma',
    creditRange: 'R$ 80.000 a R$ 800.000',
    maxTerm: 'Até 180 meses',
    avgAdminFee: '16% a 19% total',
    embeddedBid: 'Até 30%',
    description: 'Liberação de cronograma de obras para compra de materiais, mão de obra especializada e reformas completas.',
    targetAudience: 'Proprietários de lotes ou imóveis que necessitam de modernização e ampliação.',
    highlights: ['Liberação parcelada conforme avanço da obra', 'Economia superior ao empréstimo pessoal', 'Atende ampliações e acabamentos'],
  },
  {
    product: 'Carta Contemplada',
    icon: Award,
    title: 'Cotas Já Contempladas (Liberação Imediata)',
    creditRange: 'R$ 100.000 a R$ 2.000.000',
    maxTerm: 'Conforme saldo remanescente',
    avgAdminFee: 'Já embutida nas parcelas',
    embeddedBid: 'Transferência direta',
    description: 'Cartas com crédito já aprovado e disponível para utilização imediata mediante pagamento da entrada ao titular cedente.',
    targetAudience: 'Clientes com urgência em adquirir o bem (até 30 dias) e com valor de entrada disponível.',
    highlights: ['Faturamento sem aguardar sorteio', 'Transferência legal perante a administradora', 'Menor custo que financiamento'],
  },
];

export const ProductsConsorcioView: React.FC = () => {
  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-[10px] font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              Catálogo Oficial de Linhas de Crédito
            </span>
            <span className="text-xs text-slate-500">•</span>
            <span className="text-xs text-slate-400">Diretrizes Comerciais Brasil</span>
          </div>
          <h1 className="text-xl md:text-2xl font-extrabold text-white tracking-tight mt-1">
            Produtos & Modalidades de Consórcio
          </h1>
          <p className="text-xs text-slate-400">
            Regras, limites de crédito, prazos e estratégias de lance para cada categoria de mercado.
          </p>
        </div>
      </div>

      {/* Grid of Products */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {PRODUCTS_DATA.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-blue-500/40 transition-all space-y-4 shadow-lg flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    {item.maxTerm}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">
                  {item.title}
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  {item.description}
                </p>
              </div>

              {/* Specs */}
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500 text-[11px]">Faixa de Crédito:</span>
                  <strong className="text-slate-200">{item.creditRange}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 text-[11px]">Taxa Adm Média:</span>
                  <strong className="text-emerald-400">{item.avgAdminFee}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 text-[11px]">Lance Embutido:</span>
                  <strong className="text-amber-400">{item.embeddedBid}</strong>
                </div>
              </div>

              {/* Highlights */}
              <div className="space-y-1 text-[11px] text-slate-300">
                {item.highlights.map((h, i) => (
                  <p key={i} className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-blue-400 shrink-0" />
                    <span>{h}</span>
                  </p>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
