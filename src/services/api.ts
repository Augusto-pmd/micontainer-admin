import axios from "axios";
import { showApiError } from "../utils/alerts";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// Interceptor para peticiones - agregar token automáticamente
api.interceptors.request.use(
  (config) => {
    // El token se configura en los headers por defecto desde el authStore
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
      // Errores de validación (422/400) podrían manejarse distinto
      if (status === 422 && error.response?.data?.errors) {
        // Dejamos que cada pantalla llame showApiValidationErrors si lo necesita
      } else {
        showApiError(error);
      }
    }

    return Promise.reject(error);
  }
);

