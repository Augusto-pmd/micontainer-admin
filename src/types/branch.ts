export interface Branch {
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
  buildings?: Building[];
}

interface Building {
  id: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  name: string;
  floors: number;
  isActive: boolean;
  description: string;
}

export interface PaginatedBranches {
  data: Branch[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
