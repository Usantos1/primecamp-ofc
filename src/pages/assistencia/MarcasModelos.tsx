import { useState, useMemo, useEffect } from 'react';
import { ModernLayout } from '@/components/ModernLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Edit, Trash2, Smartphone, Tag, ChevronRight } from 'lucide-react';
import { useMarcasSupabase, useModelosSupabase } from '@/hooks/useMarcasModelosSupabase';
import { MARCAS_MODELOS_PADRAO } from '@/hooks/useAssistencia';
import { Marca, Modelo } from '@/types/assistencia';
import { EmptyState } from '@/components/EmptyState';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { LoadingButton } from '@/components/LoadingButton';

export default function MarcasModelos() {
  const { marcas, createMarca, updateMarca, deleteMarca } = useMarcasSupabase();
  const { modelos, createModelo, updateModelo, deleteModelo } = useModelosSupabase();
  
  // Popular marcas e modelos padrão se não existirem
  useEffect(() => {
    const popularMarcasModelos = async () => {
      // Popular marcas se não existirem
      if (marcas.length === 0) {
        for (const mp of MARCAS_MODELOS_PADRAO) {
          try {
            await createMarca(mp.marca);
          } catch (error: any) {
            // Ignorar erros de duplicata (marca já existe)
            if (error?.code !== '23505') {
              console.log(`[MarcasModelos] Erro ao criar marca ${mp.marca}:`, error);
            }
          }
        }
      }
      
      // Popular modelos se não existirem (aguardar um pouco para garantir que as marcas foram criadas)
      if (marcas.length > 0 && modelos.length === 0) {
        // Aguardar um pouco para garantir que as marcas foram criadas
        setTimeout(async () => {
          // Buscar marcas atualizadas
          const marcasAtualizadas = marcas;
          
          for (const mp of MARCAS_MODELOS_PADRAO) {
            const marca = marcasAtualizadas.find(m => m.nome === mp.marca);
            if (marca) {
              for (const nomeModelo of mp.modelos) {
                try {
                  const modeloExistente = modelos.find(m => m.nome === nomeModelo && m.marca_id === marca.id);
                  if (!modeloExistente) {
                    await createModelo(marca.id, nomeModelo);
                  }
                } catch (error: any) {
                  // Ignorar erros de duplicata (modelo já existe)
                  if (error?.code !== '23505') {
                    console.log(`[MarcasModelos] Erro ao criar modelo ${nomeModelo}:`, error);
                  }
                }
              }
            }
          }
        }, 2000);
      }
    };

    popularMarcasModelos();
  }, [marcas.length, modelos.length, createMarca, createModelo]); // Executar quando marcas ou modelos mudarem
  
  const [activeTab, setActiveTab] = useState('marcas');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMarcaId, setSelectedMarcaId] = useState<string | null>(null);
  
  // Dialogs de Marca
  const [marcaDialog, setMarcaDialog] = useState(false);
  const [editingMarca, setEditingMarca] = useState<Marca | null>(null);
  const [marcaNome, setMarcaNome] = useState('');
  const [deleteMarcaDialog, setDeleteMarcaDialog] = useState(false);
  const [deletingMarcaId, setDeletingMarcaId] = useState<string | null>(null);
  
  // Dialogs de Modelo
  const [modeloDialog, setModeloDialog] = useState(false);
  const [editingModelo, setEditingModelo] = useState<Modelo | null>(null);
  const [modeloNome, setModeloNome] = useState('');
  const [modeloMarcaId, setModeloMarcaId] = useState('');
  const [deleteModeloDialog, setDeleteModeloDialog] = useState(false);
  const [deletingModeloId, setDeletingModeloId] = useState<string | null>(null);
  
  const [isSaving, setIsSaving] = useState(false);

  // Filtrar marcas
  const filteredMarcas = useMemo(() => {
    if (!searchTerm) return marcas;
    const search = searchTerm.toLowerCase();
    return marcas.filter(m => m.nome.toLowerCase().includes(search));
  }, [marcas, searchTerm]);

  // Filtrar modelos
  const filteredModelos = useMemo(() => {
    let filtered = modelos;
    
    if (selectedMarcaId) {
      filtered = filtered.filter(m => m.marca_id === selectedMarcaId);
    }
    
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(m => m.nome.toLowerCase().includes(search));
    }
    
    return filtered;
  }, [modelos, selectedMarcaId, searchTerm]);

  // Contar modelos por marca
  const modelosPorMarca = useMemo(() => {
    const counts: Record<string, number> = {};
    modelos.forEach(m => {
      counts[m.marca_id] = (counts[m.marca_id] || 0) + 1;
    });
    return counts;
  }, [modelos]);

  // Handlers de Marca
  const handleOpenMarcaDialog = (marca?: Marca) => {
    if (marca) {
      setEditingMarca(marca);
      setMarcaNome(marca.nome);
    } else {
      setEditingMarca(null);
      setMarcaNome('');
    }
    setMarcaDialog(true);
  };

  const handleSaveMarca = async () => {
    if (!marcaNome.trim()) return;
    
    setIsSaving(true);
    try {
      if (editingMarca) {
        await updateMarca(editingMarca.id, { nome: marcaNome });
      } else {
        await createMarca(marcaNome);
      }
      setMarcaDialog(false);
      setMarcaNome('');
      setEditingMarca(null);
    } catch (error) {
      console.error('[handleSaveMarca] Erro:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteMarca = async () => {
    if (deletingMarcaId) {
      try {
        await deleteMarca(deletingMarcaId);
        setDeleteMarcaDialog(false);
        setDeletingMarcaId(null);
      } catch (error) {
        console.error('[handleDeleteMarca] Erro:', error);
      }
    }
  };

  // Handlers de Modelo
  const handleOpenModeloDialog = (modelo?: Modelo) => {
    if (modelo) {
      setEditingModelo(modelo);
      setModeloNome(modelo.nome);
      setModeloMarcaId(modelo.marca_id);
    } else {
      setEditingModelo(null);
      setModeloNome('');
      setModeloMarcaId(selectedMarcaId || '');
    }
    setModeloDialog(true);
  };

  const handleSaveModelo = async () => {
    if (!modeloNome.trim() || !modeloMarcaId) return;
    
    setIsSaving(true);
    try {
      if (editingModelo) {
        await updateModelo(editingModelo.id, { nome: modeloNome, marca_id: modeloMarcaId });
      } else {
        await createModelo(modeloMarcaId, modeloNome);
      }
      setModeloDialog(false);
      setModeloNome('');
      setModeloMarcaId('');
      setEditingModelo(null);
    } catch (error) {
      console.error('[handleSaveModelo] Erro:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteModelo = async () => {
    if (deletingModeloId) {
      try {
        await deleteModelo(deletingModeloId);
        setDeleteModeloDialog(false);
        setDeletingModeloId(null);
      } catch (error) {
        console.error('[handleDeleteModelo] Erro:', error);
      }
    }
  };

  const getMarcaNome = (marcaId: string) => {
    const marca = marcas.find(m => m.id === marcaId);
    return marca?.nome || '-';
  };

  return (
    <ModernLayout title="Marcas e Modelos" subtitle="Gerencie marcas e modelos de celulares">
      <div className="space-y-6">
        {/* Cards de resumo */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <Tag className="h-4 w-4" />
                Total de Marcas
              </div>
              <p className="text-2xl font-bold">{marcas.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <Smartphone className="h-4 w-4" />
                Total de Modelos
              </div>
              <p className="text-2xl font-bold">{modelos.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Card principal com tabs */}
        <Card>
          <CardContent className="pt-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <TabsList>
                  <TabsTrigger value="marcas" className="gap-2">
                    <Tag className="h-4 w-4" />
                    Marcas
                  </TabsTrigger>
                  <TabsTrigger value="modelos" className="gap-2">
                    <Smartphone className="h-4 w-4" />
                    Modelos
                  </TabsTrigger>
                </TabsList>
                
                <div className="flex gap-2">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Button onClick={() => activeTab === 'marcas' ? handleOpenMarcaDialog() : handleOpenModeloDialog()}>
                    <Plus className="h-4 w-4 mr-2" />
                    {activeTab === 'marcas' ? 'Nova Marca' : 'Novo Modelo'}
                  </Button>
                </div>
              </div>

              {/* Tab: Marcas */}
              <TabsContent value="marcas" className="mt-0">
                {filteredMarcas.length === 0 ? (
                  <EmptyState
                    variant="no-data"
                    title="Nenhuma marca cadastrada"
                    description="Cadastre as marcas de celulares."
                    action={{ label: 'Nova Marca', onClick: () => handleOpenMarcaDialog() }}
                  />
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Marca</TableHead>
                          <TableHead className="text-center">Modelos</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredMarcas.map((marca) => (
                          <TableRow key={marca.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setSelectedMarcaId(marca.id); setActiveTab('modelos'); }}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary font-bold">
                                  {marca.nome.charAt(0)}
                                </div>
                                {marca.nome}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="secondary">{modelosPorMarca[marca.id] || 0} modelos</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={marca.situacao === 'ativo' ? 'default' : 'outline'}>
                                {marca.situacao === 'ativo' ? 'Ativo' : 'Inativo'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleOpenMarcaDialog(marca); }}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); setDeletingMarcaId(marca.id); setDeleteMarcaDialog(true); }}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>

              {/* Tab: Modelos */}
              <TabsContent value="modelos" className="mt-0">
                <div className="mb-4">
                  <Select value={selectedMarcaId || 'all'} onValueChange={(v) => setSelectedMarcaId(v === 'all' ? null : v)}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Filtrar por marca" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as Marcas</SelectItem>
                      {marcas.map(m => (<SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>

                {filteredModelos.length === 0 ? (
                  <EmptyState
                    variant="no-data"
                    title="Nenhum modelo encontrado"
                    description={selectedMarcaId ? "Cadastre modelos para esta marca." : "Selecione uma marca ou cadastre um novo modelo."}
                    action={{ label: 'Novo Modelo', onClick: () => handleOpenModeloDialog() }}
                  />
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Modelo</TableHead>
                          <TableHead>Marca</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredModelos.map((modelo) => (
                          <TableRow key={modelo.id}>
                            <TableCell className="font-medium">{modelo.nome}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{getMarcaNome(modelo.marca_id)}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={modelo.situacao === 'ativo' ? 'default' : 'outline'}>
                                {modelo.situacao === 'ativo' ? 'Ativo' : 'Inativo'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenModeloDialog(modelo)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { setDeletingModeloId(modelo.id); setDeleteModeloDialog(true); }}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Dialog de Marca */}
      <Dialog open={marcaDialog} onOpenChange={setMarcaDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingMarca ? 'Editar Marca' : 'Nova Marca'}</DialogTitle>
            <DialogDescription>Cadastre uma marca de celular</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome da Marca *</Label>
              <Input value={marcaNome} onChange={(e) => setMarcaNome(e.target.value)} placeholder="Ex: Samsung, Apple, Motorola..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMarcaDialog(false)}>Cancelar</Button>
            <LoadingButton onClick={handleSaveMarca} loading={isSaving}>{editingMarca ? 'Atualizar' : 'Cadastrar'}</LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Modelo */}
      <Dialog open={modeloDialog} onOpenChange={setModeloDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingModelo ? 'Editar Modelo' : 'Novo Modelo'}</DialogTitle>
            <DialogDescription>Cadastre um modelo de celular</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Marca *</Label>
              <Select value={modeloMarcaId} onValueChange={setModeloMarcaId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {marcas.map(m => (<SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nome do Modelo *</Label>
              <Input value={modeloNome} onChange={(e) => setModeloNome(e.target.value)} placeholder="Ex: iPhone 15, Galaxy S24, Moto G84..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModeloDialog(false)}>Cancelar</Button>
            <LoadingButton onClick={handleSaveModelo} loading={isSaving}>{editingModelo ? 'Atualizar' : 'Cadastrar'}</LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialogs de exclusão */}
      <ConfirmDialog
        open={deleteMarcaDialog}
        onOpenChange={setDeleteMarcaDialog}
        title="Excluir Marca"
        description="Tem certeza que deseja excluir esta marca? Isso também pode afetar os modelos vinculados."
        onConfirm={handleDeleteMarca}
        variant="danger"
      />
      <ConfirmDialog
        open={deleteModeloDialog}
        onOpenChange={setDeleteModeloDialog}
        title="Excluir Modelo"
        description="Tem certeza que deseja excluir este modelo?"
        onConfirm={handleDeleteModelo}
        variant="danger"
      />
    </ModernLayout>
  );
}







