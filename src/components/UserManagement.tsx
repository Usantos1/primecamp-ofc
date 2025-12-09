import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Check, X, UserPlus, Mail, Calendar, Shield, User, Trash2, Edit } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useDepartments } from '@/hooks/useDepartments';
import { DepartmentManager } from '@/components/DepartmentManager';
import { TeamPermissionsManager } from '@/components/TeamPermissionsManager';
import { UserEditModal } from '@/components/UserEditModal';

interface UserProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  role: 'admin' | 'member';
  department: string | null;
  approved: boolean;
  approved_at: string | null;
  created_at: string;
  email?: string;
  phone?: string | null;
}

export const UserManagement = () => {
  const { toast } = useToast();
  const { departments } = useDepartments();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    display_name: '',
    department: '',
    role: 'member' as 'admin' | 'member'
  });
  const [newDepartment, setNewDepartment] = useState('');
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        toast({
          title: "Erro",
          description: "Erro ao carregar usuários",
          variant: "destructive"
        });
        return;
      }

      setUsers((data as UserProfile[]) || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const approveUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          approved: true,
          approved_at: new Date().toISOString(),
          approved_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('user_id', userId);

      if (error) {
        toast({
          title: "Erro",
          description: "Erro ao aprovar usuário",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Sucesso",
        description: "Usuário aprovado com sucesso",
      });

      fetchUsers();
    } catch (error) {
      console.error('Error approving user:', error);
    }
  };

  const rejectUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          approved: false,
          approved_at: null,
          approved_by: null
        })
        .eq('user_id', userId);

      if (error) {
        toast({
          title: "Erro",
          description: "Erro ao rejeitar usuário",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Usuário rejeitado",
        description: "Acesso removido do usuário",
        variant: "default"
      });

      fetchUsers();
    } catch (error) {
      console.error('Error rejecting user:', error);
    }
  };

  const updateUserRole = async (userId: string, role: 'admin' | 'member') => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role })
        .eq('user_id', userId);

      if (error) {
        toast({
          title: "Erro",
          description: "Erro ao atualizar role do usuário",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Sucesso",
        description: "Role do usuário atualizada",
      });

      fetchUsers();
    } catch (error) {
      console.error('Error updating user role:', error);
    }
  };

  const updateUserDepartment = async (userId: string, department: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ department })
        .eq('user_id', userId);

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
        description: "Departamento atualizado",
      });

      fetchUsers();
    } catch (error) {
      console.error('Error updating user department:', error);
    }
  };

  const deleteUser = async (userId: string, displayName: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user?.id === userId) {
        toast({
          title: "Erro",
          description: "Você não pode excluir sua própria conta",
          variant: "destructive"
        });
        return;
      }

      // Delete user using edge function (handles both profile and auth deletion)
      const { data: result, error: deleteError } = await supabase.functions.invoke('admin-delete-user', {
        body: { userId }
      });

      if (deleteError) {
        console.error('Delete error:', deleteError);
        toast({
          title: "Erro",
          description: deleteError.message || "Erro ao excluir usuário",
          variant: "destructive"
        });
        return;
      }

      if (result?.success) {
        if (result.warning) {
          toast({
            title: "Aviso",
            description: result.message || "Usuário excluído parcialmente",
            variant: "default"
          });
        } else {
          toast({
            title: "Sucesso",
            description: `Usuário ${displayName} excluído permanentemente`,
          });
        }
      } else {
        toast({
          title: "Erro",
          description: result?.error || "Erro ao excluir usuário",
          variant: "destructive"
        });
        return;
      }

      fetchUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir usuário",
        variant: "destructive"
      });
    }
  };

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let finalDepartment = newUser.department;
    
    // If user typed a new department, create it first
    if (newDepartment.trim()) {
      try {
        const { data: userData } = await supabase.auth.getUser();
        const { data: deptData, error: deptError } = await supabase
          .from('departments')
          .insert({
            name: newDepartment.trim(),
            created_by: userData.user?.id
          })
          .select()
          .single();

        if (deptError) {
          toast({
            title: "Erro",
            description: "Erro ao criar novo departamento",
            variant: "destructive"
          });
          return;
        }
        
        finalDepartment = newDepartment.trim();
        setNewDepartment('');
      } catch (error) {
        console.error('Error creating department:', error);
        return;
      }
    }
    
    if (!newUser.email || !newUser.password || !newUser.display_name || !finalDepartment) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    try {
      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
        options: {
          data: {
            display_name: newUser.display_name
          }
        }
      });

      if (authError) {
        toast({
          title: "Erro",
          description: authError.message,
          variant: "destructive"
        });
        return;
      }

      if (authData.user) {
        // Update profile with additional data
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            display_name: newUser.display_name,
            department: finalDepartment,
            role: newUser.role,
            approved: true, // Auto-approve users created by admin
            approved_at: new Date().toISOString(),
            approved_by: (await supabase.auth.getUser()).data.user?.id
          })
          .eq('user_id', authData.user.id);

        if (profileError) {
          console.error('Error updating profile:', profileError);
        }
      }

      toast({
        title: "Sucesso",
        description: "Usuário criado e aprovado automaticamente",
      });

      setNewUser({
        email: '',
        password: '',
        display_name: '',
        department: '',
        role: 'member'
      });

      fetchUsers();
    } catch (error) {
      console.error('Error creating user:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar usuário",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const pendingUsers = users.filter(user => !user.approved);
  const approvedUsers = users.filter(user => user.approved);

  return (
    <div className="space-y-6">
      {/* Department Management */}
      <DepartmentManager />

      {/* Team Permissions Management */}
      <TeamPermissionsManager />

      {/* Create New User */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Adicionar Novo Membro
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={createUser} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  placeholder="email@empresa.com"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="display_name">Nome Completo *</Label>
                <Input
                  id="display_name"
                  value={newUser.display_name}
                  onChange={(e) => setNewUser({...newUser, display_name: e.target.value})}
                  placeholder="Nome do usuário"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha Temporária *</Label>
                <Input
                  id="password"
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  placeholder="Senha inicial"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">Departamento *</Label>
                <Select value={newUser.department} onValueChange={(value) => setNewUser({...newUser, department: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o departamento" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.name}>{dept.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex gap-2 items-center">
                  <span className="text-sm text-muted-foreground">ou</span>
                  <Input
                    placeholder="Criar novo departamento"
                    value={newDepartment}
                    onChange={(e) => setNewDepartment(e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Função</Label>
                <Select value={newUser.role} onValueChange={(value: 'admin' | 'member') => setNewUser({...newUser, role: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Membro</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button type="submit" className="w-full">
              <UserPlus className="h-4 w-4 mr-2" />
              Criar Usuário
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Pending Approvals */}
      {pendingUsers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Usuários Pendentes de Aprovação ({pendingUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Data de Registro</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {user.display_name || 'Sem nome'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {new Date(user.created_at).toLocaleDateString('pt-BR')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="default"
                          onClick={() => approveUser(user.user_id)}
                        >
                          <Check className="h-4 w-4" />
                          Aprovar
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => rejectUser(user.user_id)}
                        >
                          <X className="h-4 w-4" />
                          Rejeitar
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setEditingUser(user);
                            setIsEditModalOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                          Editar
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="destructive">
                              <Trash2 className="h-4 w-4" />
                              Excluir
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar Exclusão Permanente</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir permanentemente o usuário "{user.display_name || 'Sem nome'}"? 
                                Esta ação não pode ser desfeita e removerá todos os dados do usuário do sistema.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => deleteUser(user.user_id, user.display_name || 'Usuário')}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Excluir Permanentemente
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Approved Users */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Usuários Aprovados ({approvedUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Departamento</TableHead>
                <TableHead>Função</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {approvedUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {user.display_name || 'Sem nome'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select 
                      value={user.department || ''} 
                      onValueChange={(value) => updateUserDepartment(user.user_id, value)}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Departamento" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((dept) => (
                          <SelectItem key={dept.id} value={dept.name}>{dept.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select 
                      value={user.role} 
                      onValueChange={(value: 'admin' | 'member') => updateUserRole(user.user_id, value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member">Membro</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.approved ? 'default' : 'secondary'}>
                      {user.approved ? 'Aprovado' : 'Pendente'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setEditingUser(user);
                          setIsEditModalOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                        Editar
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => rejectUser(user.user_id)}
                      >
                        <X className="h-4 w-4" />
                        Remover Acesso
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="destructive">
                            <Trash2 className="h-4 w-4" />
                            Excluir
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirmar Exclusão Permanente</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja excluir permanentemente o usuário "{user.display_name || 'Sem nome'}"? 
                              Esta ação não pode ser desfeita e removerá todos os dados do usuário do sistema.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => deleteUser(user.user_id, user.display_name || 'Usuário')}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Excluir Permanentemente
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <UserEditModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingUser(null);
        }}
        user={editingUser}
        onSuccess={() => {
          fetchUsers();
          setEditingUser(null);
          setIsEditModalOpen(false);
        }}
      />
    </div>
  );
};