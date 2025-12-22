import { create } from 'zustand';
import type { FloorMultiplier, CreateFloorMultiplierDto, UpdateFloorMultiplierDto } from '../types/pricing';
import * as pricingService from '../services/pricing.services';

interface FloorMultiplierState {
  floorMultipliers: FloorMultiplier[];
  currentFloorMultiplier: FloorMultiplier | null;
  loading: boolean;
  error: string | null;
  
  fetchFloorMultipliers: () => Promise<void>;
  fetchFloorMultiplierById: (id: number) => Promise<void>;
  createFloorMultiplier: (data: CreateFloorMultiplierDto) => Promise<FloorMultiplier>;
  updateFloorMultiplier: (id: number, data: UpdateFloorMultiplierDto) => Promise<void>;
  deleteFloorMultiplier: (id: number) => Promise<void>;
  clearCurrentFloorMultiplier: () => void;
}

export const useFloorMultiplierStore = create<FloorMultiplierState>((set) => ({
  floorMultipliers: [],
  currentFloorMultiplier: null,
  loading: false,
  error: null,

  fetchFloorMultipliers: async () => {
    set({ loading: true, error: null });
    try {
      const floorMultipliers = await pricingService.getFloorMultipliers();
      set({ floorMultipliers, loading: false });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Error al cargar floor multipliers', 
        loading: false 
      });
    }
  },

  fetchFloorMultiplierById: async (id: number) => {
    set({ loading: true, error: null });
    try {
      const floorMultiplier = await pricingService.getFloorMultiplierById(id);
      set({ currentFloorMultiplier: floorMultiplier, loading: false });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Error al cargar floor multiplier', 
        loading: false 
      });
    }
  },

  createFloorMultiplier: async (data: CreateFloorMultiplierDto) => {
    set({ loading: true, error: null });
    try {
      const newFloorMultiplier = await pricingService.createFloorMultiplier(data);
      set((state) => ({
        floorMultipliers: [...state.floorMultipliers, newFloorMultiplier],
        loading: false,
      }));
      return newFloorMultiplier;
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Error al crear floor multiplier', 
        loading: false 
      });
      throw error;
    }
  },

  updateFloorMultiplier: async (id: number, data: UpdateFloorMultiplierDto) => {
    set({ loading: true, error: null });
    try {
      const updatedFloorMultiplier = await pricingService.updateFloorMultiplier(id, data);
      set((state) => ({
        floorMultipliers: state.floorMultipliers.map((fm) =>
          fm.id === id ? updatedFloorMultiplier : fm
        ),
        currentFloorMultiplier: updatedFloorMultiplier,
        loading: false,
      }));
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Error al actualizar floor multiplier', 
        loading: false 
      });
      throw error;
    }
  },

  deleteFloorMultiplier: async (id: number) => {
    set({ loading: true, error: null });
    try {
      await pricingService.deleteFloorMultiplier(id);
      set((state) => ({
        floorMultipliers: state.floorMultipliers.filter((fm) => fm.id !== id),
        loading: false,
      }));
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Error al eliminar floor multiplier', 
        loading: false 
      });
      throw error;
    }
  },

  clearCurrentFloorMultiplier: () => set({ currentFloorMultiplier: null }),
}));
