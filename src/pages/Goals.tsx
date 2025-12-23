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
      <div className="space-y-4 md:space-y-6 px-1 md:px-0">
        <Tabs defaultValue={isAdmin ? 'manage' : 'my-goals'} className="w-full">
          <TabsList className="grid w-full grid-cols-2 border-2 border-gray-300 bg-gray-50">
            <TabsTrigger 
              value="my-goals"
              className="text-xs md:text-sm border-r-2 border-gray-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white"
            >
              Minhas Metas
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger 
                value="manage"
                className="text-xs md:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white"
              >
                Gerenciar Metas
              </TabsTrigger>
            )}
          </TabsList>
          
          <TabsContent value="my-goals" className="mt-4 md:mt-6 space-y-4">
            <div className="grid gap-3 md:gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {userGoals.map((goal) => (
                <GoalUpdateForm
                  key={goal.id}
                  goal={goal}
                  onUpdate={handleGoalUpdate}
                />
              ))}
            </div>
            {userGoals.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm md:text-base">
                Nenhuma meta atribuída a você ainda.
              </div>
            )}
          </TabsContent>
          
          {isAdmin && (
            <TabsContent value="manage" className="mt-4 md:mt-6">
              <GoalsManager />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </ModernLayout>
  );
}