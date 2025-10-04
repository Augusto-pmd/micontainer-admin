import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AuthStore, User, BackendUser, LoginResponse } from '../types/auth';
import { UserRole } from '../types/auth';
import { loginService, logoutService } from '../services/auth.services';
import { api } from '../services/api';

// Función para mapear usuario del backend al formato del frontend
const mapBackendUserToUser = (backendUser: BackendUser): User => {
  const userRole = backendUser.role.code as UserRole;
  
  return {
    id: backendUser.id,
    email: backendUser.email,
    name: `${backendUser.firstName} ${backendUser.lastName}`,
    firstName: backendUser.firstName,
    lastName: backendUser.lastName,
    role: userRole,
    roleDetails: backendUser.role,
    avatar: `${backendUser.firstName.charAt(0)}${backendUser.lastName.charAt(0)}`,
    isActive: true, // Asumimos que si el usuario puede hacer login, está activo
    createdAt: new Date(backendUser.createdAt),
    updatedAt: new Date(backendUser.updatedAt),
    customer: backendUser.customer
  };
};

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
          const response: LoginResponse = await loginService({ email, password });
          const { user: backendUser, token } = response;
          
          // Mapear el usuario del backend al formato del frontend
          const user = mapBackendUserToUser(backendUser);
          
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
