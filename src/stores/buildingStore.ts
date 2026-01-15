import { create } from 'zustand';
import type { Building } from '../types/building';
import { getAllBuildings, getBuildingById, deleteBuilding as deleteBuildingService } from '../services/building.services';
import { showSuccess } from '../utils/alerts';

interface PaginatedBuildings {
  data: Building[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface BuildingStore {
  // Estado
  buildings: Building[];
  selectedBuilding: Building | null;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  isLoading: boolean;
  error: string | null;

  // Acciones
  fetchBuildings: (params?: { page?: number; limit?: number }) => Promise<void>;
  fetchBuildingById: (id: number) => Promise<void>;
  deleteBuilding: (id: number) => Promise<void>;
  setSelectedBuilding: (building: Building | null) => void;
  clearSelectedBuilding: () => void;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  clearError: () => void;
}

export const useBuildingStore = create<BuildingStore>((set, get) => ({
  // Estado inicial
  buildings: [],
  selectedBuilding: null,
  total: 0,
  page: 1,
  limit: 10,
  totalPages: 1,
  isLoading: false,
  error: null,

  // Obtener edificios con paginación
  fetchBuildings: async (params) => {
    const { page = get().page, limit = get().limit } = params || {};
    
    set({ isLoading: true, error: null });
    
    try {
      const response: PaginatedBuildings = await getAllBuildings({ page, limit });
      
      set({
        buildings: response.data,
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
        error: error?.response?.data?.message || error?.message || 'Error al cargar edificios'
      });
      throw error;
    }
  },

  // Obtener un edificio específico por ID
  fetchBuildingById: async (id: number) => {
    set({ isLoading: true, error: null });
    
    try {
      const building = await getBuildingById(id);
      
      set({
        selectedBuilding: building,
        isLoading: false,
        error: null
      });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error?.response?.data?.message || error?.message || 'Error al cargar el edificio'
      });
      throw error;
    }
  },

  // Establecer edificio seleccionado directamente
  setSelectedBuilding: (building) => {
    set({ selectedBuilding: building });
  },

  // Eliminar un edificio
  deleteBuilding: async (id: number) => {
    set({ isLoading: true, error: null });
    
    try {
      await deleteBuildingService(id);
      
      // Refrescar la lista después de eliminar
      await get().fetchBuildings();
      
      // Mostrar mensaje de éxito
      await showSuccess('Edificio eliminado correctamente');
      
      set({
        isLoading: false,
        error: null
      });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error?.response?.data?.message || error?.message || 'Error al eliminar el edificio'
      });
      throw error;
    }
  },

  // Limpiar edificio seleccionado
  clearSelectedBuilding: () => {
    set({ selectedBuilding: null });
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
export const useBuildings = () => useBuildingStore(state => state.buildings);
export const useSelectedBuilding = () => useBuildingStore(state => state.selectedBuilding);
export const useBuildingsLoading = () => useBuildingStore(state => state.isLoading);
export const useBuildingsError = () => useBuildingStore(state => state.error);
