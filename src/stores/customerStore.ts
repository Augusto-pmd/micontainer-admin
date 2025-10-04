import { create } from 'zustand';
import type { Customer, PaginatedCustomers } from '../types/customer';
import { getAllCustomersServices, getCustomerByIdServices } from '../services/customer.services';

interface CustomerStore {
  // Estado
  customers: Customer[];
  selectedCustomer: Customer | null;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  isLoading: boolean;
  error: string | null;

  // Acciones
  fetchCustomers: (params?: { page?: number; limit?: number }) => Promise<void>;
  fetchCustomerById: (id: number) => Promise<void>;
  setSelectedCustomer: (customer: Customer | null) => void;
  clearSelectedCustomer: () => void;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  clearError: () => void;
}

export const useCustomerStore = create<CustomerStore>((set, get) => ({
  // Estado inicial
  customers: [],
  selectedCustomer: null,
  total: 0,
  page: 1,
  limit: 10,
  totalPages: 1,
  isLoading: false,
  error: null,

  // Obtener clientes con paginación
  fetchCustomers: async (params) => {
    const { page = get().page, limit = get().limit } = params || {};
    
    set({ isLoading: true, error: null });
    
    try {
      const response: PaginatedCustomers = await getAllCustomersServices({ page, limit });
      
      set({
        customers: response.data,
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
        error: error?.response?.data?.message || error?.message || 'Error al cargar clientes'
      });
      throw error;
    }
  },

  // Obtener un cliente específico por ID
  fetchCustomerById: async (id: number) => {
    set({ isLoading: true, error: null });
    
    try {
      const customer = await getCustomerByIdServices(id);
      
      set({
        selectedCustomer: customer,
        isLoading: false,
        error: null
      });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error?.response?.data?.message || error?.message || 'Error al cargar el cliente'
      });
      throw error;
    }
  },

  // Establecer cliente seleccionado directamente
  setSelectedCustomer: (customer) => {
    set({ selectedCustomer: customer });
  },

  // Limpiar cliente seleccionado
  clearSelectedCustomer: () => {
    set({ selectedCustomer: null });
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
export const useCustomers = () => useCustomerStore(state => state.customers);
export const useSelectedCustomer = () => useCustomerStore(state => state.selectedCustomer);
export const useCustomersLoading = () => useCustomerStore(state => state.isLoading);
export const useCustomersError = () => useCustomerStore(state => state.error);
