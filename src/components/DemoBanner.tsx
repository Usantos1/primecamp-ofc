import { useState, useEffect } from 'react';
import { Sparkles, X } from 'lucide-react';

const STORAGE_KEY = 'ativafix_demo_session';

export function DemoBanner() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      setVisible(sessionStorage.getItem(STORAGE_KEY) === '1');
    } catch {
      setVisible(false);
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
  };

  if (!visible || dismissed) return null;

  return (
    <div className="bg-[#00F7A5]/15 border-b border-[#00F7A5]/30 text-[#0B0F0D] flex items-center justify-center gap-2 py-2 px-4 text-sm font-medium shrink-0">
      <Sparkles className="w-4 h-4 shrink-0 text-[#00C27F]" />
      <span>
        Você está na <strong>demonstração</strong>. Os dados são de exemplo. Para usar com seus dados, faça cadastro ou login.
      </span>
      <button
        type="button"
        onClick={handleDismiss}
        className="p-1 rounded hover:bg-[#00F7A5]/20 transition-colors ml-1"
        aria-label="Ocultar aviso"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
