import { api } from "./api";
import type { PaginatedOrders, ReservationOrder } from "@/types/order";

interface GetAllOrdersParams {
  page?: number;
  limit?: number;
}

export const getAllOrdersServices = async (params?: GetAllOrdersParams): Promise<PaginatedOrders> => {
  const { page = 1, limit = 10 } = params || {};
  const response = await api.get(`/reservation-order?page=${page}&limit=${limit}`);
  return response.data;
};

export const getOrderByIdServices = async (id: number) => {
  const response = await api.get(`/reservation-order/${id}`);
  return response.data;
};

export const getOrdersByCustomerIdServices = async (customerId: number): Promise<ReservationOrder[]> => {
  const response = await api.get(`/reservation-order/customer/${customerId}`);
  return response.data;
};

export const createOrderServices = async (orderData: any) => {
  const response = await api.post("/reservation-order", orderData);
  return response.data;
};

export const updateOrderServices = async (id: number, orderData: any) => {
  const response = await api.patch(`/reservation-order/${id}`, orderData);
  return response.data;
};

export const deleteOrderServices = async (id: number) => {
  const response = await api.delete(`/reservation-order/${id}`);
  return response.data;
};
