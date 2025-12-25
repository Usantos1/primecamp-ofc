import React, { useState, useEffect } from 'react';
import { from } from '@/integrations/db/client';
import { authAPI } from '@/integrations/auth/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Building2, Save, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';

interface Department {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  created_by: string;
}

export const DepartmentManager = () => {
  const { toast } = useToast();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [newDept, setNewDept] = useState({
    name: '',
    description: ''
  });

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const { data, error } = await from('departments')
        .select('*')
        .order('name', { ascending: true })
        .execute();

      if (error) {
        toast({
          title: "Erro",
          description: "Erro ao carregar departamentos",
          variant: "destructive"
        });
        return;
      }

      setDepartments(data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
    } finally {
      setLoading(false);
    }
  };

  const createDepartment = async () => {
    if (!newDept.name.trim()) {
      toast({
        title: "Erro",
        description: "Nome do departamento é obrigatório",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data: userData } = await authAPI.getUser();
      
      const { data: inserted, error } = await from('departments')
        .insert({
          name: newDept.name.trim(),
          description: newDept.description.trim() || null,
          created_by: userData.data?.user?.id
        })
        .select('*')
        .single();

      if (error) {
        toast({
          title: "Erro",
          description: "Erro ao criar departamento",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Sucesso",
        description: "Departamento criado com sucesso"
      });

      setNewDept({ name: '', description: '' });
      setIsCreateOpen(false);
      fetchDepartments();
    } catch (error) {
      console.error('Error creating department:', error);
    }
  };

  const updateDepartment = async (id: string, updates: Partial<Department>) => {
    try {
      const { error } = await from('departments')
        .update(updates)
        .eq('id', id)
        .execute();

      if (error) {
        toast({
          title: "Erro",
          description: "Erro ao atualizar departamento",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Sucesso",
        description: "Departamento atualizado com sucesso"
      });

      setEditingDept(null);
      fetchDepartments();
    } catch (error) {
      console.error('Error updating department:', error);
    }
  };

  const deleteDepartment = async (id: string, name: string) => {
    try {
      // Check if department is being used by any users
      const { data: usersInDept } = await from('profiles')
        .select('id')
        .eq('department', name)
        .execute();

      if (usersInDept && usersInDept.length > 0) {
        toast({
          title: "Erro",
          description: `Não é possível excluir o departamento "${name}" pois existem ${usersInDept.length} usuário(s) vinculado(s) a ele.`,
          variant: "destructive"
        });
        return;
      }

      const { error } = await from('departments')
        .delete()
        .eq('id', id)
        .execute();

      if (error) {
        toast({
          title: "Erro",
          description: "Erro ao excluir departamento",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Sucesso",
        description: "Departamento excluído com sucesso"
      });

      fetchDepartments();
    } catch (error) {
      console.error('Error deleting department:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Card className="border-2 border-gray-300 shadow-sm">
      <CardHeader className="pb-3 pt-3 md:pt-6 px-3 md:px-6 border-b-2 border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base md:text-xl">
            <div className="p-1.5 md:p-2 rounded-lg bg-gradient-to-br from-green-100 to-white border-2 border-gray-200">
              <Building2 className="h-4 w-4 md:h-5 md:w-5 text-green-600" />
            </div>
            Gerenciar Departamentos
          </CardTitle>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button 
                className="w-full md:w-auto h-9 bg-gradient-to-r from-blue-500 to-green-500 hover:from-blue-600 hover:to-green-600 text-white border-0 shadow-md gap-2"
              >
                <Plus className="h-4 w-4" />
                Novo Departamento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] md:max-w-md p-3 md:p-6">
              <DialogHeader>
                <DialogTitle className="text-base md:text-lg">Criar Novo Departamento</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 md:space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-xs md:text-sm">Nome *</Label>
                  <Input
                    id="name"
                    value={newDept.name}
                    onChange={(e) => setNewDept({ ...newDept, name: e.target.value })}
                    placeholder="Nome do departamento"
                    className="h-9 md:h-10 text-base md:text-sm border-2 border-gray-300"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-xs md:text-sm">Descrição</Label>
                  <Textarea
                    id="description"
                    value={newDept.description}
                    onChange={(e) => setNewDept({ ...newDept, description: e.target.value })}
                    placeholder="Descrição do departamento (opcional)"
                    className="text-base md:text-sm border-2 border-gray-300"
                    rows={3}
                  />
                </div>
                <div className="flex flex-col md:flex-row gap-2 justify-end pt-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsCreateOpen(false)}
                    className="w-full md:w-auto h-9 border-2 border-gray-300"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    onClick={createDepartment}
                    className="w-full md:w-auto h-9 bg-gradient-to-r from-blue-500 to-green-500 hover:from-blue-600 hover:to-green-600 text-white border-0"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Criar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="p-3 md:p-6">
        {departments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm md:text-base">
            Nenhum departamento encontrado. Clique em "Novo Departamento" para começar.
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b-2 border-gray-300">
                    <TableHead className="font-semibold">Nome</TableHead>
                    <TableHead className="font-semibold">Descrição</TableHead>
                    <TableHead className="font-semibold">Criado em</TableHead>
                    <TableHead className="font-semibold">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departments.map((dept) => (
                    <TableRow key={dept.id} className="border-b border-gray-200 hover:bg-gray-50/50">
                      <TableCell>
                        {editingDept?.id === dept.id ? (
                          <Input
                            value={editingDept.name}
                            onChange={(e) => setEditingDept({ ...editingDept, name: e.target.value })}
                            className="w-40 h-9 text-sm border-2 border-gray-300"
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-green-600" />
                            <span className="font-medium">{dept.name}</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingDept?.id === dept.id ? (
                          <Textarea
                            value={editingDept.description || ''}
                            onChange={(e) => setEditingDept({ ...editingDept, description: e.target.value })}
                            className="w-60 text-sm border-2 border-gray-300"
                            rows={2}
                          />
                        ) : (
                          <span className="text-muted-foreground text-sm">{dept.description || 'Sem descrição'}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(dept.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {editingDept?.id === dept.id ? (
                            <>
                              <Button
                                size="sm"
                                onClick={() => updateDepartment(dept.id, {
                                  name: editingDept.name,
                                  description: editingDept.description
                                })}
                                className="h-8 w-8 border-2 border-green-300 bg-green-50 hover:bg-green-100"
                              >
                                <Save className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingDept(null)}
                                className="h-8 w-8 border-2 border-gray-300"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingDept(dept)}
                                className="h-8 w-8 border-2 border-gray-300"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    className="h-8 w-8 border-2 border-red-300 text-red-600 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="max-w-[95vw] md:max-w-md p-3 md:p-6">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle className="text-base md:text-lg">Confirmar Exclusão</AlertDialogTitle>
                                    <AlertDialogDescription className="text-xs md:text-sm">
                                      Tem certeza que deseja excluir o departamento "{dept.name}"? 
                                      Esta ação não pode ser desfeita e só é possível se não houver usuários vinculados.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter className="flex-col md:flex-row gap-2">
                                    <AlertDialogCancel className="w-full md:w-auto h-9 border-2 border-gray-300">Cancelar</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => deleteDepartment(dept.id, dept.name)}
                                      className="w-full md:w-auto h-9 bg-red-600 hover:bg-red-700"
                                    >
                                      Excluir
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {departments.map((dept) => (
                <Card 
                  key={dept.id}
                  className="border-2 border-gray-300 shadow-sm hover:shadow-md active:scale-[0.98] transition-all"
                >
                  <CardContent className="p-3">
                    {editingDept?.id === dept.id ? (
                      <div className="space-y-3">
                        <div>
                          <Label className="text-xs mb-1 block">Nome</Label>
                          <Input
                            value={editingDept.name}
                            onChange={(e) => setEditingDept({ ...editingDept, name: e.target.value })}
                            className="w-full h-9 text-base border-2 border-gray-300"
                          />
                        </div>
                        <div>
                          <Label className="text-xs mb-1 block">Descrição</Label>
                          <Textarea
                            value={editingDept.description || ''}
                            onChange={(e) => setEditingDept({ ...editingDept, description: e.target.value })}
                            className="w-full text-base border-2 border-gray-300"
                            rows={3}
                          />
                        </div>
                        <div className="flex gap-2 pt-2 border-t-2 border-gray-200">
                          <Button
                            size="sm"
                            onClick={() => updateDepartment(dept.id, {
                              name: editingDept.name,
                              description: editingDept.description
                            })}
                            className="flex-1 h-9 bg-gradient-to-r from-green-500 to-blue-500 text-white"
                          >
                            <Save className="h-4 w-4 mr-2" />
                            Salvar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingDept(null)}
                            className="flex-1 h-9 border-2 border-gray-300"
                          >
                            <X className="h-4 w-4 mr-2" />
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div className="p-1.5 rounded-lg bg-green-50 border-2 border-gray-200">
                              <Building2 className="h-4 w-4 text-green-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-sm">{dept.name}</h3>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {dept.description || 'Sem descrição'}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t-2 border-gray-200">
                          <span className="text-[10px] text-muted-foreground">
                            Criado em {new Date(dept.created_at).toLocaleDateString('pt-BR')}
                          </span>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingDept(dept)}
                              className="h-8 w-8 border-2 border-gray-300"
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  className="h-8 w-8 border-2 border-red-300 text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="max-w-[95vw] p-3">
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="text-base">Confirmar Exclusão</AlertDialogTitle>
                                  <AlertDialogDescription className="text-xs">
                                    Tem certeza que deseja excluir o departamento "{dept.name}"? 
                                    Esta ação não pode ser desfeita e só é possível se não houver usuários vinculados.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter className="flex-col gap-2">
                                  <AlertDialogCancel className="w-full h-9 border-2 border-gray-300">Cancelar</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => deleteDepartment(dept.id, dept.name)}
                                    className="w-full h-9 bg-red-600 hover:bg-red-700"
                                  >
                                    Excluir
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};