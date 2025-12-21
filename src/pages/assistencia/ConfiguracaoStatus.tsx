import { useState, useRef } from 'react';
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
import { Save, Edit, X, Plus, Trash2, Upload, Image as ImageIcon, AlertTriangle, CheckSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useOSImageReference } from '@/hooks/useOSImageReference';
import { useAuth } from '@/contexts/AuthContext';
import { useChecklistConfig } from '@/hooks/useChecklistConfig';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function ConfiguracaoStatusPage() {
  const { configuracoes, updateConfig, createConfig, deleteConfig } = useConfiguracaoStatus();
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const { imageUrl, uploading, uploadImage, deleteImage } = useOSImageReference();
  const { itemsEntrada, itemsSaida, createItem, updateItem, deleteItem, isLoading: isLoadingChecklist } = useChecklistConfig();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState<ConfiguracaoStatus | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deleting, setDeleting] = useState<ConfiguracaoStatus | null>(null);
  const [editingChecklist, setEditingChecklist] = useState<{ id?: string; tipo: 'entrada' | 'saida'; item_id: string; nome: string; categoria: 'fisico' | 'funcional'; ordem: number; ativo: boolean } | null>(null);
  const [isCreatingChecklist, setIsCreatingChecklist] = useState(false);
  const [deletingChecklist, setDeletingChecklist] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    status: '' as string,
    label: '',
    cor: 'bg-blue-500',
    notificar_whatsapp: false,
    mensagem_whatsapp: '',
    ordem: 0,
    ativo: true,
  });
  const [checklistForm, setChecklistForm] = useState({
    tipo: 'entrada' as 'entrada' | 'saida',
    item_id: '',
    nome: '',
    categoria: 'fisico' as 'fisico' | 'funcional',
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

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      await uploadImage(file);
      toast({
        title: 'Imagem enviada com sucesso!',
        description: 'A imagem de referência foi atualizada.',
      });
    } catch (error: any) {
      let errorMessage = error.message || 'Não foi possível fazer upload da imagem.';
      
      // Se for erro de bucket não encontrado, dar instruções detalhadas
      if (error.code === 'BUCKET_NOT_FOUND' || error.message?.includes('bucket')) {
        errorMessage = 'Bucket de armazenamento não encontrado. ' +
          'Acesse o Supabase Dashboard > Storage e crie o bucket "os-reference-images" como público.';
      }
      
      toast({
        title: 'Erro ao enviar imagem',
        description: errorMessage,
        variant: 'destructive',
        duration: 8000, // Mostrar por mais tempo para ler as instruções
      });
    } finally {
      // Limpar input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteImage = async () => {
    try {
      await deleteImage();
      toast({
        title: 'Imagem removida',
        description: 'A imagem de referência foi removida.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao remover imagem',
        description: error.message || 'Não foi possível remover a imagem.',
        variant: 'destructive',
      });
    }
  };

  const handleCreateChecklist = () => {
    setIsCreatingChecklist(true);
    setEditingChecklist(null);
    setChecklistForm({
      tipo: 'entrada',
      item_id: '',
      nome: '',
      categoria: 'fisico',
      ordem: itemsEntrada.length + 1,
      ativo: true,
    });
  };

  const handleEditChecklist = (item: any) => {
    setEditingChecklist(item);
    setIsCreatingChecklist(false);
    setChecklistForm({
      tipo: item.tipo,
      item_id: item.item_id,
      nome: item.nome,
      categoria: item.categoria,
      ordem: item.ordem,
      ativo: item.ativo,
    });
  };

  const handleSaveChecklist = async () => {
    if (!checklistForm.nome.trim() || (!checklistForm.item_id.trim() && isCreatingChecklist)) {
      toast({ 
        title: 'Campos obrigatórios', 
        description: 'Preencha o nome e o ID do item.',
        variant: 'destructive' 
      });
      return;
    }

    try {
      if (isCreatingChecklist) {
        await createItem.mutateAsync(checklistForm);
        toast({ title: 'Item de checklist criado com sucesso' });
        setIsCreatingChecklist(false);
        setChecklistForm({
          tipo: 'entrada',
          item_id: '',
          nome: '',
          categoria: 'fisico',
          ordem: 0,
          ativo: true,
        });
      } else if (editingChecklist) {
        await updateItem.mutateAsync({ id: editingChecklist.id!, ...checklistForm });
        toast({ title: 'Item de checklist atualizado com sucesso' });
        setEditingChecklist(null);
      }
    } catch (error: any) {
      toast({ 
        title: 'Erro ao salvar item', 
        description: error.message || 'Não foi possível salvar o item.',
        variant: 'destructive' 
      });
    }
  };

  const handleDeleteChecklist = async () => {
    if (!deletingChecklist) return;
    
    try {
      await deleteItem.mutateAsync(deletingChecklist);
      toast({ title: 'Item removido com sucesso' });
      setDeletingChecklist(null);
    } catch (error: any) {
      toast({ 
        title: 'Erro ao remover item', 
        description: error.message || 'Não foi possível remover o item.',
        variant: 'destructive' 
      });
    }
  };

  return (
    <ModernLayout 
      title="Configuração de Status de OS" 
      subtitle="Gerencie as configurações e mensagens para cada status de ordem de serviço"
    >
      <Tabs defaultValue="status" className="space-y-6">
        <TabsList>
          <TabsTrigger value="status">Status de OS</TabsTrigger>
          <TabsTrigger value="checklist">Checklist Personalizado</TabsTrigger>
          <TabsTrigger value="imagem">Imagem de Referência</TabsTrigger>
        </TabsList>

        <TabsContent value="status" className="space-y-6">
          <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Imagem de Referência do Aparelho
          </CardTitle>
          <CardDescription>
            Configure uma imagem única (frente e verso) que será exibida como referência visual em todas as OS
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {imageUrl ? (
            <div className="space-y-3">
              <div className="flex items-center justify-center bg-muted/20 rounded-lg border border-dashed border-muted-foreground/20 p-4">
                <img
                  src={imageUrl}
                  alt="Referência visual do aparelho (frente e verso)"
                  className="max-w-full max-h-64 w-auto h-auto object-contain"
                  style={{ maxWidth: '100%', maxHeight: '256px' }}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || !isAdmin}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploading ? 'Enviando...' : 'Substituir Imagem'}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDeleteImage}
                  disabled={uploading || !isAdmin}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remover
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-col items-center justify-center bg-muted/20 rounded-lg border border-dashed border-muted-foreground/20 p-8 text-center">
                <AlertTriangle className="h-12 w-12 mb-3 text-muted-foreground opacity-50" />
                <p className="text-sm text-muted-foreground mb-2">
                  Nenhuma imagem de referência configurada
                </p>
                <p className="text-xs text-muted-foreground">
                  Faça upload de uma imagem PNG ou JPG (máx. 2MB) contendo frente e verso do aparelho
                </p>
              </div>
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || !isAdmin}
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploading ? 'Enviando...' : 'Fazer Upload da Imagem'}
              </Button>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg"
            onChange={handleImageUpload}
            className="hidden"
          />
          {!isAdmin && (
            <p className="text-xs text-muted-foreground">
              Apenas administradores podem fazer upload de imagens
            </p>
          )}
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-1">
              ⚠️ Configuração Necessária
            </p>
            <p className="text-xs text-blue-800 dark:text-blue-200 mb-2">
              Antes de fazer upload, certifique-se de que o bucket <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">os-reference-images</code> existe no Supabase Storage.
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              <strong>Como criar:</strong> Acesse Supabase Dashboard → Storage → New Bucket → Nome: <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">os-reference-images</code> → Público: Sim
            </p>
          </div>
        </CardContent>
      </Card>

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
        </TabsContent>

        <TabsContent value="checklist" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CheckSquare className="h-5 w-5" />
                    Checklist Personalizado de Entrada e Saída
                  </CardTitle>
                  <CardDescription>
                    Configure os itens do checklist que serão usados nas OS. O checklist de entrada é gerado automaticamente ao salvar a OS.
                  </CardDescription>
                </div>
                <Button onClick={handleCreateChecklist} disabled={!isAdmin}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Item
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="entrada" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="entrada">Checklist de Entrada</TabsTrigger>
                  <TabsTrigger value="saida">Checklist de Saída</TabsTrigger>
                </TabsList>

                <TabsContent value="entrada" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-destructive">Problemas Encontrados (Físico)</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-[400px]">
                          <div className="space-y-2 pr-4">
                            {isLoadingChecklist ? (
                              <div className="text-sm text-muted-foreground">Carregando...</div>
                            ) : itemsEntrada.filter(i => i.categoria === 'fisico').length === 0 ? (
                              <div className="text-sm text-muted-foreground">Nenhum item configurado</div>
                            ) : (
                              itemsEntrada
                                .filter(i => i.categoria === 'fisico')
                                .sort((a, b) => a.ordem - b.ordem)
                                .map(item => (
                                  <div key={item.id} className="flex items-center justify-between p-2 rounded hover:bg-muted/50">
                                    <div className="flex items-center gap-2 flex-1">
                                      <Checkbox checked={item.ativo} disabled />
                                      <span className="text-sm">{item.nome}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleEditChecklist(item)}
                                        disabled={!isAdmin}
                                      >
                                        <Edit className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setDeletingChecklist(item.id)}
                                        disabled={!isAdmin}
                                        className="text-destructive hover:text-destructive"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                ))
                            )}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-green-600">Funcional OK</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-[400px]">
                          <div className="space-y-2 pr-4">
                            {isLoadingChecklist ? (
                              <div className="text-sm text-muted-foreground">Carregando...</div>
                            ) : itemsEntrada.filter(i => i.categoria === 'funcional').length === 0 ? (
                              <div className="text-sm text-muted-foreground">Nenhum item configurado</div>
                            ) : (
                              itemsEntrada
                                .filter(i => i.categoria === 'funcional')
                                .sort((a, b) => a.ordem - b.ordem)
                                .map(item => (
                                  <div key={item.id} className="flex items-center justify-between p-2 rounded hover:bg-muted/50">
                                    <div className="flex items-center gap-2 flex-1">
                                      <Checkbox checked={item.ativo} disabled />
                                      <span className="text-sm">{item.nome}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleEditChecklist(item)}
                                        disabled={!isAdmin}
                                      >
                                        <Edit className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setDeletingChecklist(item.id)}
                                        disabled={!isAdmin}
                                        className="text-destructive hover:text-destructive"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                ))
                            )}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="saida" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-destructive">Problemas Encontrados (Físico)</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-[400px]">
                          <div className="space-y-2 pr-4">
                            {isLoadingChecklist ? (
                              <div className="text-sm text-muted-foreground">Carregando...</div>
                            ) : itemsSaida.filter(i => i.categoria === 'fisico').length === 0 ? (
                              <div className="text-sm text-muted-foreground">Nenhum item configurado</div>
                            ) : (
                              itemsSaida
                                .filter(i => i.categoria === 'fisico')
                                .sort((a, b) => a.ordem - b.ordem)
                                .map(item => (
                                  <div key={item.id} className="flex items-center justify-between p-2 rounded hover:bg-muted/50">
                                    <div className="flex items-center gap-2 flex-1">
                                      <Checkbox checked={item.ativo} disabled />
                                      <span className="text-sm">{item.nome}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleEditChecklist(item)}
                                        disabled={!isAdmin}
                                      >
                                        <Edit className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setDeletingChecklist(item.id)}
                                        disabled={!isAdmin}
                                        className="text-destructive hover:text-destructive"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                ))
                            )}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-green-600">Funcional OK</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-[400px]">
                          <div className="space-y-2 pr-4">
                            {isLoadingChecklist ? (
                              <div className="text-sm text-muted-foreground">Carregando...</div>
                            ) : itemsSaida.filter(i => i.categoria === 'funcional').length === 0 ? (
                              <div className="text-sm text-muted-foreground">Nenhum item configurado</div>
                            ) : (
                              itemsSaida
                                .filter(i => i.categoria === 'funcional')
                                .sort((a, b) => a.ordem - b.ordem)
                                .map(item => (
                                  <div key={item.id} className="flex items-center justify-between p-2 rounded hover:bg-muted/50">
                                    <div className="flex items-center gap-2 flex-1">
                                      <Checkbox checked={item.ativo} disabled />
                                      <span className="text-sm">{item.nome}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleEditChecklist(item)}
                                        disabled={!isAdmin}
                                      >
                                        <Edit className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setDeletingChecklist(item.id)}
                                        disabled={!isAdmin}
                                        className="text-destructive hover:text-destructive"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                ))
                            )}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="imagem" className="space-y-6">
          {/* Seção: Imagem de Referência do Aparelho */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Imagem de Referência do Aparelho
              </CardTitle>
              <CardDescription>
                Configure uma imagem única (frente e verso) que será exibida como referência visual em todas as OS
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {imageUrl ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-center bg-muted/20 rounded-lg border border-dashed border-muted-foreground/20 p-4">
                    <img
                      src={imageUrl}
                      alt="Referência visual do aparelho (frente e verso)"
                      className="max-w-full max-h-64 w-auto h-auto object-contain"
                      style={{ maxWidth: '100%', maxHeight: '256px' }}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading || !isAdmin}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {uploading ? 'Enviando...' : 'Substituir Imagem'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleDeleteImage}
                      disabled={uploading || !isAdmin}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remover
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-col items-center justify-center bg-muted/20 rounded-lg border border-dashed border-muted-foreground/20 p-8 text-center">
                    <AlertTriangle className="h-12 w-12 mb-3 text-muted-foreground opacity-50" />
                    <p className="text-sm text-muted-foreground mb-2">
                      Nenhuma imagem de referência configurada
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Faça upload de uma imagem PNG ou JPG (máx. 2MB) contendo frente e verso do aparelho
                    </p>
                  </div>
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading || !isAdmin}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {uploading ? 'Enviando...' : 'Fazer Upload da Imagem'}
                  </Button>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                onChange={handleImageUpload}
                className="hidden"
              />
              {!isAdmin && (
                <p className="text-xs text-muted-foreground">
                  Apenas administradores podem fazer upload de imagens
                </p>
              )}
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-1">
                  ⚠️ Configuração Necessária
                </p>
                <p className="text-xs text-blue-800 dark:text-blue-200 mb-2">
                  Antes de fazer upload, certifique-se de que o bucket <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">os-reference-images</code> existe no Supabase Storage.
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  <strong>Como criar:</strong> Acesse Supabase Dashboard → Storage → New Bucket → Nome: <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">os-reference-images</code> → Público: Sim
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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

      {/* Dialog de Checklist */}
      <Dialog open={!!editingChecklist || isCreatingChecklist} onOpenChange={(open) => {
        if (!open) {
          setEditingChecklist(null);
          setIsCreatingChecklist(false);
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{isCreatingChecklist ? 'Criar Novo Item de Checklist' : 'Editar Item de Checklist'}</DialogTitle>
            <DialogDescription>
              {isCreatingChecklist 
                ? 'Crie um novo item para o checklist de entrada ou saída'
                : `Edite o item: ${editingChecklist?.nome}`}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select
                  value={checklistForm.tipo}
                  onValueChange={(v: 'entrada' | 'saida') => setChecklistForm(prev => ({ ...prev, tipo: v }))}
                  disabled={!!editingChecklist}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entrada">Entrada</SelectItem>
                    <SelectItem value="saida">Saída</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Categoria *</Label>
                <Select
                  value={checklistForm.categoria}
                  onValueChange={(v: 'fisico' | 'funcional') => setChecklistForm(prev => ({ ...prev, categoria: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fisico">Físico (Problemas)</SelectItem>
                    <SelectItem value="funcional">Funcional (OK)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {isCreatingChecklist && (
              <div className="space-y-2">
                <Label>ID do Item *</Label>
                <Input
                  value={checklistForm.item_id}
                  onChange={(e) => setChecklistForm(prev => ({ ...prev, item_id: e.target.value.toLowerCase().replace(/\s+/g, '_') }))}
                  placeholder="tela_trincada (sem espaços, use _)"
                />
                <p className="text-xs text-muted-foreground">
                  ID único do item (ex: tela_trincada, touch_ok). Use apenas letras, números e _.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Nome do Item *</Label>
              <Input
                value={checklistForm.nome}
                onChange={(e) => setChecklistForm(prev => ({ ...prev, nome: e.target.value }))}
                placeholder="Tela Trincada"
              />
            </div>

            <div className="space-y-2">
              <Label>Ordem</Label>
              <Input
                type="number"
                value={checklistForm.ordem}
                onChange={(e) => setChecklistForm(prev => ({ ...prev, ordem: parseInt(e.target.value) || 0 }))}
                placeholder="Ordem de exibição"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Item Ativo</Label>
                <p className="text-xs text-muted-foreground">
                  Se inativo, o item não aparecerá no checklist
                </p>
              </div>
              <Switch
                checked={checklistForm.ativo}
                onCheckedChange={(checked) => setChecklistForm(prev => ({ ...prev, ativo: checked }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setEditingChecklist(null);
              setIsCreatingChecklist(false);
            }}>
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={handleSaveChecklist} disabled={createItem.isPending || updateItem.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {isCreatingChecklist ? 'Criar' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingChecklist} onOpenChange={(open) => !open && setDeletingChecklist(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este item do checklist? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteChecklist} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ModernLayout>
  );
}

