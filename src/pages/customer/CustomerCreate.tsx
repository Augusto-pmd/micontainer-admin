import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Upload, X, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { createCustomerServices, uploadCustomerFiles } from "@/services/customer.services";
import { showError, showSuccess } from "@/utils/alerts";

interface CreateCustomerFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  dni: string;
  cuit: string;
  phone: string;
  address: string;
  personType: "fisica" | "juridica";
}

export const CustomerCreate = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = location.state?.returnTo || "/customers";
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [formData, setFormData] = useState<CreateCustomerFormData>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    dni: "",
    cuit: "",
    phone: "",
    address: "",
    personType: "fisica",
  });

  const [errors, setErrors] = useState<Partial<Record<keyof CreateCustomerFormData, string>>>({});

  const handleChange = (field: keyof CreateCustomerFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Limpiar error cuando el usuario empiece a escribir
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
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

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof CreateCustomerFormData, string>> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = "El nombre es requerido";
    } else if (formData.firstName.length < 2) {
      newErrors.firstName = "El nombre debe tener al menos 2 caracteres";
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = "El apellido es requerido";
    } else if (formData.lastName.length < 2) {
      newErrors.lastName = "El apellido debe tener al menos 2 caracteres";
    }

    if (!formData.email.trim()) {
      newErrors.email = "El email es requerido";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Email inválido";
    }

    if (!formData.password) {
      newErrors.password = "La contraseña es requerida";
    } else if (formData.password.length < 6) {
      newErrors.password = "La contraseña debe tener al menos 6 caracteres";
    }

    if (!formData.dni.trim()) {
      newErrors.dni = "El DNI es requerido";
    } else if (!/^\d{7,8}$/.test(formData.dni)) {
      newErrors.dni = "DNI inválido (debe tener 7 u 8 dígitos)";
    }

    if (!formData.cuit.trim()) {
      newErrors.cuit = "El CUIT es requerido";
    } else if (!/^\d{2}-\d{8}-\d{1}$/.test(formData.cuit)) {
      newErrors.cuit = "CUIT debe tener formato XX-XXXXXXXX-X";
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "El teléfono es requerido";
    } else if (formData.phone.length < 8) {
      newErrors.phone = "Teléfono inválido (mínimo 8 caracteres)";
    }

    if (!formData.address.trim()) {
      newErrors.address = "La dirección es requerida";
    } else if (formData.address.length < 5) {
      newErrors.address = "La dirección debe tener al menos 5 caracteres";
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
      const response = await createCustomerServices(formData);
      console.log("Respuesta completa del servidor:", response);
      
      // El ID puede estar en response.data.id o response.id dependiendo de la estructura
      const customerId = response.data?.id || response.id;
      console.log("Customer ID extraído:", customerId);
      
      showSuccess("Cliente creado exitosamente");
      
      // Si hay archivos seleccionados, subirlos
      if (selectedFiles.length > 0 && customerId) {
        console.log("Iniciando subida de archivos...", selectedFiles);
        setIsUploadingFiles(true);
        try {
          const uploadResponse = await uploadCustomerFiles(customerId, selectedFiles);
          console.log("Respuesta de subida:", uploadResponse);
          const { successCount, failedCount } = uploadResponse.data;
          
          if (failedCount > 0) {
            showError(`${successCount} archivo(s) subido(s), ${failedCount} fallido(s)`);
          } else {
            showSuccess(`${successCount} archivo(s) subido(s) exitosamente`);
          }
        } catch (uploadError: any) {
          console.error("Error al subir archivos:", uploadError);
          showError("Cliente creado, pero hubo un error al subir los archivos");
        } finally {
          setIsUploadingFiles(false);
        }
      } else if (selectedFiles.length > 0 && !customerId) {
        console.error("No se pudo obtener el ID del cliente creado");
        showError("Cliente creado, pero no se pudo obtener el ID para subir archivos");
      }
      
      navigate(returnTo);
    } catch (error: any) {
      console.error("Error al crear cliente:", error);
      const errorMessage = error.response?.data?.message || "Error al crear el cliente";
      showError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <Button
        variant="ghost"
        onClick={() => navigate(returnTo)}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Volver
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Crear Nuevo Cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Información Personal */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">
                Información Personal
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">
                    Nombre <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => handleChange("firstName", e.target.value)}
                    placeholder="Ej: Juan"
                    className={errors.firstName ? "border-red-500" : ""}
                  />
                  {errors.firstName && (
                    <p className="text-sm text-red-500">{errors.firstName}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">
                    Apellido <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => handleChange("lastName", e.target.value)}
                    placeholder="Ej: Pérez"
                    className={errors.lastName ? "border-red-500" : ""}
                  />
                  {errors.lastName && (
                    <p className="text-sm text-red-500">{errors.lastName}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dni">
                    DNI <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="dni"
                    value={formData.dni}
                    onChange={(e) => handleChange("dni", e.target.value)}
                    placeholder="Ej: 12345678"
                    className={errors.dni ? "border-red-500" : ""}
                  />
                  {errors.dni && (
                    <p className="text-sm text-red-500">{errors.dni}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cuit">
                    CUIT/CUIL <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="cuit"
                    value={formData.cuit}
                    onChange={(e) => handleChange("cuit", e.target.value)}
                    placeholder="Ej: 20-12345678-3"
                    className={errors.cuit ? "border-red-500" : ""}
                  />
                  {errors.cuit && (
                    <p className="text-sm text-red-500">{errors.cuit}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="personType">
                  Tipo de Persona <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.personType}
                  onValueChange={(value: "fisica" | "juridica") =>
                    handleChange("personType", value)
                  }
                >
                  <SelectTrigger id="personType">
                    <SelectValue placeholder="Seleccione tipo de persona" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fisica">Física</SelectItem>
                    <SelectItem value="juridica">Jurídica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Información de Contacto */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">
                Información de Contacto
              </h3>

              <div className="space-y-2">
                <Label htmlFor="email">
                  Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  placeholder="Ej: juan.perez@example.com"
                  className={errors.email ? "border-red-500" : ""}
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">
                  Teléfono <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  placeholder="Ej: 1123456789"
                  className={errors.phone ? "border-red-500" : ""}
                />
                {errors.phone && (
                  <p className="text-sm text-red-500">{errors.phone}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">
                  Dirección <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  placeholder="Ej: Av. Corrientes 1234"
                  className={errors.address ? "border-red-500" : ""}
                />
                {errors.address && (
                  <p className="text-sm text-red-500">{errors.address}</p>
                )}
              </div>
            </div>

            {/* Credenciales de Acceso */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">
                Credenciales de Acceso
              </h3>

              <div className="space-y-2">
                <Label htmlFor="password">
                  Contraseña <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className={errors.password ? "border-red-500" : ""}
                />
                {errors.password && (
                  <p className="text-sm text-red-500">{errors.password}</p>
                )}
              </div>
            </div>

            {/* Sección de Carga de Archivos */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">
                Documentos del Cliente (Opcional)
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Label
                    htmlFor="file-upload"
                    className="flex items-center justify-center gap-2 px-4 py-2 border border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-green-500 hover:bg-green-50 transition-colors"
                  >
                    <Upload className="h-5 w-5 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      Seleccionar archivos
                    </span>
                    <Input
                      id="file-upload"
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

            {/* Botones de Acción */}
            <div className="flex justify-end gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(returnTo)}
                disabled={isLoading || isUploadingFiles}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-green-600 hover:bg-green-700"
                disabled={isLoading || isUploadingFiles}
              >
                {isLoading ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    {isUploadingFiles ? "Subiendo archivos..." : "Creando..."}
                  </>
                ) : (
                  "Crear Cliente"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
