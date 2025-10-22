import { api } from "./api";
import type { 
  StorageRoom, 
  PaginatedStorageRooms, 
  CreateStorageRoomDto, 
  UpdateStorageRoomDto 
} from "@/types/storageRoom";

interface GetStorageRoomsParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}

export const getAllStorageRoomsServices = async (params?: GetStorageRoomsParams): Promise<PaginatedStorageRooms> => {
  const { page = 1, limit = 10, status, search } = params || {};
  let url = `/storage-room?page=${page}&limit=${limit}`;
  if (status) {
    url += `&status=${status}`;
  }
  if (search) {
    url += `&search=${encodeURIComponent(search)}`;
  }
  const response = await api.get(url);
  return response.data;
};

export const getAvailableStorageRoomsServices = async (limit: number = 1000): Promise<PaginatedStorageRooms> => {
  const response = await api.get(`/storage-room?status=available&page=1&limit=${limit}`);
  return response.data;
};

export const getStorageRoomByIdServices = async (id: number): Promise<StorageRoom> => {
  const response = await api.get(`/storage-room/${id}`);
  return response.data;
};

export const createStorageRoomServices = async (data: CreateStorageRoomDto): Promise<StorageRoom> => {
  const response = await api.post("/storage-room", data);
  return response.data;
};

export const updateStorageRoomServices = async (id: number, data: UpdateStorageRoomDto): Promise<StorageRoom> => {
  const response = await api.patch(`/storage-room/${id}`, data);
  return response.data;
};

export const deleteStorageRoomServices = async (id: number) => {
  const response = await api.delete(`/storage-room/${id}`);
  return response.data;
};

export const assignCustomerToStorageRoomServices = async (storageRoomId: number, customerId: number): Promise<StorageRoom> => {
  const response = await api.patch(`/storage-room/${storageRoomId}/assign-customer`, {
    customerId
  });
  return response.data;
};

// Re-exportar el tipo para compatibilidad
export type { StorageRoom } from "@/types/storageRoom";

