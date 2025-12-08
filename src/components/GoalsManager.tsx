import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useGoals, Goal } from '@/hooks/useGoals';
import { useUsers } from '@/hooks/useUsers';
import { useDepartments } from '@/hooks/useDepartments';
import { useAuth } from '@/contexts/AuthContext';
import { Target, Plus, Calendar, User, Building2, TrendingUp, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MultiSelect } from '@/components/ui/multi-select';

export const GoalsManager = () => {
  const { goals, loading, createGoal, updateGoal, deleteGoal } = useGoals();
  const { users } = useUsers();
  const { departments } = useDepartments();
  const { isAdmin, user } = useAuth();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    user_id: '',
    participants: [] as string[],
    target_value: '',
    unit: 'count',
    deadline: '',
    category: '',
    department: ''
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      user_id: '',
      participants: [],
      target_value: '',
      unit: 'count',
      deadline: '',
      category: '',
      department: ''
    });
    setEditingGoal(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const goalData = {
      ...formData,
      user_id: formData.user_id || user?.id || '',
      target_value: parseFloat(formData.target_value),
      current_value: 0,
      status: 'active' as const,
      created_by: user?.id || '',
      deadline: formData.deadline ? new Date(formData.deadline).toISOString() : undefined
    };

    if (editingGoal) {
      await updateGoal(editingGoal.id, goalData);
    } else {
      await createGoal(goalData);
    }

    resetForm();
    setIsCreateModalOpen(false);
  };

  const handleEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setFormData({
      title: goal.title,
      description: goal.description || '',
      user_id: goal.user_id,
      participants: goal.participants || [],
      target_value: goal.target_value.toString(),
      unit: goal.unit,
      deadline: goal.deadline ? format(new Date(goal.deadline), 'yyyy-MM-dd') : '',
      category: goal.category || '',
      department: goal.department || ''
    });
    setIsCreateModalOpen(true);
  };

  const getProgressPercentage = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'paused': return 'bg-yellow-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-blue-500';
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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Sistema de Metas
            </CardTitle>
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Meta
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingGoal ? 'Editar Meta' : 'Criar Nova Meta'}
                  </DialogTitle>
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Título da Meta</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Ex: Aumentar vendas mensais"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Descreva os detalhes da meta..."
                    />
                  </div>

                   {isAdmin && (
                     <>
                       <div className="space-y-2">
                         <Label htmlFor="user_id">Responsável</Label>
                         <Select 
                           value={formData.user_id} 
                           onValueChange={(value) => setFormData({ ...formData, user_id: value })}
                         >
                           <SelectTrigger>
                             <SelectValue placeholder="Selecione o responsável" />
                           </SelectTrigger>
                           <SelectContent>
                             {user?.id && (
                               <SelectItem value={user.id}>Eu mesmo</SelectItem>
                             )}
                             {users.map((u) => (
                               <SelectItem key={u.id} value={u.id}>
                                 {u.display_name}
                               </SelectItem>
                             ))}
                           </SelectContent>
                         </Select>
                       </div>

                       <div className="space-y-2">
                         <Label htmlFor="participants">Participantes</Label>
                         <MultiSelect
                           options={users.map(u => ({ value: u.id, label: u.display_name || 'Usuário' }))}
                           selected={formData.participants}
                           onChange={(values) => setFormData({ ...formData, participants: values })}
                           placeholder="Selecione os participantes"
                         />
                       </div>
                     </>
                   )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="target_value">Valor Alvo</Label>
                      <Input
                        id="target_value"
                        type="number"
                        value={formData.target_value}
                        onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
                        placeholder="100"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="unit">Unidade</Label>
                      <Select 
                        value={formData.unit} 
                        onValueChange={(value) => setFormData({ ...formData, unit: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="count">Quantidade</SelectItem>
                          <SelectItem value="hours">Horas</SelectItem>
                          <SelectItem value="percentage">Porcentagem</SelectItem>
                          <SelectItem value="money">Valor (R$)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="deadline">Prazo</Label>
                    <Input
                      id="deadline"
                      type="date"
                      value={formData.deadline}
                      onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Categoria</Label>
                    <Select 
                      value={formData.category} 
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="productivity">Produtividade</SelectItem>
                        <SelectItem value="sales">Vendas</SelectItem>
                        <SelectItem value="quality">Qualidade</SelectItem>
                        <SelectItem value="efficiency">Eficiência</SelectItem>
                        <SelectItem value="innovation">Inovação</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="department">Departamento</Label>
                    <Select 
                      value={formData.department} 
                      onValueChange={(value) => setFormData({ ...formData, department: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o departamento" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((dept) => (
                          <SelectItem key={dept.id} value={dept.name}>
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsCreateModalOpen(false)}
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" className="flex-1">
                      {editingGoal ? 'Atualizar' : 'Criar Meta'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        <CardContent>
          {goals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma meta encontrada</p>
              <p className="text-sm">Crie sua primeira meta para começar!</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {goals.map((goal) => (
                <Card key={goal.id} className="bg-card/50 backdrop-blur-sm">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{goal.title}</h3>
                        {goal.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {goal.description}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(goal.status)}>
                          {goal.status === 'active' && 'Ativa'}
                          {goal.status === 'completed' && 'Concluída'}
                          {goal.status === 'paused' && 'Pausada'}
                          {goal.status === 'cancelled' && 'Cancelada'}
                        </Badge>
                        {(goal.user_id === user?.id || isAdmin) && (
                          <>
                            <Button variant="outline" size="sm" onClick={() => handleEdit(goal)}>
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => deleteGoal(goal.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span>Progresso</span>
                        <span className="font-medium">
                          {goal.current_value} / {goal.target_value} {goal.unit}
                        </span>
                      </div>
                      
                      <Progress 
                        value={getProgressPercentage(goal.current_value, goal.target_value)} 
                        className="h-2"
                      />

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {goal.user_name}
                        </div>
                        
                        {goal.deadline && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(goal.deadline), "d 'de' MMM, yyyy", { locale: ptBR })}
                          </div>
                        )}
                        
                        {goal.department && (
                          <div className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {goal.department}
                          </div>
                        )}
                        
                        {goal.category && (
                          <div className="flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            {goal.category}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};