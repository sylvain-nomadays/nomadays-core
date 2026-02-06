'use client';

import { useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { apiClient } from '@/lib/api/client';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Hook for authentication using Supabase
 * Automatically syncs the access token with the API client
 */
export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    error: null,
  });

  const supabase = createClient();

  // Sync token with API client
  const syncToken = useCallback((session: Session | null) => {
    if (session?.access_token) {
      apiClient.setToken(session.access_token);
    } else {
      apiClient.clearToken();
    }
  }, []);

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        // First try to get session from Supabase client
        const { data: { session }, error } = await supabase.auth.getSession();

        console.log('[useAuth] getSession result:', {
          hasSession: !!session,
          hasToken: !!session?.access_token,
          tokenPreview: session?.access_token ? session.access_token.substring(0, 20) + '...' : null,
          error: error?.message
        });

        if (error) throw error;

        // If no session from client, try to get token from server API
        // (needed because SSR uses HTTP-only cookies)
        let finalSession = session;
        if (!session && typeof window !== 'undefined') {
          console.log('[useAuth] No session from client, trying server API...');
          try {
            const response = await fetch('/api/auth/token');
            const tokenData = await response.json();
            console.log('[useAuth] Server token response:', { ok: response.ok, hasToken: !!tokenData.token });
            if (response.ok) {
              const { token } = tokenData;
              if (token) {
                // We have a token from server, get user info
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                  // Create a minimal session object with the token
                  finalSession = {
                    access_token: token,
                    refresh_token: '',
                    token_type: 'bearer',
                    expires_in: 3600,
                    expires_at: Math.floor(Date.now() / 1000) + 3600,
                    user,
                  } as Session;
                }
              }
            }
          } catch {
            // Ignore token fetch errors, session remains null
          }
        }

        console.log('[useAuth] Final state:', {
          hasSession: !!finalSession,
          hasToken: !!finalSession?.access_token,
          hasUser: !!finalSession?.user
        });

        setState({
          user: finalSession?.user ?? null,
          session: finalSession,
          loading: false,
          error: null,
        });

        syncToken(finalSession);
      } catch (error) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: error as Error,
        }));
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setState({
          user: session?.user ?? null,
          session,
          loading: false,
          error: null,
        });

        syncToken(session);

        // Handle specific events
        if (event === 'SIGNED_OUT') {
          apiClient.clearToken();
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase.auth, syncToken]);

  // Sign in with email/password
  const signIn = useCallback(async (email: string, password: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      syncToken(data.session);

      return { user: data.user, error: null };
    } catch (error) {
      setState(prev => ({ ...prev, loading: false, error: error as Error }));
      return { user: null, error: error as Error };
    }
  }, [supabase.auth, syncToken]);

  // Sign in with OAuth (Google, etc.)
  const signInWithOAuth = useCallback(async (provider: 'google' | 'github') => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;
    } catch (error) {
      setState(prev => ({ ...prev, error: error as Error }));
    }
  }, [supabase.auth]);

  // Sign in with magic link
  const signInWithMagicLink = useCallback(async (email: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;

      setState(prev => ({ ...prev, loading: false }));
      return { error: null };
    } catch (error) {
      setState(prev => ({ ...prev, loading: false, error: error as Error }));
      return { error: error as Error };
    }
  }, [supabase.auth]);

  // Sign up with email/password
  const signUp = useCallback(async (email: string, password: string, metadata?: { name?: string }) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: metadata,
        },
      });

      if (error) throw error;

      return { user: data.user, error: null };
    } catch (error) {
      setState(prev => ({ ...prev, loading: false, error: error as Error }));
      return { user: null, error: error as Error };
    }
  }, [supabase.auth]);

  // Sign out
  const signOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      apiClient.clearToken();

      // Redirect to login
      window.location.href = '/login';
    } catch (error) {
      setState(prev => ({ ...prev, error: error as Error }));
    }
  }, [supabase.auth]);

  // Refresh session
  const refreshSession = useCallback(async () => {
    try {
      const { data: { session }, error } = await supabase.auth.refreshSession();

      if (error) throw error;

      syncToken(session);

      return session;
    } catch (error) {
      setState(prev => ({ ...prev, error: error as Error }));
      return null;
    }
  }, [supabase.auth, syncToken]);

  // Get current access token
  const getAccessToken = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  }, [supabase.auth]);

  return {
    ...state,
    signIn,
    signInWithOAuth,
    signInWithMagicLink,
    signUp,
    signOut,
    refreshSession,
    getAccessToken,
    isAuthenticated: !!state.user,
  };
}
