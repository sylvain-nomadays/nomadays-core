'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ApiError } from '@/lib/api/client';
import { useAuthContext } from '@/contexts/AuthContext';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
}

interface UseApiOptions {
  immediate?: boolean;
}

/**
 * Generic hook for API calls
 * Waits for authentication to be ready before making requests
 */
export function useApi<T>(
  fetcher: () => Promise<T>,
  options: UseApiOptions = { immediate: true }
) {
  const { loading: authLoading, session } = useAuthContext();
  const hasExecuted = useRef(false);

  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: options.immediate ?? true,
    error: null,
  });

  const execute = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const data = await fetcher();
      setState({ data, loading: false, error: null });
      return data;
    } catch (err) {
      const error = err as ApiError;
      setState({ data: null, loading: false, error });
      // Don't throw - let the component handle via error state
      return null;
    }
  }, [fetcher]);

  // Wait for auth to be ready AND session to exist before making the initial request
  useEffect(() => {
    if (options.immediate && !authLoading && session && !hasExecuted.current) {
      hasExecuted.current = true;
      execute();
    }
  }, [authLoading, session, options.immediate, execute]);

  return {
    ...state,
    execute,
    refetch: execute,
  };
}

/**
 * Hook for mutations (POST, PUT, DELETE)
 */
export function useMutation<T, TVariables = unknown>(
  mutationFn: (variables: TVariables) => Promise<T>
) {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const mutate = useCallback(
    async (variables: TVariables) => {
      setState(prev => ({ ...prev, loading: true, error: null }));
      try {
        const data = await mutationFn(variables);
        setState({ data, loading: false, error: null });
        return data;
      } catch (err) {
        const error = err as ApiError;
        setState(prev => ({ ...prev, loading: false, error }));
        throw error;
      }
    },
    [mutationFn]
  );

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return {
    ...state,
    mutate,
    reset,
  };
}

// Re-export types
export type { ApiError };
