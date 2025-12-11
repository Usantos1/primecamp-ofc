import { useState } from 'react';
import { ModernLayout } from '@/components/ModernLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Users } from 'lucide-react';
import { useCargos } from '@/hooks/useCargos';
import { Cargo, CARGOS_LABELS } from '@/types/assistencia';
import { useToast } from '@/hooks/use-toast';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { LoadingButton } from '@/components/LoadingButton';

export default function Colaboradores() {
  const { toast } = useToast();
  const { colaboradores, createColaborador, updateColaborador, deleteColaborador, isLoading } = useCargos();
  
  const [showForm, setShowForm] = useState(false);
  const [editingColab, setEditingColab] = useState<any>(null);
  const [showDelete, setShowDelete] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    cargo: 'tecnico' as Cargo,
    ativo: true,
    email: '',
    telefone: '',
  });

  const handleNew = () => {
    setEditingColab(null);
    setFormData({
      nome: '',
      cargo: 'tecnico',
      ativo: true,
      email: '',
      telefone: '',
    });
    setShowForm(true);
  };

  const handleEdit = (colab: any) => {
    setEditingColab(colab);
    setFormData({
      nome: colab.nome,
      cargo: colab.cargo,
      ativo: colab.ativo,
      email: colab.email || '',
      telefone: colab.telefone || '',
    });
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!formData.nome) {
      toast({ title: 'Nome é obrigatório', variant: 'destructive' });
      return;
    }

    if (editingColab) {
      updateColaborador(editingColab.id, formData);
      toast({ title: 'Colaborador atualizado!' });
    } else {
      createColaborador(formData);
      toast({ title: 'Colaborador cadastrado!' });
    }
    setShowForm(false);
    setEditingColab(null);
  };

  const handleDelete = (id: string) => {
    setDeletingId(id);
    setShowDelete(true);
  };

  const confirmDelete = () => {
    if (deletingId) {
      deleteColaborador(deletingId);
      toast({ title: 'Colaborador excluído!' });
      setDeletingId(null);
    }
    setShowDelete(false);
  };

  return (
    <ModernLayout title="Colaboradores" subtitle="Gerenciar colaboradores e cargos">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Colaboradores</CardTitle>
              <Button onClick={handleNew} className="gap-2">
                <Plus className="h-4 w-4" />
                Novo Colaborador
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center text-muted-foreground py-8">Carregando...</p>
            ) : colaboradores.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum colaborador cadastrado ainda.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {colaboradores.map(colab => (
                    <TableRow key={colab.id}>
                      <TableCell className="font-medium">{colab.nome}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {CARGOS_LABELS[colab.cargo]}
                        </Badge>
                      </TableCell>
                      <TableCell>{colab.email || '-'}</TableCell>
                      <TableCell>{colab.telefone || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={colab.ativo ? 'default' : 'secondary'}>
                          {colab.ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(colab)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(colab.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Dialog de Formulário */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingColab ? 'Editar Colaborador' : 'Novo Colaborador'}
              </DialogTitle>
              <DialogDescription>
                {editingColab ? 'Atualize os dados do colaborador' : 'Cadastre um novo colaborador'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input
                  value={formData.nome}
                  onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                  placeholder="Nome do colaborador"
                />
              </div>

              <div className="space-y-2">
                <Label>Cargo *</Label>
                <Select
                  value={formData.cargo}
                  onValueChange={(v: Cargo) => setFormData(prev => ({ ...prev, cargo: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tecnico">Técnico</SelectItem>
                    <SelectItem value="vendedor">Vendedor</SelectItem>
                    <SelectItem value="atendente">Atendente</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="email@exemplo.com"
                />
              </div>

              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  value={formData.telefone}
                  onChange={(e) => setFormData(prev => ({ ...prev, telefone: e.target.value }))}
                  placeholder="(99) 99999-9999"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="ativo"
                  checked={formData.ativo}
                  onChange={(e) => setFormData(prev => ({ ...prev, ativo: e.target.checked }))}
                  className="h-4 w-4"
                />
                <Label htmlFor="ativo" className="cursor-pointer">Ativo</Label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              <LoadingButton onClick={handleSubmit}>
                {editingColab ? 'Atualizar' : 'Cadastrar'}
              </LoadingButton>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog de Confirmação de Exclusão */}
        <ConfirmDialog
          open={showDelete}
          onOpenChange={setShowDelete}
          onConfirm={confirmDelete}
          title="Excluir Colaborador"
          description="Tem certeza que deseja excluir este colaborador? Esta ação não pode ser desfeita."
        />
      </div>
    </ModernLayout>
  );
}
