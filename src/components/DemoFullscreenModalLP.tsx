import { X } from 'lucide-react';
import { APP_URL } from '@/pages/landing/constants';

interface DemoFullscreenModalLPProps {
  open: boolean;
  onClose: () => void;
  onAssinar: () => void;
}

const DEMO_IFRAME_URL = `${APP_URL}/demo?auto=1`;

export function DemoFullscreenModalLP({ open, onClose }: DemoFullscreenModalLPProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#030504]">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#00F7A5]/20 bg-[#0B0F0D] shrink-0">
        <span className="text-sm font-medium text-[#F5F7F6]">Demonstração — um clique para experimentar</span>
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-xl hover:bg-white/10 transition-colors text-[#F5F7F6]"
          aria-label="Fechar demonstração"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <iframe
        src={DEMO_IFRAME_URL}
        title="Ativa FIX Demonstração"
        className="flex-1 w-full min-h-0 border-0"
        allow="fullscreen"
      />
    </div>
  );
}
