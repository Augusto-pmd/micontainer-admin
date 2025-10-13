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
  customer: OrderCustomer;
  storageRoom: OrderStorageRoom;
}

export interface OrderCustomer {
  id: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  dni: string;
  cuit: string;
  address: string;
  phone: string;
  personType: 'fisica' | 'juridica';
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface OrderStorageRoom {
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
  image: string;
  status: 'available' | 'reserved' | 'occupied' | 'maintenance';
  description: string;
  building: OrderBuilding;
}

export interface OrderBuilding {
  id: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  name: string;
  floors: number;
  isActive: boolean;
  description: string;
  branch: OrderBranch;
}

export interface OrderBranch {
  id: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  name: string;
  address: string;
  country: string;
  city: string;
  zipCode: string;
  phone: string;
  email: string;
  gps_location: string;
  images: string[];
  isActive: boolean;
  description: string;
}

export interface PaginatedOrders {
  data: ReservationOrder[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
