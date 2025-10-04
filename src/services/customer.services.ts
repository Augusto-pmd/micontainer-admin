import { api } from "./api";
import type { PaginatedCustomers } from "@/types/customer";

interface GetAllCustomersParams {
  page?: number;
  limit?: number;
}

export const getAllCustomersServices = async (params?: GetAllCustomersParams): Promise<PaginatedCustomers> => {
  const { page = 1, limit = 10 } = params || {};
  const response = await api.get(`/customer?page=${page}&limit=${limit}`);
  return response.data;
};

export const getCustomerByIdServices = async (id: number) => {
  const response = await api.get(`/customer/${id}`);
  return response.data;
};

export const createCustomerServices = async (customerData: any) => {
  const response = await api.post("/customer", customerData);
  return response.data;
};

export const updateCustomerServices = async (id: number, customerData: any) => {
  const response = await api.patch(`/customer/${id}`, customerData);
  return response.data;
};

export const deleteCustomerServices = async (id: number) => {
  const response = await api.delete(`/customer/${id}`);
  return response.data;
};
