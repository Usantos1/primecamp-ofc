import { useState, useEffect } from 'react';
import { from } from '@/integrations/db/client';
import { useAuth } from '@/contexts/AuthContext';

export interface UserActivityLog {
  id: string;
  user_id: string;
  activity_type: string;
  description: string;
  entity_type?: string;
  entity_id?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  user_name?: string;
}

export const useUserLogs = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<UserActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_activity_logs')
        .select('*')
        .execute().order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error fetching logs:', error);
        return;
      }

      const formattedLogs: UserActivityLog[] = (data || []).map(log => ({
        ...log,
        user_name: 'Usuário'
      }));

      setLogs(formattedLogs);
    } catch (error) {
      console.error('Error in fetchLogs:', error);
    } finally {
      setLoading(false);
    }
  };

  const logActivity = async (
    activityType: string,
    description: string,
    entityType?: string,
    entityId?: string,
    additionalData?: Record<string, any>
  ) => {
    if (!user) return;

    try {
      // Get current IP and user agent
      const ipAddress = await getCurrentIP();
      const userAgent = navigator.userAgent;
      
      await // 🚫 Supabase RPC removido - TODO: implementar na API
      // supabase.rpc('log_user_activity', {
        p_user_id: user.id,
        p_activity_type: activityType,
        p_description: description,
        p_entity_type: entityType,
        p_entity_id: entityId
      });

      // Also log to a more detailed table if we need additional data
      if (additionalData) {
        await supabase
          .from('user_activity_logs')
          .insert({
            user_id: user.id,
            activity_type: activityType,
            description: `${description} - Dados: ${JSON.stringify(additionalData)}`,
            entity_type: entityType,
            entity_id: entityId,
            ip_address: ipAddress,
            user_agent: userAgent
          });
      }
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  };

  const getCurrentIP = async (): Promise<string> => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip || 'Não disponível';
    } catch (error) {
      return 'Não disponível';
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [user]);

  return {
    logs,
    loading,
    logActivity,
    refetch: fetchLogs
  };
};