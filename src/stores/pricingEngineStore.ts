import { create } from 'zustand';
import type { PricingEngine, CreatePricingEngineDto, UpdatePricingEngineDto } from '../types/pricing';
import * as pricingService from '../services/pricing.services';

interface PricingEngineState {
  pricingEngines: PricingEngine[];
  currentPricingEngine: PricingEngine | null;
  loading: boolean;
  error: string | null;
  
  fetchPricingEngines: () => Promise<void>;
  fetchPricingEngineById: (id: string | number) => Promise<void>;
  createPricingEngine: (data: CreatePricingEngineDto) => Promise<PricingEngine>;
  updatePricingEngine: (id: number, data: UpdatePricingEngineDto) => Promise<void>;
  deletePricingEngine: (id: string | number) => Promise<void>;
  clearCurrentPricingEngine: () => void;
}

export const usePricingEngineStore = create<PricingEngineState>((set) => ({
  pricingEngines: [],
  currentPricingEngine: null,
  loading: false,
  error: null,

  fetchPricingEngines: async () => {
    set({ loading: true, error: null });
    try {
      const pricingEngines = await pricingService.getPricingEngines();
      set({ pricingEngines, loading: false });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Error al cargar pricing engines', 
        loading: false 
      });
    }
  },

  fetchPricingEngineById: async (id: string | number) => {
    set({ loading: true, error: null });
    try {
      const pricingEngine = await pricingService.getPricingEngineById(id);
      set({ currentPricingEngine: pricingEngine, loading: false });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Error al cargar pricing engine', 
        loading: false 
      });
    }
  },

  createPricingEngine: async (data: CreatePricingEngineDto) => {
    set({ loading: true, error: null });
    try {
      const newPricingEngine = await pricingService.createPricingEngine(data);
      set((state) => ({
        pricingEngines: [...state.pricingEngines, newPricingEngine],
        loading: false,
      }));
      return newPricingEngine;
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Error al crear pricing engine', 
        loading: false 
      });
      throw error;
    }
  },

  updatePricingEngine: async (id: number, data: UpdatePricingEngineDto) => {
    set({ loading: true, error: null });
    try {
      const updatedPricingEngine = await pricingService.updatePricingEngine(id, data);
      set((state) => ({
        pricingEngines: state.pricingEngines.map((pe) =>
          pe.id === id ? updatedPricingEngine : pe
        ),
        currentPricingEngine: updatedPricingEngine,
        loading: false,
      }));
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Error al actualizar pricing engine', 
        loading: false 
      });
      throw error;
    }
  },

  deletePricingEngine: async (id: string | number) => {
    set({ loading: true, error: null });
    try {
      await pricingService.deletePricingEngine(id);
      set((state) => ({
        pricingEngines: state.pricingEngines.filter((pe) => pe.id !== id),
        loading: false,
      }));
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Error al eliminar pricing engine', 
        loading: false 
      });
      throw error;
    }
  },

  clearCurrentPricingEngine: () => set({ currentPricingEngine: null }),
}));
