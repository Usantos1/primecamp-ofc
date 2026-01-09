import React, { createContext, useContext, useEffect, useState } from 'react';
import { authAPI, User } from '@/integrations/auth/api-client';
import { from } from '@/integrations/db/client';

interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  role: 'admin' | 'member';
  department: string | null;
  phone: string | null;
  approved: boolean;
  approved_at: string | null;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: { token: string } | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isApproved: boolean;
  refreshPermissions: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<{ token: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    console.log('Fetching profile for user:', userId);
    try {
      const { data, error } = await from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
        return;
      }

      console.log('Profile fetched:', data);
      setProfile(data as Profile);
      
      // Disparar evento customizado para recarregar permissões
      window.dispatchEvent(new CustomEvent('permissions-changed'));
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const checkAuth = async () => {
    try {
      const response = await authAPI.getCurrentUser();
      const authData = response?.data;
      
      if (authData?.user) {
        setUser(authData.user);
        const token = authAPI.getToken();
        if (token) {
          setSession({ token });
        }
        
        if (authData.profile) {
          setProfile(authData.profile as Profile);
        } else if (authData.user?.id) {
          // Se não tem profile, tentar buscar
          await fetchProfile(authData.user.id);
        }
      } else {
        setUser(null);
        setSession(null);
        setProfile(null);
      }
    } catch (error) {
      console.error('Error checking auth:', error);
      setUser(null);
      setSession(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Verificar autenticação ao montar o componente
    checkAuth();

    // Listener para mudanças no localStorage (logout de outras abas)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'auth_token') {
        checkAuth();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Verificar autenticação periodicamente (a cada 5 minutos)
    const interval = setInterval(() => {
      if (authAPI.isAuthenticated()) {
        checkAuth();
      }
    }, 5 * 60 * 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  // Listener para atualizar o profile em tempo real (sem reload de página)
  useEffect(() => {
    const handleProfileChanged = () => {
      if (user?.id) {
        fetchProfile(user.id);
      }
    };

    window.addEventListener('profile-changed', handleProfileChanged as EventListener);
    return () => window.removeEventListener('profile-changed', handleProfileChanged as EventListener);
  }, [user?.id]);

  const signOut = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      // Limpar estado
      setUser(null);
      setSession(null);
      setProfile(null);
      // Limpar token do localStorage
      localStorage.removeItem('auth_token');
      // Redirecionar para login
      window.location.href = '/login';
    }
  };

  // Função para recarregar permissões (dispara evento que será ouvido pelo usePermissions)
  const refreshPermissions = () => {
    window.dispatchEvent(new CustomEvent('permissions-changed'));
  };

  // Verificar role do user_roles (aceita variações)
  const adminRoles = ['admin', 'administrador', 'administrator'];
  const isAdmin = profile?.role ? adminRoles.includes(profile.role.toLowerCase()) : false;
  const isApproved = profile?.approved === true;

  // Cache do status de admin no localStorage para acesso rápido
  useEffect(() => {
    if (profile?.role) {
      const adminStatus = adminRoles.includes(profile.role.toLowerCase());
      localStorage.setItem('user_is_admin', adminStatus.toString());
    }
    if (!user && !loading) {
      localStorage.removeItem('user_is_admin');
    }
  }, [profile?.role, user, loading]);

  const value = {
    user,
    session,
    profile,
    loading,
    signOut,
    isAdmin,
    isApproved,
    refreshPermissions
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};