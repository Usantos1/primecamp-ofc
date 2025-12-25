/**
 * Cliente de autenticação para API PostgreSQL
 * Substitui o Supabase Auth
 */

const API_URL = import.meta.env.VITE_API_URL || 'https://api.primecamp.cloud/api';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupData {
  email: string;
  password: string;
  display_name?: string;
  phone?: string;
  department?: string;
  role?: 'admin' | 'member';
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    email_verified: boolean;
    created_at: string;
  };
  profile: any;
}

export interface User {
  id: string;
  email: string;
  email_verified: boolean;
  created_at: string;
}

class AuthAPIClient {
  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    // Obter token do localStorage
    const token = localStorage.getItem('auth_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    console.log('[authAPI] Fazendo login via API PostgreSQL:', { 
      apiUrl: API_URL,
      email: credentials.email 
    });
    
    // 🚫 GARANTIR que não está usando Supabase
    if (API_URL.includes('supabase.co')) {
      throw new Error('🚫 ERRO: API_URL ainda aponta para Supabase! Configure VITE_API_URL corretamente.');
    }
    
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Erro ao fazer login' }));
      console.error('[authAPI] Erro no login:', error);
      throw new Error(error.error || 'Erro ao fazer login');
    }

    const data = await response.json();
    console.log('[authAPI] Login bem-sucedido:', { 
      userId: data.user?.id, 
      email: data.user?.email,
      hasToken: !!data.token 
    });
    
    // Limpar QUALQUER token do Supabase que possa estar no localStorage
    Object.keys(localStorage).forEach(key => {
      if (key.includes('supabase') || key.includes('sb-')) {
        localStorage.removeItem(key);
        console.log('[authAPI] Removido token Supabase:', key);
      }
    });
    
    // Salvar token no localStorage (PostgreSQL API)
    if (data.token) {
      localStorage.setItem('auth_token', data.token);
      console.log('[authAPI] Token salvo como auth_token');
    } else {
      console.warn('[authAPI] AVISO: Login bem-sucedido mas sem token!');
    }

    return data;
  }

  async signup(data: SignupData): Promise<AuthResponse> {
    const response = await fetch(`${API_URL}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro ao criar conta');
    }

    const result = await response.json();
    
    // Salvar token no localStorage
    if (result.token) {
      localStorage.setItem('auth_token', result.token);
    }

    return result;
  }

  async logout(): Promise<void> {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
      });
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    } finally {
      // Sempre remover token do localStorage
      localStorage.removeItem('auth_token');
    }
  }

  async getCurrentUser(): Promise<{ user: User; profile: any } | null> {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      return null;
    }

    try {
      const response = await fetch(`${API_URL}/auth/me`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        // Token inválido ou expirado
        localStorage.removeItem('auth_token');
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('Erro ao buscar usuário atual:', error);
      localStorage.removeItem('auth_token');
      return null;
    }
  }

  getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  // Métodos compatíveis com Supabase Auth para facilitar migração
  async getUser(): Promise<{ data: { user: User | null }; error: any | null }> {
    try {
      const currentUser = await this.getCurrentUser();
      return {
        data: { user: currentUser?.user || null },
        error: null,
      };
    } catch (error: any) {
      return {
        data: { user: null },
        error: { message: error.message || 'Erro ao buscar usuário' },
      };
    }
  }

  async getSession(): Promise<{ data: { session: { access_token: string } | null }; error: any | null }> {
    try {
      const token = this.getToken();
      if (!token) {
        return {
          data: { session: null },
          error: null,
        };
      }

      // Verificar se token ainda é válido
      const currentUser = await this.getCurrentUser();
      if (!currentUser) {
        return {
          data: { session: null },
          error: null,
        };
      }

      return {
        data: { session: { access_token: token } },
        error: null,
      };
    } catch (error: any) {
      return {
        data: { session: null },
        error: { message: error.message || 'Erro ao buscar sessão' },
      };
    }
  }
}

export const authAPI = new AuthAPIClient();

