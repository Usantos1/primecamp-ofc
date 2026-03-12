import { useState, useEffect } from 'react';
import { Sparkles, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CTA_WHATSAPP, CTA_MSG } from '@/pages/landing/constants';
import { DEMO_SESSION_KEY } from '@/utils/demoMode';

const DEMO_TIMER_SECONDS = 60;

export function DemoBanner() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(DEMO_TIMER_SECONDS);
  const [showPostTimerModal, setShowPostTimerModal] = useState(false);

  useEffect(() => {
    try {
      // Só exibe para quem entrou pela página /demo (sessionStorage definido apenas lá)
      setVisible(sessionStorage.getItem(DEMO_SESSION_KEY) === '1');
    } catch {
      setVisible(false);
    }
  }, []);

  useEffect(() => {
    if (!visible || dismissed || showPostTimerModal) return;
    if (secondsLeft <= 0) {
      setShowPostTimerModal(true);
      return;
    }
    const t = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [visible, dismissed, secondsLeft, showPostTimerModal]);

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

  // Nunca exibir para quem não está em sessão de demonstração
  if (!visible || dismissed) return null;

  const m = Math.floor(secondsLeft / 60);
  const s = secondsLeft % 60;
  const timerText = `${m}:${s.toString().padStart(2, '0')}`;

  return (
    <>
      <div className="bg-[#00F7A5]/15 border-b border-[#00F7A5]/30 text-[#0B0F0D] flex flex-wrap items-center justify-center gap-x-4 gap-y-2 py-2.5 px-4 text-sm font-medium shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 shrink-0 text-[#00C27F]" />
          <span>
            Você está na <strong>demonstração</strong>. Os dados são de exemplo. Para usar com seus dados, faça cadastro ou login.
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-center">
            <span className="text-[10px] uppercase tracking-wider text-[#0B0F0D]/80">Tempo restante</span>
            <span className="font-mono font-bold tabular-nums text-base bg-[#00F7A5]/25 rounded-lg px-2.5 py-1 border border-[#00F7A5]/40">
              {timerText}
            </span>
          </div>
          <span className="text-xs text-[#0B0F0D]/90">
            Após 1 minuto um aviso será exibido.
          </span>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="p-1.5 rounded-lg hover:bg-[#00F7A5]/20 transition-colors ml-1"
          aria-label="Ocultar aviso"
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
