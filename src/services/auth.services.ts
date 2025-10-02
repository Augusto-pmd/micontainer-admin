import { api } from "./api";
interface Credentials {
  email: string;
  password: string;
}

// Login
export const login = async (credentials: Credentials) => {
  const response = await api.post("/auth/login", credentials);
  return response.data;
};

// Logout
export const logout = async () => {
  const response = await api.post("/auth/logout");
  return response.data;
};