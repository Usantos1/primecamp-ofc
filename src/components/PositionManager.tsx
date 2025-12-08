import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { usePositions } from '@/hooks/usePositions';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Users, Plus, Edit, Trash2, Crown, Shield, Star } from 'lucide-react';

export const PositionManager = () => {
  const { positions, loading, createPosition, updatePosition, deletePosition } = usePositions();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    level: 1
  });

  const resetForm = () => {
    setFormData({ name: '', description: '', level: 1 });
    setEditingPosition(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingPosition) {
        await updatePosition(editingPosition.id, formData);
      } else {
        await createPosition(formData);
      }
      
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving position:', error);
    }
  };

  const handleEdit = (position: any) => {
    setEditingPosition(position);
    setFormData({
      name: position.name,
      description: position.description || '',
      level: position.level
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deletePosition(id);
    } catch (error) {
      console.error('Error deleting position:', error);
    }
  };

  const getLevelIcon = (level: number) => {
    if (level >= 5) return Crown;
    if (level >= 3) return Shield;
    return Star;
  };

  const getLevelColor = (level: number) => {
    if (level >= 5) return 'bg-red-500';
    if (level >= 3) return 'bg-blue-500';
    return 'bg-green-500';
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
            <Users className="h-5 w-5" />
            Gerenciamento de Cargos
          </CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Cargo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingPosition ? 'Editar Cargo' : 'Novo Cargo'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Nome do Cargo</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Gerente de Vendas"
                    required
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">Descrição</label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descrição das responsabilidades do cargo"
                    rows={3}
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">Nível Hierárquico</label>
                  <Select 
                    value={formData.level.toString()} 
                    onValueChange={(value) => setFormData({ ...formData, level: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Nível 1 - Operacional</SelectItem>
                      <SelectItem value="2">Nível 2 - Júnior</SelectItem>
                      <SelectItem value="3">Nível 3 - Pleno</SelectItem>
                      <SelectItem value="4">Nível 4 - Sênior</SelectItem>
                      <SelectItem value="5">Nível 5 - Gerencial</SelectItem>
                      <SelectItem value="6">Nível 6 - Diretoria</SelectItem>
                      <SelectItem value="7">Nível 7 - Executivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingPosition ? 'Atualizar' : 'Criar'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {positions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum cargo encontrado. Crie o primeiro cargo para começar.
            </div>
          ) : (
            positions.map((position) => {
              const LevelIcon = getLevelIcon(position.level);
              return (
                <div
                  key={position.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <LevelIcon className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{position.name}</span>
                        <Badge className={`${getLevelColor(position.level)} text-white`}>
                          Nível {position.level}
                        </Badge>
                      </div>
                      {position.description && (
                        <p className="text-sm text-muted-foreground">
                          {position.description}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(position)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir o cargo "{position.name}"? 
                            Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(position.id)}>
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
};