import { useEffect } from 'react';
import { useWhatsApp } from '@/hooks/useWhatsApp';
import { supabase } from '@/integrations/supabase/client';

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
    console.log('NotificationManager: Setting up listeners...');
    
    // Check current integration settings
    const checkSettings = async () => {
      try {
        const { data: settings } = await supabase
          .from('kv_store_2c4defad')
          .select('value')
          .eq('key', 'integration_settings')
          .single();
        console.log('NotificationManager: Current integration settings:', settings?.value);
      } catch (error) {
        console.error('NotificationManager: Error fetching settings:', error);
      }
    };
    
    checkSettings();
    
    // Listen for new tasks
    const tasksChannel = supabase
      .channel('tasks-notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'tasks'
      }, async (payload) => {
        console.log('NotificationManager: Task INSERT detected', payload);
        try {
          // Get integration settings
          const { data: settings } = await supabase
            .from('kv_store_2c4defad')
            .select('value')
            .eq('key', 'integration_settings')
            .single();

          const integrationSettings = settings?.value as any;
          if (!integrationSettings?.whatsappNotifications) return;
          
          // Check if task notifications are enabled
          if (!integrationSettings.notificationEvents?.includes('task_created')) return;

          // Get user phone for the assigned user
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name, phone')
            .eq('user_id', payload.new.responsible_user_id)
            .single();

          // Use user's phone if available, fallback to default notification phone
          const phone = profile?.phone || integrationSettings.defaultNotificationPhone;
          
          if (phone) {
            await sendTaskNotification(payload.new, phone, profile?.display_name);
          }
        } catch (error) {
          console.error('Error sending task notification:', error);
        }
      })
      .subscribe((status) => {
        console.log('NotificationManager: Tasks channel status:', status);
      });

    // Listen for calendar events
    const calendarChannel = supabase
      .channel('calendar-notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'calendar_events'
      }, async (payload) => {
        console.log('NotificationManager: Calendar event INSERT detected', payload);
        try {
          // Get integration settings
          const { data: settings } = await supabase
            .from('kv_store_2c4defad')
            .select('value')
            .eq('key', 'integration_settings')
            .single();

          const integrationSettings = settings?.value as any;
          if (!integrationSettings?.whatsappNotifications) return;
          
          // Check if calendar notifications are enabled
          if (!integrationSettings.notificationEvents?.includes('calendar_event')) return;

          // For now, use default notification phone
          const phone = integrationSettings.defaultNotificationPhone;
          
          if (phone) {
            await sendCalendarNotification(payload.new, phone);
          }
        } catch (error) {
          console.error('Error sending calendar notification:', error);
        }
      })
      .subscribe((status) => {
        console.log('NotificationManager: Calendar channel status:', status);
      });

    // Listen for task status updates
    const taskUpdatesChannel = supabase
      .channel('task-status-notifications')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'tasks'
      }, async (payload) => {
        console.log('NotificationManager: Task UPDATE detected', payload);
        try {
          // Only notify on status changes
          if (payload.old.status === payload.new.status) return;

          // Get integration settings
          const { data: settings } = await supabase
            .from('kv_store_2c4defad')
            .select('value')
            .eq('key', 'integration_settings')
            .single();

          const integrationSettings = settings?.value as any;
          if (!integrationSettings?.whatsappNotifications) return;
          
          // Check if task status notifications are enabled
          if (!integrationSettings.notificationEvents?.includes('task_status_changed')) return;

          // Get user phone for the assigned user
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name, phone')
            .eq('user_id', payload.new.responsible_user_id)
            .single();

          // Use user's phone if available, fallback to default notification phone
          const phone = profile?.phone || integrationSettings.defaultNotificationPhone;
          
          if (phone) {
            await sendTaskStatusNotification(payload.new, phone, payload.old.status, profile?.display_name);
          }
        } catch (error) {
          console.error('Error sending task status notification:', error);
        }
      })
      .subscribe((status) => {
        console.log('NotificationManager: Task updates channel status:', status);
      });

    // Listen for process creation
    const processesChannel = supabase
      .channel('process-notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'processes'
      }, async (payload) => {
        console.log('🔥 NotificationManager: Process INSERT detected', payload);
        console.log('🔥 Process data:', payload.new);
        try {
          // Get integration settings
          console.log('🔥 Fetching integration settings...');
          const { data: settings } = await supabase
            .from('kv_store_2c4defad')
            .select('value')
            .eq('key', 'integration_settings')
            .single();

          console.log('🔥 Integration settings:', settings?.value);
          const integrationSettings = settings?.value as any;
          
          if (!integrationSettings?.whatsappNotifications) {
            console.log('🔥 WhatsApp notifications disabled, skipping...');
            return;
          }
          
          // Check if process notifications are enabled
          if (!integrationSettings.notificationEvents?.includes('process_created')) {
            console.log('🔥 Process creation notifications disabled in settings, skipping...');
            console.log('🔥 Available events:', integrationSettings.notificationEvents);
            return;
          }

          console.log('🔥 Process notifications enabled, proceeding...');
          const process = payload.new;
          console.log('🔥 Process owner:', process.owner);
          console.log('🔥 Process participants:', process.participants);
          
          // Notify owner
          if (process.owner) {
            console.log('🔥 Getting phone for owner:', process.owner);
            const ownerPhone = await getUserPhoneByName(process.owner);
            console.log('🔥 Owner phone found:', ownerPhone);
            if (ownerPhone) {
              console.log('🔥 Sending notification to owner...');
              await sendProcessNotification(process, ownerPhone, process.owner);
            } else {
              console.log('🔥 No phone found for owner, using fallback...');
              const fallbackPhone = integrationSettings.defaultNotificationPhone || '5519987794141';
              await sendProcessNotification(process, fallbackPhone, process.owner);
            }
          }
          
          // Notify participants
          if (process.participants && process.participants.length > 0) {
            console.log('🔥 Notifying participants...');
            for (const participant of process.participants) {
              if (participant !== process.owner) { // Don't notify owner twice
                console.log('🔥 Getting phone for participant:', participant);
                const participantPhone = await getUserPhoneByName(participant);
                console.log('🔥 Participant phone found:', participantPhone);
                if (participantPhone) {
                  console.log('🔥 Sending notification to participant...');
                  await sendProcessNotification(process, participantPhone, participant);
                } else {
                  console.log('🔥 No phone found for participant, using fallback...');
                  const fallbackPhone = integrationSettings.defaultNotificationPhone || '5519987794141';
                  await sendProcessNotification(process, fallbackPhone, participant);
                }
              }
            }
          }
          console.log('🔥 Process notifications completed successfully');
        } catch (error) {
          console.error('🔥 Error sending process notification:', error);
        }
      })
      .subscribe((status) => {
        console.log('NotificationManager: Process channel status:', status);
      });

    // Listen for new job candidates
    const jobCandidatesChannel = supabase
      .channel('job-candidates-notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'job_responses'
      }, async (payload) => {
        console.log('NotificationManager: New job candidate detected', payload);
        try {
          const { data: survey } = await supabase
            .from('job_surveys')
            .select('title')
            .eq('id', payload.new.survey_id)
            .single();

          const { data: admins } = await supabase
            .from('profiles')
            .select('phone, display_name')
            .eq('role', 'admin')
            .eq('approved', true);

          if (admins && admins.length > 0) {
            for (const admin of admins) {
              if (admin.phone) {
                await sendJobCandidateNotification(
                  { ...payload.new, protocol: `APP-${payload.new.id.split('-')[0].toUpperCase()}` },
                  survey?.title || 'Vaga não especificada',
                  admin.phone
                );
              }
            }
          }
        } catch (error) {
          console.error('Error sending job candidate notification:', error);
        }
      })
      .subscribe((status) => {
        console.log('NotificationManager: Job candidates channel status:', status);
      });

    // Listen for DISC tests completed (candidate_responses)
    const discTestsChannel = supabase
      .channel('disc-tests-notifications')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'candidate_responses'
      }, async (payload) => {
        if (!payload.old.is_completed && payload.new.is_completed) {
          console.log('NotificationManager: DISC test completed', payload);
          try {
            const { data: admins } = await supabase
              .from('profiles')
              .select('phone, display_name')
              .eq('role', 'admin')
              .eq('approved', true);

            if (admins && admins.length > 0) {
              for (const admin of admins) {
                if (admin.phone) {
                  await sendDiscTestCompletedNotification(payload.new, admin.phone);
                }
              }
            }
          } catch (error) {
            console.error('Error sending DISC test notification:', error);
          }
        }
      })
      .subscribe((status) => {
        console.log('NotificationManager: DISC tests channel status:', status);
      });

    // Listen for internal DISC tests completed (disc_responses)
    const internalDiscTestsChannel = supabase
      .channel('internal-disc-tests-notifications')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'disc_responses'
      }, async (payload) => {
        if (!payload.old.is_completed && payload.new.is_completed) {
          console.log('NotificationManager: Internal DISC test completed', payload);
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('display_name, department')
              .eq('user_id', payload.new.user_id)
              .single();

            const { data: admins } = await supabase
              .from('profiles')
              .select('phone, display_name')
              .eq('role', 'admin')
              .eq('approved', true);

            if (admins && admins.length > 0) {
              for (const admin of admins) {
                if (admin.phone) {
                  await sendDiscTestCompletedNotification({
                    ...payload.new,
                    name: profile?.display_name || 'Não informado',
                    company: profile?.department || 'Colaborador Interno'
                  }, admin.phone);
                }
              }
            }
          } catch (error) {
            console.error('Error sending internal DISC test notification:', error);
          }
        }
      })
      .subscribe((status) => {
        console.log('NotificationManager: Internal DISC tests channel status:', status);
      });

    return () => {
      supabase.removeChannel(tasksChannel);
      supabase.removeChannel(calendarChannel);
      supabase.removeChannel(taskUpdatesChannel);
      supabase.removeChannel(processesChannel);
      supabase.removeChannel(jobCandidatesChannel);
      supabase.removeChannel(discTestsChannel);
      supabase.removeChannel(internalDiscTestsChannel);
    };
  }, [sendTaskNotification, sendCalendarNotification, sendTaskStatusNotification, sendProcessNotification, sendJobCandidateNotification, sendDiscTestCompletedNotification, getUserPhoneByName]);

  return <>{children}</>;
}