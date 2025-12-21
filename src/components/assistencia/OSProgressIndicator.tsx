import { CheckCircle2, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OSProgressIndicatorProps {
  etapas: {
    id: string;
    label: string;
    concluida: boolean;
  }[];
}

export function OSProgressIndicator({ etapas }: OSProgressIndicatorProps) {
  const totalEtapas = etapas.length;
  const etapasConcluidas = etapas.filter(e => e.concluida).length;
  const percentual = totalEtapas > 0 ? (etapasConcluidas / totalEtapas) * 100 : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Progresso da OS</span>
        <span className="font-medium">{etapasConcluidas} de {totalEtapas} etapas concluídas</span>
      </div>
      <div className="flex items-center gap-2">
        {etapas.map((etapa, index) => (
          <div key={etapa.id} className="flex items-center gap-1 flex-1">
            <div className="flex items-center gap-1.5 flex-1">
              {etapa.concluida ? (
                <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              )}
              <span className={cn(
                "text-xs truncate",
                etapa.concluida ? "text-green-600 font-medium" : "text-muted-foreground"
              )}>
                {etapa.label}
              </span>
            </div>
            {index < etapas.length - 1 && (
              <div className={cn(
                "h-0.5 flex-1",
                etapa.concluida ? "bg-green-600" : "bg-muted"
              )} />
            )}
          </div>
        ))}
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className="h-full bg-green-600 transition-all duration-300"
          style={{ width: `${percentual}%` }}
        />
      </div>
    </div>
  );
}

