import { useState, useEffect } from 'react';
import { from } from '@/integrations/db/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Shield, Users } from 'lucide-react';

interface Role {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

interface Permission {
  id: string;
  resource: string;
  action: string;
  description: string;
  category: string;
}

export function RolesManager() {
  const { toast } = useToast();
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolesPermissionsMap, setRolesPermissionsMap] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [rolePermissions, setRolePermissions] = useState<Map<string, boolean>>(new Map());
  const [formData, setFormData] = useState({
    name: '',
    display_name: '',
    description: '',
  });
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Carregar roles
      const { data: rolesData, error: rolesError } = await from('roles')
        .select('*')
        .order('display_name', { ascending: true })
        .execute();

      if (rolesError) throw rolesError;
      setRoles(rolesData || []);

      // Carregar permissões
      const { data: permsData, error: permsError } = await from('permissions')
        .select('*')
        .order('category', { ascending: true })
        .execute();

      if (permsError) throw permsError;
      setPermissions(permsData || []);

      // Carregar contagem de permissões por role
      const { data: rolePermsData } = await from('role_permissions')
        .select('role_id')
        .execute();

      if (rolePermsData) {
        const countMap = new Map<string, number>();
        rolePermsData.forEach((rp: any) => {
          countMap.set(rp.role_id, (countMap.get(rp.role_id) || 0) + 1);
        });
        setRolesPermissionsMap(countMap);
      }

