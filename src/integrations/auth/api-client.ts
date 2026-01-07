/**
 * Cliente de Autenticação - API REST
 * 
 * Este arquivo gerencia toda a autenticação do sistema.
 * Todas as operações passam pela API em api.primecamp.cloud
 */

// Configurar URL da API
// Em desenvolvimento local, usar localhost:3000
// Em produção, usar api.primecamp.cloud
const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.DEV 
    ? 'http://localhost:3000/api' 
    : 'https://api.primecamp.cloud/api');

// Validação de segurança
if (API_URL.includes('.supabase.co')) {
  throw new Error('CONFIGURAÇÃO INVÁLIDA: API_URL não pode apontar para Supabase');
}

console.log('[Auth] ✅ Cliente de autenticação inicializado:', API_URL);

// Limpar qualquer token antigo de outros sistemas
const cleanOldTokens = () => {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.includes('sb-') || key.includes('supabase'))) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
    console.log('[Auth] Removido token antigo:', key);
  });
};

// Executar limpeza ao carregar
cleanOldTokens();

interface User {
  id: string;
  email: string;
  role?: string;
  profile?: any;
  company_id?: string;
}

interface AuthResponse {
  data?: {
    user?: User;
    token?: string;
    session?: any;
  };
  error?: {
    message: string;
    code?: string;
  };
}

class AuthAPIClient {
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const token = localStorage.getItem('auth_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: { message: data.error || data.message || 'Erro ao fazer login' } };
      }

      // Salvar token
      if (data.token) {
        localStorage.setItem('auth_token', data.token);
      }

      return { data: { user: data.user, token: data.token } };
    } catch (error: any) {
      console.error('[Auth] Erro no login:', error);
      return { error: { message: error.message || 'Erro de conexão' } };
    }
  }

  async signup(email: string, password: string, userData?: any): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, ...userData }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: { message: data.error || data.message || 'Erro ao criar conta' } };
      }

      return { data: { user: data.user } };
    } catch (error: any) {
      console.error('[Auth] Erro no signup:', error);
      return { error: { message: error.message || 'Erro de conexão' } };
    }
  }

  async logout(): Promise<void> {
    try {
      const token = localStorage.getItem('auth_token');
      if (token) {
        await fetch(`${API_URL}/auth/logout`, {
          method: 'POST',
          headers: this.getHeaders(),
        }).catch(() => {});
      }
    } finally {
      localStorage.removeItem('auth_token');
      cleanOldTokens();
    }
  }

  async getCurrentUser(): Promise<AuthResponse> {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        return { data: { user: undefined } };
      }

      const response = await fetch(`${API_URL}/auth/me`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('auth_token');
        }
        return { data: { user: undefined } };
      }

      const data = await response.json();
      return { data: { user: data.user, profile: data.profile } };
    } catch (error: any) {
      console.error('[Auth] Erro ao obter usuário:', error);
      return { data: { user: undefined } };
    }
  }

  async resetPassword(email: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: { message: data.error || data.message || 'Erro ao resetar senha' } };
      }

      return { data: {} };
    } catch (error: any) {
      console.error('[Auth] Erro no reset de senha:', error);
      return { error: { message: error.message || 'Erro de conexão' } };
    }
  }

  async updatePassword(newPassword: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_URL}/auth/update-password`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ password: newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: { message: data.error || data.message || 'Erro ao atualizar senha' } };
      }

      return { data: {} };
    } catch (error: any) {
      console.error('[Auth] Erro ao atualizar senha:', error);
      return { error: { message: error.message || 'Erro de conexão' } };
    }
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('auth_token');
  }

  getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  // Método de compatibilidade para código legado que usa getSession()
  async getSession(): Promise<{ data: { session: { access_token: string } | null }; error: any }> {
    const token = localStorage.getItem('auth_token');
    if (token) {
      return { 
        data: { 
          session: { 
            access_token: token 
          } 
        }, 
        error: null 
      };
    }
    return { data: { session: null }, error: null };
  }
}

export const authAPI = new AuthAPIClient();
export default authAPI;
