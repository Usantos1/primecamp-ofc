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
    <Card className="border-2 border-gray-300 shadow-sm h-full flex flex-col">
      <CardHeader className="pb-3 pt-3 md:pt-6 px-3 md:px-6 border-b-2 border-gray-200">
        <CardTitle className="flex items-center gap-2 text-sm md:text-base">
          <div className="p-1.5 md:p-2 rounded-lg bg-gradient-to-br from-orange-100 to-white border-2 border-gray-200">
            <Target className="h-3 w-3 md:h-5 md:w-5 text-orange-600" />
          </div>
          <span className="line-clamp-2">{goal.title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 md:p-6 space-y-3 md:space-y-4 flex-1 flex flex-col">
        <div className="space-y-2">
          <div className="flex justify-between text-xs md:text-sm">
            <span className="font-medium">Progresso</span>
            <span className="font-semibold">{goal.current_value}/{goal.target_value} {goal.unit}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 md:h-2.5 border border-gray-300">
            <div 
              className="bg-gradient-to-r from-orange-500 to-red-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="text-center text-xs md:text-sm text-muted-foreground">
            {progressPercentage.toFixed(1)}% concluído
          </div>
        </div>

        <form onSubmit={handleUpdate} className="space-y-3 md:space-y-4 flex-1 flex flex-col">
          <div className="space-y-2">
            <Label htmlFor="updateValue" className="text-xs md:text-sm">Adicionar ao progresso</Label>
            <div className="flex gap-2">
              <Input
                id="updateValue"
                type="number"
                step="0.01"
                value={updateValue}
                onChange={(e) => setUpdateValue(e.target.value)}
                placeholder={`Ex: 5 ${goal.unit}`}
                className="flex-1 h-9 md:h-10 text-base md:text-sm border-2 border-gray-300"
              />
              <span className="flex items-center text-xs md:text-sm text-muted-foreground px-2 whitespace-nowrap">
                {goal.unit}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-xs md:text-sm">Observações (opcional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Descreva o que foi realizado..."
              rows={2}
              className="text-base md:text-sm border-2 border-gray-300"
            />
          </div>

          <Button 
            type="submit" 
            disabled={isLoading} 
            className="w-full h-9 md:h-10 mt-auto bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white border-0"
          >
            <Plus className="h-3 w-3 md:h-4 md:w-4 mr-2" />
            <span className="text-xs md:text-sm">{isLoading ? 'Atualizando...' : 'Atualizar Meta'}</span>
          </Button>
        </form>

        {goal.description && (
          <div className="mt-3 md:mt-4 p-2 md:p-3 bg-gray-50 rounded-lg border-2 border-gray-200">
            <Label className="text-xs md:text-sm font-medium">Histórico</Label>
            <p className="text-xs md:text-sm text-muted-foreground whitespace-pre-line mt-1 line-clamp-3">
              {goal.description}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};