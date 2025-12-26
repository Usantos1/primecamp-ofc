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
import { Marca, Modelo } from '@/types/assistencia';
import { EmptyState } from '@/components/EmptyState';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { LoadingButton } from '@/components/LoadingButton';

export default function MarcasModelos() {
  const { marcas, createMarca, updateMarca, deleteMarca, isLoading: isLoadingMarcas } = useMarcasSupabase();
  const { modelos, createModelo, updateModelo, deleteModelo, isLoading: isLoadingModelos } = useModelosSupabase();
  
  // Log para debug
  useEffect(() => {
    console.log('[MarcasModelos] Marcas carregadas:', marcas.length);
    console.log('[MarcasModelos] Modelos carregados:', modelos.length);
  }, [marcas.length, modelos.length]);
  
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
      <div className="space-y-4 md:space-y-6 px-1 md:px-0">
        {/* Cards de resumo */}
        <div className="grid grid-cols-2 gap-3 md:gap-4">
          <Card className="border-2 border-gray-300 border-l-4 border-l-blue-500 shadow-sm bg-blue-50/50 md:bg-transparent">
            <CardContent className="p-3 md:pt-4">
              <div className="flex items-center gap-2 text-blue-700 md:text-muted-foreground text-[10px] md:text-sm mb-1">
                <Tag className="h-3 w-3 md:h-4 md:w-4" />
                Total de Marcas
              </div>
              <p className="text-base md:text-2xl font-bold text-blue-700 md:text-foreground">{marcas.length}</p>
            </CardContent>
          </Card>
          <Card className="border-2 border-gray-300 border-l-4 border-l-purple-500 shadow-sm bg-purple-50/50 md:bg-transparent">
            <CardContent className="p-3 md:pt-4">
              <div className="flex items-center gap-2 text-purple-700 md:text-muted-foreground text-[10px] md:text-sm mb-1">
                <Smartphone className="h-3 w-3 md:h-4 md:w-4" />
                Total de Modelos
              </div>
              <p className="text-base md:text-2xl font-bold text-purple-700 md:text-foreground">{modelos.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Card principal com tabs */}
        <Card className="border-2 border-gray-300 shadow-sm">
          <CardContent className="p-3 md:pt-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4 mb-4 md:mb-6 pb-3 md:pb-0 border-b-2 md:border-b-0 border-gray-200">
                <TabsList className="grid grid-cols-2 w-full md:w-auto border-2 border-gray-300 bg-gray-50 h-auto">
                  <TabsTrigger 
                    value="marcas" 
                    className="flex items-center justify-center gap-2 text-xs md:text-sm py-2.5 md:py-3 px-2 md:px-4 border-r-2 border-gray-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white"
                  >
                    <Tag className="h-3 w-3 md:h-4 md:w-4" />
                    Marcas
                  </TabsTrigger>
                  <TabsTrigger 
                    value="modelos" 
                    className="flex items-center justify-center gap-2 text-xs md:text-sm py-2.5 md:py-3 px-2 md:px-4 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white"
                  >
                    <Smartphone className="h-3 w-3 md:h-4 md:w-4" />
                    Modelos
                  </TabsTrigger>
                </TabsList>
                
                <div className="flex gap-2">
                  <div className="relative flex-1 min-w-[150px] md:min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 h-9 md:h-10 text-base md:text-sm border-2 border-gray-300"
                    />
                  </div>
                  <Button 
                    onClick={() => activeTab === 'marcas' ? handleOpenMarcaDialog() : handleOpenModeloDialog()}
                    className="h-9 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white border-0 shadow-md"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    <span className="hidden md:inline">{activeTab === 'marcas' ? 'Nova Marca' : 'Novo Modelo'}</span>
                    <span className="md:hidden">{activeTab === 'marcas' ? 'Nova' : 'Novo'}</span>
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
                  <div className="border-2 border-gray-300 rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="text-xs md:text-sm font-semibold">Marca</TableHead>
                          <TableHead className="text-center text-xs md:text-sm font-semibold">Modelos</TableHead>
                          <TableHead className="text-xs md:text-sm font-semibold">Status</TableHead>
                          <TableHead className="text-right text-xs md:text-sm font-semibold">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredMarcas.map((marca, idx) => (
                          <TableRow 
                            key={marca.id} 
                            className={`cursor-pointer hover:bg-blue-50/50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`} 
                            onClick={() => { setSelectedMarcaId(marca.id); setActiveTab('modelos'); }}
                          >
                            <TableCell className="font-medium text-xs md:text-sm">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 md:w-8 md:h-8 rounded bg-gradient-to-br from-blue-100 to-indigo-100 border-2 border-gray-200 flex items-center justify-center text-blue-700 font-bold text-xs md:text-sm">
                                  {marca.nome.charAt(0)}
                                </div>
                                <span className="line-clamp-1">{marca.nome}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="secondary" className="text-[10px] md:text-xs border-2 border-gray-300">
                                {modelosPorMarca[marca.id] || 0} modelos
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={marca.situacao === 'ativo' ? 'default' : 'outline'}
                                className={`text-[10px] md:text-xs border-2 ${marca.situacao === 'ativo' ? 'bg-green-500 text-white border-green-600' : 'border-gray-300'}`}
                              >
                                {marca.situacao === 'ativo' ? 'Ativo' : 'Inativo'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 border-2 border-gray-300 hover:bg-blue-50" 
                                  onClick={(e) => { e.stopPropagation(); handleOpenMarcaDialog(marca); }}
                                >
                                  <Edit className="h-3 w-3 md:h-4 md:w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 border-2 border-red-300 text-red-600 hover:bg-red-50" 
                                  onClick={(e) => { e.stopPropagation(); setDeletingMarcaId(marca.id); setDeleteMarcaDialog(true); }}
                                >
                                  <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
                                </Button>
                                <ChevronRight className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
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
                    <SelectTrigger className="w-full md:w-[200px] h-9 md:h-10 text-base md:text-sm border-2 border-gray-300">
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
                  <div className="border-2 border-gray-300 rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="text-xs md:text-sm font-semibold">Modelo</TableHead>
                          <TableHead className="text-xs md:text-sm font-semibold">Marca</TableHead>
                          <TableHead className="text-xs md:text-sm font-semibold">Status</TableHead>
                          <TableHead className="text-right text-xs md:text-sm font-semibold">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredModelos.map((modelo, idx) => (
                          <TableRow key={modelo.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                            <TableCell className="font-medium text-xs md:text-sm">{modelo.nome}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-[10px] md:text-xs border-2 border-gray-300">
                                {getMarcaNome(modelo.marca_id)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={modelo.situacao === 'ativo' ? 'default' : 'outline'}
                                className={`text-[10px] md:text-xs border-2 ${modelo.situacao === 'ativo' ? 'bg-green-500 text-white border-green-600' : 'border-gray-300'}`}
                              >
                                {modelo.situacao === 'ativo' ? 'Ativo' : 'Inativo'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 border-2 border-gray-300 hover:bg-purple-50" 
                                  onClick={() => handleOpenModeloDialog(modelo)}
                                >
                                  <Edit className="h-3 w-3 md:h-4 md:w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 border-2 border-red-300 text-red-600 hover:bg-red-50" 
                                  onClick={() => { setDeletingModeloId(modelo.id); setDeleteModeloDialog(true); }}
                                >
                                  <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
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
        <DialogContent className="max-w-sm max-w-[95vw] p-3 md:p-6">
          <DialogHeader>
            <DialogTitle className="text-base md:text-lg">{editingMarca ? 'Editar Marca' : 'Nova Marca'}</DialogTitle>
            <DialogDescription className="text-xs md:text-sm">Cadastre uma marca de celular</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 md:space-y-4">
            <div className="space-y-2">
              <Label className="text-xs md:text-sm">Nome da Marca *</Label>
              <Input 
                value={marcaNome} 
                onChange={(e) => setMarcaNome(e.target.value)} 
                placeholder="Ex: Samsung, Apple, Motorola..."
                className="h-9 md:h-10 text-base md:text-sm border-2 border-gray-300"
              />
            </div>
          </div>
          <DialogFooter className="flex-col md:flex-row gap-2 mt-4">
            <Button 
              variant="outline" 
              onClick={() => setMarcaDialog(false)}
              className="w-full md:w-auto h-9 border-2 border-gray-300"
            >
              Cancelar
            </Button>
            <LoadingButton 
              onClick={handleSaveMarca} 
              loading={isSaving}
              className="w-full md:w-auto h-9 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white border-0"
            >
              {editingMarca ? 'Atualizar' : 'Cadastrar'}
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Modelo */}
      <Dialog open={modeloDialog} onOpenChange={setModeloDialog}>
        <DialogContent className="max-w-sm max-w-[95vw] p-3 md:p-6">
          <DialogHeader>
            <DialogTitle className="text-base md:text-lg">{editingModelo ? 'Editar Modelo' : 'Novo Modelo'}</DialogTitle>
            <DialogDescription className="text-xs md:text-sm">Cadastre um modelo de celular</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 md:space-y-4">
            <div className="space-y-2">
              <Label className="text-xs md:text-sm">Marca *</Label>
              <Select value={modeloMarcaId} onValueChange={setModeloMarcaId}>
                <SelectTrigger className="h-9 md:h-10 text-base md:text-sm border-2 border-gray-300">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {marcas.map(m => (<SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs md:text-sm">Nome do Modelo *</Label>
              <Input 
                value={modeloNome} 
                onChange={(e) => setModeloNome(e.target.value)} 
                placeholder="Ex: iPhone 15, Galaxy S24, Moto G84..."
                className="h-9 md:h-10 text-base md:text-sm border-2 border-gray-300"
              />
            </div>
          </div>
          <DialogFooter className="flex-col md:flex-row gap-2 mt-4">
            <Button 
              variant="outline" 
              onClick={() => setModeloDialog(false)}
              className="w-full md:w-auto h-9 border-2 border-gray-300"
            >
              Cancelar
            </Button>
            <LoadingButton 
              onClick={handleSaveModelo} 
              loading={isSaving}
              className="w-full md:w-auto h-9 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0"
            >
              {editingModelo ? 'Atualizar' : 'Cadastrar'}
            </LoadingButton>
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







