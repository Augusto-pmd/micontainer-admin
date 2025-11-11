import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  updateStorageRoomServices, 
  getStorageRoomByIdServices,
  uploadStorageRoomFiles,
  deleteStorageRoomFile
} from "@/services/storageRoom.services";
import { getAllBuildings } from "@/services/building.services";
import { showError, showSuccess } from "@/utils/alerts";
import { STORAGE_ROOM_STATUS, type StorageRoomStatus, type UpdateStorageRoomDto } from "@/types/storageRoom";
import type { Building } from "@/types/building";

export const StorageRoomEdit = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [buildings, setBuildings] = useState<ComboboxOption[]>([]);

  const [formData, setFormData] = useState<Omit<UpdateStorageRoomDto, 'buildingId' | 'status'> & { buildingId: string; status: string }>({
    space: "",
    buildingId: "",
    floor: "",
    width: 0,
    length: 0,
    height: 0,
    depth: 0,
    areaM2: 0,
    volumeM3: 0,
    price: 0,
    images: [],
    status: STORAGE_ROOM_STATUS.BLOCKED,
    description: "",
  });

  const [errors, setErrors] = useState<Partial<Record<keyof UpdateStorageRoomDto, string>>>({});
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;

      try {
        const [storageRoomData, buildingsData] = await Promise.all([
          getStorageRoomByIdServices(parseInt(id)),
          getAllBuildings({ page: 1, limit: 1000 }),
        ]);

        const buildingOptions = buildingsData.data.map((building: Building) => ({
          value: building.id.toString(),
          label: `${building.name} - ${building.branch?.name || 'Sin sucursal'}`,
        }));
        setBuildings(buildingOptions);

        setFormData({
          space: storageRoomData.space,
          buildingId: storageRoomData.building?.id.toString() || "",
          floor: storageRoomData.floor,
          width: parseFloat(storageRoomData.width),
          length: parseFloat(storageRoomData.length),
          height: parseFloat(storageRoomData.height),
          depth: parseFloat(storageRoomData.depth),
          areaM2: parseFloat(storageRoomData.areaM2),
          volumeM3: parseFloat(storageRoomData.volumeM3),
          price: parseFloat(storageRoomData.price),
          images: storageRoomData.images || [],
          status: storageRoomData.status,
          description: storageRoomData.description,
        });

        // Cargar imágenes si existen
        if (storageRoomData.images && storageRoomData.images.length > 0) {
          setUploadedFiles(storageRoomData.images);
        }
      } catch (error) {
        console.error("Error loading data:", error);
        showError("Error al cargar los datos");
      } finally {
        setLoadingData(false);
      }
    };

    loadData();
  }, [id]);

  const handleChange = (field: keyof typeof formData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof UpdateStorageRoomDto]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }

    // Auto-calcular área si cambian width o length
    if (field === "width" || field === "length") {
      const width = field === "width" ? Number(value) : formData.width;
      const length = field === "length" ? Number(value) : formData.length;
      if (width && length && width > 0 && length > 0) {
        setFormData((prev) => ({ ...prev, areaM2: width * length }));
      }
    }

    // Auto-calcular volumen si cambian width, length o height
    if (field === "width" || field === "length" || field === "height") {
      const width = field === "width" ? Number(value) : formData.width;
      const length = field === "length" ? Number(value) : formData.length;
      const height = field === "height" ? Number(value) : formData.height;
      if (width && length && height && width > 0 && length > 0 && height > 0) {
        setFormData((prev) => ({ ...prev, volumeM3: width * length * height }));
      }
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof UpdateStorageRoomDto, string>> = {};

    if (formData.space && !formData.space.trim()) {
      newErrors.space = "El identificador del espacio no puede estar vacío";
    }

    if (formData.width !== undefined && formData.width <= 0) {
      newErrors.width = "El ancho debe ser mayor a 0";
    }

    if (formData.length !== undefined && formData.length <= 0) {
      newErrors.length = "El largo debe ser mayor a 0";
    }

    if (formData.height !== undefined && formData.height <= 0) {
      newErrors.height = "El alto debe ser mayor a 0";
    }

    if (formData.areaM2 !== undefined && formData.areaM2 <= 0) {
      newErrors.areaM2 = "El área debe ser mayor a 0";
    }

    if (formData.price !== undefined && formData.price <= 0) {
      newErrors.price = "El precio debe ser mayor a 0";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      showError("Por favor, corrija los errores en el formulario");
      return;
    }

    if (!id) return;

    setIsLoading(true);
    try {
      const dataToSend: UpdateStorageRoomDto = {
        space: formData.space || undefined,
        buildingId: formData.buildingId ? parseInt(formData.buildingId) : undefined,
        floor: formData.floor || undefined,
        width: formData.width || undefined,
        length: formData.length || undefined,
        height: formData.height || undefined,
        depth: formData.depth || undefined,
        areaM2: formData.areaM2 || undefined,
        volumeM3: formData.volumeM3 || undefined,
        price: formData.price || undefined,
        status: formData.status as StorageRoomStatus,
        description: formData.description || undefined,
      };

      await updateStorageRoomServices(parseInt(id), dataToSend);
      showSuccess("Espacio actualizado exitosamente");
      navigate(`/storage-rooms/${id}`);
    } catch (error: any) {
      console.error("Error updating storage room:", error);
      const errorMessage = error.response?.data?.message || "Error al actualizar el espacio";
      showError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (files: File[]) => {
    if (!id) return;

    try {
      setIsUploadingImages(true);
      const response = await uploadStorageRoomFiles(parseInt(id), files);
      
      // La respuesta tiene esta estructura:
      // { success: true, message: '...', data: { uploadedFiles: [{fileName, key, url, downloadUrl}] } }
      let newUrls: string[] = [];
      
      if (response.data?.uploadedFiles && Array.isArray(response.data.uploadedFiles)) {
        // Usar downloadUrl si está disponible (evita problemas de CORS)
        // Si no, usar url
        newUrls = response.data.uploadedFiles.map((file: any) => file.downloadUrl || file.url);
      }
      
      if (newUrls.length > 0) {
        setUploadedFiles(prev => [...prev, ...newUrls]);
        showSuccess(response.message || `${files.length} imagen(es) subida(s) exitosamente`);
      } else {
        // Si no hay URLs en la respuesta, recargar desde el servidor
        const storageRoomData = await getStorageRoomByIdServices(parseInt(id));
        if (storageRoomData.images && storageRoomData.images.length > 0) {
          setUploadedFiles(storageRoomData.images);
        }
        showSuccess(response.message || "Imágenes subidas exitosamente");
      }
    } catch (error: any) {
      console.error("Error uploading files:", error);
      const errorMessage = error.response?.data?.message || "Error al subir las imágenes";
      showError(errorMessage);
    } finally {
      setIsUploadingImages(false);
    }
  };

  const handleFileDelete = async (fileUrl: string) => {
    if (!id) return;
    
    try {
      await deleteStorageRoomFile(parseInt(id), fileUrl);
      setUploadedFiles(prev => prev.filter(url => url !== fileUrl));
      showSuccess("Imagen eliminada exitosamente");
    } catch (error: any) {
      console.error("Error deleting file:", error);
      const errorMessage = error.response?.data?.message || "Error al eliminar la imagen";
      showError(errorMessage);
    }
  };



  if (loadingData) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin" style={{ animationDuration: "0.8s" }}>
          <Spinner className="h-16 w-16 text-green-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <Button
        variant="ghost"
        onClick={() => navigate(`/storage-rooms/${id}`)}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Volver a Detalles
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Editar Espacio de Almacenamiento</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Información Básica */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">
                Información Básica
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="space">
                    Identificador del Espacio
                  </Label>
                  <Input
                    id="space"
                    placeholder="SR-001"
                    value={formData.space}
                    onChange={(e) => handleChange("space", e.target.value)}
                    className={errors.space ? "border-red-500" : ""}
                  />
                  {errors.space && (
                    <p className="text-sm text-red-500">{errors.space}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="buildingId">
                    Edificio
                  </Label>
                  <Combobox
                    options={buildings}
                    value={formData.buildingId}
                    onChange={(value) => handleChange("buildingId", value)}
                    placeholder="Seleccione un edificio"
                    searchPlaceholder="Buscar edificio..."
                    emptyMessage="No se encontraron edificios"
                    width="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="floor">
                    Piso
                  </Label>
                  <Input
                    id="floor"
                    placeholder="Floor 1"
                    value={formData.floor}
                    onChange={(e) => handleChange("floor", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">
                    Estado
                  </Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => handleChange("status", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione un estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={STORAGE_ROOM_STATUS.AVAILABLE}>Disponible</SelectItem>
                      <SelectItem value={STORAGE_ROOM_STATUS.OCCUPIED}>Ocupado</SelectItem>
                      <SelectItem value={STORAGE_ROOM_STATUS.RESERVED}>Reservado</SelectItem>
                      <SelectItem value={STORAGE_ROOM_STATUS.BLOCKED}>Bloqueado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Dimensiones */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">
                Dimensiones
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="width">
                    Ancho (m)
                  </Label>
                  <Input
                    id="width"
                    type="number"
                    step="0.01"
                    placeholder="5.00"
                    value={formData.width || ""}
                    onChange={(e) => handleChange("width", parseFloat(e.target.value) || 0)}
                    className={errors.width ? "border-red-500" : ""}
                  />
                  {errors.width && (
                    <p className="text-sm text-red-500">{errors.width}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="length">
                    Largo (m)
                  </Label>
                  <Input
                    id="length"
                    type="number"
                    step="0.01"
                    placeholder="10.00"
                    value={formData.length || ""}
                    onChange={(e) => handleChange("length", parseFloat(e.target.value) || 0)}
                    className={errors.length ? "border-red-500" : ""}
                  />
                  {errors.length && (
                    <p className="text-sm text-red-500">{errors.length}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="height">
                    Alto (m)
                  </Label>
                  <Input
                    id="height"
                    type="number"
                    step="0.01"
                    placeholder="3.00"
                    value={formData.height || ""}
                    onChange={(e) => handleChange("height", parseFloat(e.target.value) || 0)}
                    className={errors.height ? "border-red-500" : ""}
                  />
                  {errors.height && (
                    <p className="text-sm text-red-500">{errors.height}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="depth">
                    Profundidad (m)
                  </Label>
                  <Input
                    id="depth"
                    type="number"
                    step="0.01"
                    placeholder="2.00"
                    value={formData.depth || ""}
                    onChange={(e) => handleChange("depth", parseFloat(e.target.value) || 0)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="areaM2">
                    Área (m²)
                  </Label>
                  <Input
                    id="areaM2"
                    type="number"
                    step="0.01"
                    placeholder="50.00"
                    value={formData.areaM2 || ""}
                    onChange={(e) => handleChange("areaM2", parseFloat(e.target.value) || 0)}
                    className={errors.areaM2 ? "border-red-500" : ""}
                  />
                  {errors.areaM2 && (
                    <p className="text-sm text-red-500">{errors.areaM2}</p>
                  )}
                  <p className="text-xs text-gray-500">
                    Calculado: {((formData.width || 0) * (formData.length || 0)).toFixed(2)} m²
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="volumeM3">
                    Volumen (m³)
                  </Label>
                  <Input
                    id="volumeM3"
                    type="number"
                    step="0.01"
                    placeholder="150.00"
                    value={formData.volumeM3 || ""}
                    onChange={(e) => handleChange("volumeM3", parseFloat(e.target.value) || 0)}
                  />
                  <p className="text-xs text-gray-500">
                    Calculado: {((formData.width || 0) * (formData.length || 0) * (formData.height || 0)).toFixed(2)} m³
                  </p>
                </div>
              </div>
            </div>

            {/* Precio */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">
                Precio
              </h3>

              <div className="space-y-2">
                <Label htmlFor="price">
                  Precio Mensual (ARS)
                </Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  placeholder="200.50"
                  value={formData.price || ""}
                  onChange={(e) => handleChange("price", parseFloat(e.target.value) || 0)}
                  className={errors.price ? "border-red-500" : ""}
                />
                {errors.price && (
                  <p className="text-sm text-red-500">{errors.price}</p>
                )}
              </div>
            </div>

            {/* Descripción */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">
                Descripción
              </h3>

              <div className="space-y-2">
                <Label htmlFor="description">
                  Descripción del Espacio
                </Label>
                <Textarea
                  id="description"
                  placeholder="Descripción detallada del espacio de almacenamiento..."
                  value={formData.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  rows={4}
                />
              </div>
            </div>

            {/* Imágenes del Espacio */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="text-lg font-semibold">
                  Imágenes del Espacio ({uploadedFiles.length})
                </h3>
                <div>
                  <input
                    type="file"
                    multiple
                    accept=".jpg,.jpeg,.png,.svg,.webp"
                    id="image-upload-input-edit"
                    className="hidden"
                    onChange={async (e) => {
                      const files = Array.from(e.target.files || []);
                      if (files.length > 0) {
                        await handleFileUpload(files);
                        e.target.value = '';
                      }
                    }}
                  />
                  <Button 
                    type="button" 
                    size="sm" 
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => document.getElementById('image-upload-input-edit')?.click()}
                    disabled={isUploadingImages}
                  >
                    {isUploadingImages ? (
                      <>
                        <Spinner className="w-4 h-4 mr-2" />
                        Subiendo...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Agregar Imágenes
                      </>
                    )}
                  </Button>
                </div>
              </div>
              
              {uploadedFiles.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {uploadedFiles.map((imageUrl, index) => {
                    console.log(`Renderizando imagen ${index + 1}:`, imageUrl);
                    return (
                    <div 
                      key={index} 
                      className="relative group"
                    >
                      <a 
                        href={imageUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <div 
                          className="relative w-full rounded-lg border-2 border-gray-300 hover:border-green-500 overflow-hidden transition-all duration-300 shadow-sm hover:shadow-md"
                          style={{ 
                            height: '256px',
                            backgroundColor: '#f9fafb'
                          }}
                        >
                          <img
                            src={imageUrl}
                            alt={`Imagen ${index + 1}`}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'contain',
                              display: 'block'
                            }}
                            onLoad={() => {
                              console.log(`Imagen cargada exitosamente: ${imageUrl}`);
                            }}
                            onError={(e) => {
                              console.error(`Error cargando imagen: ${imageUrl}`);
                              const img = e.target as HTMLImageElement;
                              const container = img.parentElement;
                              if (container) {
                                container.innerHTML = `
                                  <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #6b7280;">
                                    <svg style="width: 48px; height: 48px; margin-bottom: 8px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                    <p style="font-size: 14px; font-weight: 500;">Error al cargar</p>
                                    <p style="font-size: 12px; margin-top: 4px;">URL: ${imageUrl.substring(0, 50)}...</p>
                                  </div>
                                `;
                              }
                            }}
                          />
                        </div>
                      </a>
                      {/* Botón eliminar */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleFileDelete(imageUrl);
                        }}
                        className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white rounded-full p-1.5 shadow-lg transition-all duration-200 opacity-0 group-hover:opacity-100 z-10"
                        title="Eliminar imagen"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg text-gray-500">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-lg font-medium mb-2">No hay imágenes</p>
                  <p className="text-sm">Haz clic en "Agregar Imágenes" para subir fotos del espacio</p>
                </div>
              )}
            </div>

            {/* Botones de Acción */}
            <div className="flex justify-end gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/storage-rooms/${id}`)}
                disabled={isLoading || isUploadingImages}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-green-600 hover:bg-green-700"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    Guardando...
                  </>
                ) : (
                  "Guardar Cambios"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
