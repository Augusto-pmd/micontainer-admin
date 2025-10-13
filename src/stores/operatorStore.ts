import { create } from "zustand";
import type { Operator } from "@/types/operator";
import { getOperatorByIdServices } from "@/services/operator.services";

interface OperatorState {
  selectedOperator: Operator | null;
  isLoading: boolean;
  error: string | null;
  setSelectedOperator: (operator: Operator | null) => void;
  fetchOperatorById: (id: number) => Promise<void>;
  clearSelectedOperator: () => void;
}

export const useOperatorStore = create<OperatorState>((set) => ({
  selectedOperator: null,
  isLoading: false,
  error: null,

  setSelectedOperator: (operator) => set({ selectedOperator: operator }),

  fetchOperatorById: async (id: number) => {
    set({ isLoading: true, error: null });
    try {
      const operator = await getOperatorByIdServices(id);
      set({ selectedOperator: operator, isLoading: false });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || "Error al cargar el operador";
      set({ error: errorMessage, isLoading: false });
    }
  },

  clearSelectedOperator: () => set({ selectedOperator: null, error: null }),
}));
