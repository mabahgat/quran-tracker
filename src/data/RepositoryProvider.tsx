import React, { createContext, useContext, useEffect, useState } from 'react';

import { initRepositories } from './db';
import { Repositories } from './repositories/types';

interface RepositoryContextValue {
  repositories: Repositories | null;
  ready: boolean;
  error: Error | null;
}

const RepositoryContext = createContext<RepositoryContextValue>({
  repositories: null,
  ready: false,
  error: null,
});

interface RepositoryProviderProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  errorFallback?: (error: Error) => React.ReactNode;
}

export function RepositoryProvider({ children, fallback, errorFallback }: RepositoryProviderProps) {
  const [state, setState] = useState<RepositoryContextValue>({
    repositories: null,
    ready: false,
    error: null,
  });

  useEffect(() => {
    let active = true;
    initRepositories()
      .then((repositories) => {
        if (active) {
          setState({ repositories, ready: true, error: null });
        }
      })
      .catch((error: Error) => {
        if (active) {
          setState({ repositories: null, ready: false, error });
        }
      });
    return () => {
      active = false;
    };
  }, []);

  if (state.error) {
    return <>{errorFallback ? errorFallback(state.error) : null}</>;
  }
  if (!state.ready) {
    return <>{fallback ?? null}</>;
  }
  return <RepositoryContext.Provider value={state}>{children}</RepositoryContext.Provider>;
}

export function useRepositories(): Repositories {
  const { repositories } = useContext(RepositoryContext);
  if (!repositories) {
    throw new Error('Repositories are not ready yet');
  }
  return repositories;
}
