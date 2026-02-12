/**
 * API Client for FastAPI backend
 * Handles authentication with Supabase JWT tokens
 *
 * Uses Next.js rewrites to proxy /api/* requests to the backend.
 * This avoids CORS issues and browser blocking.
 */

import { createClient } from '@/lib/supabase/client';

// Use relative URL to go through Next.js proxy (configured in next.config.ts)
// The proxy rewrites /api/* to http://localhost:8000/*
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

/**
 * API Error class — extends Error so Next.js error handlers
 * can properly display the message (avoids [object Object]).
 */
export class ApiError extends Error {
  detail: string;
  status: number;

  constructor(detail: string, status: number) {
    super(detail);
    this.name = 'ApiError';
    this.detail = detail;
    this.status = status;
  }
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
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('[apiClient.getToken] Supabase error:', error);
          return null;
        }
        console.log('[apiClient.getToken] Session:', session ? 'found' : 'not found');
        return session?.access_token ?? null;
      } catch (err) {
        console.error('[apiClient.getToken] Exception:', err);
        return null;
      }
    }

    return null;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    // Ensure endpoint starts with /api for the Next.js proxy
    // Skip if endpoint already starts with /api
    const normalizedEndpoint = endpoint.startsWith('/api') ? endpoint : `/api${endpoint}`;
    const url = `${this.baseUrl}${normalizedEndpoint}`;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Get token and add to headers
    const token = await this.getToken();
    console.log('[apiClient] Request:', {
      url,
      method: options.method || 'GET',
      hasToken: !!token,
      tokenPreview: token ? token.substring(0, 20) + '...' : null,
    });
    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    let response: Response;
    try {
      response = await fetch(url, {
        ...options,
        headers,
      });
    } catch (networkError) {
      // Network error - fetch failed entirely (no response)
      console.error('[apiClient] Network error:', networkError);
      throw new ApiError(
        `Impossible de contacter le serveur (${this.baseUrl}). Vérifiez que le backend est démarré.`,
        0,
      );
    }

    if (!response.ok) {
      let detail = 'An error occurred';

      try {
        const data = await response.json();
        detail = data.detail || detail;
      } catch {
        // Ignore JSON parse errors
      }

      // Handle specific error codes
      if (response.status === 401) {
        detail = 'Session expirée. Veuillez vous reconnecter.';
        // Could trigger a logout here
      } else if (response.status === 403) {
        detail = 'Accès non autorisé.';
      }

      throw new ApiError(detail, response.status);
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
    // Ensure endpoint starts with /api for the Next.js proxy
    const normalizedEndpoint = endpoint.startsWith('/api') ? endpoint : `/api${endpoint}`;
    const url = `${this.baseUrl}${normalizedEndpoint}`;

    const headers: Record<string, string> = {};

    // Get token and add to headers
    const token = await this.getToken();
    console.log('[apiClient.upload] Token:', token ? 'present' : 'missing');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    console.log('[apiClient.upload] Uploading to:', url);
    console.log('[apiClient.upload] FormData entries:', [...formData.entries()].map(e => `${e[0]}: ${e[1] instanceof File ? `File(${e[1].name}, ${e[1].size} bytes)` : e[1]}`));

    // Note: Don't set Content-Type for FormData - browser will set it with boundary
    // Use AbortController for timeout (5 minutes for large PDFs + AI processing)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5 * 60 * 1000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

    if (!response.ok) {
      let detail = 'An error occurred';

      try {
        const data = await response.json();
        detail = data.detail || detail;
      } catch {
        // Ignore JSON parse errors
      }

      throw new ApiError(detail, response.status);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error('La requête a expiré (timeout). Le traitement IA peut prendre du temps pour les gros fichiers.');
      }
      throw err;
    }
  }
}

// Singleton instance
export const apiClient = new ApiClient();

// ApiError is exported as a class above
