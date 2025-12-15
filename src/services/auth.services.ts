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

// Forgot Password
export const forgotPasswordService = async (email: string) => {
  const response = await api.post("/auth/forgot-password", { email });
  return response.data;
};

// Reset Password
export const resetPasswordService = async (token: string, newPassword: string) => {
  const response = await api.post("/auth/reset-password", { token, newPassword });
  return response.data;
};

