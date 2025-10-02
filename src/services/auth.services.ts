import { api } from "./api";

interface Credentials {
  email: string;
  password: string;
}

// Login
export const loginService = async (credentials: Credentials) => {
  const response = await api.post("/auth/login", credentials);
  return response.data;
};

// Logout
export const logoutService = async () => {
  const response = await api.post("/auth/logout");
  return response.data;
};

// Obtener perfil del usuario autenticado
export const getProfileService = async () => {
  const response = await api.get("/auth/me");
  return response.data;
};