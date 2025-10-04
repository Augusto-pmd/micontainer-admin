import { api } from "./api";

export interface StorageRoom {
  id: number;
  space: string;
  floor: string;
  width: string;
  length: string;
  height: string;
  depth: string;
  areaM2: string;
  volumeM3: string;
  price: string;
  status: 'available' | 'reserved' | 'occupied' | 'maintenance';
  description: string;
  image: string;
  building?: {
    id: number;
    name: string;
    branch?: {
      id: number;
      name: string;
      city: string;
    };
  };
}

export interface PaginatedStorageRooms {
  data: StorageRoom[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface GetStorageRoomsParams {
  page?: number;
  limit?: number;
  status?: string;
}

export const getAllStorageRoomsServices = async (params?: GetStorageRoomsParams): Promise<PaginatedStorageRooms> => {
  const { page = 1, limit = 10, status } = params || {};
  let url = `/storage-room?page=${page}&limit=${limit}`;
  if (status) {
    url += `&status=${status}`;
  }
  const response = await api.get(url);
  return response.data;
};

export const getAvailableStorageRoomsServices = async (limit: number = 1000): Promise<PaginatedStorageRooms> => {
  const response = await api.get(`/storage-room?status=available&page=1&limit=${limit}`);
  return response.data;
};

export const getStorageRoomByIdServices = async (id: number) => {
  const response = await api.get(`/storage-room/${id}`);
  return response.data;
};
