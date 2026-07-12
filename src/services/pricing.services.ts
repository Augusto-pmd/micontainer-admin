import { api } from './api';
import type {
  BranchPricingConfig,
  UpdateBranchPricingDto,
} from '../types/pricing';

// ==================== Branch Pricing Config (Unified) ====================

export const getPricingConfigByBranch = async (branchId: number): Promise<BranchPricingConfig> => {
  const response = await api.get(`/pricing-engine/branch/${branchId}`);
  return response.data;
};

export const updatePricingConfigByBranch = async (
  branchId: number,
  data: UpdateBranchPricingDto
): Promise<BranchPricingConfig> => {
  const response = await api.put(`/pricing-engine/branch/${branchId}`, data);
  return response.data;
};

// ==================== Cobros rechazados (titileo Inventario) ====================
// Backend READ-ONLY: ultimo intento de cobro por suscripcion en MP. Plazo de negocio:
// 10 dias para regularizar desde el rechazo. Cacheado 10 min en el server.

export interface CobroRechazado {
  baulera: string;
  m2: number;
  cliente: string;
  email: string;
  subId: string;
  monto: number;
  fechaRechazo: string;
  diasTranscurridos: number | null;
  diasRestantes: number | null;
  vencido: boolean;
  mpEstado: string;
  mpDetalle: string;
  reintentos: number | null;
}

export interface CobrosRechazadosRes {
  total: number;
  plazoDias: number;
  revisadas: number;
  sinDato: number;
  rechazados: CobroRechazado[];
  cacheado?: boolean;
}

export const getCobrosRechazadosServices = async (branchId = 'nordelta'): Promise<CobrosRechazadosRes> => {
  const response = await api.get(`/pricing-engine/cobros-rechazados/${branchId}`);
  return response.data;
};

// ==================== Pricing Engine ====================

// (CRUD PricingEngine / floor-multiplier / size-perm ELIMINADOS 12/07: solo los usaban 3 stores
// zombis sin consumidores, y las rutas /floor-multiplier y /size-perm nunca existieron en el backend.)
