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
  storageRoomId?: string | null;
  bauleraCodigo?: string | null;
  heldUntil?: string | null;
  source?: string;
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
  mpSubscriptionStatus: string;
  storageRoomId: string;
  notes: string;
}>) => {
  const res = await api.patch(`/admin/reservations/${id}`, patch);
  return res.data;
};

export const deleteAdminReservation = async (id: string) => {
  const res = await api.delete(`/admin/reservations/${id}`);
  return res.data;
};

export interface FreeRoom {
  id: string;
  space?: string;
  name?: string;
  areaM2?: string;
}

// Bauleras libres de una medida (para reasignar)
export const getFreeRoomsByM2 = async (m2: number): Promise<FreeRoom[]> => {
  const res = await api.get(`/storage-room?status=available&page=1&limit=2000`);
  const d = res.data;
  const list: FreeRoom[] = d?.data ?? d?.items ?? (Array.isArray(d) ? d : []);
  return list.filter((r) => Number(r.areaM2) === Number(m2));
};

// Reasignar (o asignar) baulera a una reserva. storageRoomId opcional = elegir puntual; sin el = automatica.
export const reassignReservationRoom = async (id: string, storageRoomId?: string) => {
  const res = await api.post(`/admin/reservations/${id}/assign-room`, storageRoomId ? { storageRoomId } : {});
  return res.data;
};
