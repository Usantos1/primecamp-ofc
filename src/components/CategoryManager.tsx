import React, { useState } from 'react';
import { useCategories } from '@/hooks/useCategories';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Category } from '@/types/process';

interface CategoryFormData {
  name: string;
  description: string;
  color: string;
  icon: string;
}

export const CategoryManager = () => {
  const { categories, loading, createCategory, updateCategory, deleteCategory } = useCategories();
  const { isAdmin } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    description: '',
    color: '#6366f1',
    icon: '📁'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingCategory) {
      await updateCategory(editingCategory.id, formData);
    } else {
      await createCategory(formData);
    }
    
    setIsDialogOpen(false);
    setEditingCategory(null);
    setFormData({ name: '', description: '', color: '#6366f1', icon: '📁' });
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      color: category.color,
      icon: category.icon
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta categoria?')) {
      await deleteCategory(id);
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
            <div className="p-1.5 md:p-2 rounded-lg bg-gradient-to-br from-orange-100 to-white border-2 border-gray-200">
              <span className="text-lg md:text-xl">📁</span>
            </div>
            Gerenciar Categorias
          </CardTitle>
          {isAdmin && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full md:w-auto h-9 bg-gradient-to-r from-blue-500 to-orange-500 hover:from-blue-600 hover:to-orange-600 text-white border-0 shadow-md">
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Categoria
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[95vw] md:max-w-md p-3 md:p-6">
                <DialogHeader>
                  <DialogTitle className="text-base md:text-lg">
                    {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-3 md:space-y-4">
                  <div>
                    <Label htmlFor="name" className="text-xs md:text-sm">Nome</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="h-9 md:h-10 text-base md:text-sm border-2 border-gray-300"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description" className="text-xs md:text-sm">Descrição</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="text-base md:text-sm border-2 border-gray-300"
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="color" className="text-xs md:text-sm">Cor</Label>
                    <Input
                      id="color"
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="h-10 w-full border-2 border-gray-300"
                    />
                  </div>
                  <div>
                    <Label htmlFor="icon" className="text-xs md:text-sm">Ícone (emoji)</Label>
                    <Input
                      id="icon"
                      value={formData.icon}
                      onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                      placeholder="📁"
                      className="h-9 md:h-10 text-base md:text-sm border-2 border-gray-300"
                    />
                  </div>
                  <div className="flex flex-col md:flex-row justify-end gap-2 pt-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsDialogOpen(false)}
                      className="w-full md:w-auto h-9 border-2 border-gray-300"
                    >
                      Cancelar
                    </Button>
                    <Button 
                      type="submit"
                      className="w-full md:w-auto h-9 bg-gradient-to-r from-blue-500 to-orange-500 hover:from-blue-600 hover:to-orange-600 text-white border-0"
                    >
                      {editingCategory ? 'Salvar' : 'Criar'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-3 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {categories.length === 0 ? (
            <div className="col-span-full text-center py-8 text-muted-foreground text-sm md:text-base">
              Nenhuma categoria encontrada. Crie a primeira categoria para começar.
            </div>
          ) : (
            categories.map((category) => (
              <Card 
                key={category.id} 
                className="border-2 border-gray-300 shadow-sm hover:shadow-md hover:border-gray-400 transition-all active:scale-[0.98]"
                style={{ borderLeftColor: category.color, borderLeftWidth: '4px' }}
              >
                <CardHeader className="pb-3 pt-3 px-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl md:text-2xl">{category.icon}</span>
                      <CardTitle className="text-sm md:text-lg">{category.name}</CardTitle>
                    </div>
                    <Badge 
                      style={{ backgroundColor: category.color, color: 'white', border: '2px solid rgba(0,0,0,0.1)' }}
                      className="text-[10px] md:text-xs"
                    >
                      {category.color}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  {category.description && (
                    <p className="text-xs md:text-sm text-muted-foreground mb-3 line-clamp-2">
                      {category.description}
                    </p>
                  )}
                  {isAdmin && (
                    <div className="flex gap-2 pt-2 border-t-2 border-gray-200">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(category)}
                        className="flex-1 h-8 text-xs border-2 border-gray-300"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(category.id)}
                        className="flex-1 h-8 text-xs border-2 border-red-300 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Excluir
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};