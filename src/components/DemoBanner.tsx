import { useState, useEffect } from 'react';
import { Sparkles, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CTA_WHATSAPP, CTA_MSG } from '@/pages/landing/constants';
import { DEMO_SESSION_KEY } from '@/utils/demoMode';

const DEMO_TIMER_SECONDS = 60;

function isInIframe(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function isEmbedded(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return new URLSearchParams(window.location.search).get('embed') === '1';
  } catch {
    return false;
  }
}

export function DemoBanner() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(DEMO_TIMER_SECONDS);
  const [showPostTimerModal, setShowPostTimerModal] = useState(false);
  const inIframe = useState(() => isInIframe())[0];
  const embedded = useState(() => isEmbedded())[0];

  useEffect(() => {
    try {
      if (isInIframe()) {
        setVisible(false);
        return;
      }
      setVisible(sessionStorage.getItem(DEMO_SESSION_KEY) === '1');
    } catch {
      setVisible(false);
    }
  }, []);

  // Interval: decrementa o timer a cada segundo (não passa de 0)
  useEffect(() => {
    if (!visible || dismissed || showPostTimerModal) return;
    if (secondsLeft <= 0) return;
    const t = setInterval(() => {
      setSecondsLeft((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [visible, dismissed, secondsLeft, showPostTimerModal]);

  // Quando o timer chega a 0, abrir o modal (efeito dedicado para garantir que abra)
  useEffect(() => {
    if (visible && !dismissed && secondsLeft <= 0) {
      setShowPostTimerModal(true);
    }
  }, [visible, dismissed, secondsLeft]);

  const handleDismiss = () => {
    setDismissed(true);
  };

  const handleAssinarWhatsApp = () => {
    window.open(`${CTA_WHATSAPP}?text=${encodeURIComponent(CTA_MSG)}`, '_blank', 'noopener,noreferrer');
  };

  const handleTestarMaisUmMinuto = () => {
    setSecondsLeft(DEMO_TIMER_SECONDS);
    setShowPostTimerModal(false);
  };

  // Quando está no iframe da LP (embed=1 ou inIframe), o banner já está na barra do modal — não duplicar
  if (embedded || inIframe) return null;
  if (!visible || dismissed) return null;

  const m = Math.floor(secondsLeft / 60);
  const s = secondsLeft % 60;
  const timerText = `${m}:${s.toString().padStart(2, '0')}`;

  return (
    <>
      {/* Banner no preto fora do sistema (topo da página) */}
      <div className="bg-[#0B0F0D] border-b border-[#00F7A5]/20 text-[#F5F7F6] flex flex-wrap items-center justify-center gap-x-4 gap-y-2 py-2.5 px-4 text-sm font-medium shrink-0">
        <span className="text-center">
          Você está na <strong className="text-[#00F7A5]">demonstração</strong>. Os dados são de exemplo. Para usar com seus dados, faça cadastro ou login.
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider text-[#9AA4A0]">Tempo restante</span>
          <span className="font-mono font-bold tabular-nums text-base bg-[#07110D] text-[#00F7A5] rounded-lg px-2.5 py-1 border border-[#00F7A5]/30">
            {timerText}
          </span>
        </div>
        <Button
          size="sm"
          onClick={handleAssinarWhatsApp}
          className="h-9 rounded-lg font-semibold bg-[#00C27F] hover:bg-[#00a86b] text-[#0B0F0D] shrink-0"
        >
          Assinar Agora
        </Button>
        <button
          type="button"
          onClick={handleDismiss}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-[#F5F7F6]"
          aria-label="Fechar demonstração"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <Dialog open={showPostTimerModal} onOpenChange={setShowPostTimerModal}>
        <DialogContent className="rounded-2xl max-w-sm gap-4">
          <DialogHeader>
            <DialogTitle className="text-lg">Tempo da demonstração</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            O tempo da demonstração acabou. Assine agora ou teste por mais 1 minuto.
          </p>
          <div className="flex flex-col gap-2">
            <Button
              onClick={handleAssinarWhatsApp}
              className="w-full h-12 rounded-xl font-semibold bg-[#00C27F] hover:bg-[#00a86b] text-white"
            >
              Assinar Agora
            </Button>
            <Button
              variant="outline"
              onClick={handleTestarMaisUmMinuto}
              className="w-full h-12 rounded-xl font-semibold border-2"
            >
              Testar por mais 1 minuto
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
