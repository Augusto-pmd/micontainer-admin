import { api } from './api';
import type {
  PricingEngine,
  CreatePricingEngineDto,
  UpdatePricingEngineDto,
  FloorMultiplier,
  CreateFloorMultiplierDto,
  UpdateFloorMultiplierDto,
  SizePerm,
  CreateSizePermDto,
  UpdateSizePermDto,
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

// ==================== Pricing Engine ====================

export const getPricingEngines = async (): Promise<PricingEngine[]> => {
  const response = await api.get('/pricing-engine');
  return response.data;
};

export const getPricingEngineById = async (id: string | number): Promise<PricingEngine> => {
  const response = await api.get(`/pricing-engine/${id}`);
  return response.data;
};

export const createPricingEngine = async (data: CreatePricingEngineDto): Promise<PricingEngine> => {
  const response = await api.post('/pricing-engine', data);
  return response.data;
};

export const updatePricingEngine = async (
  id: number,
  data: UpdatePricingEngineDto
): Promise<PricingEngine> => {
  const response = await api.patch(`/pricing-engine/${id}`, data);
  return response.data;
};

export const deletePricingEngine = async (id: string | number): Promise<void> => {
  await api.delete(`/pricing-engine/${id}`);
};

// ==================== Floor Multiplier ====================

export const getFloorMultipliers = async (): Promise<FloorMultiplier[]> => {
  const response = await api.get('/floor-multiplier');
  return response.data;
};

export const getFloorMultiplierById = async (id: string | number): Promise<FloorMultiplier> => {
  const response = await api.get(`/floor-multiplier/${id}`);
  return response.data;
};

export const createFloorMultiplier = async (
  data: CreateFloorMultiplierDto
): Promise<FloorMultiplier> => {
  const response = await api.post('/floor-multiplier', data);
  return response.data;
};

export const updateFloorMultiplier = async (
  id: number,
  data: UpdateFloorMultiplierDto
): Promise<FloorMultiplier> => {
  const response = await api.patch(`/floor-multiplier/${id}`, data);
  return response.data;
};

export const deleteFloorMultiplier = async (id: string | number): Promise<void> => {
  await api.delete(`/floor-multiplier/${id}`);
};

// ==================== Size Perm ====================

export const getSizePerms = async (): Promise<SizePerm[]> => {
  const response = await api.get('/size-perm');
  return response.data;
};

export const getSizePermById = async (id: string | number): Promise<SizePerm> => {
  const response = await api.get(`/size-perm/${id}`);
  return response.data;
};

export const createSizePerm = async (data: CreateSizePermDto): Promise<SizePerm> => {
  const response = await api.post('/size-perm', data);
  return response.data;
};

export const updateSizePerm = async (id: number, data: UpdateSizePermDto): Promise<SizePerm> => {
  const response = await api.patch(`/size-perm/${id}`, data);
  return response.data;
};

export const deleteSizePerm = async (id: string | number): Promise<void> => {
  await api.delete(`/size-perm/${id}`);
};
