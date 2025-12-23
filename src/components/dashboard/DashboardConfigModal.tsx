import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useDashboardConfig, DashboardWidgetConfig } from '@/hooks/useDashboardConfig';
import { GripVertical, Settings } from 'lucide-react';
import { useState } from 'react';

interface DashboardConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const WIDGET_LABELS: Record<string, string> = {
  'financial-cards': 'Cards Financeiros',
  'os-status': 'Status de OS',
  'alerts': 'Alertas de Gestão',
  'trend-charts': 'Gráficos de Tendência',
  'quick-actions': 'Ações Rápidas',
  'main-sections': 'Seções Principais',
};

export function DashboardConfigModal({ open, onOpenChange }: DashboardConfigModalProps) {
  const { config, toggleWidget, updateWidgetOrder, togglePresentationMode, saveConfig } = useDashboardConfig();
  const [localWidgets, setLocalWidgets] = useState<DashboardWidgetConfig[]>(config.widgets);

  const handleSave = async () => {
    await saveConfig({ ...config, widgets: localWidgets });
    onOpenChange(false);
  };

  const handleToggleWidget = (widgetId: string) => {
    setLocalWidgets(prev =>
      prev.map(w => (w.id === widgetId ? { ...w, enabled: !w.enabled } : w))
    );
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newWidgets = [...localWidgets];
    [newWidgets[index - 1], newWidgets[index]] = [newWidgets[index], newWidgets[index - 1]];
    setLocalWidgets(newWidgets.map((w, i) => ({ ...w, order: i + 1 })));
  };

  const handleMoveDown = (index: number) => {
    if (index === localWidgets.length - 1) return;
    const newWidgets = [...localWidgets];
    [newWidgets[index], newWidgets[index + 1]] = [newWidgets[index + 1], newWidgets[index]];
    setLocalWidgets(newWidgets.map((w, i) => ({ ...w, order: i + 1 })));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-w-[95vw] p-3 md:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base md:text-lg">
            <Settings className="h-5 w-5" />
            Configurar Dashboard
          </DialogTitle>
          <DialogDescription className="text-xs md:text-sm">
            Ative ou desative widgets e organize a ordem de exibição
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Modo Apresentação */}
          <div className="flex items-center justify-between p-3 border-2 border-gray-300 rounded-lg">
            <div>
              <Label htmlFor="presentation-mode" className="text-sm font-semibold">
                Modo Apresentação (TV)
              </Label>
              <p className="text-xs text-muted-foreground">
                Dashboard otimizado para exibição em TV da loja
              </p>
            </div>
            <Switch
              id="presentation-mode"
              checked={config.presentationMode}
              onCheckedChange={togglePresentationMode}
            />
          </div>

          {/* Lista de Widgets */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Widgets do Dashboard</Label>
            <div className="space-y-2 border-2 border-gray-300 rounded-lg p-3">
              {localWidgets
                .sort((a, b) => a.order - b.order)
                .map((widget, index) => (
                  <div
                    key={widget.id}
                    className="flex items-center justify-between p-3 border-2 border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <GripVertical className="h-5 w-5 text-gray-400" />
                      <Label htmlFor={`widget-${widget.id}`} className="text-sm font-medium cursor-pointer">
                        {WIDGET_LABELS[widget.id] || widget.id}
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleMoveUp(index)}
                          disabled={index === 0}
                        >
                          ↑
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleMoveDown(index)}
                          disabled={index === localWidgets.length - 1}
                        >
                          ↓
                        </Button>
                      </div>
                      <Switch
                        id={`widget-${widget.id}`}
                        checked={widget.enabled}
                        onCheckedChange={() => handleToggleWidget(widget.id)}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1 h-9 border-2 border-gray-300"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            className="flex-1 h-9 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white border-0"
          >
            Salvar Configurações
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

