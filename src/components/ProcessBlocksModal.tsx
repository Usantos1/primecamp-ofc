import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Play, Circle, Square, Diamond, CheckCircle, Bell } from 'lucide-react';

interface ProcessBlocksModalProps {
  onAddNode: (event: React.MouseEvent, type: string, label: string) => void;
  trigger?: React.ReactNode;
}

export const ProcessBlocksModal = ({ onAddNode, trigger }: ProcessBlocksModalProps) => {
  const [open, setOpen] = useState(false);

  const processBlocks = [
    {
      type: 'input',
      label: 'Início',
      description: 'Início do processo',
      icon: Play,
      color: '#22c55e',
      bgColor: 'bg-green-500',
    },
    {
      type: 'default',
      label: 'Tarefa',
      description: 'Tarefa do processo',
      icon: CheckCircle,
      color: '#3b82f6',
      bgColor: 'bg-blue-500',
    },
    {
      type: 'default',
      label: 'Decisão',
      description: 'Ponto de decisão com múltiplas saídas',
      icon: Diamond,
      color: '#eab308',
      bgColor: 'bg-yellow-500',
    },
    {
      type: 'default',
      label: 'Validação',
      description: 'Etapa de validação',
      icon: Circle,
      color: '#8b5cf6',
      bgColor: 'bg-purple-500',
    },
    {
      type: 'default',
      label: 'Notificação',
      description: 'Envio de notificação',
      icon: Bell,
      color: '#f97316',
      bgColor: 'bg-orange-500',
    },
    {
      type: 'output',
      label: 'Finalização',
      description: 'Conclusão do processo',
      icon: Square,
      color: '#ef4444',
      bgColor: 'bg-red-500',
    },
  ];

  const handleDragStart = (event: React.DragEvent, blockType: string, blockLabel: string, color?: string) => {
    event.dataTransfer.setData('application/reactflow/type', blockType);
    event.dataTransfer.setData('application/reactflow/label', blockLabel);
    event.dataTransfer.setData('application/reactflow/color', color || '#6366f1');
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleBlockClick = (event: React.MouseEvent, type: string, label: string) => {
    onAddNode(event, type, label);
    setOpen(false);
  };

  const handleDragEnd = () => {
    // Auto-close modal after successful drag
    setTimeout(() => setOpen(false), 100);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4" />
            Blocos
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            Blocos de Processo
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Arraste e solte ou clique para adicionar blocos ao fluxo
          </p>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 mt-4">
          {processBlocks.map((block, index) => {
            const IconComponent = block.icon;
            return (
                <div
                  key={index}
                  className="border rounded-lg p-4 cursor-move hover:bg-muted/50 hover:shadow-md hover:scale-[1.02] transition-all duration-200 active:scale-95"
                  draggable={true}
                  onDragStart={(e) => handleDragStart(e, block.type, block.label, block.color)}
                  onDragEnd={handleDragEnd}
                  onClick={(e) => handleBlockClick(e, block.type, block.label)}
                >
                  <div className="flex items-start gap-3">
                    <div 
                      className={`p-2 rounded-lg ${block.bgColor} flex-shrink-0`}
                      style={{ backgroundColor: block.color }}
                    >
                      <IconComponent className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm">{block.label}</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {block.description}
                      </p>
                    </div>
                  </div>
                </div>
            );
          })}
        </div>

        <div className="mt-4 p-3 bg-muted rounded-lg">
          <h4 className="font-medium text-sm mb-2">Como usar:</h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• <strong>Arraste</strong> um bloco para o local desejado no fluxo</li>
            <li>• <strong>Clique</strong> em um bloco para adicioná-lo automaticamente</li>
            <li>• <strong>Duplo clique</strong> nos blocos no fluxo para editar propriedades</li>
            <li>• <strong>Conecte</strong> os blocos arrastando dos pontos de conexão</li>
            <li>• <strong>Delete/Backspace</strong> para remover linhas selecionadas</li>
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
};