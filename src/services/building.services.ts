import { api } from "./api";

export const getAllBuildings = async () => {
  const response = await api.get("/buildings");
  return response.data;
};

export const getBuildingById = async (id: number) => {
  const response = await api.get(`/buildings/${id}`);
  return response.data;
};

export const createBuilding = async (buildingData: any) => {
  const response = await api.post("/buildings", buildingData);
  return response.data;
};

export const updateBuilding = async (id: number, buildingData: any) => {
  const response = await api.put(`/buildings/${id}`, buildingData);
  return response.data;
};

export const deleteBuilding = async (id: number) => {
  const response = await api.delete(`/buildings/${id}`);
  return response.data;
};

export const getBuildingsByBranchId = async (branchId: number) => {
  const response = await api.get(`/branch/${branchId}`);
  return response.data;
};