      // Se estiver editando, carregar permissões do role
      if (editingRole) {
        await loadRolePermissions(editingRole.id);
      }
    } catch (error: any) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar roles e permissões',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadRolePermissions = async (roleId: string) => {
    try {
      const { data, error } = await from('role_permissions')
        .select('permission_id')
        .eq('role_id', roleId)
        .execute();

      if (error) throw error;

      const permMap = new Map<string, boolean>();
      (data || []).forEach((rp: any) => {
        permMap.set(rp.permission_id, true);
      });
      setRolePermissions(permMap);
    } catch (error: any) {
      console.error('Erro ao carregar permissões do role:', error);
    }
  };

  const handleOpenDialog = (role?: Role) => {
    if (role) {
      setEditingRole(role);
      setFormData({
        name: role.name,
        display_name: role.display_name,
        description: role.description || '',
      });
      loadRolePermissions(role.id);
    } else {
      setEditingRole(null);
      setFormData({
        name: '',
        display_name: '',
        description: '',
      });
      setRolePermissions(new Map());
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingRole(null);
    setFormData({
      name: '',
      display_name: '',
      description: '',
    });
    setRolePermissions(new Map());
  };

  const handleTogglePermission = (permissionId: string) => {
    const newMap = new Map(rolePermissions);
    if (newMap.get(permissionId)) {
      newMap.delete(permissionId);
    } else {
      newMap.set(permissionId, true);
    }
    setRolePermissions(newMap);
  };

  const handleSave = async () => {
    try {
      if (!formData.name || !formData.display_name) {
        toast({
          title: 'Erro',
          description: 'Nome e nome de exibição são obrigatórios',
          variant: 'destructive',
        });
        return;
      }

      let roleId: string;

      if (editingRole) {
        // Atualizar role
        const { data, error } = await from('roles')
          .update({
            display_name: formData.display_name,
            description: formData.description || null,
          })
          .eq('id', editingRole.id)
          .select('*')
          .single();

        if (error) throw error;
        roleId = data.id;
      } else {
        // Verificar se já existe um role com o mesmo nome
        const { data: existingRole } = await from('roles')
          .select('id, name')
          .eq('name', formData.name)
          .maybeSingle();

        if (existingRole) {
          throw new Error(`Já existe uma função com o nome "${formData.name}". Por favor, escolha outro nome.`);
        }

        // Criar role
        const { data, error } = await from('roles')
          .insert({
            name: formData.name,
            display_name: formData.display_name,
            description: formData.description || null,
            is_system: false,
          })
          .select('*')
          .single();

        if (error) throw error;
        roleId = data.id;
      }

      // Atualizar permissões do role
      // Remover todas as permissões existentes
      await from('role_permissions')
        .eq('role_id', roleId)
        .delete();

      // Adicionar novas permissões
      if (rolePermissions.size > 0) {
        const permissionsToInsert = Array.from(rolePermissions.keys()).map(permissionId => ({
          role_id: roleId,
          permission_id: permissionId,
        }));

        await from('role_permissions')
          .insert(permissionsToInsert)
          .execute();
      }

      toast({
        title: 'Sucesso',
        description: editingRole ? 'Role atualizado com sucesso' : 'Role criado com sucesso',
      });

      handleCloseDialog();
      loadData();
    } catch (error: any) {
      console.error('Erro ao salvar role:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao salvar role',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!roleToDelete) return;

    try {
      // Verificar se há usuários usando este role (verificar na tabela profiles)
      const { data: usersWithRole, error: usersError } = await from('profiles')
        .select('user_id')
        .eq('role', roleToDelete.name)
        .execute();

      if (usersError) {
        console.warn('Erro ao verificar usuários com role:', usersError);
      }

      const userCount = usersWithRole?.length || 0;
      
      if (userCount > 0) {
        // Avisar mas permitir continuar
        const confirmed = window.confirm(
          `ATENÇÃO: Há ${userCount} usuário(s) usando a função "${roleToDelete.display_name}".\n\n` +
          `Ao remover esta função, os usuários ficarão sem função definida.\n\n` +
          `Deseja continuar mesmo assim?`
        );
        
        if (!confirmed) {
          setDeleteDialogOpen(false);
          setRoleToDelete(null);
          return;
        }
      }

      // Limpar referências em user_position_departments (setar role_id para NULL)
      const { error: updError } = await from('user_position_departments')
        .update({ role_id: null })
        .eq('role_id', roleToDelete.id)
        .execute();

      if (updError) {
        console.warn('Erro ao limpar referências em user_position_departments:', updError);
        // Tentar deletar diretamente se update falhar
        try {
          await from('user_position_departments')
            .delete()
            .eq('role_id', roleToDelete.id)
            .execute();
        } catch (delError) {
          console.warn('Erro ao deletar referências em user_position_departments:', delError);
        }
      }

      // Deletar permissões associadas
      const { error: permError } = await from('role_permissions')
        .delete()
        .eq('role_id', roleToDelete.id)
        .execute();

      if (permError) {
        console.warn('Erro ao deletar permissões do role:', permError);
        // Continuar mesmo assim
      }

      // Excluir role
      const { error } = await from('roles')
        .delete()
        .eq('id', roleToDelete.id)
        .execute();

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: `Função "${roleToDelete.display_name}" removida com sucesso`,
      });

      setDeleteDialogOpen(false);
      setRoleToDelete(null);
      loadData();
    } catch (error: any) {
      console.error('Erro ao excluir role:', error);
      console.error('Detalhes do erro:', JSON.stringify(error, null, 2));
      
      let errorMessage = 'Erro ao excluir função';
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.error?.message) {
        errorMessage = error.error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      // Verificar se é erro de constraint (usuários usando)
      if (errorMessage.includes('foreign key') || errorMessage.includes('constraint') || errorMessage.includes('violates')) {
        if (errorMessage.includes('user_position_departments')) {
          errorMessage = `Erro: há referências na tabela user_position_departments. Tente novamente - o sistema tentará limpar automaticamente.`;
        } else {
          errorMessage = `Não é possível excluir: há dados relacionados usando esta função.`;
        }
      }

      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  // Agrupar permissões por categoria, removendo duplicatas visuais
  // (mesmo resource.action ou descrição idêntica)
  const permissionsByCategory = permissions.reduce((acc, perm) => {
    if (!acc[perm.category]) {
      acc[perm.category] = [];
    }
    
    // Verificar se já existe uma permissão com mesmo resource.action nesta categoria
    const isDuplicate = acc[perm.category].some(existing => 
      existing.resource === perm.resource && existing.action === perm.action
    );
    
    // Verificar se já existe uma permissão com mesma descrição nesta categoria
    const isDescriptionDuplicate = perm.description && acc[perm.category].some(existing => 
      existing.description && 
      existing.description.toLowerCase().trim() === perm.description.toLowerCase().trim()
    );
    
    // Só adicionar se não for duplicata
    if (!isDuplicate && !isDescriptionDuplicate) {
      acc[perm.category].push(perm);
    }
    
    return acc;
  }, {} as Record<string, Permission[]>);

  const categoryLabels: Record<string, string> = {
    pdv: 'PDV - Vendas',
    assistencia: 'Assistência Técnica',
    clientes: 'Clientes',
    admin: 'Administração',
    rh: 'Recursos Humanos',
    gestao: 'Gestão',
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gerenciar Roles</h2>
          <p className="text-sm text-muted-foreground">
            Crie e gerencie roles predefinidos com permissões específicas
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Role
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Roles do Sistema</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Permissões</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.map((role) => {
                // Contar permissões do role
                const permCount = rolesPermissionsMap.get(role.id) || 0;
                return (
                  <TableRow key={role.id}>
                    <TableCell className="font-medium">{role.display_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {role.description || '-'}
                    </TableCell>
                    <TableCell>
                      {role.is_system ? (
                        <Badge variant="outline">Sistema</Badge>
                      ) : (
                        <Badge variant="secondary">Customizado</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{permCount} permissões</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(role)}
                          title="Editar função"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setRoleToDelete(role);
                            setDeleteDialogOpen(true);
                          }}
                          title="Remover função"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog de criar/editar role */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {editingRole ? 'Editar Role' : 'Novo Role'}
            </DialogTitle>
            <DialogDescription>
              {editingRole
                ? 'Edite as informações do role e suas permissões'
                : 'Crie um novo role e defina suas permissões'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome (código) *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: vendedor_senior"
                  disabled={!!editingRole}
                />
                <p className="text-xs text-muted-foreground">
                  {editingRole ? 'Nome não pode ser alterado' : 'Apenas letras minúsculas, números e underscore'}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Nome de Exibição *</Label>
                <Input
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  placeholder="Ex: Vendedor Sênior"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descreva o propósito deste role"
                rows={3}
              />
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-semibold">Permissões</Label>
                  <p className="text-xs text-muted-foreground">
                    Selecione as permissões que este role terá
                  </p>
                </div>
                <div className="text-sm text-muted-foreground">
                  <span className="font-semibold text-primary">
                    {Array.from(rolePermissions.values()).filter(Boolean).length}
                  </span>
                  {' / '}
                  {permissions.length} selecionadas
                </div>
              </div>

              <ScrollArea className="h-[500px] border rounded-md p-4">
                <div className="space-y-6">
                  {Object.entries(permissionsByCategory).map(([category, perms]) => {
                    const selectedCount = perms.filter(p => rolePermissions.get(p.id)).length;
                    return (
                      <div key={category} className="border-l-2 border-primary/20 pl-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-sm flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            {categoryLabels[category] || category}
                          </h4>
                          <Badge variant="secondary" className="text-xs">
                            {selectedCount} / {perms.length}
                          </Badge>
                        </div>
                        <div className="space-y-2 pl-2">
                          {perms.map((perm) => {
                            const isChecked = rolePermissions.get(perm.id) || false;
                            return (
                              <div key={perm.id} className="flex items-center gap-2 py-1 hover:bg-muted/50 rounded px-2 -mx-2">
                                <Checkbox
                                  id={`role-perm-${perm.id}`}
                                  checked={isChecked}
                                  onCheckedChange={() => handleTogglePermission(perm.id)}
                                />
                                <Label
                                  htmlFor={`role-perm-${perm.id}`}
                                  className="text-sm cursor-pointer flex-1"
                                >
                                  {perm.description}
                                </Label>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              {editingRole ? 'Salvar Alterações' : 'Criar Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover a função "{roleToDelete?.display_name}"?
              {roleToDelete?.is_system && (
                <span className="block mt-2 font-semibold text-amber-600 dark:text-amber-400">
                  Esta é uma função do sistema. Certifique-se de que nenhum usuário está usando esta função.
                </span>
              )}
              <span className="block mt-2">Esta ação não pode ser desfeita.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRoleToDelete(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

