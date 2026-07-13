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
  faceEnrollStatus?: 'not_started' | 'queued' | 'enrolled' | 'failed' | 'revoked';
  paymentMode?: string;
}

export interface AdminReservationsResponse {
  data: AdminReservation[];
  total: number;
}

// Detalle completo de una reserva (incluye la traza del recobro: rebillAt/rebillBy/mpInitPoint)
export type AdminReservationFull = AdminReservation & {
  rebillAt?: string; rebillBy?: string; rebillPrevPreapprovalId?: string; mpInitPoint?: string;
};
export const getAdminReservationById = async (id: string): Promise<AdminReservationFull> => {
  const res = await api.get(`/admin/reservations/${id}`);
  return res.data;
};

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

// DAR DE BAJA (distinto de Eliminar): cancela la suscripción en MP si tiene (corta el cobro),
// marca la reserva cancelada y libera la baulera. Para pago único solo marca + libera.
export const cancelAdminReservation = async (id: string) => {
  const res = await api.post(`/admin/reservations/${id}/cancel`);
  return res.data as { message: string; mpCancelled: boolean; roomFreed: boolean };
};

// REENVIAR LINK DE COBRO (pago rechazado): cancela la sub rechazada en MP (deja de reintentar),
// crea una nueva atada a la MISMA baulera/reserva y se la manda al cliente por mail. Si la paga,
// el webhook lo reactiva solo. Devuelve el link nuevo para copiar/mandar por WhatsApp.
// (rebillSubscription ELIMINADO: creaba una suscripción nueva vía /rebill — contra el modelo.
//  La UI usa generarDeuda -> /deuda, PAGO ÚNICO. El endpoint /rebill quedó deshabilitado -> 410.)

// DEUDA (SPEC cobros-alineados §5): genera un PAGO ÚNICO por un mes adeudado o un proporcional.
// NO crea suscripción (la del cliente sigue viva sola). Reemplaza a rebillSubscription en la UI.
export const generarDeuda = async (p: {
  bauleraCodigo: string; monto: number; tipo: 'mes_adeudado' | 'proporcional';
  periodo?: string; desde?: string; hasta?: string; email: string; cliente?: string; reservationId?: string;
}) => {
  const res = await api.post(`/admin/reservations/deuda`, p);
  return res.data as { debtId: string; initPoint: string; tipo: string; monto: number; periodo: string; email: string };
};

// FACE ID — alta manual por el admin (hasta integrar el dispositivo de acceso):
// ver la foto (URL firmada 15 min), confirmar el alta (borra la foto) o rechazarla.
export const getFacePhoto = async (id: string) => {
  const res = await api.get(`/admin/reservations/${id}/face-photo`);
  return res.data as { url?: string; path?: string; status?: string; subida?: string; baulera?: string };
};
export const confirmFaceEnrolled = async (id: string) => {
  const res = await api.post(`/admin/reservations/${id}/face-enrolled`);
  return res.data as { message: string };
};
export const rejectFacePhoto = async (id: string) => {
  const res = await api.post(`/admin/reservations/${id}/face-reject`);
  return res.data as { message: string };
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
