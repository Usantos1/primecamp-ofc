/**
 * Cliente HTTP centralizado para comunicação com a API
 * Substitui todas as chamadas diretas ao Supabase
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 
  (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:3000/api' 
    : 'https://api.primecamp.cloud/api');

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
  details?: any;
}

export interface ApiError {
  error: string;
  message: string;
  details?: any;
  status?: number;
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  /**
   * Obtém headers padrão com autenticação
   */
  private getHeaders(customHeaders?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...customHeaders,
    };

    // Adicionar token de autenticação se existir
    const token = localStorage.getItem('auth_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  /**
   * Trata erros da API
   */
  private async handleError(response: Response): Promise<ApiError> {
    let errorData: any;
    try {
      errorData = await response.json();
    } catch {
      errorData = { error: 'Erro desconhecido', message: response.statusText };
    }

    const error: ApiError = {
      error: errorData.error || 'Erro na requisição',
      message: errorData.message || errorData.error || response.statusText,
      details: errorData.details,
      status: response.status,
    };

    // Tratamento específico por status code
    if (response.status === 401) {
      // Token inválido ou expirado - limpar e redirecionar para login
      localStorage.removeItem('auth_token');
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    } else if (response.status === 403) {
      // Acesso negado
      console.error('Acesso negado:', error.message);
    } else if (response.status >= 500) {
      // Erro do servidor
      console.error('Erro do servidor:', error.message);
    }

    return error;
  }

  /**
   * Faz uma requisição GET
   */
  async get<T = any>(endpoint: string, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'GET',
        headers: this.getHeaders(headers),
      });

      if (!response.ok) {
        const error = await this.handleError(response);
        return { error: error.message };
      }

      const data = await response.json();
      return { data };
    } catch (error: any) {
      console.error('Erro na requisição GET:', error);
      return { error: error.message || 'Erro ao fazer requisição' };
    }
  }

  /**
   * Faz uma requisição POST
   */
  async post<T = any>(endpoint: string, body?: any, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'POST',
        headers: this.getHeaders(headers),
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const error = await this.handleError(response);
        return { error: error.message };
      }

      const data = await response.json();
      return { data };
    } catch (error: any) {
      console.error('Erro na requisição POST:', error);
      return { error: error.message || 'Erro ao fazer requisição' };
    }
  }

  /**
   * Faz uma requisição PUT
   */
  async put<T = any>(endpoint: string, body?: any, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'PUT',
        headers: this.getHeaders(headers),
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const error = await this.handleError(response);
        return { error: error.message };
      }

      const data = await response.json();
      return { data };
    } catch (error: any) {
      console.error('Erro na requisição PUT:', error);
      return { error: error.message || 'Erro ao fazer requisição' };
    }
  }

  /**
   * Faz uma requisição PATCH
   */
  async patch<T = any>(endpoint: string, body?: any, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'PATCH',
        headers: this.getHeaders(headers),
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const error = await this.handleError(response);
        return { error: error.message };
      }

      const data = await response.json();
      return { data };
    } catch (error: any) {
      console.error('Erro na requisição PATCH:', error);
      return { error: error.message || 'Erro ao fazer requisição' };
    }
  }

  /**
   * Faz uma requisição DELETE
   */
  async delete<T = any>(endpoint: string, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'DELETE',
        headers: this.getHeaders(headers),
      });

      if (!response.ok) {
        const error = await this.handleError(response);
        return { error: error.message };
      }

      const data = await response.json().catch(() => ({}));
      return { data };
    } catch (error: any) {
      console.error('Erro na requisição DELETE:', error);
      return { error: error.message || 'Erro ao fazer requisição' };
    }
  }

  /**
   * Faz upload de arquivo
   */
  async uploadFile(endpoint: string, file: File | Blob, fieldName: string = 'file', additionalData?: Record<string, any>): Promise<ApiResponse> {
    try {
      const formData = new FormData();
      formData.append(fieldName, file);
      
      if (additionalData) {
        Object.entries(additionalData).forEach(([key, value]) => {
          formData.append(key, typeof value === 'string' ? value : JSON.stringify(value));
        });
      }

      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) {
        const error = await this.handleError(response);
        return { error: error.message };
      }

      const data = await response.json();
      return { data };
    } catch (error: any) {
      console.error('Erro no upload:', error);
      return { error: error.message || 'Erro ao fazer upload' };
    }
  }

  /**
   * Invoca uma função/endpoint customizado (substitui supabase.functions.invoke)
   */
  async invokeFunction(functionName: string, body?: any): Promise<ApiResponse> {
    return this.post(`/functions/${functionName}`, body);
  }
}

// Instância singleton do cliente
export const apiClient = new ApiClient();

// Exportar também como default para compatibilidade
export default apiClient;

