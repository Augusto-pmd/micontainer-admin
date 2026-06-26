import { api } from "./api";

export interface AuditRow {
  id: string;
  actor: string;
  via: string;
  role?: string | null;
  action: string;
  entity?: string | null;
  entityId?: string | null;
  branchId?: string | null;
  detail?: Record<string, any>;
  ts: string | null;
}

export interface AuditParams {
  actor?: string;
  action?: string;
  from?: string;
  to?: string;
  limit?: number;
}

export const getAudit = async (p?: AuditParams): Promise<{ data: AuditRow[]; total: number }> => {
  const q = new URLSearchParams();
  if (p?.actor) q.set("actor", p.actor);
  if (p?.action) q.set("action", p.action);
  if (p?.from) q.set("from", p.from);
  if (p?.to) q.set("to", p.to);
  q.set("limit", String(p?.limit || 200));
  const res = await api.get(`/admin/audit?${q.toString()}`);
  return res.data;
};
