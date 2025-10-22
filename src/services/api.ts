import axios from "axios";
import { showApiError } from "../utils/alerts";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// Interceptor para peticiones - agregar token automáticamente
api.interceptors.request.use(
  (config) => {
    // Obtener el token del localStorage si existe
    const authStorage = localStorage.getItem('auth-storage');
    if (authStorage) {
      try {
        const { state } = JSON.parse(authStorage);
        const token = state?.token;
        if (token && !config.headers.Authorization) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (error) {
        console.error('Error al parsear auth-storage:', error);
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
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

