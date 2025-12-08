import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2, Tag as TagIcon } from 'lucide-react';
import { useTags, Tag } from '@/hooks/useTags';
import { useAuth } from '@/contexts/AuthContext';

const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', 
  '#10b981', '#06b6d4', '#84cc16', '#f97316',
  '#ef4444', '#64748b', '#7c3aed', '#0ea5e9'
];

const PRESET_ICONS = [
  '🏷️', '📝', '🎯', '⚡', '🔥', '💡', '🚀', '⭐',
  '📊', '🔧', '💼', '🌟', '📈', '🎨', '🔒', '✨'
];

export const TagManager = () => {
  const { tags, loading, createTag, updateTag, deleteTag } = useTags();
  const { isAdmin } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    color: '#6366f1',
    icon: '🏷️',
    description: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      return;
    }

    let success = false;
    if (editingTag) {
      success = await updateTag(editingTag.id, formData);
    } else {
      success = await createTag(formData);
    }

    if (success) {
      setIsDialogOpen(false);
      setEditingTag(null);
      setFormData({ name: '', color: '#6366f1', icon: '🏷️', description: '' });
    }
  };

  const handleEdit = (tag: Tag) => {
    setEditingTag(tag);
    setFormData({
      name: tag.name,
      color: tag.color,
      icon: tag.icon,
      description: tag.description || ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (tag: Tag) => {
    await deleteTag(tag.id);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingTag(null);
    setFormData({ name: '', color: '#6366f1', icon: '🏷️', description: '' });
  };

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center">
            Acesso restrito a administradores
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TagIcon className="h-5 w-5 text-primary" />
            <CardTitle>Gerenciar Tags</CardTitle>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingTag(null)} className="gap-2">
                <Plus className="h-4 w-4" />
                Nova Tag
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingTag ? 'Editar Tag' : 'Nova Tag'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome da Tag</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Ex: Urgente, Cliente VIP, etc."
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Cor</Label>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_COLORS.map(color => (
                      <button
                        key={color}
                        type="button"
                        className={`w-8 h-8 rounded-full border-2 ${
                          formData.color === color 
                            ? 'border-foreground scale-110' 
                            : 'border-muted-foreground/20'
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => setFormData({...formData, color})}
                      />
                    ))}
                  </div>
                  <Input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({...formData, color: e.target.value})}
                    className="w-20 h-10 p-1"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Ícone</Label>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_ICONS.map(icon => (
                      <button
                        key={icon}
                        type="button"
                        className={`w-10 h-10 text-lg rounded-md border-2 hover:border-primary transition-colors ${
                          formData.icon === icon 
                            ? 'border-primary bg-primary/10' 
                            : 'border-muted'
                        }`}
                        onClick={() => setFormData({...formData, icon})}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                  <Input
                    value={formData.icon}
                    onChange={(e) => setFormData({...formData, icon: e.target.value})}
                    placeholder="Digite um emoji"
                    className="w-20"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição (opcional)</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Descrição da tag..."
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={handleDialogClose}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingTag ? 'Atualizar' : 'Criar'} Tag
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          </div>
        ) : tags.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <TagIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma tag criada ainda</p>
            <p className="text-sm">Crie tags para organizar melhor seus processos</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tags.map(tag => (
              <div
                key={tag.id}
                className="group relative p-4 rounded-lg border-2 transition-all hover:border-primary/50"
                style={{ borderColor: tag.color + '40' }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-lg">{tag.icon}</span>
                    <div>
                      <h3 className="font-medium">{tag.name}</h3>
                      {tag.description && (
                        <p className="text-sm text-muted-foreground">{tag.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(tag)}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir Tag</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir a tag "{tag.name}"? Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(tag)} className="bg-destructive hover:bg-destructive/90">
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                <Badge 
                  variant="secondary" 
                  className="mt-2"
                  style={{ 
                    backgroundColor: tag.color + '20',
                    color: tag.color,
                    borderColor: tag.color + '40'
                  }}
                >
                  {tag.icon} {tag.name}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};