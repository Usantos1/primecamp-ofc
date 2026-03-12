import { MessageCircle } from 'lucide-react';
import { CTA_WHATSAPP, CTA_MSG, APP_URL } from './constants';

export function LandingFooter() {
  return (
    <footer className="py-14 md:py-16 px-4 md:px-8 border-t border-[#00F7A5]/10 bg-[#030504]">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-10">
          <img
            src="/logo-ativafix.png"
            alt="Ativa FIX"
            className="h-9 md:h-10 w-auto opacity-95"
          />
          <a
            href={`${CTA_WHATSAPP}?text=${encodeURIComponent(CTA_MSG)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="landing-btn landing-btn-primary inline-flex items-center gap-2 px-6 py-3 font-semibold text-sm border border-[#00F7A5]/40"
          >
            <MessageCircle className="w-4 h-4" />
            Falar no WhatsApp
          </a>
        </div>
        <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-8 gap-y-3 text-sm">
          <a
            href={`${APP_URL}/termos-de-uso`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#6D7873] hover:text-[#00F7A5] transition-colors"
          >
            Termos de Uso
          </a>
          <a
            href={`${APP_URL}/politica-de-privacidade`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#6D7873] hover:text-[#00F7A5] transition-colors"
          >
            Política de Privacidade
          </a>
          <a
            href={APP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#6D7873] hover:text-[#00F7A5] transition-colors"
          >
            Acessar sistema
          </a>
        </div>
      </div>
    </footer>
  );
}
