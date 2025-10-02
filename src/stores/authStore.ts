import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AuthStore, User } from '../types/auth';
import { UserRole } from '../types/auth';
import { loginService, logoutService, getProfileService } from '../services/auth.services';
import { api } from '../services/api';

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // Estado inicial
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false, // Inicializamos en false, se activará en checkAuth si es necesario
      error: null,

      // Acción de login
      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await loginService({ email, password });
          const { user, token } = response;
          
          // Configurar el token en el header por defecto de axios
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          set({
            user: { ...user, lastLogin: new Date() },
            token,
            isAuthenticated: true,
            isLoading: false,
            error: null
          });
        } catch (error: any) {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: error?.response?.data?.message || error?.message || 'Error de autenticación'
          });
          throw error;
        }
      },

      // Acción de logout
      logout: async () => {
        try {
          await logoutService();
        } catch (error) {
          // Incluso si el logout en el servidor falla, limpiamos el estado local
          console.error('Error durante logout:', error);
        } finally {
          // Limpiar el token del header de axios
          delete api.defaults.headers.common['Authorization'];
          
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: null
          });
          
          // Limpiar localStorage
          localStorage.removeItem('auth-storage');
        }
      },

      // Establecer usuario directamente
      setUser: (user: User) => {
        set({
          user,
          isAuthenticated: true,
          error: null
        });
      },

      // Establecer token
      setToken: (token: string) => {
        set({ token });
      },

      // Limpiar errores
      clearError: () => {
        set({ error: null });
      },

      // Verificar autenticación al cargar la app
      checkAuth: async () => {
        const { token, isAuthenticated } = get();
        
        // Si ya está autenticado, no hacer nada
        if (isAuthenticated) {
          return;
        }
        
        // Si no hay token, marcar como no cargando
        if (!token) {
          set({ isLoading: false });
          return;
        }

        set({ isLoading: true });
        
        try {
          // Configurar el token en el header
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          // Hacer una petición al endpoint de validación
          const user = await getProfileService();
          
          set({
            user,
            isAuthenticated: true,
            isLoading: false,
            error: null
          });
        } catch {
          // Limpiar el token del header
          delete api.defaults.headers.common['Authorization'];
          
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: null
          });
          // Limpiar token inválido del storage
          localStorage.removeItem('auth-storage');
        }
      },

      // Actualizar rol de usuario (para admins)
      updateUserRole: async (userId: string, role: UserRole) => {
        const { user } = get();
        
        if (!user || user.role !== UserRole.ADMIN) {
          throw new Error('No tienes permisos para esta acción');
        }

        // En una app real, esto sería una llamada a la API
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Si es el usuario actual, actualizar el estado
        if (user.id === userId) {
          set({
            user: {
              ...user,
              role
            }
          });
        }
      }
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      // Solo persistir datos importantes
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);

// Selectores útiles
export const useAuth = () => {
  const store = useAuthStore();
  return {
    user: store.user,
    isAuthenticated: store.isAuthenticated,
    isLoading: store.isLoading,
    error: store.error,
    login: store.login,
    logout: store.logout,
    checkAuth: store.checkAuth,
    clearError: store.clearError
  };
};

export const useUser = () => useAuthStore(state => state.user);
export const useIsAuthenticated = () => useAuthStore(state => state.isAuthenticated);
export const useAuthLoading = () => useAuthStore(state => state.isLoading);
export const useAuthError = () => useAuthStore(state => state.error);
