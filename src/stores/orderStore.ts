import { create } from 'zustand';
import type { ReservationOrder, PaginatedOrders } from '../types/order';
import { getAllOrdersServices, getOrderByIdServices } from '../services/order.services';

interface OrderStore {
  // Estado
  orders: ReservationOrder[];
  selectedOrder: ReservationOrder | null;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  isLoading: boolean;
  error: string | null;

  // Acciones
  fetchOrders: (params?: { page?: number; limit?: number }) => Promise<void>;
  fetchOrderById: (id: string | number) => Promise<void>;
  setSelectedOrder: (order: ReservationOrder | null) => void;
  clearSelectedOrder: () => void;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  clearError: () => void;
}

export const useOrderStore = create<OrderStore>((set, get) => ({
  // Estado inicial
  orders: [],
  selectedOrder: null,
  total: 0,
  page: 1,
  limit: 10,
  totalPages: 1,
  isLoading: false,
  error: null,

  // Obtener órdenes con paginación
  fetchOrders: async (params) => {
    const { page = get().page, limit = get().limit } = params || {};
    
    set({ isLoading: true, error: null });
    
    try {
      const response: PaginatedOrders = await getAllOrdersServices({ page, limit });
      
      set({
        orders: response.data,
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
        error: error?.response?.data?.message || error?.message || 'Error al cargar órdenes'
      });
      throw error;
    }
  },

  // Obtener una orden específica por ID
  fetchOrderById: async (id: string | number) => {
    set({ isLoading: true, error: null });
    
    try {
      const order = await getOrderByIdServices(id);
      
      set({
        selectedOrder: order,
        isLoading: false,
        error: null
      });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error?.response?.data?.message || error?.message || 'Error al cargar la orden'
      });
      throw error;
    }
  },

  // Establecer orden seleccionada directamente
  setSelectedOrder: (order) => {
    set({ selectedOrder: order });
  },

  // Limpiar orden seleccionada
  clearSelectedOrder: () => {
    set({ selectedOrder: null });
  },

  // Cambiar página
  setPage: (page) => {
    set({ page });
  },

  // Cambiar límite
  setLimit: (limit) => {
    set({ limit, page: 1 }); // Resetear a página 1 cuando cambia el límite
  },

  // Limpiar errores
  clearError: () => {
    set({ error: null });
  }
}));

// Selectores útiles
export const useOrders = () => useOrderStore(state => state.orders);
export const useSelectedOrder = () => useOrderStore(state => state.selectedOrder);
export const useOrdersLoading = () => useOrderStore(state => state.isLoading);
export const useOrdersError = () => useOrderStore(state => state.error);
