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
    <Card className="border-2 border-gray-300 shadow-sm">
      <CardHeader className="pb-3 pt-3 md:pt-6 px-3 md:px-6 border-b-2 border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base md:text-xl">
            <div className="p-1.5 md:p-2 rounded-lg bg-gradient-to-br from-pink-100 to-white border-2 border-gray-200">
              <TagIcon className="h-4 w-4 md:h-5 md:w-5 text-pink-600" />
            </div>
            Gerenciar Tags
          </CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                onClick={() => setEditingTag(null)} 
                className="w-full md:w-auto h-9 bg-gradient-to-r from-blue-500 to-pink-500 hover:from-blue-600 hover:to-pink-600 text-white border-0 shadow-md gap-2"
              >
                <Plus className="h-4 w-4" />
                Nova Tag
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] md:max-w-md p-3 md:p-6">
              <DialogHeader>
                <DialogTitle className="text-base md:text-lg">
                  {editingTag ? 'Editar Tag' : 'Nova Tag'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-3 md:space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-xs md:text-sm">Nome da Tag</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Ex: Urgente, Cliente VIP, etc."
                    required
                    className="h-9 md:h-10 text-base md:text-sm border-2 border-gray-300"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs md:text-sm">Cor</Label>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_COLORS.map(color => (
                      <button
                        key={color}
                        type="button"
                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                          formData.color === color 
                            ? 'border-gray-800 scale-110 shadow-md' 
                            : 'border-gray-300 hover:border-gray-400'
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
                    className="w-full h-10 p-1 border-2 border-gray-300"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs md:text-sm">Ícone</Label>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_ICONS.map(icon => (
                      <button
                        key={icon}
                        type="button"
                        className={`w-10 h-10 text-lg rounded-md border-2 transition-all hover:border-primary ${
                          formData.icon === icon 
                            ? 'border-primary bg-primary/10 shadow-md' 
                            : 'border-gray-300 hover:border-gray-400'
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
                    className="w-full h-9 md:h-10 text-base md:text-sm border-2 border-gray-300"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-xs md:text-sm">Descrição (opcional)</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Descrição da tag..."
                    className="h-9 md:h-10 text-base md:text-sm border-2 border-gray-300"
                  />
                </div>

                <div className="flex flex-col md:flex-row justify-end gap-2 pt-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleDialogClose}
                    className="w-full md:w-auto h-9 border-2 border-gray-300"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit"
                    className="w-full md:w-auto h-9 bg-gradient-to-r from-blue-500 to-pink-500 hover:from-blue-600 hover:to-pink-600 text-white border-0"
                  >
                    {editingTag ? 'Atualizar' : 'Criar'} Tag
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent className="p-3 md:p-6">
        {loading ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          </div>
        ) : tags.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <TagIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm md:text-base">Nenhuma tag criada ainda</p>
            <p className="text-xs md:text-sm mt-1">Crie tags para organizar melhor seus processos</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {tags.map(tag => (
              <Card
                key={tag.id}
                className="border-2 shadow-sm hover:shadow-md transition-all active:scale-[0.98] group"
                style={{ borderColor: tag.color + '40', borderLeftColor: tag.color, borderLeftWidth: '4px' }}
              >
                <CardContent className="p-3 md:p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-lg md:text-xl">{tag.icon}</span>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm md:text-base">{tag.name}</h3>
                        {tag.description && (
                          <p className="text-xs md:text-sm text-muted-foreground mt-1 line-clamp-2">{tag.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(tag)}
                        className="h-8 w-8 border-2 border-gray-300"
                      >
                        <Edit className="h-3 w-3" />
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
                        <AlertDialogContent className="max-w-[95vw] md:max-w-md p-3 md:p-6">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-base md:text-lg">Excluir Tag</AlertDialogTitle>
                            <AlertDialogDescription className="text-xs md:text-sm">
                              Tem certeza que deseja excluir a tag "{tag.name}"? Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="flex-col md:flex-row gap-2">
                            <AlertDialogCancel className="w-full md:w-auto h-9 border-2 border-gray-300">Cancelar</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDelete(tag)} 
                              className="w-full md:w-auto h-9 bg-red-600 hover:bg-red-700"
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                  <Badge 
                    variant="secondary" 
                    className="mt-2 text-[10px] md:text-xs border-2"
                    style={{ 
                      backgroundColor: tag.color + '20',
                      color: tag.color,
                      borderColor: tag.color + '40'
                    }}
                  >
                    {tag.icon} {tag.name}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};