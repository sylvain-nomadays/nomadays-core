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
  /** Dependencies array - refetch when these change (after initial fetch) */
  deps?: unknown[];
}

/**
 * Generic hook for API calls
 * Waits for authentication to be ready before making requests
 * Preserves data during refetch to avoid flicker
 */
export function useApi<T>(
  fetcher: () => Promise<T>,
  options: UseApiOptions = { immediate: true }
) {
  const { loading: authLoading, session } = useAuthContext();

  // Track if we've done the initial fetch
  const initialFetchDone = useRef(false);
  // Keep the fetcher in a ref to always use the latest version
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  // Track the current request to handle race conditions
  const requestId = useRef(0);

  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: options.immediate ?? true,
    error: null,
  });

  const execute = useCallback(async () => {
    // Increment request ID to track this specific request
    const currentRequestId = ++requestId.current;

    // Keep existing data while loading (avoid flicker)
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const data = await fetcherRef.current();

      // Only update if this is still the latest request
      if (currentRequestId === requestId.current) {
        setState({ data, loading: false, error: null });
      }
      return data;
    } catch (err) {
      const error = err as ApiError;

      // Only update if this is still the latest request
      if (currentRequestId === requestId.current) {
        // Keep existing data on error (don't replace with null)
        setState(prev => ({
          data: prev.data, // Keep previous data
          loading: false,
          error
        }));
      }
      return null;
    }
  }, []); // No dependencies - uses refs

  // Initial fetch: Wait for auth to be ready AND session to exist
  useEffect(() => {
    if (options.immediate && !authLoading && session && !initialFetchDone.current) {
      initialFetchDone.current = true;
      execute();
    }
  }, [authLoading, session, options.immediate, execute]);

  // Refetch when dependencies change (only after initial fetch is done)
  const depsKey = JSON.stringify(options.deps ?? []);
  const prevDepsKey = useRef(depsKey);

  useEffect(() => {
    // Only refetch if deps changed AND we've already done initial fetch AND we have a session
    if (initialFetchDone.current && prevDepsKey.current !== depsKey && session) {
      prevDepsKey.current = depsKey;
      execute();
    }
  }, [depsKey, session, execute]);

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
