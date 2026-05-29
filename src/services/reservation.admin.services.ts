import { api } from "./api";

export interface AdminReservation {
  id: string;
  status: 'pending_payment' | 'active' | 'cancelled' | 'payment_failed';
  mpSubscriptionStatus: 'pending' | 'authorized' | 'paused' | 'cancelled';
  mpPreapprovalId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerDni: string;
  userUid: string;
  sucursalId: string;
  category: string;
  m2: number;
  monthly: number;
  firstMonth: number;
  startDate: string;
  duration: number;
  addons: string[];
  createdAt: string | null;
  cancelledAt: string | null;
}

export interface AdminReservationsResponse {
  data: AdminReservation[];
  total: number;
}

export const getAdminReservations = async (params?: {
  limit?: number;
  status?: string;
  search?: string;
}): Promise<AdminReservationsResponse> => {
  const { limit = 100, status, search } = params || {};
  let url = `/admin/reservations?limit=${limit}`;
  if (status) url += `&status=${status}`;
  if (search) url += `&search=${encodeURIComponent(search)}`;
  const res = await api.get(url);
  return res.data;
};

export const updateAdminReservation = async (id: string, patch: Partial<{
  status: string;
  storageRoomId: string;
  notes: string;
}>) => {
  const res = await api.patch(`/admin/reservations/${id}`, patch);
  return res.data;
};
