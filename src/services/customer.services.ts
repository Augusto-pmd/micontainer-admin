import { api } from "./api";
import type { PaginatedCustomers } from "@/types/customer";

interface GetAllCustomersParams {
  page?: number;
  limit?: number;
}

export const getAllCustomersServices = async (params?: GetAllCustomersParams): Promise<PaginatedCustomers> => {
  const { page = 1, limit = 10 } = params || {};
  const response = await api.get(`/customer?page=${page}&limit=${limit}`);
  return response.data;
};

export const getCustomerByIdServices = async (id: number) => {
  const response = await api.get(`/customer/${id}`);
  return response.data;
};

export const createCustomerServices = async (customerData: any) => {
  const response = await api.post("/customer", customerData);
  return response.data;
};

export const updateCustomerServices = async (id: number, customerData: any) => {
  const response = await api.patch(`/customer/${id}`, customerData);
  return response.data;
};

export const deleteCustomerServices = async (id: number) => {
  const response = await api.delete(`/customer/${id}`);
  return response.data;
};

export const uploadCustomerFiles = async (customerId: number, files: File[]) => {
  const formData = new FormData();
  
  console.log(`Preparando subida de ${files.length} archivo(s) para customer ID: ${customerId}`);
  
  // Agregar todos los archivos al FormData
  files.forEach((file, index) => {
    console.log(`Agregando archivo ${index + 1}: ${file.name} (${file.size} bytes)`);
    formData.append('file', file);
  });

  console.log(`URL del endpoint: /s3/customer/${customerId}/upload`);
  
  const response = await api.post(`/s3/customer/${customerId}/upload`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  
  console.log("Respuesta del servidor:", response.data);
  
  return response.data;
};

export const deleteCustomerFile = async (customerId: number, fileUrl: string) => {
  console.log(`Eliminando archivo para customer ID: ${customerId}, URL: ${fileUrl}`);
  
  const response = await api.delete(`/s3/customer/${customerId}/file`, {
    data: {
      fileUrl: fileUrl
    }
  });
  
  console.log("Archivo eliminado, respuesta:", response.data);
  
  return response.data;
};

export const downloadCustomerFile = async (fileUrl: string, fileName: string) => {
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
