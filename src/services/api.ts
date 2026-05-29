import axios from "axios";
import { showApiError } from "../utils/alerts";
import { auth } from "@/lib/firebase";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// Interceptor de requests — siempre usa un token fresco de Firebase (auto-refresh)
api.interceptors.request.use(
  async (config) => {
    try {
      const user = auth.currentUser;
      if (user) {
        // getIdToken(false) devuelve el token cacheado si sigue válido,
        // o lo refresca automáticamente si expiró (>1 hora)
        const token = await user.getIdToken(false);
        config.headers.Authorization = `Bearer ${token}`;
        // Sincronizar con el store también
        const { useAuthStore } = await import('@/stores/authStore');
        useAuthStore.getState().setToken?.(token);
      } else {
        // Fallback al token guardado en localStorage
        const authStorage = localStorage.getItem('auth-storage');
        if (authStorage) {
          const { state } = JSON.parse(authStorage);
          if (state?.token && !config.headers.Authorization) {
            config.headers.Authorization = `Bearer ${state.token}`;
          }
        }
      }
    } catch (e) {
      // Si falla el refresh usamos el token guardado
      const authStorage = localStorage.getItem('auth-storage');
      if (authStorage) {
        try {
          const { state } = JSON.parse(authStorage);
          if (state?.token) config.headers.Authorization = `Bearer ${state.token}`;
        } catch {}
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor para respuestas - manejar errores de autenticación
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const status = error.response?.status;
    // Manejo específico 401: sesión expirada
    if (status === 401) {
      delete api.defaults.headers.common['Authorization'];
      localStorage.removeItem('auth-storage');
      if (window.location.pathname !== '/login') {
        await showApiError(error, 'Sesión expirada, por favor inicia sesión nuevamente');
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }

    // Evitar mostrar múltiples errores simultáneos (opcional se podría mejorar con cola)
    if (status >= 400) {
      // Permitir que las peticiones con la config 'skipErrorAlert' manejen sus propios errores
      const skipErrorAlert = error.config?.skipErrorAlert;
      
      // Errores de validación (422/400) podrían manejarse distinto
      if (status === 422 && error.response?.data?.errors) {
        // Dejamos que cada pantalla llame showApiValidationErrors si lo necesita
      } else if (!skipErrorAlert) {
        showApiError(error);
      }
    }

    return Promise.reject(error);
  }
);

