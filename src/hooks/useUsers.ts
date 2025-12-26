import { useState, useEffect } from 'react';
import { from } from '@/integrations/db/client';

export interface User {
  id: string;
  user_id: string;
  display_name: string;
  department?: string;
  role: string;
  approved: boolean;
  phone?: string;
  avatar_url?: string;
}

export const useUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id, 
          user_id, 
          display_name, 
          department, 
          role, 
          approved, 
          phone, 
          avatar_url
        `)
        .order('display_name')
        .execute();

      if (error) {
        console.error('Error fetching users:', error);
        return;
      }

      const formattedUsers: User[] = (data || []).map(profile => ({
        id: profile.user_id,
        user_id: profile.user_id,
        display_name: profile.display_name || 'Usuário sem nome',
        department: profile.department,
        role: profile.role,
        approved: profile.approved,
        phone: profile.phone,
        avatar_url: profile.avatar_url
      }));

      setUsers(formattedUsers);
    } catch (error) {
      console.error('Error in fetchUsers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return {
    users,
    loading,
    refetch: fetchUsers
  };
};