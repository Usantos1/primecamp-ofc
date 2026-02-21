/**
 * Cliente HTTP centralizado para a API
 * 
 * Este arquivo é o cliente HTTP para comunicação com a API.
 * Todas as requisições passam por aqui.
 * Em caso de 429 (Too Many Requests), as requisições são repetidas com backoff.
 */

import { fetchWithRetry } from '@/utils/fetchWithRetry';

// Usar VITE_API_URL se definida (permite localhost em dev); senão API de produção
const API_URL = import.meta.env.VITE_API_URL || 'https://api.primecamp.cloud/api';

// Validação de segurança
if (API_URL.includes('.supabase.co')) {
  throw new Error('CONFIGURAÇÃO INVÁLIDA: API_URL não pode apontar para Supabase');
}

// API Client inicializado silenciosamente

interface ApiResponse {
  data?: any;
  error?: string;
}

class APIClient {
  private baseURL: string;

  constructor() {
    this.baseURL = API_URL;
  }

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

  private async handleResponse(response: Response): Promise<any> {
    if (response.status === 401) {
      // Não redirecionar para login se estivermos em uma rota pública
      const currentPath = window.location.pathname;
      const isPublicRoute = currentPath.startsWith('/vaga/') || 
                            currentPath.startsWith('/vagas') || 
                            currentPath.startsWith('/candidatura/') ||
                            currentPath.startsWith('/acompanhar-candidatura/') ||
                            currentPath.startsWith('/job-application/') ||
                            currentPath.startsWith('/acompanhar-os/') ||
                            currentPath.startsWith('/login') ||
                            currentPath.startsWith('/auth') ||
                            currentPath.startsWith('/reset-password') ||
                            currentPath.startsWith('/candidato-disc') ||
                            currentPath.startsWith('/disc-externo');
      
      if (!isPublicRoute) {
        localStorage.removeItem('auth_token');
        window.location.href = '/login';
        throw new Error('Sessão expirada');
      }
      // Para rotas públicas, apenas retornar o erro sem redirecionar
    }

    let data: any = {};
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      try {
        data = await response.json();
      } catch (e) {
        console.warn('[API Client] Failed to parse JSON response:', e);
      }
    } else {
      const text = await response.text().catch(() => '');
      if (text) {
        console.warn('[API Client] Non-JSON response:', text.substring(0, 100));
      }
    }
    
    if (!response.ok) {
      const errorMessage = data.error || data.message || `Erro ${response.status}: ${response.statusText}`;
      const error: any = new Error(errorMessage);
      error.status = response.status;
      error.data = data;
      console.error('[API Client] Request failed:', {
        status: response.status,
        statusText: response.statusText,
        url: response.url,
        error: errorMessage,
        data
      });
      throw error;
    }

    return data;
  }

  async get(endpoint: string): Promise<ApiResponse> {
    try {
      const url = `${this.baseURL}${endpoint}`;
      console.log('[API Client] GET:', url);
      const response = await fetchWithRetry(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });
      console.log('[API Client] Response status:', response.status, response.statusText);
      const data = await this.handleResponse(response);
      return { data };
    } catch (error: any) {
      console.error('[API] GET error:', error);
      return { error: error.message };
    }
  }

  async post(endpoint: string, body?: any, customHeaders?: Record<string, string>): Promise<ApiResponse> {
    try {
      const url = `${this.baseURL}${endpoint}`;
      console.log('[API Client] POST:', url, body);
      const response = await fetchWithRetry(url, {
        method: 'POST',
        headers: { ...this.getHeaders(), ...customHeaders },
        body: body ? JSON.stringify(body) : undefined,
      });
      console.log('[API Client] Response status:', response.status, response.statusText);
      const data = await this.handleResponse(response);
      return { data };
    } catch (error: any) {
      console.error('[API] POST error:', error);
      return { 
        error: {
          message: error.message,
          status: error.status,
          data: error.data
        }
      };
    }
  }

  async put(endpoint: string, body?: any): Promise<ApiResponse> {
    try {
      const response = await fetchWithRetry(`${this.baseURL}${endpoint}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await this.handleResponse(response);
      return { data };
    } catch (error: any) {
      console.error('[API] PUT error:', error);
      return { error: error.message };
    }
  }

  async patch(endpoint: string, body?: any): Promise<ApiResponse> {
    try {
      const response = await fetchWithRetry(`${this.baseURL}${endpoint}`, {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await this.handleResponse(response);
      return { data };
    } catch (error: any) {
      console.error('[API] PATCH error:', error);
      return { error: error.message };
    }
  }

  async delete(endpoint: string): Promise<ApiResponse> {
    try {
      const response = await fetchWithRetry(`${this.baseURL}${endpoint}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });
      const data = await this.handleResponse(response);
      return { data };
    } catch (error: any) {
      console.error('[API] DELETE error:', error);
      return { error: error.message };
    }
  }

  /**
   * Invoca uma função customizada no backend
   */
  async invokeFunction(functionName: string, body?: any, headers?: Record<string, string>): Promise<ApiResponse> {
    return this.post(`/functions/${functionName}`, body, headers);
  }

  /**
   * Upload de arquivo
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

      const response = await fetchWithRetry(`${this.baseURL}${endpoint}`, {
        method: 'POST',
        headers,
        body: formData,
      });

      const data = await this.handleResponse(response);
      return { data };
    } catch (error: any) {
      console.error('[API] Upload error:', error);
      return { error: error.message };
    }
  }
}

export const apiClient = new APIClient();
export default apiClient;
