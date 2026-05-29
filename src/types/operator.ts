import type { Branch } from './branch';

export interface OperatorUser {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  firstName: string;
  lastName: string;
  email: string;
  role?: {
    id: number;
    code: string;
    name: string;
  };
}

export interface Operator {
  id: number;
  createdAt: string;
  updatedAt: string;
  branch: Branch;
  user: OperatorUser;
}

export interface PaginatedOperators {
  data: Operator[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateOperatorDto {
  branchId: string | number;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}
