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
