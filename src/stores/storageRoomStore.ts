import { create } from "zustand";
import type { StorageRoom } from "@/types/storageRoom";
import { getStorageRoomByIdServices } from "@/services/storageRoom.services";

interface StorageRoomState {
  selectedStorageRoom: StorageRoom | null;
  isLoading: boolean;
  error: string | null;
  fetchStorageRoomById: (id: number) => Promise<void>;
  clearSelectedStorageRoom: () => void;
}

export const useStorageRoomStore = create<StorageRoomState>((set) => ({
  selectedStorageRoom: null,
  isLoading: false,
  error: null,

  fetchStorageRoomById: async (id: number) => {
    set({ isLoading: true, error: null });
    try {
      const storageRoom = await getStorageRoomByIdServices(id);
      set({ selectedStorageRoom: storageRoom, isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || "Error al cargar el storage room",
        isLoading: false,
      });
    }
  },

  clearSelectedStorageRoom: () => {
    set({ selectedStorageRoom: null, error: null });
  },
}));
