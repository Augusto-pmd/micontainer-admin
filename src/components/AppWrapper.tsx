import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from '../router/AppRouter';
import { useAuthStore } from '../stores/authStore';

const AppWrapper = () => {
  const checkAuth = useAuthStore(state => state.checkAuth);

  useEffect(() => {
    // Inicializar la autenticación al cargar la app
    checkAuth();
  }, [checkAuth]);

  return <RouterProvider router={router} />;
};

export default AppWrapper;
