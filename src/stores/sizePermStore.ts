import { create } from 'zustand';
import type { SizePerm, CreateSizePermDto, UpdateSizePermDto } from '../types/pricing';
import * as pricingService from '../services/pricing.services';

interface SizePermState {
  sizePerms: SizePerm[];
  currentSizePerm: SizePerm | null;
  loading: boolean;
  error: string | null;
  
  fetchSizePerms: () => Promise<void>;
  fetchSizePermById: (id: number) => Promise<void>;
  createSizePerm: (data: CreateSizePermDto) => Promise<SizePerm>;
  updateSizePerm: (id: number, data: UpdateSizePermDto) => Promise<void>;
  deleteSizePerm: (id: number) => Promise<void>;
  clearCurrentSizePerm: () => void;
}

export const useSizePermStore = create<SizePermState>((set) => ({
  sizePerms: [],
  currentSizePerm: null,
  loading: false,
  error: null,

  fetchSizePerms: async () => {
    set({ loading: true, error: null });
    try {
      const sizePerms = await pricingService.getSizePerms();
      set({ sizePerms, loading: false });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Error al cargar size permissions', 
        loading: false 
      });
    }
  },

  fetchSizePermById: async (id: number) => {
    set({ loading: true, error: null });
    try {
      const sizePerm = await pricingService.getSizePermById(id);
      set({ currentSizePerm: sizePerm, loading: false });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Error al cargar size permission', 
        loading: false 
      });
    }
  },

  createSizePerm: async (data: CreateSizePermDto) => {
    set({ loading: true, error: null });
    try {
      const newSizePerm = await pricingService.createSizePerm(data);
      set((state) => ({
        sizePerms: [...state.sizePerms, newSizePerm],
        loading: false,
      }));
      return newSizePerm;
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Error al crear size permission', 
        loading: false 
      });
      throw error;
    }
  },

  updateSizePerm: async (id: number, data: UpdateSizePermDto) => {
    set({ loading: true, error: null });
    try {
      const updatedSizePerm = await pricingService.updateSizePerm(id, data);
      set((state) => ({
        sizePerms: state.sizePerms.map((sp) =>
          sp.id === id ? updatedSizePerm : sp
        ),
        currentSizePerm: updatedSizePerm,
        loading: false,
      }));
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Error al actualizar size permission', 
        loading: false 
      });
      throw error;
    }
  },

  deleteSizePerm: async (id: number) => {
    set({ loading: true, error: null });
    try {
      await pricingService.deleteSizePerm(id);
      set((state) => ({
        sizePerms: state.sizePerms.filter((sp) => sp.id !== id),
        loading: false,
      }));
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Error al eliminar size permission', 
        loading: false 
      });
      throw error;
    }
  },

  clearCurrentSizePerm: () => set({ currentSizePerm: null }),
}));
