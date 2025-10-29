import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import { FileUpload } from "@/components/FileUpload";
import { 
  createStorageRoomServices, 
  uploadStorageRoomFiles, 
  deleteStorageRoomFile, 
  downloadStorageRoomFile 
} from "@/services/storageRoom.services";
import { getAllBuildings } from "@/services/building.services";
import { showError, showSuccess } from "@/utils/alerts";
import { STORAGE_ROOM_STATUS, type StorageRoomStatus, type CreateStorageRoomDto } from "@/types/storageRoom";
import type { Building } from "@/types/building";

export const StorageRoomCreate = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [buildings, setBuildings] = useState<ComboboxOption[]>([]);

  const [formData, setFormData] = useState<Omit<CreateStorageRoomDto, 'buildingId' | 'status'> & { buildingId: string; status: string }>({
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
    image: "",
    status: STORAGE_ROOM_STATUS.BLOCKED,
    description: "",
  });

  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [storageRoomId, setStorageRoomId] = useState<number | null>(null);

  const [errors, setErrors] = useState<Partial<Record<keyof CreateStorageRoomDto, string>>>({});

  useEffect(() => {
    const loadBuildings = async () => {
      try {
        const response = await getAllBuildings({ page: 1, limit: 1000 });
        const buildingOptions = response.data.map((building: Building) => ({
          value: building.id.toString(),
          label: `${building.name} - ${building.branch?.name || 'Sin sucursal'}`,
        }));
        setBuildings(buildingOptions);
      } catch (error) {
        console.error("Error loading buildings:", error);
        showError("Error al cargar los edificios");
      } finally {
        setLoadingData(false);
      }
    };

    loadBuildings();
  }, []);

  const handleChange = (field: keyof typeof formData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof CreateStorageRoomDto]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }

    // Auto-calcular área si cambian width o length
    if (field === "width" || field === "length") {
      const width = field === "width" ? Number(value) : formData.width;
      const length = field === "length" ? Number(value) : formData.length;
      if (width > 0 && length > 0) {
        setFormData((prev) => ({ ...prev, areaM2: width * length }));
      }
    }

    // Auto-calcular volumen si cambian width, length o height
    if (field === "width" || field === "length" || field === "height") {
      const width = field === "width" ? Number(value) : formData.width;
      const length = field === "length" ? Number(value) : formData.length;
      const height = field === "height" ? Number(value) : formData.height;
      if (width > 0 && length > 0 && height > 0) {
        setFormData((prev) => ({ ...prev, volumeM3: width * length * height }));
      }
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof CreateStorageRoomDto, string>> = {};

    if (!formData.space.trim()) {
      newErrors.space = "El identificador del espacio es requerido";
    }

    if (!formData.buildingId) {
      newErrors.buildingId = "Debe seleccionar un edificio";
    }

    if (!formData.floor.trim()) {
      newErrors.floor = "El piso es requerido";
    }

    if (formData.width <= 0) {
      newErrors.width = "El ancho debe ser mayor a 0";
    }

    if (formData.length <= 0) {
      newErrors.length = "El largo debe ser mayor a 0";
    }

    if (formData.height <= 0) {
      newErrors.height = "El alto debe ser mayor a 0";
    }

    if (formData.areaM2 <= 0) {
      newErrors.areaM2 = "El área debe ser mayor a 0";
    }

    if (formData.price <= 0) {
      newErrors.price = "El precio debe ser mayor a 0";
    }

    // La imagen ahora es opcional
    if (formData.image.trim() && !formData.image.match(/^https?:\/\/.+/)) {
      newErrors.image = "Debe ser una URL válida";
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

    setIsLoading(true);
    try {
      const dataToSend: CreateStorageRoomDto = {
        ...formData,
        buildingId: parseInt(formData.buildingId),
        status: formData.status as StorageRoomStatus,
        depth: formData.depth || undefined,
        volumeM3: formData.volumeM3 || undefined,
        description: formData.description || undefined,
        image: formData.image || "",
      };

      const createdStorageRoom = await createStorageRoomServices(dataToSend);
      setStorageRoomId(createdStorageRoom.id);
      showSuccess("Espacio creado exitosamente. Ahora puedes subir archivos.");
    } catch (error: any) {
      console.error("Error creating storage room:", error);
      const errorMessage = error.response?.data?.message || "Error al crear el espacio";
      showError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (files: File[]) => {
    if (!storageRoomId) {
      showError("Primero debes crear el espacio antes de subir archivos");
      return;
    }

    const response = await uploadStorageRoomFiles(storageRoomId, files);
    if (response.urls) {
      setUploadedFiles(prev => [...prev, ...response.urls]);
    }
  };

  const handleFileDelete = async (fileUrl: string) => {
    if (!storageRoomId) return;
    
    await deleteStorageRoomFile(storageRoomId, fileUrl);
    setUploadedFiles(prev => prev.filter(url => url !== fileUrl));
  };

  const handleFileDownload = async (fileUrl: string, fileName: string) => {
    await downloadStorageRoomFile(fileUrl, fileName);
  };

  const handleFinish = () => {
    navigate("/storage-rooms");
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
        onClick={() => navigate("/storage-rooms")}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Volver a Espacios
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Crear Nuevo Espacio de Almacenamiento</CardTitle>
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
                    Identificador del Espacio <span className="text-red-500">*</span>
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
                    Edificio <span className="text-red-500">*</span>
                  </Label>
                  <Combobox
                    options={buildings}
                    value={formData.buildingId}
                    onChange={(value) => handleChange("buildingId", value)}
                    placeholder="Seleccione un edificio"
                    searchPlaceholder="Buscar edificio..."
                    emptyMessage="No se encontraron edificios"
                    width="w-full"
                    className={errors.buildingId ? "border-red-500" : ""}
                  />
                  {errors.buildingId && (
                    <p className="text-sm text-red-500">{errors.buildingId}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="floor">
                    Piso <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="floor"
                    placeholder="Floor 1"
                    value={formData.floor}
                    onChange={(e) => handleChange("floor", e.target.value)}
                    className={errors.floor ? "border-red-500" : ""}
                  />
                  {errors.floor && (
                    <p className="text-sm text-red-500">{errors.floor}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">
                    Estado <span className="text-red-500">*</span>
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
                    Ancho (m) <span className="text-red-500">*</span>
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
                    Largo (m) <span className="text-red-500">*</span>
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
                    Alto (m) <span className="text-red-500">*</span>
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
                    Área (m²) <span className="text-red-500">*</span>
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
                    Se calcula automáticamente: {formData.width} × {formData.length} = {(formData.width * formData.length).toFixed(2)} m²
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
                    Se calcula automáticamente: {(formData.width * formData.length * formData.height).toFixed(2)} m³
                  </p>
                </div>
              </div>
            </div>

            {/* Precio e Imagen */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">
                Precio e Imagen
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">
                    Precio Mensual (ARS) <span className="text-red-500">*</span>
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

                <div className="space-y-2">
                  <Label htmlFor="image">
                    URL de Imagen (opcional)
                  </Label>
                  <Input
                    id="image"
                    type="url"
                    placeholder="https://example.com/image.jpg"
                    value={formData.image}
                    onChange={(e) => handleChange("image", e.target.value)}
                    className={errors.image ? "border-red-500" : ""}
                  />
                  {errors.image && (
                    <p className="text-sm text-red-500">{errors.image}</p>
                  )}
                  <p className="text-xs text-gray-500">
                    También puedes subir archivos después de crear el espacio
                  </p>
                </div>
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

            {/* Sección de archivos (solo después de crear) */}
            {storageRoomId && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">
                  Archivos del Espacio
                </h3>
                <FileUpload
                  files={uploadedFiles}
                  onUpload={handleFileUpload}
                  onDelete={handleFileDelete}
                  onDownload={handleFileDownload}
                  acceptedTypes={[".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png", ".svg"]}
                  maxFiles={10}
                  maxFileSize={10}
                  title="Imágenes y Documentos"
                  description="Sube imágenes del espacio, planos, documentos relacionados"
                />
              </div>
            )}

            {/* Botones de Acción */}
            <div className="flex justify-end gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/storage-rooms")}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              
              {!storageRoomId ? (
                <Button
                  type="submit"
                  className="bg-green-600 hover:bg-green-700"
                  disabled={isLoading || buildings.length === 0}
                >
                  {isLoading ? (
                    <>
                      <Spinner className="mr-2 h-4 w-4" />
                      Creando...
                    </>
                  ) : (
                    "Crear Espacio"
                  )}
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleFinish}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Finalizar
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
