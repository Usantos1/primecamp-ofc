import { useState, useEffect } from 'react';
import { from } from '@/integrations/db/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { useUserLogs } from '@/hooks/useUserLogs';

export interface TimeClockRecord {
  id: string;
  user_id: string;
  date: string;
  clock_in?: string;
  clock_out?: string;
  break_start?: string;
  break_end?: string;
  lunch_start?: string;
  lunch_end?: string;
  total_hours?: string;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
  location?: string;
  ip_address?: string;
  created_at: string;
  updated_at: string;
  user_name?: string;
}

export const useTimeClock = () => {
  const { user } = useAuth();
  const { logActivity } = useUserLogs();
  const [records, setRecords] = useState<TimeClockRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayRecord, setTodayRecord] = useState<TimeClockRecord | null>(null);

  const fetchRecords = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const { data, error } = await from('time_clock')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(30)
        .execute();

      if (error) {
        console.error('Error fetching time records:', error);
        return;
      }

      const formattedRecords: TimeClockRecord[] = (data || []).map(record => {
        // Converter location para string se for objeto
        let locationString: string | null = null;
        if (record.location) {
          if (typeof record.location === 'string') {
            locationString = record.location;
          } else if (typeof record.location === 'object') {
            // Se for objeto com latitude e longitude
            if ('latitude' in record.location && 'longitude' in record.location) {
              locationString = `${record.location.latitude}, ${record.location.longitude}`;
            } else {
              // Tentar converter para string
              locationString = JSON.stringify(record.location);
            }
          } else {
            locationString = String(record.location);
          }
        }
        
        return {
          id: record.id,
          user_id: record.user_id,
          date: record.date,
          clock_in: record.clock_in,
          clock_out: record.clock_out,
          break_start: record.break_start,
          break_end: record.break_end,
          lunch_start: record.lunch_start,
          lunch_end: record.lunch_end,
          total_hours: record.total_hours as string,
          status: record.status as 'pending' | 'approved' | 'rejected',
          notes: record.notes,
          location: locationString,
          ip_address: record.ip_address,
          created_at: record.created_at,
          updated_at: record.updated_at,
          user_name: 'Usuário'
        };
      });

      setRecords(formattedRecords);

      // Get today's record - comparar apenas a parte da data (YYYY-MM-DD)
      const today = new Date().toISOString().split('T')[0];
      const todaysRecord = formattedRecords.find(r => {
        // Normalizar a data do registro para comparação
        const recordDate = r.date ? r.date.split('T')[0] : '';
        return recordDate === today && r.user_id === user.id;
      });
      
      console.log('[TimeClock] Today:', today, 'Records:', formattedRecords.length, 'TodayRecord:', todaysRecord);
      setTodayRecord(todaysRecord || null);
    } catch (error) {
      console.error('Error in fetchRecords:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLocation = async (): Promise<{location: string, ip: string}> => {
    try {
      // Get IP address with multiple fallbacks
      let ipAddress = 'Não disponível';
      try {
        // Try multiple IP services as backup
        const ipServices = [
          'https://api.ipify.org?format=json',
          'https://ipapi.co/json/',
          'https://httpbin.org/ip'
        ];
        
        for (const service of ipServices) {
          try {
            const response = await fetch(service);
            const data = await response.json();
            if (data.ip) {
              ipAddress = data.ip;
              break;
            }
            if (data.origin) { // httpbin format
              ipAddress = data.origin;
              break;
            }
          } catch (serviceError) {
            console.warn(`Failed to get IP from ${service}:`, serviceError);
            continue;
          }
        }
      } catch (error) {
        console.warn('Failed to get IP:', error);
      }

      // Then get geolocation
      return new Promise((resolve) => {
        if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = `${position.coords.latitude}, ${position.coords.longitude}`;
          resolve({ location, ip: ipAddress });
        },
        (error) => {
          console.warn('Geolocation error:', error);
          resolve({ location: 'Permissão negada', ip: ipAddress });
        },
        { 
          enableHighAccuracy: true,
          timeout: 25000, // Enhanced for mobile devices
          maximumAge: 30000 // Faster refresh for real-time accuracy
        }
          );
        } else {
          resolve({ location: 'Não suportado', ip: ipAddress });
        }
      });
    } catch (error) {
      console.error('Error in getLocation:', error);
      return { location: 'Erro', ip: 'Não disponível' };
    }
  };

  const clockIn = async () => {
    if (!user) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      const now = new Date().toISOString();

      // Check if already clocked in today within the same minute
      const existingRecord = await from('time_clock')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .single();

      if (existingRecord.data?.clock_in) {
        const existingTime = new Date(existingRecord.data.clock_in);
        const currentTime = new Date(now);
        const timeDiff = Math.abs(currentTime.getTime() - existingTime.getTime());
        
        if (timeDiff < 60000) { // Less than 1 minute
          toast({
            title: "Aviso",
            description: "Você já registrou entrada recentemente",
            variant: "destructive"
          });
          return;
        }
      }

      const { location, ip } = await getLocation();

      let data, error;
      if (existingRecord.data?.id) {
        // Update existing record
        const result = await from('time_clock')
          .eq('id', existingRecord.data.id)
          .update({
            clock_in: now,
            location,
            ip_address: ip
          })
          .execute();
        data = existingRecord.data;
        error = result.error;
      } else {
        // Insert new record
        const result = await from('time_clock')
          .insert({
            user_id: user.id,
            date: today,
            clock_in: now,
            location,
            ip_address: ip,
            status: 'pending'
          })
          .select('*')
          .single();
        data = result.data;
        error = result.error;
      }

      if (error) {
        toast({
          title: "Erro",
          description: "Erro ao registrar entrada",
          variant: "destructive"
        });
        return;
      }

      // Log activity
      await logActivity('time_clock', 'Registro de entrada', 'time_clock', data?.id || '');

      toast({
        title: "Entrada registrada",
        description: "Horário de entrada registrado com sucesso"
      });

      fetchRecords();
    } catch (error) {
      console.error('Error clocking in:', error);
    }
  };

  const clockOut = async () => {
    if (!user || !todayRecord) return;

    try {
      const now = new Date().toISOString();
      
      // Calculate total hours
      const clockInTime = new Date(todayRecord.clock_in!);
      const clockOutTime = new Date(now);
      const totalMs = clockOutTime.getTime() - clockInTime.getTime();
      const totalHours = Math.floor(totalMs / (1000 * 60 * 60));
      const totalMinutes = Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60));
      const totalHoursFormatted = `${totalHours}:${totalMinutes.toString().padStart(2, '0')}:00`;

      const { error } = await from('time_clock')
        .eq('id', todayRecord.id)
        .update({
          clock_out: now,
          total_hours: totalHoursFormatted
        })
        .execute();

      if (error) {
        toast({
          title: "Erro",
          description: "Erro ao registrar saída",
          variant: "destructive"
        });
        return;
      }

      // Log activity
      await logActivity('time_clock', 'Registro de saída', 'time_clock', todayRecord.id);

      toast({
        title: "Saída registrada",
        description: "Horário de saída registrado com sucesso"
      });

      fetchRecords();
    } catch (error) {
      console.error('Error clocking out:', error);
    }
  };

  const startBreak = async () => {
    if (!user || !todayRecord) return;

    try {
      const now = new Date().toISOString();

      const { error } = await from('time_clock')
        .eq('id', todayRecord.id)
        .update({
          break_start: now
        })
        .execute();

      if (error) {
        toast({
          title: "Erro",
          description: "Erro ao iniciar pausa",
          variant: "destructive"
        });
        return;
      }

      // Log activity
      await logActivity('time_clock', 'Início de pausa', 'time_clock', todayRecord.id);

      toast({
        title: "Pausa iniciada",
        description: "Horário de pausa registrado"
      });

      fetchRecords();
    } catch (error) {
      console.error('Error starting break:', error);
    }
  };

  const endBreak = async () => {
    if (!user || !todayRecord) return;

    try {
      const now = new Date().toISOString();

      const { error } = await from('time_clock')
        .eq('id', todayRecord.id)
        .update({
          break_end: now
        })
        .execute();

      if (error) {
        toast({
          title: "Erro",
          description: "Erro ao finalizar pausa",
          variant: "destructive"
        });
        return;
      }

      // Log activity
      await logActivity('time_clock', 'Fim de pausa', 'time_clock', todayRecord.id);

      toast({
        title: "Pausa finalizada",
        description: "Retorno da pausa registrado"
      });

      fetchRecords();
    } catch (error) {
      console.error('Error ending break:', error);
    }
  };

  const startLunch = async () => {
    if (!user || !todayRecord) return;

    try {
      const now = new Date().toISOString();

      const { error } = await from('time_clock')
        .eq('id', todayRecord.id)
        .update({
          lunch_start: now
        })
        .execute();

      if (error) {
        toast({
          title: "Erro",
          description: "Erro ao iniciar almoço",
          variant: "destructive"
        });
        return;
      }

      // Log activity
      await logActivity('time_clock', 'Início de almoço', 'time_clock', todayRecord.id);

      toast({
        title: "Almoço iniciado",
        description: "Saída para almoço registrada"
      });

      fetchRecords();
    } catch (error) {
      console.error('Error starting lunch:', error);
    }
  };

  const endLunch = async () => {
    if (!user || !todayRecord) return;

    try {
      const now = new Date().toISOString();

      const { error } = await from('time_clock')
        .eq('id', todayRecord.id)
        .update({
          lunch_end: now
        })
        .execute();

      if (error) {
        toast({
          title: "Erro",
          description: "Erro ao finalizar almoço",
          variant: "destructive"
        });
        return;
      }

      // Log activity
      await logActivity('time_clock', 'Fim de almoço', 'time_clock', todayRecord.id);

      toast({
        title: "Almoço finalizado",
        description: "Retorno do almoço registrado"
      });

      fetchRecords();
    } catch (error) {
      console.error('Error ending lunch:', error);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [user]);

  return {
    records,
    loading,
    todayRecord,
    clockIn,
    clockOut,
    startBreak,
    endBreak,
    startLunch,
    endLunch,
    refetch: fetchRecords
  };
};