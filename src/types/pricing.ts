// PricingEngine types
export interface PricingEngine {
  id: number;
  totalUnits: number;
  occupiedUnits: number;
  baseScarcityMultiplier: number;
  scarcityFactor: number;
  basePricePerM2: number;
  expectedDurationMonths: number;
  branchId: number;
  createdAt: string;
  updatedAt: string;
  branch?: {
    id: number;
    name: string;
  };
}

export interface CreatePricingEngineDto {
  totalUnits: number;
  occupiedUnits: number;
  scarcityFactor: number;
  basePricePerM2: number;
  expectedDurationMonths: number;
  branchId: number;
}

export interface UpdatePricingEngineDto {
  totalUnits?: number;
  occupiedUnits?: number;
  scarcityFactor?: number;
  basePricePerM2?: number;
  expectedDurationMonths?: number;
  branchId?: number;
}

// FloorMultiplier types
export interface FloorMultiplier {
  id: number;
  floor: number;
  multiplier: number;
  pricingEngineId: number;
  createdAt: string;
  updatedAt: string;
  pricingEngine?: {
    id: number;
    branchId: number;
  };
}

export interface CreateFloorMultiplierDto {
  floor: number;
  multiplier: number;
  pricingEngineId: number;
}

export interface UpdateFloorMultiplierDto {
  floor?: number;
  multiplier?: number;
}

// SizePerm types
export interface SizePerm {
  id: number;
  multiplier: number;
  minRange: number;
  maxRange: number;
  branchId: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSizePermDto {
  multiplier: number;
  minRange: number;
  maxRange: number;
  branchId: number;
}

export interface UpdateSizePermDto {
  multiplier?: number;
  minRange?: number;
  maxRange?: number;
  branchId?: number;
}

// Respuesta unificada por sucursal
export interface BranchPricingConfig {
  pricingEngine: PricingEngine | null;
  floorMultipliers: FloorMultiplier[];
  sizePerms: SizePerm[];
}

// Body para actualizar toda la configuración
export interface UpdateBranchPricingDto {
  pricingEngine?: Partial<Omit<PricingEngine, 'id' | 'branchId' | 'createdAt' | 'updatedAt' | 'branch'>>;
  floorMultipliers?: Array<{
    id?: number;
    floor: number;
    multiplier: number;
  }>;
  sizePerms?: Array<{
    id?: number;
    minRange: number;
    maxRange: number;
    multiplier: number;
  }>;
}
