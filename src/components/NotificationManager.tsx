import { useEffect } from 'react';
import { useWhatsApp } from '@/hooks/useWhatsApp';
import { from } from '@/integrations/db/client';

interface NotificationManagerProps {
  children: React.ReactNode;
}

export function NotificationManager({ children }: NotificationManagerProps) {
  console.log('NotificationManager: Component mounted and initializing...');
  const { 
    sendTaskNotification, 
    sendCalendarNotification, 
    sendTaskStatusNotification, 
    sendProcessNotification, 
    sendJobCandidateNotification,
    sendDiscTestCompletedNotification,
    getUserPhoneByName 
  } = useWhatsApp();

  useEffect(() => {
    console.log('NotificationManager: ⚠️ Real-time notifications DESABILITADAS (Supabase removido)');
    console.log('NotificationManager: Use PostgreSQL API para buscar dados');
    
    // 🚫 SUPABASE REMOVIDO - Real-time desabilitado temporariamente
    // TODO: Implementar real-time via PostgreSQL quando necessário
    
    // 🚫 DESABILITADO - Não buscar settings do Supabase
    // TODO: Implementar busca de settings via API PostgreSQL se necessário
    // const checkSettings = async () => {
    //   try {
    //     const { data: settings } = await from('kv_store_2c4defad')
    //       .select('value')
    //       .eq('key', 'integration_settings')
    //       .single()
    //       .execute();
    //     console.log('NotificationManager: Current integration settings:', settings?.value);
    //   } catch (error) {
    //     console.error('NotificationManager: Error fetching settings:', error);
    //   }
    // };
    
    // 🚫 DESABILITAR TODAS AS SUBSCRIPTIONS - Supabase removido
    // Real-time não está disponível no PostgreSQL ainda
    return () => {
      console.log('NotificationManager: Cleanup (no channels to remove)');
    };
    
    // 🚫 TODAS AS SUBSCRIPTIONS DESABILITADAS - Supabase removido
    // Real-time não está disponível no PostgreSQL ainda
    // TODO: Implementar polling ou WebSockets quando necessário
  }, [sendTaskNotification, sendCalendarNotification, sendTaskStatusNotification, sendProcessNotification, sendJobCandidateNotification, sendDiscTestCompletedNotification, getUserPhoneByName]);

  return <>{children}</>;
}