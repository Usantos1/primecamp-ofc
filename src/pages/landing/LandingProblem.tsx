import { motion } from 'framer-motion';
import { MessageCircle, Package, Wallet, HelpCircle } from 'lucide-react';

const PROBLEMS = [
  { title: 'Cliente perguntando status', desc: 'Ligação e WhatsApp o tempo todo.', Icon: HelpCircle },
  { title: 'Peça sumindo do estoque', desc: 'Não sabe o que tem nem o que falta.', Icon: Package },
  { title: 'Financeiro sem controle', desc: 'Contas e caixa na cabeça ou no caderno.', Icon: Wallet },
  { title: 'WhatsApp virando suporte manual', desc: 'Responde a mesma pergunta dezenas de vezes.', Icon: MessageCircle },
];

export function LandingProblem() {
  return (
    <section className="relative py-24 md:py-32 px-4 landing-bg-base">
      <div className="absolute inset-0 landing-bg-grid opacity-50" />
      <div className="relative z-10 max-w-6xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#F5F7F6] text-center mb-4 tracking-tight"
        >
          O problema não é falta de cliente.
          <br />
          <span className="text-[#00F7A5]">É falta de organização.</span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="text-center text-[#9AA4A0] text-lg md:text-xl mb-16 max-w-2xl mx-auto"
        >
          Quando a assistência começa a crescer, a bagunça cresce junto.
        </motion.p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
          {PROBLEMS.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ delay: i * 0.08, duration: 0.45 }}
              className="landing-card-premium p-6 md:p-7 flex flex-col"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#00F7A5]/10 border border-[#00F7A5]/20 flex items-center justify-center mb-4">
                <item.Icon className="w-6 h-6 text-[#00F7A5]" />
              </div>
              <h3 className="font-bold text-[#F5F7F6] text-lg md:text-xl mb-2">{item.title}</h3>
              <p className="text-sm md:text-base text-[#6D7873] leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="text-center text-[#6D7873] font-medium mt-14 text-lg"
        >
          Sem sistema, tudo vira improviso.
        </motion.p>
      </div>
    </section>
  );
}
