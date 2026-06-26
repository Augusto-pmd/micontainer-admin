import { api } from "./api";

export interface Cancellation {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  m2: number | null;
  storageRoomId: string | null;
  bauleraCodigo: string | null;
  cancelledBy: string;
  bajaGestionada: boolean;
  bajaDecision: string | null;
  cancelledAt: string | null;
}

export const getCancellations = async (pending = true): Promise<{ data: Cancellation[]; total: number }> => {
  const res = await api.get(`/admin/cancellations${pending ? "?pending=true" : ""}`, { skipErrorAlert: true } as any);
  return res.data;
};

export const resolveCancellation = async (id: string, decision: string, nota: string) => {
  const res = await api.post(`/admin/cancellations/${id}/resolve`, { decision, nota });
  return res.data;
};
