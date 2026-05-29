import { create } from 'zustand';
import type { Branch, PaginatedBranches } from '../types/branch';
import { getAllBranchesServices, getBranchByIdServices, deleteBranchServices } from '../services/branch.services';
import { showSuccess } from '../utils/alerts';

interface BranchStore {
  // Estado
  branches: Branch[];
  selectedBranch: Branch | null;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  isLoading: boolean;
  error: string | null;

  // Acciones
  fetchBranches: (params?: { page?: number; limit?: number }) => Promise<void>;
  fetchBranchById: (id: string | number) => Promise<void>;
  deleteBranch: (id: string | number) => Promise<void>;
  setSelectedBranch: (branch: Branch | null) => void;
  clearSelectedBranch: () => void;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  clearError: () => void;
}

export const useBranchStore = create<BranchStore>((set, get) => ({
  // Estado inicial
  branches: [],
  selectedBranch: null,
  total: 0,
  page: 1,
  limit: 10,
  totalPages: 1,
  isLoading: false,
  error: null,

  // Obtener sucursales con paginación
  fetchBranches: async (params) => {
    const { page = get().page, limit = get().limit } = params || {};
    
    set({ isLoading: true, error: null });
    
    try {
      const response: PaginatedBranches = await getAllBranchesServices({ page, limit });
      
      set({
        branches: response.data,
        total: response.total,
        page: response.page,
        limit: response.limit,
        totalPages: response.totalPages,
        isLoading: false,
        error: null
      });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error?.response?.data?.message || error?.message || 'Error al cargar sucursales'
      });
      throw error;
    }
  },

  // Obtener una sucursal específica por ID
  fetchBranchById: async (id: string | number) => {
    set({ isLoading: true, error: null });
    
    try {
      const branch = await getBranchByIdServices(id);
      
      set({
        selectedBranch: branch,
        isLoading: false,
        error: null
      });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error?.response?.data?.message || error?.message || 'Error al cargar la sucursal'
      });
      throw error;
    }
  },

  // Establecer sucursal seleccionada directamente
  setSelectedBranch: (branch) => {
    set({ selectedBranch: branch });
  },

  // Eliminar una sucursal
  deleteBranch: async (id: string | number) => {
    set({ isLoading: true, error: null });
    
    try {
      await deleteBranchServices(id);
      
      // Refrescar la lista después de eliminar
      await get().fetchBranches();
      
      // Mostrar mensaje de éxito
      await showSuccess('Sucursal eliminada correctamente');
      
      set({
        isLoading: false,
        error: null
      });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error?.response?.data?.message || error?.message || 'Error al eliminar la sucursal'
      });
      throw error;
    }
  },

  // Limpiar sucursal seleccionada
  clearSelectedBranch: () => {
    set({ selectedBranch: null });
  },

  // Cambiar página
  setPage: (page) => {
    set({ page });
  },

  // Cambiar límite
  setLimit: (limit) => {
    set({ limit, page: 1 });
  },

  // Limpiar errores
  clearError: () => {
    set({ error: null });
  }
}));

// Selectores útiles
export const useBranches = () => useBranchStore(state => state.branches);
export const useSelectedBranch = () => useBranchStore(state => state.selectedBranch);
export const useBranchesLoading = () => useBranchStore(state => state.isLoading);
export const useBranchesError = () => useBranchStore(state => state.error);
