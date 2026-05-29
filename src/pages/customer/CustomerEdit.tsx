import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Upload, X, FileText, Trash2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCustomerStore } from "@/stores/customerStore";
import { updateCustomerServices, uploadCustomerFiles, deleteCustomerFile, downloadCustomerFile } from "@/services/customer.services";
import { showSuccess, showApiError, showError } from "@/utils/alerts";

export const CustomerEdit = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selectedCustomer, isLoading, fetchCustomerById } = useCustomerStore();

  const [formData, setFormData] = useState({
    dni: "",
    cuit: "",
    address: "",
    phone: "",
    personType: "fisica" as "fisica" | "juridica",
    user: {
      firstName: "",
      lastName: "",
      email: "",
    },
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [existingDocuments, setExistingDocuments] = useState<string[]>([]);
  const [deletingFileUrl, setDeletingFileUrl] = useState<string | null>(null);
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchCustomerById(id);
    }
  }, [id, fetchCustomerById]);

  useEffect(() => {
    if (selectedCustomer) {
      setFormData({
        dni: selectedCustomer.dni,
        cuit: selectedCustomer.cuit,
        address: selectedCustomer.address,
        phone: selectedCustomer.phone,
        personType: selectedCustomer.personType,
        user: {
          firstName: selectedCustomer.user.firstName,
          lastName: selectedCustomer.user.lastName,
          email: selectedCustomer.user.email,
        },
      });
      
      // Cargar documentos existentes
      if (selectedCustomer.documentUrls && selectedCustomer.documentUrls.length > 0) {
        setExistingDocuments(selectedCustomer.documentUrls);
      }
    }
  }, [selectedCustomer]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    if (name.startsWith("user.")) {
      const userField = name.split(".")[1];
      setFormData((prev) => ({
        ...prev,
        user: {
          ...prev.user,
          [userField]: value,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handlePersonTypeChange = (value: "fisica" | "juridica") => {
    setFormData((prev) => ({ ...prev, personType: value }));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setSelectedFiles((prev) => [...prev, ...Array.from(files)]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  const getFileNameFromUrl = (url: string): string => {
    try {
      // Decodificar la URL para obtener el nombre legible del archivo
      const decodedUrl = decodeURIComponent(url);
      const parts = decodedUrl.split('/');
      const lastPart = parts[parts.length - 1];
      
      // Extraer el nombre del archivo (quitar el UUID si existe)
      // Formato esperado: nombreArchivo-uuid.extension
      const match = lastPart.match(/(.+?)-[a-f0-9-]{36}\.(.+)$/i);
      if (match) {
        return `${match[1]}.${match[2]}`;
      }
      
      return lastPart;
    } catch (error) {
      console.error("Error al extraer nombre del archivo:", error);
      return "Archivo";
    }
  };

  const handleDeleteFile = async (fileUrl: string) => {
    if (!window.confirm("¿Está seguro de eliminar este archivo?")) {
      return;
    }

    setDeletingFileUrl(fileUrl);
    
    try {
      await deleteCustomerFile(id as any, fileUrl);
      
      // Actualizar lista de documentos existentes
      setExistingDocuments((prev) => prev.filter((url) => url !== fileUrl));
      
      showSuccess("Archivo eliminado exitosamente");
      
      // Refrescar datos del cliente
      if (id) {
        fetchCustomerById(id);
      }
    } catch (error: any) {
      console.error("Error al eliminar archivo:", error);
      showApiError(error);
    } finally {
      setDeletingFileUrl(null);
    }
  };

  const handleDownloadFile = async (fileUrl: string) => {
    setDownloadingFile(fileUrl);
    try {
      const fileName = getFileNameFromUrl(fileUrl);
      await downloadCustomerFile(fileUrl, fileName);
    } catch (error: any) {
      console.error("Error al descargar archivo:", error);
      showError("Error al descargar el archivo");
    } finally {
      setDownloadingFile(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.dni.trim()) {
      showApiError(new Error("El DNI es requerido"));
      return;
    }

    if (!formData.cuit.trim()) {
      showApiError(new Error("El CUIT es requerido"));
      return;
    }

    if (!formData.user.firstName.trim()) {
      showApiError(new Error("El nombre es requerido"));
      return;
    }

    if (!formData.user.lastName.trim()) {
      showApiError(new Error("El apellido es requerido"));
      return;
    }

    if (!formData.user.email.trim()) {
      showApiError(new Error("El email es requerido"));
      return;
    }

    setIsSaving(true);

    try {
      const userData = {
        firstName: formData.user.firstName,
        lastName: formData.user.lastName,
        email: formData.user.email,
        address: formData.address,
        cuit: formData.cuit,
        dni: formData.dni,
        phone: formData.phone,
      };
      await updateCustomerServices(id as any, userData);
      await showSuccess("Cliente actualizado correctamente");
      
      // Si hay archivos seleccionados, subirlos
      if (selectedFiles.length > 0) {
        console.log("Iniciando subida de archivos para customer ID:", id, selectedFiles);
        setIsUploadingFiles(true);
        try {
          const uploadResponse = await uploadCustomerFiles(id as any, selectedFiles);
          console.log("Respuesta de subida:", uploadResponse);
          const { successCount, failedCount } = uploadResponse.data;
          
          if (failedCount > 0) {
            showError(`${successCount} archivo(s) subido(s), ${failedCount} fallido(s)`);
          } else {
            showSuccess(`${successCount} archivo(s) subido(s) exitosamente`);
          }
          
          // Limpiar archivos seleccionados después de subir
          setSelectedFiles([]);
        } catch (uploadError: any) {
          console.error("Error al subir archivos:", uploadError);
          showError("Cliente actualizado, pero hubo un error al subir los archivos");
        } finally {
          setIsUploadingFiles(false);
        }
      }
      
      navigate(`/customers/${id}`);
    } catch (error: any) {
      showApiError(error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin" style={{ animationDuration: "0.8s" }}>
          <Spinner className="h-16 w-16 text-green-500" />
        </div>
      </div>
    );
  }

  if (!selectedCustomer) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <p className="text-gray-500">Cliente no encontrado</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate(`/customers/${id}`)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a detalles
        </Button>

        <h1 className="text-3xl font-bold text-gray-900">Editar Cliente</h1>
        <p className="text-gray-500 mt-2">
          Actualiza la información del cliente
        </p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información del Usuario */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Información Personal
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Nombre */}
              <div className="space-y-2">
                <Label htmlFor="user.firstName">
                  Nombre <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="user.firstName"
                  name="user.firstName"
                  value={formData.user.firstName}
                  onChange={handleChange}
                  placeholder="Nombre"
                  required
                />
              </div>

              {/* Apellido */}
              <div className="space-y-2">
                <Label htmlFor="user.lastName">
                  Apellido <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="user.lastName"
                  name="user.lastName"
                  value={formData.user.lastName}
                  onChange={handleChange}
                  placeholder="Apellido"
                  required
                />
              </div>

              {/* Email */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="user.email">
                  Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="user.email"
                  name="user.email"
                  type="email"
                  value={formData.user.email}
                  onChange={handleChange}
                  placeholder="Email"
                  required
                />
              </div>
            </div>
          </div>

          {/* Información del Cliente */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Información del Cliente
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* DNI */}
              <div className="space-y-2">
                <Label htmlFor="dni">
                  DNI <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="dni"
                  name="dni"
                  value={formData.dni}
                  onChange={handleChange}
                  placeholder="DNI"
                  required
                />
              </div>

              {/* CUIT */}
              <div className="space-y-2">
                <Label htmlFor="cuit">
                  CUIT <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="cuit"
                  name="cuit"
                  value={formData.cuit}
                  onChange={handleChange}
                  placeholder="CUIT"
                  required
                />
              </div>

              {/* Dirección */}
              <div className="space-y-2">
                <Label htmlFor="address">
                  Dirección <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Dirección"
                  required
                />
              </div>

              {/* Teléfono */}
              <div className="space-y-2">
                <Label htmlFor="phone">
                  Teléfono <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Teléfono"
                  required
                />
              </div>

              {/* Tipo de Persona */}
              <div className="space-y-2">
                <Label htmlFor="personType">
                  Tipo de Persona <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.personType}
                  onValueChange={handlePersonTypeChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona el tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fisica">Persona Física</SelectItem>
                    <SelectItem value="juridica">Persona Jurídica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Sección de Carga de Archivos */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Documentos del Cliente
            </h2>
            
            {/* Documentos Existentes */}
            {existingDocuments.length > 0 && (
              <div className="mb-6 space-y-2">
                <h3 className="text-sm font-medium text-gray-700">
                  Archivos actuales ({existingDocuments.length}):
                </h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {existingDocuments.map((fileUrl, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <FileText className="h-5 w-5 text-blue-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {getFileNameFromUrl(fileUrl)}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {fileUrl}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadFile(fileUrl)}
                          disabled={downloadingFile === fileUrl}
                          className="hover:bg-blue-100 hover:text-blue-700"
                          title="Descargar archivo"
                        >
                          {downloadingFile === fileUrl ? (
                            <Spinner className="h-4 w-4" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteFile(fileUrl)}
                          disabled={deletingFileUrl === fileUrl}
                          className="hover:bg-red-100 hover:text-red-700"
                          title="Eliminar archivo"
                        >
                          {deletingFileUrl === fileUrl ? (
                            <Spinner className="h-4 w-4" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Subir Nuevos Archivos */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-700">
                Subir nuevos archivos:
              </h3>
              <div className="flex items-center gap-4">
                <Label
                  htmlFor="file-upload-edit"
                  className="flex items-center justify-center gap-2 px-4 py-2 border border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-green-500 hover:bg-green-50 transition-colors"
                >
                  <Upload className="h-5 w-5 text-gray-500" />
                  <span className="text-sm text-gray-600">
                    Seleccionar archivos
                  </span>
                  <Input
                    id="file-upload-edit"
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.svg"
                  />
                </Label>
                <p className="text-xs text-gray-500">
                  Puedes subir múltiples archivos (PDF, DOC, imágenes)
                </p>
              </div>

              {/* Lista de archivos seleccionados */}
              {selectedFiles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">
                    Archivos seleccionados ({selectedFiles.length}):
                  </p>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {selectedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <FileText className="h-5 w-5 text-gray-500 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {file.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatFileSize(file.size)}
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveFile(index)}
                          className="flex-shrink-0 hover:bg-red-50 hover:text-red-600"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex justify-end gap-4 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`/customers/${id}`)}
              disabled={isSaving || isUploadingFiles}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSaving || isUploadingFiles}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSaving || isUploadingFiles ? (
                <>
                  <Spinner className="h-4 w-4 mr-2" />
                  {isUploadingFiles ? "Subiendo archivos..." : "Guardando..."}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Guardar Cambios
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
