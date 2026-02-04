import type { Building } from './building';

export const STORAGE_ROOM_STATUS = {
  AVAILABLE: "available",
  OCCUPIED: "occupied",
  RESERVED: "reserved",
  BLOCKED: "blocked"
} as const;

export type StorageRoomStatus = typeof STORAGE_ROOM_STATUS[keyof typeof STORAGE_ROOM_STATUS];

export const RESERVATION_ORDER_STATUS = {
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  CANCELED: "CANCELED",
} as const;

export type ReservationOrderStatus = typeof RESERVATION_ORDER_STATUS[keyof typeof RESERVATION_ORDER_STATUS];

export interface ReservationOrder {
  id: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  entryDate: string;
  entryTime: string;
  totalAmount: string;
  status: ReservationOrderStatus;
}

export interface StorageRoom {
  id: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  space: string;
  floor: string;
  width: string;
  length: string;
  height: string;
  depth: string;
  areaM2: string;
  volumeM3: string;
  price: string;
  images: string[];
  status: StorageRoomStatus;
  description: string;
  building?: Building;
  reservationOrders?: ReservationOrder[];
}

export interface PaginatedStorageRooms {
  data: StorageRoom[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateStorageRoomDto {
  space: string;
  buildingId: number;
  floor: number;
  width: number;
  length: number;
  height: number;
  depth?: number;
  areaM2: number;
  volumeM3?: number;
  price?: number;
  images: string[];
  status: StorageRoomStatus;
  description?: string;
}

export interface UpdateStorageRoomDto {
  space?: string;
  buildingId?: number;
  floor?: number;
  width?: number;
  length?: number;
  height?: number;
  depth?: number;
  areaM2?: number;
  volumeM3?: number;
  price?: number;
  images?: string[];
  status?: StorageRoomStatus;
  description?: string;
}
