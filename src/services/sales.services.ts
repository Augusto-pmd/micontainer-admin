import { api } from "./api";

export interface ManualSalePayload {
  sucursalId?: string;
  category?: string;
  m2: number;
  storageRoomId?: string;
  bauleraCodigo?: string;
  name?: string;
  email: string;
  phone?: string;
  dni?: string;
  startDate?: string;
  endDate?: string;
  durationMonths?: number;
  promoMonths?: number;
  discountPct?: number;
  priceOverride?: number;
  paymentMode?: 'subscription' | 'onetime';
}

export interface ManualSaleResult {
  reservationId: string;
  initPoint: string;
  preapprovalId: string;
  monthly: number;
  duration: number;
  paymentMode?: string;
  total?: number;
}

// Venta manual desde el admin: crea la reserva + suscripcion MP y devuelve el link de pago.
export const createManualSale = async (p: ManualSalePayload): Promise<ManualSaleResult> => {
  const res = await api.post("/admin/reservations/sell", p);
  return res.data;
};
