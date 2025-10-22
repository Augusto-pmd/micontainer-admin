import { api } from "./api";

export const getUsers = async () => {
  const response = await api.get("/user");
  return response.data;
};

export const getUserById = async (id: string) => {
  const response = await api.get(`/user/${id}`);
  return response.data;
};

export const createUser = async (userData: any) => {
  const response = await api.post("/user", userData);
  return response.data;
};

export const updateUser = async (id: string, userData: any) => {
  const response = await api.patch(`/user/${id}`, userData);
  return response.data;
};

// Versión sin alert automático para manejar errores manualmente
export const updateUserSilent = async (id: string, userData: any) => {
  const response = await api.patch(`/user/${id}`, userData, {
    skipErrorAlert: true,
  } as any);
  return response.data;
};

export const deleteUser = async (id: string) => {
  const response = await api.delete(`/user/${id}`);
  return response.data;
};

export const updateUserRole = async (id: string, role: string) => {
  const response = await api.patch(`/user/${id}/role`, { role });
  return response.data;
};
