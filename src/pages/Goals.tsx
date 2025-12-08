import { ModernLayout } from '@/components/ModernLayout';
import { GoalsManager } from '@/components/GoalsManager';
import { GoalUpdateForm } from '@/components/GoalUpdateForm';
import { useGoals } from '@/hooks/useGoals';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Goals() {
  const { goals } = useGoals();
  const { profile } = useAuth();

  const userGoals = goals.filter(goal => 
    goal.user_id === profile?.user_id || 
    (goal.participants && goal.participants.includes(profile?.user_id || ''))
  );
  const isAdmin = profile?.role === 'admin';

  // Simple refresh function for now
  const handleGoalUpdate = () => {
    window.location.reload();
  };

  return (
    <ModernLayout
      title="Sistema de Metas"
      subtitle="Defina e acompanhe suas metas e objetivos"
    >
      <Tabs defaultValue={isAdmin ? 'manage' : 'my-goals'} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="my-goals">Minhas Metas</TabsTrigger>
          {isAdmin && <TabsTrigger value="manage">Gerenciar Metas</TabsTrigger>}
        </TabsList>
        
        <TabsContent value="my-goals" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {userGoals.map((goal) => (
              <GoalUpdateForm
                key={goal.id}
                goal={goal}
                onUpdate={handleGoalUpdate}
              />
            ))}
          </div>
          {userGoals.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma meta atribuída a você ainda.
            </div>
          )}
        </TabsContent>
        
        {isAdmin && (
          <TabsContent value="manage">
            <GoalsManager />
          </TabsContent>
        )}
      </Tabs>
    </ModernLayout>
  );
}