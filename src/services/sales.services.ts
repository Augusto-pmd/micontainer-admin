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
  promoUnit?: 'days' | 'months';
  discountPct?: number;
  priceOverride?: number;
  paymentMode?: 'subscription' | 'onetime' | 'plan';
}

export interface ManualSaleResult {
  reservationId: string;
  initPoint: string;
  preapprovalId?: string;
  monthly: number;
  duration: number;
  paymentMode?: string;
  total?: number;
  endDate?: string;
  planId?: string;
  suscripcionLink?: string;
  // MES GRATIS (modelo 31/07): UN SOLO link. El proporcional de entrada lo cobra MP al terminar el
  // período gratis; estos tres campos son la ESTIMACIÓN para avisarle al cliente (el monto real lo
  // calcula MP). Ya no existe el segundo link ni el modo regalar/cobrar.
  proporcionalDias?: number;
  proporcionalEstimado?: number;
  proporcionalFecha?: string;
  finGratis?: string;        // 'YYYY-MM-DD' fin del período gratis (arranca HOY)
  primerDebito?: string;     // 'YYYY-MM-DD' primer débito completo (el 1° siguiente)
  trialDays?: number;        // días totales del cupón/trial en MP
  gratis?: string;           // "1 mes(es)" / "45 día(s)"
}

// Venta manual desde el admin: crea la reserva + suscripcion MP y devuelve el link de pago.
// RUTA 1 de 3: SUSCRIPCIÓN mensual (la de siempre).
export const createManualSale = async (p: ManualSalePayload): Promise<ManualSaleResult> => {
  const res = await api.post("/admin/reservations/sell", p);
  return res.data;
};

// RUTA 2 de 3: PAGO ÚNICO — el cliente paga N meses de una (Checkout Pro, sin recurrencia).
// Endpoint PROPIO para no cruzarse con la suscripción.
export const createOneTimeSale = async (p: ManualSalePayload): Promise<ManualSaleResult> => {
  const res = await api.post("/admin/reservations/sell-onetime", p);
  return res.data;
};

// RUTA 3 de 3: MES GRATIS — suscripción vía PLAN de MP (free_trial). Devuelve el LINK DEL PLAN.
// Endpoint PROPIO para no cruzarse con las otras dos.
export const createPlanSale = async (p: ManualSalePayload): Promise<ManualSaleResult> => {
  const res = await api.post("/admin/reservations/sell-plan", p);
  return res.data;
};
