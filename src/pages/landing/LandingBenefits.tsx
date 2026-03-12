import { motion } from 'framer-motion';
import { RotateCcw, Gauge, LayoutGrid, Briefcase, LineChart } from 'lucide-react';

const BENEFITS = [
  { text: 'menos retrabalho', Icon: RotateCcw },
  { text: 'mais controle', Icon: Gauge },
  { text: 'mais organização', Icon: LayoutGrid },
  { text: 'mais profissionalismo', Icon: Briefcase },
  { text: 'mais visão do negócio', Icon: LineChart },
];

export function LandingBenefits() {
  return (
    <section className="relative py-24 md:py-32 px-4 bg-[#07110D]">
      <div className="absolute inset-0 landing-bg-grid opacity-20" />
      <div className="relative z-10 max-w-5xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#F5F7F6] text-center mb-14 md:mb-16 tracking-tight leading-tight"
        >
          Quando a assistência se organiza, tudo muda.
        </motion.h2>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 md:gap-5">
          {BENEFITS.map((item, i) => (
            <motion.div
              key={item.text}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06, duration: 0.45 }}
              className="landing-card-premium p-5 md:p-6 flex flex-col items-center text-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#00F7A5]/10 border border-[#00F7A5]/20 flex items-center justify-center mb-3">
                <item.Icon className="w-6 h-6 text-[#00F7A5]" />
              </div>
              <span className="font-semibold text-[#F5F7F6] text-base md:text-lg">{item.text}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
