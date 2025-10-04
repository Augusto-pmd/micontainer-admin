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
import { useBuildingStore } from "@/stores/buildingStore";
import { updateBuilding } from "@/services/building.services";
import { showSuccess, showApiError } from "@/utils/alerts";

export const BuildingEdit = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selectedBuilding, isLoading, fetchBuildingById } = useBuildingStore();
  
  const [formData, setFormData] = useState({
    name: "",
    floors: 0,
    isActive: true,
    description: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (id) {
      fetchBuildingById(Number(id));
    }
  }, [id, fetchBuildingById]);

  useEffect(() => {
    if (selectedBuilding) {
      setFormData({
        name: selectedBuilding.name,
        floors: selectedBuilding.floors,
        isActive: selectedBuilding.isActive,
        description: selectedBuilding.description || "",
      });
    }
  }, [selectedBuilding]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === "floors" ? parseInt(value) || 0 : value
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

    if (formData.floors < 1) {
      showApiError(new Error("El número de pisos debe ser mayor a 0"));
      return;
    }

    setIsSaving(true);
    
    try {
      await updateBuilding(Number(id), formData);
      await showSuccess("Edificio actualizado correctamente");
      navigate(`/building/${id}`);
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

  if (!selectedBuilding) {
    return (
      <div className="p-6">
        <p className="text-gray-500">Edificio no encontrado</p>
        <Button onClick={() => navigate("/building")} className="mt-4">
          Volver a edificios
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full p-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <Button variant="outline" onClick={() => navigate(`/building/${id}`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Cancelar
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Editar Edificio</h1>
          <p className="text-gray-500">{selectedBuilding.name}</p>
        </div>
      </div>

      <div className="max-w-2xl">
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
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
                placeholder="Ej: Torre Nordelta 1"
                required
              />
            </div>

            {/* Pisos */}
            <div className="space-y-2">
              <Label htmlFor="floors">
                Número de pisos <span className="text-red-500">*</span>
              </Label>
              <Input
                id="floors"
                name="floors"
                type="number"
                min="1"
                value={formData.floors}
                onChange={handleChange}
                placeholder="Ej: 5"
                required
              />
            </div>

            {/* Descripción */}
            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Descripción del edificio..."
                rows={4}
              />
            </div>

            {/* Estado Activo */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="isActive">Estado Activo</Label>
                <p className="text-sm text-gray-500">
                  El edificio estará disponible para operaciones
                </p>
              </div>
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={handleSwitchChange}
              />
            </div>

            {/* Información de la sucursal (solo lectura) */}
            {selectedBuilding.branch && (
              <div className="rounded-lg border p-4 bg-gray-50">
                <Label>Sucursal asociada</Label>
                <p className="text-sm font-medium mt-1">{selectedBuilding.branch.name}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {selectedBuilding.branch.city}, {selectedBuilding.branch.country}
                </p>
              </div>
            )}

            {/* Botones */}
            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={isSaving}
                className="flex-1"
              >
                {isSaving ? (
                  <>
                    <Spinner className="h-4 w-4 mr-2" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Guardar cambios
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/building/${id}`)}
                disabled={isSaving}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};
