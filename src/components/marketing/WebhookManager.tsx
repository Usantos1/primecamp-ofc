import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Plus, Copy, Trash2, Eye, CheckCircle, XCircle, 
  Webhook, Link, Clock, AlertTriangle, ExternalLink
} from 'lucide-react';
import { useWebhooks, useWebhookLogs, WebhookConfig } from '@/hooks/useWebhooks';
import { dateFormatters } from '@/utils/formatters';
import { LoadingButton } from '@/components/LoadingButton';
import { useToast } from '@/hooks/use-toast';

export function WebhookManager() {
  const { toast } = useToast();
  const { webhooks, isLoading, createWebhook, updateWebhook, deleteWebhook, getWebhookUrl, isCreating, isUpdating } = useWebhooks();
  
  const [showDialog, setShowDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showLogsDialog, setShowLogsDialog] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState<WebhookConfig | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  const [form, setForm] = useState({
    nome: '',
    fonte_padrao: 'ativacrm',
    descricao: '',
  });

  const { logs, isLoading: logsLoading } = useWebhookLogs(selectedWebhook?.id || null);

  const resetForm = () => {
    setForm({ nome: '', fonte_padrao: 'ativacrm', descricao: '' });
    setSelectedWebhook(null);
  };

  const handleOpenDialog = (webhook?: WebhookConfig) => {
    if (webhook) {
      setSelectedWebhook(webhook);
      setForm({
        nome: webhook.nome,
        fonte_padrao: webhook.fonte_padrao,
        descricao: webhook.descricao || '',
      });
    } else {
      resetForm();
    }
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (selectedWebhook) {
      await updateWebhook({ id: selectedWebhook.id, ...form });
    } else {
      await createWebhook(form);
    }
    setShowDialog(false);
    resetForm();
  };

  const handleDelete = async () => {
    if (deletingId) {
      await deleteWebhook(deletingId);
      setShowDeleteDialog(false);
      setDeletingId(null);
    }
  };

  const handleToggleActive = async (webhook: WebhookConfig) => {
    await updateWebhook({ id: webhook.id, is_active: !webhook.is_active });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'URL copiada!' });
  };

  const handleViewLogs = (webhook: WebhookConfig) => {
    setSelectedWebhook(webhook);
    setShowLogsDialog(true);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Webhook className="h-5 w-5 text-primary" />
          <span className="font-medium">Webhooks Configurados</span>
          <Badge variant="secondary" className="text-xs">{webhooks.length}</Badge>
        </div>
        <Button onClick={() => handleOpenDialog()} size="sm" className="h-8">
          <Plus className="h-4 w-4 mr-1" />Novo Webhook
        </Button>
      </div>

      {/* Lista de Webhooks */}
      {webhooks.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Webhook className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">Nenhum webhook configurado</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Crie um webhook para receber leads automaticamente do AtivaCRM ou outras fontes.
            </p>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-1" />Criar Webhook
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {webhooks.map((webhook) => (
            <Card key={webhook.id} className={!webhook.is_active ? 'opacity-60' : ''}>
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium truncate">{webhook.nome}</h4>
                      <Badge variant={webhook.is_active ? 'default' : 'secondary'} className="text-[10px]">
                        {webhook.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                    
                    {webhook.descricao && (
                      <p className="text-xs text-muted-foreground mb-2">{webhook.descricao}</p>
                    )}
                    
                    {/* URL do Webhook */}
                    <div className="flex items-center gap-2 bg-muted/50 p-2 rounded-lg">
                      <Link className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <code className="text-[10px] md:text-xs text-muted-foreground truncate flex-1">
                        {getWebhookUrl(webhook.webhook_key)}
                      </code>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 shrink-0"
                        onClick={() => copyToClipboard(getWebhookUrl(webhook.webhook_key))}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    
                    {/* Stats */}
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        {webhook.leads_recebidos || 0} leads
                      </span>
                      {webhook.ultimo_lead_em && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Último: {dateFormatters.short(webhook.ultimo_lead_em)}
                        </span>
                      )}
                      <span>Fonte: {webhook.fonte_padrao}</span>
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch 
                      checked={webhook.is_active} 
                      onCheckedChange={() => handleToggleActive(webhook)}
                    />
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleViewLogs(webhook)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenDialog(webhook)}>
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8" 
                      onClick={() => { setDeletingId(webhook.id); setShowDeleteDialog(true); }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Info de integração */}
      <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200">
        <CardContent className="p-4">
          <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Como integrar com AtivaCRM</h4>
          <ol className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-decimal list-inside">
            <li>Crie um webhook acima e copie a URL</li>
            <li>No AtivaCRM, vá em Configurações → Webhooks</li>
            <li>Cole a URL e configure os campos a serem enviados</li>
            <li>Teste enviando um lead e verifique os logs</li>
          </ol>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
            Campos suportados: nome, email, telefone, whatsapp, cidade, estado, interesse, utm_source, utm_medium, utm_campaign, utm_term, mensagem
          </p>
        </CardContent>
      </Card>

      {/* Dialog de criação/edição */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedWebhook ? 'Editar Webhook' : 'Novo Webhook'}</DialogTitle>
            <DialogDescription>
              Configure um webhook para receber leads automaticamente
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label>Nome do Webhook *</Label>
              <Input
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder="Ex: AtivaCRM - Campanhas Google"
              />
            </div>
            
            <div>
              <Label>Fonte Padrão</Label>
              <Input
                value={form.fonte_padrao}
                onChange={(e) => setForm({ ...form, fonte_padrao: e.target.value })}
                placeholder="Ex: ativacrm, google_ads, meta_ads"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Usado quando o payload não especificar a fonte
              </p>
            </div>
            
            <div>
              <Label>Descrição</Label>
              <Textarea
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                placeholder="Descrição opcional do webhook..."
                rows={2}
              />
            </div>

            {selectedWebhook && (
              <div className="bg-muted/50 p-3 rounded-lg">
                <Label className="text-xs">URL do Webhook</Label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-xs flex-1 truncate">
                    {getWebhookUrl(selectedWebhook.webhook_key)}
                  </code>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => copyToClipboard(getWebhookUrl(selectedWebhook.webhook_key))}
                  >
                    <Copy className="h-3 w-3 mr-1" />Copiar
                  </Button>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <LoadingButton loading={isCreating || isUpdating} onClick={handleSave} disabled={!form.nome}>
              {selectedWebhook ? 'Salvar' : 'Criar Webhook'}
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de logs */}
      <Dialog open={showLogsDialog} onOpenChange={setShowLogsDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Logs - {selectedWebhook?.nome}</DialogTitle>
            <DialogDescription>
              Últimos leads e eventos recebidos por este webhook
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="h-[400px]">
            {logsLoading ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : logs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum log registrado ainda
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Detalhes</TableHead>
                    <TableHead>IP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs">
                        {dateFormatters.short(log.created_at)}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={log.tipo === 'lead_recebido' ? 'default' : log.tipo === 'erro' ? 'destructive' : 'secondary'}
                          className="text-[10px]"
                        >
                          {log.tipo === 'lead_recebido' ? 'Lead' : log.tipo === 'erro' ? 'Erro' : 'Teste'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs max-w-[200px] truncate">
                        {log.erro || (log.payload?.nome || log.payload?.name) || '-'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {log.ip_origem || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Webhook?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todos os logs serão excluídos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

