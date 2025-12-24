import { useState, useEffect } from 'react';
import { from } from '@/integrations/db/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  target_value: number;
  current_value: number;
  unit: string;
  deadline?: string;
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  category?: string;
  department?: string;
  participants?: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
  user_name?: string;
  creator_name?: string;
}

export const useGoals = () => {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGoals = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Get user profile to check role and department
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role, department')
        .execute().eq('user_id', user.id)
        .single();

      let query = supabase
        .from('goals')
        .select('*')
        .execute().order('created_at', { ascending: false });

      // Filter based on role, department, and participation
      if (profileData?.role !== 'admin') {
        query = query.or(`user_id.eq.${user.id},department.eq.${profileData?.department},participants.cs.{${user.id}}`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching goals:', error);
        return;
      }

      const formattedGoals: Goal[] = (data || []).map(goal => ({
        id: goal.id,
        user_id: goal.user_id,
        title: goal.title,
        description: goal.description,
        target_value: goal.target_value,
        current_value: goal.current_value,
        unit: goal.unit,
        deadline: goal.deadline,
        status: goal.status as 'active' | 'completed' | 'paused' | 'cancelled',
        category: goal.category,
        department: goal.department,
        participants: goal.participants || [],
        created_by: goal.created_by,
        created_at: goal.created_at,
        updated_at: goal.updated_at,
        user_name: 'Usuário',
        creator_name: 'Criador'
      }));

      setGoals(formattedGoals);
    } catch (error) {
      console.error('Error in fetchGoals:', error);
    } finally {
      setLoading(false);
    }
  };

  const createGoal = async (goalData: Omit<Goal, 'id' | 'created_at' | 'updated_at' | 'user_name' | 'creator_name'>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('goals')
        .insert({
          ...goalData,
          created_by: user.id
        })
        .select()
        .single();

      if (error) {
        toast({
          title: "Erro",
          description: "Erro ao criar meta",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Sucesso",
        description: "Meta criada com sucesso"
      });

      fetchGoals();
      return data;
    } catch (error) {
      console.error('Error creating goal:', error);
    }
  };

  const updateGoal = async (goalId: string, updates: Partial<Goal>) => {
    try {
      const { error } = await supabase
        .from('goals')
        .update(updates)
        .eq('id', goalId);

      if (error) {
        toast({
          title: "Erro",
          description: "Erro ao atualizar meta",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Sucesso",
        description: "Meta atualizada com sucesso"
      });

      fetchGoals();
    } catch (error) {
      console.error('Error updating goal:', error);
    }
  };

  const deleteGoal = async (goalId: string) => {
    try {
      const { error } = await supabase
        .from('goals')
        .delete()
        .eq('id', goalId);

      if (error) {
        toast({
          title: "Erro",
          description: "Erro ao excluir meta",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Sucesso",
        description: "Meta excluída com sucesso"
      });

      fetchGoals();
    } catch (error) {
      console.error('Error deleting goal:', error);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, [user]);

  return {
    goals,
    loading,
    createGoal,
    updateGoal,
    deleteGoal,
    refetch: fetchGoals
  };
};