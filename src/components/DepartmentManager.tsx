import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('name');

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
      const { data: userData } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('departments')
        .insert({
          name: newDept.name.trim(),
          description: newDept.description.trim() || null,
          created_by: userData.user?.id
        });

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
      const { error } = await supabase
        .from('departments')
        .update(updates)
        .eq('id', id);

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
      const { data: usersInDept } = await supabase
        .from('profiles')
        .select('id')
        .eq('department', name);

      if (usersInDept && usersInDept.length > 0) {
        toast({
          title: "Erro",
          description: `Não é possível excluir o departamento "${name}" pois existem ${usersInDept.length} usuário(s) vinculado(s) a ele.`,
          variant: "destructive"
        });
        return;
      }

      const { error } = await supabase
        .from('departments')
        .delete()
        .eq('id', id);

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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Gerenciar Departamentos
          </CardTitle>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Novo Departamento
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Novo Departamento</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    value={newDept.name}
                    onChange={(e) => setNewDept({ ...newDept, name: e.target.value })}
                    placeholder="Nome do departamento"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={newDept.description}
                    onChange={(e) => setNewDept({ ...newDept, description: e.target.value })}
                    placeholder="Descrição do departamento (opcional)"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={createDepartment}>
                    <Plus className="h-4 w-4 mr-2" />
                    Criar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {departments.map((dept) => (
              <TableRow key={dept.id}>
                <TableCell>
                  {editingDept?.id === dept.id ? (
                    <Input
                      value={editingDept.name}
                      onChange={(e) => setEditingDept({ ...editingDept, name: e.target.value })}
                      className="w-40"
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      {dept.name}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {editingDept?.id === dept.id ? (
                    <Textarea
                      value={editingDept.description || ''}
                      onChange={(e) => setEditingDept({ ...editingDept, description: e.target.value })}
                      className="w-60"
                    />
                  ) : (
                    <span className="text-muted-foreground">{dept.description || 'Sem descrição'}</span>
                  )}
                </TableCell>
                <TableCell>
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
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingDept(null)}
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
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir o departamento "{dept.name}"? 
                                Esta ação não pode ser desfeita e só é possível se não houver usuários vinculados.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => deleteDepartment(dept.id, dept.name)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
        {departments.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum departamento encontrado. Clique em "Novo Departamento" para começar.
          </div>
        )}
      </CardContent>
    </Card>
  );
};