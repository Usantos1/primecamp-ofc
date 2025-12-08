import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useGoals } from '@/hooks/useGoals';
import { useToast } from '@/hooks/use-toast';
import { Target, Plus, TrendingUp } from 'lucide-react';

interface Goal {
  id: string;
  title: string;
  description?: string;
  current_value: number;
  target_value: number;
  unit: string;
}

interface GoalUpdateFormProps {
  goal: Goal;
  onUpdate: () => void;
}

export const GoalUpdateForm = ({ goal, onUpdate }: GoalUpdateFormProps) => {
  const [updateValue, setUpdateValue] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { updateGoal } = useGoals();
  const { toast } = useToast();

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!updateValue) {
      toast({
        title: "Erro",
        description: "Insira um valor para atualizar",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const newValue = parseFloat(updateValue);
      const newTotal = goal.current_value + newValue;
      
      await updateGoal(goal.id, {
        current_value: newTotal,
        description: notes ? `${goal.description || ''}\n\nAtualização: +${newValue} - ${notes}` : goal.description
      });

      toast({
        title: "Meta atualizada",
        description: `Adicionado ${newValue} ${goal.unit}. Total: ${newTotal}/${goal.target_value}`,
      });

      setUpdateValue('');
      setNotes('');
      onUpdate();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao atualizar meta",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const progressPercentage = Math.min((goal.current_value / goal.target_value) * 100, 100);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          {goal.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progresso</span>
            <span>{goal.current_value}/{goal.target_value} {goal.unit}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="text-center text-sm text-muted-foreground">
            {progressPercentage.toFixed(1)}% concluído
          </div>
        </div>

        <form onSubmit={handleUpdate} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="updateValue">Adicionar ao progresso</Label>
            <div className="flex gap-2">
              <Input
                id="updateValue"
                type="number"
                step="0.01"
                value={updateValue}
                onChange={(e) => setUpdateValue(e.target.value)}
                placeholder={`Ex: 5 ${goal.unit}`}
                className="flex-1"
              />
              <span className="flex items-center text-sm text-muted-foreground px-2">
                {goal.unit}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações (opcional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Descreva o que foi realizado..."
              rows={2}
            />
          </div>

          <Button type="submit" disabled={isLoading} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            {isLoading ? 'Atualizando...' : 'Atualizar Meta'}
          </Button>
        </form>

        {goal.description && (
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <Label className="text-sm font-medium">Histórico</Label>
            <p className="text-sm text-muted-foreground whitespace-pre-line">
              {goal.description}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};