import { useState, useEffect } from 'react';
import { Category } from '@/types/process';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useCategories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching categories:', error);
        toast.error('Erro ao carregar categorias');
        return;
      }

      const formattedCategories: Category[] = data.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        color: row.color,
        icon: row.icon,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        createdBy: row.created_by
      }));

      setCategories(formattedCategories);
    } catch (error) {
      console.error('Unexpected error fetching categories:', error);
      toast.error('Erro inesperado ao carregar categorias');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const createCategory = async (categoryData: Omit<Category, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => {
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) {
        toast.error('Usuário não autenticado');
        return null;
      }

      const { data, error } = await supabase
        .from('categories')
        .insert({
          name: categoryData.name,
          description: categoryData.description,
          color: categoryData.color,
          icon: categoryData.icon,
          created_by: user.data.user.id
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating category:', error);
        toast.error('Erro ao criar categoria');
        return null;
      }

      const newCategory: Category = {
        id: data.id,
        name: data.name,
        description: data.description,
        color: data.color,
        icon: data.icon,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
        createdBy: data.created_by
      };

      setCategories(prev => [...prev, newCategory]);
      toast.success('Categoria criada com sucesso');
      return newCategory;
    } catch (error) {
      console.error('Unexpected error creating category:', error);
      toast.error('Erro inesperado ao criar categoria');
      return null;
    }
  };

  const updateCategory = async (id: string, updates: Partial<Category>) => {
    try {
      const { error } = await supabase
        .from('categories')
        .update({
          ...(updates.name && { name: updates.name }),
          ...(updates.description !== undefined && { description: updates.description }),
          ...(updates.color && { color: updates.color }),
          ...(updates.icon && { icon: updates.icon })
        })
        .eq('id', id);

      if (error) {
        console.error('Error updating category:', error);
        toast.error('Erro ao atualizar categoria');
        return;
      }

      setCategories(prev =>
        prev.map(category =>
          category.id === id
            ? { ...category, ...updates, updatedAt: new Date() }
            : category
        )
      );
      toast.success('Categoria atualizada com sucesso');
    } catch (error) {
      console.error('Unexpected error updating category:', error);
      toast.error('Erro inesperado ao atualizar categoria');
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting category:', error);
        toast.error('Erro ao excluir categoria');
        return;
      }

      setCategories(prev => prev.filter(category => category.id !== id));
      toast.success('Categoria excluída com sucesso');
    } catch (error) {
      console.error('Unexpected error deleting category:', error);
      toast.error('Erro inesperado ao excluir categoria');
    }
  };

  return {
    categories,
    loading,
    createCategory,
    updateCategory,
    deleteCategory,
    refetch: fetchCategories
  };
};