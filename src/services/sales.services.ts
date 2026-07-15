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
  // MES GRATIS (2 links): true = generar YA el pago único del gap (alineación al 1°).
  // false/ausente = diferirlo (se genera después desde Inventario → botón Proporcional).
  generarGapAhora?: boolean;
  // Si se difiere: desde qué fecha Inventario marca el gap "sin cobrar" (celeste). Vacío = de una.
  recordarGapDesde?: string;
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
  // MES GRATIS (modelo 14/07): link 1 = suscripción; link 2 = proporcional de ENTRADA (los días del
  // mes actual, hoy → 1° próximo). El backend devuelve las FECHAS del ciclo ya calculadas.
  suscripcionLink?: string;
  gapLink?: string | null;   // null si se difirió (generarGapAhora=false) o gap=0
  gapAmount?: number;        // SIEMPRE viene calculado (para mostrar el ciclo aunque se difiera)
  gapDays?: number;
  gapDesde?: string;         // 'YYYY-MM-DD' hoy
  gapHasta?: string;         // 'YYYY-MM-DD' el 1° próximo (arranca el gratis)
  finGratis?: string;        // 'YYYY-MM-DD' fin del período gratis
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
