import { api } from './api';

export interface PricingByM2 { [m2: string]: number; }

export interface BranchLite { id: string; name?: string; }

export interface RoomLite {
  id: string;
  space?: string;
  name?: string;
  areaM2?: string;
  status?: string;
  price?: string;
  priceOverride?: number | null;
  lockPrice?: boolean;
}

export const getBranches = async (): Promise<BranchLite[]> => {
  const r = await api.get('/branch?page=1&limit=100');
  const d = r.data;
  const list = d?.data ?? d?.items ?? (Array.isArray(d) ? d : []);
  return list as BranchLite[];
};

export const getPricingTable = async (branchId: string): Promise<PricingByM2> => {
  const r = await api.get(`/pricing?branchId=${encodeURIComponent(branchId)}`);
  return (r.data && r.data.byM2) || {};
};

export const savePricingTable = async (branchId: string, byM2: PricingByM2, effectiveDate?: string): Promise<void> => {
  await api.put(`/pricing-engine/branch/${encodeURIComponent(branchId)}`, { byM2, effectiveDate });
};

export const getAllRooms = async (branchId: string): Promise<RoomLite[]> => {
  const r = await api.get(`/storage-room?branchId=${encodeURIComponent(branchId)}&page=1&limit=2000`);
  const d = r.data;
  const list = d?.data ?? d?.items ?? d?.rooms ?? (Array.isArray(d) ? d : []);
  return list as RoomLite[];
};

export const saveRoomOverride = async (
  id: string,
  body: { priceOverride: number | null; lockPrice: boolean }
): Promise<void> => {
  await api.put(`/pricing-engine/room/${encodeURIComponent(id)}`, body);
};

export const repriceSubscriptions = async (
  branchId: string, m2: number, currentAmount: number, newAmount: number, dryRun: boolean, notify = false
): Promise<any> => {
  const r = await api.post(`/pricing-engine/reprice/${encodeURIComponent(branchId)}`, { m2, currentAmount, newAmount, dryRun, notify });
  return r.data;
};

export const repriceAll = async (
  branchId: string,
  items: Array<{ m2: number; currentAmount: number; newAmount: number }>,
  dryRun: boolean, notify = false
): Promise<any> => {
  const r = await api.post(`/pricing-engine/reprice-all/${encodeURIComponent(branchId)}`, { items, dryRun, notify });
  return r.data;
};

// CAMBIAR EL COBRO REAL DE UN INQUILINO POR BAULERA (reprice individual desde Tarifas): cambia el
// monto de la suscripción de MP del inquilino ACTIVO de esa baulera. Rige para los próximos cobros.
// Distinto de "Precio propio" (que es solo el precio de referencia de la baulera, no toca MP).
export const cambiarCobroBaulera = async (code: string, nuevo: number) => {
  const r = await api.post(`/admin/reservations/cambiar-precio-baulera`, { code, nuevo });
  return r.data as { ok: boolean; code: string; cliente: string; subId: string; anterior: number; nuevo: number };
};
