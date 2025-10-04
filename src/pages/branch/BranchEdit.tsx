import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/ui/spinner";
import { Card } from "@/components/ui/card";
import { useBranchStore } from "@/stores/branchStore";
import { updateBranchServices } from "@/services/branch.services";
import { showSuccess, showApiError } from "@/utils/alerts";

export const BranchEdit = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selectedBranch, isLoading, fetchBranchById } = useBranchStore();
  
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    city: "",
    country: "",
    zipCode: "",
    phone: "",
    email: "",
    gps_location: "",
    description: "",
    isActive: true,
    images: [] as string[],
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (id) {
      fetchBranchById(Number(id));
    }
  }, [id, fetchBranchById]);

  useEffect(() => {
    if (selectedBranch) {
      setFormData({
        name: selectedBranch.name,
        address: selectedBranch.address,
        city: selectedBranch.city,
        country: selectedBranch.country,
        zipCode: selectedBranch.zipCode,
        phone: selectedBranch.phone,
        email: selectedBranch.email,
        gps_location: selectedBranch.gps_location,
        description: selectedBranch.description || "",
        isActive: selectedBranch.isActive,
        images: selectedBranch.images || [],
      });
    }
  }, [selectedBranch]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormData(prev => ({ ...prev, isActive: checked }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      showApiError(new Error("El nombre es requerido"));
      return;
    }

    if (!formData.email.trim()) {
      showApiError(new Error("El email es requerido"));
      return;
    }

    if (!formData.phone.trim()) {
      showApiError(new Error("El teléfono es requerido"));
      return;
    }

    setIsSaving(true);
    
    try {
      await updateBranchServices(Number(id), formData);
      await showSuccess("Sucursal actualizada correctamente");
      navigate(`/branch/${id}`);
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

  if (!selectedBranch) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <p className="text-gray-500">Sucursal no encontrada</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate(`/branch/${id}`)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a detalles
        </Button>

        <h1 className="text-3xl font-bold text-gray-900">
          Editar Sucursal
        </h1>
        <p className="text-gray-500 mt-2">
          Actualiza la información de la sucursal
        </p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Nombre */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Nombre <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Nombre de la sucursal"
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

            {/* Ciudad */}
            <div className="space-y-2">
              <Label htmlFor="city">
                Ciudad <span className="text-red-500">*</span>
              </Label>
              <Input
                id="city"
                name="city"
                value={formData.city}
                onChange={handleChange}
                placeholder="Ciudad"
                required
              />
            </div>

            {/* País */}
            <div className="space-y-2">
              <Label htmlFor="country">
                País <span className="text-red-500">*</span>
              </Label>
              <Input
                id="country"
                name="country"
                value={formData.country}
                onChange={handleChange}
                placeholder="País"
                required
              />
            </div>

            {/* Código Postal */}
            <div className="space-y-2">
              <Label htmlFor="zipCode">
                Código Postal
              </Label>
              <Input
                id="zipCode"
                name="zipCode"
                value={formData.zipCode}
                onChange={handleChange}
                placeholder="Código postal"
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

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Email"
                required
              />
            </div>

            {/* GPS Location */}
            <div className="space-y-2">
              <Label htmlFor="gps_location">
                Ubicación GPS
              </Label>
              <Input
                id="gps_location"
                name="gps_location"
                value={formData.gps_location}
                onChange={handleChange}
                placeholder="Coordenadas GPS"
              />
            </div>
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <Label htmlFor="description">
              Descripción
            </Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Descripción de la sucursal"
              rows={4}
            />
          </div>

          {/* Estado Activo */}
          <div className="flex items-center space-x-2">
            <Switch
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={handleSwitchChange}
            />
            <Label htmlFor="isActive" className="cursor-pointer">
              Sucursal activa
            </Label>
          </div>

          {/* Nota sobre imágenes */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <p className="text-sm text-blue-800">
              <strong>Nota:</strong> Las imágenes se mantienen sin cambios. Para modificar las imágenes, contacta al administrador del sistema.
            </p>
          </div>

          {/* Botones de acción */}
          <div className="flex justify-end gap-4 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`/branch/${id}`)}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSaving ? (
                <>
                  <Spinner className="h-4 w-4 mr-2" />
                  Guardando...
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
