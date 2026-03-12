import { motion } from 'framer-motion';
import { useAnimatedNumber } from './useAnimatedNumber';
import { useState, useEffect } from 'react';

const CARD_BASE =
  'landing-card-premium text-[#F5F7F6] shadow-lg backdrop-blur-sm ';

/** Card Dashboard: vendas, ticket, OS abertas (com contador) */
function CardDashboard() {
  const vendas = useAnimatedNumber(2340, 2000, true, 0);
  const ticket = useAnimatedNumber(180, 2200, true, 0);
  const osAbertas = useAnimatedNumber(34, 1600, true, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className={`p-4 w-[200px] shrink-0 hero-card-float ${CARD_BASE}`}
    >
      <div className="text-xs font-medium text-[#9AA4A0] uppercase tracking-wider mb-3">Dashboard</div>
      <div className="space-y-2">
        <div className="flex justify-between items-baseline gap-2">
          <span className="text-xs text-[#6D7873]">Vendas do dia</span>
          <span className="font-bold text-[#00F7A5]">R$ {vendas.toLocaleString('pt-BR')}</span>
        </div>
        <div className="flex justify-between items-baseline gap-2">
          <span className="text-xs text-[#6D7873]">Ticket médio</span>
          <span className="font-semibold">R$ {ticket}</span>
        </div>
        <div className="flex justify-between items-baseline gap-2">
          <span className="text-xs text-[#6D7873]">OS abertas</span>
          <span className="font-semibold">{osAbertas}</span>
        </div>
      </div>
    </motion.div>
  );
}

/** Card Lista de OS */
function CardListaOS() {
  const items = [
    { num: 721, aparelho: 'iPhone 12', cliente: 'João' },
    { num: 720, aparelho: 'Moto G', cliente: 'Maria' },
    { num: 719, aparelho: 'Samsung A50', cliente: 'Lucas' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.35 }}
      className={`p-5 w-[260px] shrink-0 hero-card-float hero-card-float-delay-1 ${CARD_BASE}`}
    >
      <div className="text-xs font-medium text-[#9AA4A0] uppercase tracking-wider mb-3">Ordens de serviço</div>
      <ul className="space-y-2">
        {items.map((row) => (
          <li key={row.num} className="flex justify-between items-center gap-1 text-sm">
            <span className="text-[#6D7873] shrink-0">#{row.num}</span>
            <span className="font-medium truncate" title={row.aparelho}>{row.aparelho}</span>
            <span className="text-[#9AA4A0] truncate max-w-[72px]" title={row.cliente}>{row.cliente}</span>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

/** Card de alerta */
function CardAlerta() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.45 }}
      className={`p-5 w-[280px] shrink-0 hero-card-float hero-card-float-delay-2 ${CARD_BASE}`}
    >
      <div className="text-xs font-medium text-[#00F7A5] uppercase tracking-wider mb-2">Alerta</div>
      <div className="text-sm font-semibold mb-1">OS #721 finalizada</div>
      <div className="text-xs text-[#9AA4A0]">Cliente: João</div>
      <div className="text-xs text-[#00F7A5]">Status: pronta para retirada</div>
    </motion.div>
  );
}

/** Card financeiro */
function CardFinanceiro() {
  const entradas = useAnimatedNumber(3800, 2400, true, 0);
  const saidas = useAnimatedNumber(1200, 2200, true, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.55 }}
      className={`p-5 w-[240px] shrink-0 hero-card-float ${CARD_BASE}`}
    >
      <div className="text-xs font-medium text-[#9AA4A0] uppercase tracking-wider mb-3">Caixa do dia</div>
      <div className="space-y-2">
        <div className="flex justify-between items-baseline gap-2">
          <span className="text-xs text-[#6D7873]">Entradas</span>
          <span className="font-bold text-[#00F7A5]">R$ {entradas.toLocaleString('pt-BR')}</span>
        </div>
        <div className="flex justify-between items-baseline gap-2">
          <span className="text-xs text-[#6D7873]">Saídas</span>
          <span className="font-semibold">R$ {saidas.toLocaleString('pt-BR')}</span>
        </div>
      </div>
    </motion.div>
  );
}

/** Notificação flutuante "ao vivo" */
function LiveNotification({ text, sub, delay }: { text: string; sub: string; delay: number }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.96 }}
      animate={visible ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 8, scale: 0.96 }}
      transition={{ duration: 0.35 }}
      className="rounded-lg bg-[#0B0F0D] border border-[#00F7A5]/20 px-3 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.4),0_0_0_1px_rgba(0,247,165,0.15)] text-xs text-[#F5F7F6]"
    >
      <div className="font-semibold">{text}</div>
      <div className="text-[#9AA4A0]">{sub}</div>
    </motion.div>
  );
}

export function HeroVisualProof() {
  return (
    <div className="relative w-full flex justify-center items-center">
      {/* Desktop: cards sobrepostos; Mobile: coluna */}
      <div className="relative w-full max-w-[520px] min-h-[360px] md:min-h-[420px] flex flex-col md:block items-center justify-center gap-4 md:gap-0 py-6">
        {/* Notificações ao vivo - canto superior esquerdo para não sobrepor cards */}
        <div className="absolute top-0 left-0 z-30 flex flex-col gap-2 max-w-[200px]">
          <LiveNotification text="OS #722 criada" sub="Cliente: Ana • Entrada" delay={2500} />
          <LiveNotification text="OS #721 finalizada" sub="Pronta para retirada" delay={5500} />
        </div>

        {/* Card Alerta - topo */}
        <div className="hidden md:block absolute top-0 right-0 z-20">
          <CardAlerta />
        </div>
        {/* Linha do meio: Dashboard (centro) + OS (esquerda) */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-0 md:absolute md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 z-10">
          <div className="order-2 md:order-1 md:-mr-6">
            <CardListaOS />
          </div>
          <div className="order-1 md:order-2">
            <CardDashboard />
          </div>
        </div>
        {/* Card Financeiro - abaixo */}
        <div className="hidden md:block absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
          <CardFinanceiro />
        </div>

        {/* Mobile: mostrar todos em coluna (alerta e financeiro já estão no fluxo via flex) */}
        <div className="flex md:hidden flex-col gap-4 w-full max-w-[280px]">
          <CardAlerta />
          <CardFinanceiro />
        </div>
      </div>
    </div>
  );
}
