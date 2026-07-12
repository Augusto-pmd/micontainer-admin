import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AuthStore, User } from '../types/auth';
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

      // (login viejo ELIMINADO 12/07: el login real es Firebase — ver lib/firebase + Login.tsx)

      // Acción de logout
      logout: async () => {
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
        const { token, user } = get();
        
        // Si no hay token, marcar como no cargando
        if (!token) {
          set({ isLoading: false, isAuthenticated: false });
          return;
        }

        // Si tenemos token pero no usuario (caso raro), limpiar todo
        if (token && !user) {
          delete api.defaults.headers.common['Authorization'];
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: null
          });
          localStorage.removeItem('auth-storage');
          return;
        }

        // Si tenemos token y usuario, configurar el header para futuras peticiones
        // Nota: El interceptor de axios ya maneja esto, pero lo dejamos por redundancia
        if (token && user) {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          set({ 
            isLoading: false,
            isAuthenticated: true
          });
        }
      },

      // (updateUserRole mock ELIMINADO 12/07: nunca se llamó; el rol real vive en operators)
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
    logout: store.logout,
    checkAuth: store.checkAuth,
    clearError: store.clearError,
    setUser: store.setUser,
    setToken: store.setToken,
  };
};

export const useUser = () => useAuthStore(state => state.user);
export const useIsAuthenticated = () => useAuthStore(state => state.isAuthenticated);
export const useAuthLoading = () => useAuthStore(state => state.isLoading);
export const useAuthError = () => useAuthStore(state => state.error);
