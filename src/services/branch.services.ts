import { api } from "./api"
import type { PaginatedBranches } from "@/types/branch";

interface GetAllBranchesParams {
  page?: number;
  limit?: number;
  search?: string;
}

export const getAllBranchesServices = async (params?: GetAllBranchesParams): Promise<PaginatedBranches> => {
  const { page = 1, limit = 10, search } = params || {};
  let url = `/branch?page=${page}&limit=${limit}`;
  if (search) {
    url += `&search=${encodeURIComponent(search)}`;
  }
  const response = await api.get(url);
  return response.data;
};

export const getBranchByIdServices = async (id: string | number) => {
  const response = await api.get(`/branch/${id}`);
  return response.data;
};

export const createBranchServices = async (branchData: any) => {
  const response = await api.post("/branch", branchData);
  return response.data;
};

export const updateBranchServices = async (id: number, branchData: any) => {
  const response = await api.patch(`/branch/${id}`, branchData);
  return response.data;
};

export const deleteBranchServices = async (id: string | number) => {
  const response = await api.delete(`/branch/${id}`);
  return response.data;
};