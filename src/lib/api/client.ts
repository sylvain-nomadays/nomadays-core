/**
 * API Client for FastAPI backend
 * Handles authentication with Supabase JWT tokens
 */

import { createClient } from '@/lib/supabase/client';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface ApiError {
  detail: string;
  status: number;
}

type TokenGetter = () => Promise<string | null>;

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;
  private tokenGetter: TokenGetter | null = null;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Set a static token (used by useAuth hook)
   */
  setToken(token: string) {
    this.token = token;
  }

  /**
   * Clear the token
   */
  clearToken() {
    this.token = null;
  }

  /**
   * Set a function to dynamically get the token
   * This is useful for server-side or when token might refresh
   */
  setTokenGetter(getter: TokenGetter) {
    this.tokenGetter = getter;
  }

  /**
   * Get the current token (either static or from getter, or from Supabase)
   */
  private async getToken(): Promise<string | null> {
    // First check static token
    if (this.token) {
      return this.token;
    }

    // Then check token getter
    if (this.tokenGetter) {
      return this.tokenGetter();
    }

    // Finally, try to get from Supabase directly (client-side only)
    if (typeof window !== 'undefined') {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        return session?.access_token ?? null;
      } catch {
        return null;
      }
    }

    return null;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Get token and add to headers
    const token = await this.getToken();
    console.log('[apiClient] Token for request:', {
      hasToken: !!token,
      tokenPreview: token ? token.substring(0, 20) + '...' : null,
      staticToken: !!this.token,
      endpoint
    });
    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error: ApiError = {
        detail: 'An error occurred',
        status: response.status,
      };

      try {
        const data = await response.json();
        error.detail = data.detail || error.detail;
      } catch {
        // Ignore JSON parse errors
      }

      // Handle specific error codes
      if (response.status === 401) {
        error.detail = 'Session expirée. Veuillez vous reconnecter.';
        // Could trigger a logout here
      } else if (response.status === 403) {
        error.detail = 'Accès non autorisé.';
      }

      throw error;
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  // GET request
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  // POST request
  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // PUT request
  async put<T>(endpoint: string, data: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // PATCH request
  async patch<T>(endpoint: string, data: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // DELETE request
  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // UPLOAD request (for file uploads with FormData)
  async upload<T>(endpoint: string, formData: FormData): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {};

    // Get token and add to headers
    const token = await this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Note: Don't set Content-Type for FormData - browser will set it with boundary
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error: ApiError = {
        detail: 'An error occurred',
        status: response.status,
      };

      try {
        const data = await response.json();
        error.detail = data.detail || error.detail;
      } catch {
        // Ignore JSON parse errors
      }

      throw error;
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }
}

// Singleton instance
export const apiClient = new ApiClient();

// Export types
export type { ApiError };
