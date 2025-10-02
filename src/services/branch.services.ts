import { api } from "./api"


export const getAllBranchesServices = async () => {
  const response = await api.get("/branch");
  return response.data;
};

export const getBranchByIdServices = async (id: number) => {
  const response = await api.get(`/branch/${id}`);
  return response.data;
};

export const createBranchServices = async (branchData: any) => {
  const response = await api.post("/branch", branchData);
  return response.data;
};

export const updateBranchServices = async (id: number, branchData: any) => {
  const response = await api.put(`/branch/${id}`, branchData);
  return response.data;
};

export const deleteBranchServices = async (id: number) => {
  const response = await api.delete(`/branch/${id}`);
  return response.data;
};