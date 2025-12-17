import { useState } from 'react';
import { ModernLayout } from '@/components/ModernLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useConfiguracaoStatus } from '@/hooks/useAssistencia';
import { ConfiguracaoStatus, STATUS_OS_LABELS, StatusOS } from '@/types/assistencia';
import { Save, Edit, X, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export default function ConfiguracaoStatusPage() {
  const { configuracoes, updateConfig, createConfig, deleteConfig } = useConfiguracaoStatus();
  const { toast } = useToast();
  const [editing, setEditing] = useState<ConfiguracaoStatus | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deleting, setDeleting] = useState<ConfiguracaoStatus | null>(null);
  const [editForm, setEditForm] = useState({
    status: '' as string,
    label: '',
    cor: 'bg-blue-500',
    notificar_whatsapp: false,
    mensagem_whatsapp: '',
    ordem: 0,
    ativo: true,
  });

  const handleCreate = () => {
    setIsCreating(true);
    setEditing(null);
    setEditForm({
      status: '',
      label: '',
      cor: 'bg-blue-500',
      notificar_whatsapp: false,
      mensagem_whatsapp: '',
      ordem: configuracoes.length + 1,
      ativo: true,
    });
  };

  const handleEdit = (config: ConfiguracaoStatus) => {
    setEditing(config);
    setIsCreating(false);
    setEditForm({
      status: config.status,
      label: config.label,
      cor: config.cor,
      notificar_whatsapp: config.notificar_whatsapp,
      mensagem_whatsapp: config.mensagem_whatsapp || '',
      ordem: config.ordem,
      ativo: config.ativo,
    });
  };

  const handleSave = () => {
    if (!editForm.label.trim()) {
      toast({ 
        title: 'Label obrigatório', 
        description: 'Informe o nome do status.',
        variant: 'destructive' 
      });
      return;
    }

    if (isCreating) {
      if (!editForm.status.trim()) {
        toast({ 
          title: 'Código do status obrigatório', 
          description: 'Informe o código único do status (ex: novo_status).',
          variant: 'destructive' 
        });
        return;
      }

      // Verificar se já existe status com o mesmo código
      if (configuracoes.some(c => c.status === editForm.status)) {
        toast({ 
          title: 'Status já existe', 
          description: 'Já existe um status com este código.',
          variant: 'destructive' 
        });
        return;
      }

      createConfig({
        status: editForm.status as StatusOS,
        label: editForm.label,
        cor: editForm.cor,
        notificar_whatsapp: editForm.notificar_whatsapp,
        mensagem_whatsapp: editForm.mensagem_whatsapp || undefined,
        ordem: editForm.ordem,
        ativo: editForm.ativo,
      });
      toast({ title: 'Status criado com sucesso' });
      setIsCreating(false);
    } else if (editing) {
      updateConfig(editing.id, {
        label: editForm.label,
        cor: editForm.cor,
        notificar_whatsapp: editForm.notificar_whatsapp,
        mensagem_whatsapp: editForm.mensagem_whatsapp || undefined,
        ordem: editForm.ordem,
        ativo: editForm.ativo,
      });
      toast({ title: 'Configuração atualizada com sucesso' });
      setEditing(null);
    }
  };

  const handleDelete = () => {
    if (!deleting) return;
    
    deleteConfig(deleting.id);
    toast({ title: 'Status removido com sucesso' });
    setDeleting(null);
  };

  const getStatusLabel = (status: StatusOS | string) => {
    if (status in STATUS_OS_LABELS) {
      return STATUS_OS_LABELS[status as StatusOS];
    }
    return status;
  };

  return (
    <ModernLayout 
      title="Configuração de Status de OS" 
      subtitle="Gerencie as configurações e mensagens para cada status de ordem de serviço"
    >
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Status de Ordem de Serviço</CardTitle>
              <CardDescription>
                Configure as mensagens do WhatsApp e outras opções para cada status
              </CardDescription>
            </div>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Status
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Ordem</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Cor</TableHead>
                <TableHead>Notificar WhatsApp</TableHead>
                <TableHead>Mensagem</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...configuracoes].sort((a, b) => a.ordem - b.ordem).map((config) => (
                <TableRow key={config.id}>
                  <TableCell className="text-center font-medium">{config.ordem}</TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-2 py-1 rounded">{config.status}</code>
                  </TableCell>
                  <TableCell className="font-medium">
                    <Badge className={config.cor}>{config.label}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded ${config.cor}`} />
                      <span className="text-xs text-muted-foreground">{config.cor}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {config.notificar_whatsapp ? (
                      <Badge variant="outline" className="text-green-600">Sim</Badge>
                    ) : (
                      <Badge variant="outline" className="text-gray-500">Não</Badge>
                    )}
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {config.mensagem_whatsapp || '-'}
                  </TableCell>
                  <TableCell>
                    {config.ativo ? (
                      <Badge variant="outline" className="text-green-600">Ativo</Badge>
                    ) : (
                      <Badge variant="outline" className="text-gray-500">Inativo</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(config)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleting(config)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!editing || isCreating} onOpenChange={(open) => {
        if (!open) {
          setEditing(null);
          setIsCreating(false);
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{isCreating ? 'Criar Novo Status' : 'Editar Configuração'}</DialogTitle>
            <DialogDescription>
              {isCreating 
                ? 'Crie um novo status para ordem de serviço'
                : `Configure as opções para o status: ${editing && getStatusLabel(editing.status)}`}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {isCreating ? (
              <div className="space-y-2">
                <Label>Código do Status *</Label>
                <Input
                  value={editForm.status}
                  onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value.toLowerCase().replace(/\s+/g, '_') }))}
                  placeholder="novo_status (sem espaços, use _)"
                />
                <p className="text-xs text-muted-foreground">
                  Código único do status (ex: aguardando_peca, em_revisao). Use apenas letras, números e _.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Código do Status</Label>
                <Input
                  value={editForm.status}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  O código do status não pode ser alterado após a criação.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Label *</Label>
              <Input
                value={editForm.label}
                onChange={(e) => setEditForm(prev => ({ ...prev, label: e.target.value }))}
                placeholder="Nome do status"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ordem</Label>
                <Input
                  type="number"
                  value={editForm.ordem}
                  onChange={(e) => setEditForm(prev => ({ ...prev, ordem: parseInt(e.target.value) || 0 }))}
                  placeholder="Ordem de exibição"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Cor (classe Tailwind)</Label>
              <Input
                value={editForm.cor}
                onChange={(e) => setEditForm(prev => ({ ...prev, cor: e.target.value }))}
                placeholder="bg-blue-500"
              />
              <p className="text-xs text-muted-foreground">
                Ex: bg-blue-500, bg-green-500, bg-red-500, etc.
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Notificar via WhatsApp</Label>
                <p className="text-xs text-muted-foreground">
                  Enviar mensagem automaticamente quando o status mudar
                </p>
              </div>
              <Switch
                checked={editForm.notificar_whatsapp}
                onCheckedChange={(checked) => setEditForm(prev => ({ ...prev, notificar_whatsapp: checked }))}
              />
            </div>

            {editForm.notificar_whatsapp && (
              <div className="space-y-2">
                <Label>Mensagem do WhatsApp</Label>
                <Textarea
                  value={editForm.mensagem_whatsapp}
                  onChange={(e) => setEditForm(prev => ({ ...prev, mensagem_whatsapp: e.target.value }))}
                  placeholder="Olá {cliente}! Sua OS #{numero} do {marca} {modelo} está {status}."
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  Use {'{cliente}'}, {'{numero}'}, {'{status}'}, {'{marca}'} e {'{modelo}'} como variáveis
                </p>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Status Ativo</Label>
                <p className="text-xs text-muted-foreground">
                  Se inativo, o status não aparecerá nas opções
                </p>
              </div>
              <Switch
                checked={editForm.ativo}
                onCheckedChange={(checked) => setEditForm(prev => ({ ...prev, ativo: checked }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setEditing(null);
              setIsCreating(false);
            }}>
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              {isCreating ? 'Criar' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o status "{deleting?.label}"? 
              Esta ação não pode ser desfeita e pode afetar ordens de serviço que usam este status.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ModernLayout>
  );
}

