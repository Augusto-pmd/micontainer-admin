export interface Customer {
  id: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  dni: string;
  cuit: string;
  address: string;
  phone: string;
  personType: 'fisica' | 'juridica';
  user: CustomerUser;
}

export interface CustomerUser {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  firstName: string;
  lastName: string;
  email: string;
}

export interface PaginatedCustomers {
  data: Customer[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
