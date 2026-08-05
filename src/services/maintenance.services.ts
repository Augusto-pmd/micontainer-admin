import { api } from "./api";

export interface RoomsReport {
  total: number;
  esquemaNuevo_conPrefijo: number;
  esquemaViejo_sinPrefijo: number;
  porBranchId: Record<string, number>;
  ejemploNuevo: string[];
  ejemploViejo: string[];
  edificios: { id: string; name: string; branchId?: string }[];
}

export const getRoomsReport = async (): Promise<RoomsReport> => {
  const res = await api.get("/admin/maintenance/rooms-report");
  return res.data;
};

export const cleanupRooms = async (): Promise<{ backed: number; deleted: number; restantes: number; backupStamp: string }> => {
  const res = await api.post("/admin/maintenance/rooms-cleanup", { confirm: true });
  return res.data;
};

export const renameBuilding = async (id: string, name: string) => {
  const res = await api.post("/admin/maintenance/rename-building", { id, name });
  return res.data;
};

// INQUILINOS HUÉRFANOS: bauleras LIBRES que quedaron con datos del inquilino anterior pegados
// (bug corregido el 05/08 — las liberadas antes del fix arrastran la basura). El reporte no toca
// nada; la limpieza respalda cada baulera antes de despegar los punteros. No borra clientes.
export interface HuerfanosReport {
  bauleras: number;
  customersAfectados: number;
  detalle: { roomId: string; baulera: string; enBaulera: string[]; customers: string[] }[];
}

export const getHuerfanos = async (): Promise<HuerfanosReport> => {
  const res = await api.get("/admin/maintenance/inquilinos-huerfanos");
  return res.data;
};

export const limpiarHuerfanos = async (): Promise<{ bauleras: number; customersDesanexados: number; backupStamp: string }> => {
  const res = await api.post("/admin/maintenance/inquilinos-huerfanos", { confirm: true });
  return res.data;
};
