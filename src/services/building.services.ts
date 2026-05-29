import { api } from "./api";

export const getAllBuildings = async (params?: { page?: number; limit?: number; search?: string }) => {
  const { page = 1, limit = 10, search } = params || {};
  let url = `/building?page=${page}&limit=${limit}`;
  if (search) {
    url += `&search=${encodeURIComponent(search)}`;
  }
  const response = await api.get(url);
  return response.data;
};

export const getBuildingById = async (id: string | number) => {
  const response = await api.get(`/building/${id}`);
  return response.data;
};

export const createBuilding = async (buildingData: any) => {
  const response = await api.post("/building", buildingData);
  return response.data;
};

export const updateBuilding = async (id: number, buildingData: any) => {
  const response = await api.patch(`/building/${id}`, buildingData);
  return response.data;
};

export const deleteBuilding = async (id: string | number) => {
  const response = await api.delete(`/building/${id}`);
  return response.data;
};

export const getbuildingByBranchId = async (branchId: number) => {
  const response = await api.get(`/branch/${branchId}`);
  return response.data;
};