import { useEffect, useRef } from 'react';
import { useAuth } from '../stores/authStore';

/**
 * Hook para inicializar la autenticación solo una vez
 */
export const useAuthInit = () => {
  const { checkAuth, isAuthenticated, isLoading } = useAuth();
  const hasInitialized = useRef(false);

  useEffect(() => {
    // Solo ejecutar una vez y si no está ya autenticado
    if (!hasInitialized.current && !isAuthenticated && !isLoading) {
      hasInitialized.current = true;
      checkAuth();
    }
  }, [checkAuth, isAuthenticated, isLoading]);

  return { isLoading };
};
