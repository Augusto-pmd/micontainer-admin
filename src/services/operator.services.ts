import { api } from "./api";
import type { PaginatedOperators, CreateOperatorDto } from "@/types/operator";

interface GetAllOperatorsParams {
  page?: number;
  limit?: number;
}

export const getAllOperatorsServices = async (params?: GetAllOperatorsParams): Promise<PaginatedOperators> => {
  const { page = 1, limit = 10 } = params || {};
  const response = await api.get(`/operator?page=${page}&limit=${limit}`);
  return response.data;
};

export const getOperatorByIdServices = async (id: number) => {
  const response = await api.get(`/operator/${id}`);
  return response.data;
};

export const getOperatorByUserIdServices = async (userId: string) => {
  const response = await api.get(`/operator/user/${userId}`);
  return response.data;
};

export const createOperatorServices = async (operatorData: CreateOperatorDto) => {
  const response = await api.post("/operator", operatorData);
  return response.data;
};

export const deleteOperatorServices = async (id: number) => {
  const response = await api.delete(`/operator/${id}`);
  return response.data;
};
