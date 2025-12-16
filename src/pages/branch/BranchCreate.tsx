import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/ui/spinner";
import { Card } from "@/components/ui/card";
import { createBranchServices } from "@/services/branch.services";
import { showSuccess, showApiError } from "@/utils/alerts";

export const BranchCreate = () => {
  const navigate = useNavigate();

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
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, isActive: checked }));
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
      const response = await createBranchServices(formData);
      await showSuccess("Sucursal creada correctamente");
      navigate(`/branch/${response.id}`);
    } catch (error: any) {
      showApiError(error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/branch")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a sucursales
        </Button>

        <h1 className="text-3xl font-bold text-gray-900">Crear Sucursal</h1>
        <p className="text-gray-500 mt-2">
          Ingresa la información de la nueva sucursal
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
              <Label htmlFor="zipCode">Código Postal</Label>
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
              <Label htmlFor="gps_location">Ubicación GPS</Label>
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
            <Label htmlFor="description">Descripción</Label>
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

          {/* Botones de acción */}
          <div className="flex justify-end gap-4 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/branch")}
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
                  Crear Sucursal
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
