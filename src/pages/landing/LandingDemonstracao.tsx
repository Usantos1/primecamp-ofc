import { motion } from 'framer-motion';
import { LayoutDashboard, FileCheck, Package, Wallet, FlaskConical } from 'lucide-react';

const PREVIEWS = [
  { label: 'Dashboard', Icon: LayoutDashboard },
  { label: 'Ordens de serviço', Icon: FileCheck },
  { label: 'Estoque', Icon: Package },
  { label: 'Financeiro', Icon: Wallet },
];

interface LandingDemonstracaoProps {
  demoUrl?: string;
}

export function LandingDemonstracao({ demoUrl }: LandingDemonstracaoProps) {
  return (
    <section className="relative py-24 md:py-32 px-4 landing-bg-base">
      <div className="absolute inset-0 landing-bg-grid opacity-30" />
      <div className="relative z-10 max-w-5xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#F5F7F6] text-center mb-4 tracking-tight"
        >
          Veja o Ativa FIX funcionando.
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.08 }}
          className="text-center text-[#9AA4A0] text-lg md:text-xl mb-14 max-w-2xl mx-auto"
        >
          Ordens de serviço, estoque e financeiro em um único sistema.
        </motion.p>

        {/* Mockup principal do dashboard */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="landing-card-premium w-full max-w-4xl mx-auto aspect-video mb-12 flex items-center justify-center overflow-hidden"
        >
          <div className="w-full h-full p-6 md:p-8 flex flex-col gap-4">
            <div className="flex gap-3 flex-wrap">
              {['Vendas hoje', 'OS abertas', 'Ticket médio', 'Caixa'].map((t, i) => (
                <div key={t} className="h-14 flex-1 min-w-[120px] rounded-xl bg-[#07110D] border border-[#00F7A5]/10 flex items-center justify-center">
                  <span className="text-sm text-[#9AA4A0]">{t}</span>
                </div>
              ))}
            </div>
            <div className="flex-1 grid grid-cols-3 gap-3 rounded-xl bg-[#07110D]/50 border border-[#00F7A5]/10 p-3">
              <div className="col-span-2 rounded-lg bg-[#0B0F0D] border border-[#00F7A5]/10" />
              <div className="rounded-lg bg-[#0B0F0D] border border-[#00F7A5]/10" />
            </div>
          </div>
        </motion.div>

        {/* Previews das telas */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {PREVIEWS.map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.15 + i * 0.06, duration: 0.45 }}
              className="landing-card-premium p-5 flex flex-col items-center justify-center min-h-[120px] md:min-h-[140px]"
            >
              <item.Icon className="w-8 h-8 text-[#00F7A5] mb-2" />
              <span className="text-sm font-medium text-[#F5F7F6] text-center">{item.label}</span>
            </motion.div>
          ))}
        </div>

        {demoUrl && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex justify-center"
          >
            <motion.a
              href={demoUrl}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="landing-btn landing-btn-secondary inline-flex items-center gap-2 px-6 py-4 font-semibold text-base text-[#F5F7F6] border border-[#00F7A5]/20 bg-[#0B0F0D]/80 hover:border-[#00F7A5]/40 hover:bg-[#0B0F0D] transition-all duration-300"
            >
              <FlaskConical className="w-4 h-4 shrink-0" />
              Experimentar o sistema
            </motion.a>
          </motion.div>
        )}
      </div>
    </section>
  );
}
