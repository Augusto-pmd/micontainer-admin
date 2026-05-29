import { api } from "./api";
import type { 
  StorageRoom, 
  PaginatedStorageRooms, 
  CreateStorageRoomDto, 
  UpdateStorageRoomDto 
} from "@/types/storageRoom";

interface GetStorageRoomsParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}

export const getAllStorageRoomsServices = async (params?: GetStorageRoomsParams): Promise<PaginatedStorageRooms> => {
  const { page = 1, limit = 10, status, search } = params || {};
  let url = `/storage-room?page=${page}&limit=${limit}`;
  if (status) {
    url += `&status=${status}`;
  }
  if (search) {
    url += `&search=${encodeURIComponent(search)}`;
  }
  const response = await api.get(url);
  return response.data;
};

export const getAvailableStorageRoomsServices = async (limit: number = 1000): Promise<PaginatedStorageRooms> => {
  const response = await api.get(`/storage-room?status=available&page=1&limit=${limit}`);
  return response.data;
};

export const getStorageRoomByIdServices = async (id: string | number): Promise<StorageRoom> => {
  const response = await api.get(`/storage-room/${id}`);
  return response.data;
};

export const createStorageRoomServices = async (data: CreateStorageRoomDto): Promise<StorageRoom> => {
  const response = await api.post("/storage-room", data);
  return response.data;
};

export const updateStorageRoomServices = async (id: number, data: UpdateStorageRoomDto): Promise<StorageRoom> => {
  const response = await api.patch(`/storage-room/${id}`, data);
  return response.data;
};

export const deleteStorageRoomServices = async (id: string | number) => {
  const response = await api.delete(`/storage-room/${id}`);
  return response.data;
};

export const assignCustomerToStorageRoomServices = async (storageRoomId: number, customerId: number): Promise<StorageRoom> => {
  const response = await api.patch(`/storage-room/${storageRoomId}/assign-customer`, {
    customerId
  });
  return response.data;
};

export const adminAssignCustomerToStorageRoomServices = async (storageRoomId: number, customerId: number): Promise<StorageRoom> => {
  const response = await api.patch(`/storage-room/${storageRoomId}/admin-assign-customer`, {
    customerId
  });
  return response.data;
};

export const uploadStorageRoomFiles = async (storageRoomId: number, files: File[]) => {
  const formData = new FormData();
  
  console.log(`Preparando subida de ${files.length} archivo(s) para storage room ID: ${storageRoomId}`);
  
  // Agregar todos los archivos al FormData
  files.forEach((file, index) => {
    console.log(`Agregando archivo ${index + 1}: ${file.name} (${file.size} bytes)`);
    formData.append('file', file);
  });

  console.log(`URL del endpoint: /s3/storage-room/${storageRoomId}/upload`);
  
  const response = await api.post(`/s3/storage-room/${storageRoomId}/upload`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  
  console.log("Respuesta del servidor:", response.data);
  
  return response.data;
};

export const deleteStorageRoomFile = async (storageRoomId: number, fileUrl: string) => {
  console.log(`Eliminando archivo para storage room ID: ${storageRoomId}, URL: ${fileUrl}`);
  
  const response = await api.delete(`/s3/storage-room/${storageRoomId}/image`, {
    data: {
      imageUrl: fileUrl
    }
  });
  
  console.log("Archivo eliminado, respuesta:", response.data);
  
  return response.data;
};

export const downloadStorageRoomFile = async (fileUrl: string, fileName: string) => {
  console.log(`Descargando archivo: ${fileUrl}`);
  
  try {
    const response = await api.get(fileUrl, {
      responseType: 'blob', // Importante para archivos
    });
    
    // Crear un blob URL temporal
    const blob = new Blob([response.data]);
    const url = window.URL.createObjectURL(blob);
    
    // Crear un link temporal y hacer click para descargar
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    
    // Limpiar
    link.remove();
    window.URL.revokeObjectURL(url);
    
    console.log("Archivo descargado exitosamente");
  } catch (error) {
    console.error("Error al descargar archivo:", error);
    throw error;
  }
};

// Re-exportar el tipo para compatibilidad
export type { StorageRoom } from "@/types/storageRoom";

