import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Award, Flame, TrendingUp } from 'lucide-react';
import { from } from '@/integrations/db/client';
import { useAuth } from '@/contexts/AuthContext';

export function GamificationPanel() {
  const { user } = useAuth();

  const { data: pointsData } = useQuery({
    queryKey: ['user-points', user?.id],
    queryFn: async () => {
      if (!user) return { total: 0, recent: [] };
      
      const { data, error } = await from('user_points')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)
        .execute();
      
      if (error) throw error;
      
      const total = data?.reduce((sum, p) => sum + (p.points || 0), 0) || 0;
      return { total, recent: data || [] };
    },
    enabled: !!user
  });

  const { data: badges } = useQuery({
    queryKey: ['user-badges', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await from('user_badges')
        .select('*')
        .eq('user_id', user.id)
        .order('earned_at', { ascending: false })
        .execute();
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user
  });

  const { data: streak } = useQuery({
    queryKey: ['user-streak', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await from('user_streaks')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!user
  });

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Trophy className="h-4 w-4 text-yellow-500" />
            Pontos Totais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{pointsData?.total || 0}</div>
          <p className="text-xs text-muted-foreground mt-1">Continue aprendendo para ganhar mais!</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Award className="h-4 w-4 text-purple-500" />
            Badges
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{badges?.length || 0}</div>
          <div className="flex flex-wrap gap-1 mt-2">
            {badges?.slice(0, 3).map((badge) => (
              <Badge key={badge.id} variant="secondary" className="text-xs">
                {badge.badge_icon} {badge.badge_name}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Flame className="h-4 w-4 text-orange-500" />
            Sequência
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{streak?.current_streak || 0} dias</div>
          <p className="text-xs text-muted-foreground mt-1">
            Melhor: {streak?.longest_streak || 0} dias
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

