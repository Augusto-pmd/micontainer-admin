import { api } from "./api";

// (loginService ELIMINADO 12/07: el login real es Firebase — signInWithEmail/Google en lib/firebase)

// Forgot Password
export const forgotPasswordService = async (email: string) => {
  const response = await api.post("/auth/forgot-password", { email });
  return response.data;
};

// (resetPasswordService ELIMINADO 12/07: /auth/reset-password nunca existió; el reset es el mail de Firebase)

