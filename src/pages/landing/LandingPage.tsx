import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { LogIn, MessageCircle } from 'lucide-react';

const CTA_WHATSAPP = 'https://wa.me/551991979912';
const CTA_MSG = 'Olá! Quero conhecer o Ativa FIX e o que o sistema oferece para minha assistência técnica.';
const APP_URL = 'https://app.ativafix.com';

export default function LandingPage() {
  useEffect(() => {
    document.documentElement.classList.add('landing-page');
    document.body.classList.add('landing-page');
    return () => {
      document.documentElement.classList.remove('landing-page');
      document.body.classList.remove('landing-page');
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden">
      {/* Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="fixed top-0 left-0 right-0 z-50 px-4 py-3 bg-black/80 backdrop-blur-md border-b border-white/5"
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <motion.img
            src="/logo-ativafix.png"
            alt="Ativa FIX"
            className="h-10 w-auto object-contain"
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          />
          <motion.a
            href={APP_URL}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium text-[#00ff88] border border-[#00ff88]/60 bg-[#00ff88]/5 hover:bg-[#00ff88]/15 hover:border-[#00ff88] transition-all duration-200 backdrop-blur-sm"
          >
            <LogIn className="w-4 h-4" />
            Acessar o Sistema
          </motion.a>
        </div>
      </motion.header>

      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center px-4 pt-24 pb-16">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-[#0d1f0d] to-black" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(0,255,136,0.15),transparent)]" />
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="inline-block px-4 py-1.5 rounded-full text-sm font-semibold text-[#00ff88] bg-[#00ff88]/10 border border-[#00ff88]/30 mb-6"
          >
            Feito por quem vive assistência na pele
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.6 }}
            className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight tracking-tight mb-6"
          >
            <span className="text-white">Tudo que sua assistência precisa.</span>
            <br />
            <span className="text-[#00ff88] drop-shadow-[0_0_30px_rgba(0,255,136,0.5)]">
              No lugar certo.
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10"
          >
            O Ativa FIX reúne o que mais importa no dia a dia: OS com link pro cliente acompanhar, estoque organizado, 
            financeiro com DRE e fluxo de caixa, PDV, alertas no WhatsApp no horário que você definir. Tudo integrado.
          </motion.p>
          <motion.a
            href={`${CTA_WHATSAPP}?text=${encodeURIComponent(CTA_MSG)}`}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65, duration: 0.5 }}
            whileHover={{ scale: 1.04, boxShadow: '0 0 40px rgba(0,255,136,0.2)' }}
            whileTap={{ scale: 0.98 }}
            className="inline-flex items-center justify-center gap-3 px-10 py-4 rounded-full font-bold text-lg text-[#00ff88] border-2 border-[#00ff88]/60 bg-[#00ff88]/5 hover:bg-[#00ff88]/15 hover:border-[#00ff88] transition-all duration-200 backdrop-blur-sm shadow-[0_0_30px_rgba(0,255,136,0.08)]"
          >
            <MessageCircle className="w-5 h-5" />
            Quero organizar minha assistência
          </motion.a>
        </div>
      </section>

      {/* Dores – 2ª dobra */}
      <section className="min-h-screen flex flex-col justify-center py-24 px-4 bg-[#0d0d0d] border-y border-white/5">
        <div className="max-w-5xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.5 }}
            className="text-3xl sm:text-4xl font-extrabold text-center mb-3"
          >
            Você vive isso?
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="text-center text-slate-500 mb-14"
          >
            O Ativa FIX resolve: cada módulo cobre o que mais importa no dia a dia da assistência.
          </motion.p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { title: 'OS em papel ou planilha', desc: 'Ficha some, cliente cobra, histórico perdido. O sistema centraliza tudo e gera link pro cliente acompanhar.' },
              { title: 'Estoque no “achômetro”', desc: 'Peça sumiu, comprou em dobro. O sistema controla entrada/saída e inventário e avisa o que falta.' },
              { title: 'Financeiro na cabeça', desc: 'Contas espalhadas, DRE nem existia. O sistema organiza caixa, contas e gera DRE e fluxo de caixa.' },
              { title: 'Cliente ligando o tempo todo', desc: '"Ficou pronto?" O sistema envia link pro cliente acompanhar o status da OS sem você parar pra atender.' },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                whileHover={{ y: -6, transition: { duration: 0.2 } }}
                className="p-5 rounded-xl bg-white/5 border border-white/10 hover:border-[#00ff88]/40 transition-colors"
              >
                <h3 className="font-bold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-slate-500">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* O que o sistema tem (recursos reais) – 3ª dobra */}
      <section className="min-h-screen flex flex-col justify-center py-24 px-4 bg-black">
        <div className="max-w-6xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-3xl sm:text-4xl font-extrabold text-center mb-4"
          >
            O que o sistema oferece: <span className="text-[#00ff88]">o que mais importa</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-center text-slate-500 mb-16 max-w-2xl mx-auto"
          >
            OS, estoque, financeiro com DRE e fluxo de caixa, clientes, PDV com cupom, relatórios e painel de alertas no WhatsApp no horário que você definir. Tudo integrado.
          </motion.p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: '📋', title: 'Ordens de serviço', items: ['Abertura com checklist de entrada e defeitos', 'Acompanhamento em tempo real pelo cliente (link)', 'Status personalizáveis e impressão de OS/termica'] },
              { icon: '📦', title: 'Estoque e produtos', items: ['Cadastro de peças, marcas e modelos', 'Controle de entrada/saída e inventário', 'Integrado ao PDV e às OS'] },
              { icon: '💰', title: 'Financeiro completo', items: ['Caixa, contas a pagar e a receber', 'DRE, fluxo de caixa e planejamento anual', 'Categorias e transações organizadas'] },
              { icon: '👥', title: 'Clientes', items: ['Cadastro único com histórico de serviços', 'Filtros e busca rápida', 'Pronto para atendimento profissional'] },
              { icon: '🧾', title: 'PDV e cupom', items: ['Venda com cupom e impressão', 'Múltiplas formas de pagamento e carteiras', 'Devoluções e configuração de cupom'] },
              { icon: '📊', title: 'Relatórios e alertas', items: ['Relatórios de vendas e tendências', 'Painel de alertas: WhatsApp no horário que você definir', 'Notificações: OS aberta, caixa fechado, contas a pagar'] },
              { icon: '🔗', title: 'Integrações', items: ['API para agentes de IA e automação', 'WhatsApp e Telegram configuráveis', 'Tokens de acesso e logs de uso'] },
            ].map((block, i) => (
              <motion.div
                key={block.title}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ delay: (i % 6) * 0.08, duration: 0.5 }}
                whileHover={{ y: -6, borderColor: 'rgba(0,255,136,0.4)', transition: { duration: 0.2 } }}
                className="p-6 rounded-2xl bg-[#141414] border border-white/10 hover:border-[#00ff88]/30 transition-colors"
              >
                <div className="text-2xl mb-3">{block.icon}</div>
                <h3 className="text-lg font-bold text-white mb-3">{block.title}</h3>
                <ul className="space-y-1.5 text-sm text-slate-400">
                  {block.items.map((li) => (
                    <li key={li} className="flex items-start gap-2">
                      <span className="text-[#00ff88] mt-0.5">•</span>
                      {li}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final – 4ª dobra */}
      <section className="min-h-screen flex flex-col justify-center py-24 px-4 bg-gradient-to-b from-black to-[#0d1f0d] border-t border-white/5">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl mx-auto text-center"
        >
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">
            Quer o mesmo na sua?
          </h2>
          <p className="text-slate-500 mb-10 text-lg">
            Fale no WhatsApp. Sem compromisso — mostramos o sistema e o que ele faz na prática.
          </p>
          <motion.a
            href={`${CTA_WHATSAPP}?text=${encodeURIComponent(CTA_MSG)}`}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.04, boxShadow: '0 0 40px rgba(0,255,136,0.2)' }}
            whileTap={{ scale: 0.98 }}
            className="inline-flex items-center justify-center gap-3 px-10 py-4 rounded-full font-bold text-lg text-[#00ff88] border-2 border-[#00ff88]/60 bg-[#00ff88]/5 hover:bg-[#00ff88]/15 hover:border-[#00ff88] transition-all duration-200 backdrop-blur-sm shadow-[0_0_30px_rgba(0,255,136,0.08)]"
          >
            <MessageCircle className="w-6 h-6" />
            Quero organizar minha assistência
          </motion.a>
        </motion.div>
      </section>

      {/* Footer – 5ª dobra */}
      <footer className="py-12 px-6 border-t border-white/5 bg-black/50">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-6">
            <p className="text-slate-500 text-sm order-2 sm:order-1">
              Ativa FIX – Sistema feito por quem vive assistência, com o que mais importa no dia a dia.
            </p>
            <a
              href={`${CTA_WHATSAPP}?text=${encodeURIComponent(CTA_MSG)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm text-[#00ff88] border border-[#00ff88]/50 bg-[#00ff88]/5 hover:bg-[#00ff88]/10 transition-all order-1 sm:order-2"
            >
              <MessageCircle className="w-4 h-4" />
              Quero organizar minha assistência
            </a>
          </div>
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-6 gap-y-2 text-sm">
<a href={`${APP_URL}/termos-de-uso`} target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-[#00ff88] transition-colors">
                  Termos de Uso
                </a>
                <a href={`${APP_URL}/politica-de-privacidade`} target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-[#00ff88] transition-colors">
                  Política de Privacidade
                </a>
            <a href={APP_URL} target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-[#00ff88] transition-colors">
              Acessar o Sistema
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
