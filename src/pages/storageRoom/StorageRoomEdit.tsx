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
import { getAllBuildings, getBuildingById } from "@/services/building.services";
import { showError, showSuccess } from "@/utils/alerts";
import { STORAGE_ROOM_STATUS, type StorageRoomStatus, type UpdateStorageRoomDto } from "@/types/storageRoom";
import type { Building } from "@/types/building";

export const StorageRoomEdit = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [buildings, setBuildings] = useState<ComboboxOption[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [floorOptions, setFloorOptions] = useState<ComboboxOption[]>([]);

  const [formData, setFormData] = useState<Omit<UpdateStorageRoomDto, 'buildingId' | 'status'> & { buildingId: string; status: string }>({
    space: "",
    buildingId: "",
    floor: 0,
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
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]); // URLs de imágenes ya guardadas en S3
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]); // Archivos pendientes de subir
  const [previewUrls, setPreviewUrls] = useState<string[]>([]); // URLs temporales para preview
  const [filesToDelete, setFilesToDelete] = useState<string[]>([]); // Imágenes marcadas para eliminar

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
          floor: typeof storageRoomData.floor === 'string' ? parseInt(storageRoomData.floor) : storageRoomData.floor,
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

        // Cargar info del edificio para obtener pisos
        if (storageRoomData.building?.id) {
          const building = await getBuildingById(storageRoomData.building.id);
          setSelectedBuilding(building);
          
          // Generar opciones de pisos
          const floors: ComboboxOption[] = [];
          for (let i = 0; i < building.floors; i++) {
            floors.push({
              value: i.toString(),
              label: i === 0 ? "PB" : `Piso ${i}`,
            });
          }
          setFloorOptions(floors);
        }

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

  const handleChange = async (field: keyof typeof formData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof UpdateStorageRoomDto]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }

    // Cargar info del edificio cuando se selecciona
    if (field === "buildingId" && value) {
      try {
        const building = await getBuildingById(parseInt(value as string));
        setSelectedBuilding(building);
        
        // Generar opciones de pisos
        const floors: ComboboxOption[] = [];
        for (let i = 0; i < building.floors; i++) {
          floors.push({
            value: i.toString(),
            label: i === 0 ? "PB" : `Piso ${i}`,
          });
        }
        setFloorOptions(floors);
        
        // Resetear el piso seleccionado
        setFormData((prev) => ({ ...prev, floor: 0 }));
      } catch (error) {
        console.error("Error loading building:", error);
        showError("Error al cargar información del edificio");
      }
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
      // 1. Primero actualizar los datos del storage room
      const dataToSend: UpdateStorageRoomDto = {
        space: formData.space || undefined,
        buildingId: formData.buildingId ? parseInt(formData.buildingId) : undefined,
        floor: formData.floor !== undefined && formData.floor !== null ? formData.floor : undefined,
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

      // 2. Eliminar imágenes marcadas para eliminar
      if (filesToDelete.length > 0) {
        console.log(`=== ELIMINANDO IMÁGENES ===`);
        console.log(`Total marcadas para eliminar: ${filesToDelete.length}`);
        console.log(`URLs a eliminar:`, filesToDelete);
        
        const deletePromises = filesToDelete.map(async (fileUrl, index) => {
          try {
            console.log(`[${index + 1}/${filesToDelete.length}] Eliminando: ${fileUrl}`);
            const result = await deleteStorageRoomFile(parseInt(id), fileUrl);
            console.log(`[${index + 1}/${filesToDelete.length}] Eliminada exitosamente`);
            return result;
          } catch (error) {
            console.error(`[${index + 1}/${filesToDelete.length}] Error eliminando:`, error);
            throw error;
          }
        });
        
        await Promise.all(deletePromises);
        console.log(`✓ Todas las ${filesToDelete.length} imagen(es) eliminada(s)`);
        
        // Actualizar el estado local para reflejar las eliminaciones
        setUploadedFiles(prev => prev.filter(url => !filesToDelete.includes(url)));
        setFilesToDelete([]);
      }

      // 3. Si hay imágenes pendientes, subirlas ahora
      if (pendingFiles.length > 0) {
        setIsUploadingImages(true);
        const response = await uploadStorageRoomFiles(parseInt(id), pendingFiles);
        console.log("Imágenes subidas:", response);
      }

      // 4. Verificar qué imágenes tiene el storage room después de las operaciones
      const updatedStorageRoom = await getStorageRoomByIdServices(parseInt(id));
      console.log("=== VERIFICACIÓN FINAL ===");
      console.log("Imágenes en el servidor después de guardar:", updatedStorageRoom.images);
      console.log("Total de imágenes:", updatedStorageRoom.images?.length || 0);
      
      // Navegar inmediatamente para evitar renderizados con datos antiguos
      showSuccess("Espacio actualizado exitosamente");
      
      // Usar replace en lugar de push para evitar que el usuario vuelva atrás
      navigate(`/storage-rooms/${id}`, { replace: true });
    } catch (error: any) {
      console.error("Error updating storage room:", error);
      const errorMessage = error.response?.data?.message || "Error al actualizar el espacio";
      showError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (files: File[]) => {
    // Crear previews locales sin subir al servidor todavía
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setPreviewUrls(prev => [...prev, e.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });

    // Guardar archivos para subir más tarde
    setPendingFiles(prev => [...prev, ...files]);
    showSuccess(`${files.length} imagen(es) lista(s) para subir`);
  };

  const handleFileDelete = (fileUrl: string, isPending: boolean = false) => {
    if (isPending) {
      // Es un preview local, solo remover del estado
      const index = previewUrls.indexOf(fileUrl);
      if (index > -1) {
        setPreviewUrls(prev => prev.filter(url => url !== fileUrl));
        setPendingFiles(prev => prev.filter((_, i) => i !== index));
        showSuccess("Imagen removida");
      }
    } else {
      // Es una imagen ya guardada en S3, marcarla para eliminar
      setFilesToDelete(prev => [...prev, fileUrl]);
      showSuccess("Imagen marcada para eliminar");
    }
  };

  const handleRestoreFile = (fileUrl: string) => {
    // Restaurar una imagen marcada para eliminar
    setFilesToDelete(prev => prev.filter(url => url !== fileUrl));
    showSuccess("Imagen restaurada");
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
                  <Combobox
                    options={floorOptions}
                    value={formData.floor?.toString() || "0"}
                    onChange={(value) => handleChange("floor", Number(value))}
                    placeholder="Seleccione un piso"
                    searchPlaceholder="Buscar piso..."
                    emptyMessage={formData.buildingId ? "No hay pisos disponibles" : "Primero seleccione un edificio"}
                    width="w-full"
                    disabled={!formData.buildingId}
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
                  Imágenes del Espacio ({uploadedFiles.length - filesToDelete.length + previewUrls.length})
                  {previewUrls.length > 0 && (
                    <span className="ml-2 text-sm text-yellow-600 font-normal">
                      ({previewUrls.length} pendiente{previewUrls.length > 1 ? 's' : ''})
                    </span>
                  )}
                  {filesToDelete.length > 0 && (
                    <span className="ml-2 text-sm text-red-600 font-normal">
                      ({filesToDelete.length} se eliminarán)
                    </span>
                  )}
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
              
              {(uploadedFiles.length > 0 || previewUrls.length > 0) ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Imágenes ya guardadas en S3 */}
                  {uploadedFiles.map((imageUrl, index) => {
                    const isMarkedForDeletion = filesToDelete.includes(imageUrl);
                    console.log(`Renderizando imagen guardada ${index + 1}:`, imageUrl);
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
                          className={`relative w-full rounded-lg border-2 ${
                            isMarkedForDeletion 
                              ? 'border-red-300 hover:border-red-500' 
                              : 'border-gray-300 hover:border-green-500'
                          } overflow-hidden transition-all duration-300 shadow-sm hover:shadow-md`}
                          style={{ 
                            height: '256px',
                            backgroundColor: isMarkedForDeletion ? '#fef2f2' : '#f9fafb',
                            opacity: isMarkedForDeletion ? 0.6 : 1
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
                          {/* Badge de "Marcada para eliminar" */}
                          {isMarkedForDeletion && (
                            <div className="absolute top-2 left-2 bg-red-600 text-white text-xs font-semibold px-2 py-1 rounded flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Se eliminará
                            </div>
                          )}
                        </div>
                      </a>
                      
                      {/* Botón eliminar o restaurar */}
                      {isMarkedForDeletion ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleRestoreFile(imageUrl);
                          }}
                          className="absolute top-2 right-2 bg-green-600 hover:bg-green-700 text-white rounded-full p-1.5 shadow-lg transition-all duration-200 opacity-0 group-hover:opacity-100 z-10"
                          title="Restaurar imagen"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleFileDelete(imageUrl, false);
                          }}
                          className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white rounded-full p-1.5 shadow-lg transition-all duration-200 opacity-0 group-hover:opacity-100 z-10"
                          title="Marcar para eliminar"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  );
                  })}

                  {/* Previews de imágenes pendientes de subir */}
                  {previewUrls.map((previewUrl, index) => (
                    <div 
                      key={`preview-${index}`} 
                      className="relative group"
                    >
                      <div className="block">
                        <div 
                          className="relative w-full rounded-lg border-2 border-yellow-300 hover:border-yellow-500 overflow-hidden transition-all duration-300 shadow-sm hover:shadow-md"
                          style={{ 
                            height: '256px',
                            backgroundColor: '#fffbeb'
                          }}
                        >
                          <img
                            src={previewUrl}
                            alt={`Preview ${index + 1}`}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'contain',
                              display: 'block'
                            }}
                          />
                          {/* Badge de "Pendiente" */}
                          <div className="absolute top-2 left-2 bg-yellow-500 text-white text-xs font-semibold px-2 py-1 rounded">
                            Pendiente
                          </div>
                        </div>
                      </div>
                      {/* Botón eliminar preview */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleFileDelete(previewUrl, true);
                        }}
                        className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white rounded-full p-1.5 shadow-lg transition-all duration-200 opacity-0 group-hover:opacity-100 z-10"
                        title="Remover imagen"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
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
                onClick={() => {
                  // Limpiar previews, archivos pendientes y marcas de eliminación
                  setPreviewUrls([]);
                  setPendingFiles([]);
                  setFilesToDelete([]);
                  navigate(`/storage-rooms/${id}`);
                }}
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
