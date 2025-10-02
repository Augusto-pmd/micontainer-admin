import axios from "axios";

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
  (error) => {
    if (error.response?.status === 401) {
      // Token expirado o inválido
      // Limpiar datos de autenticación
      delete api.defaults.headers.common['Authorization'];
      localStorage.removeItem('auth-storage');
      
      // Redirigir al login si no estamos ya ahí
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

