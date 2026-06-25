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
