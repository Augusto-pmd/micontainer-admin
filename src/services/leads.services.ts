import { api } from './api';

export interface Lead { id: string; name: string; email: string; phone: string; m2?: number | null; }
export interface Leads { clientes: Lead[]; noClientes: Lead[]; }

export const getLeads = async (branchId?: string): Promise<Leads> => {
  const r = await api.get(`/leads${branchId ? `?branchId=${encodeURIComponent(branchId)}` : ''}`);
  return r.data;
};
