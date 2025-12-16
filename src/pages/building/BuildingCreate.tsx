import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/ui/spinner";
import { Card } from "@/components/ui/card";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { createBuilding } from "@/services/building.services";
import { getAllBranchesServices } from "@/services/branch.services";
import { showSuccess, showApiError, showError } from "@/utils/alerts";
import type { Branch } from "@/types/branch";

export const BuildingCreate = () => {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    name: "",
    floors: 1,
    isActive: true,
    description: "",
    branchId: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [branches, setBranches] = useState<ComboboxOption[]>([]);

  useEffect(() => {
    const loadBranches = async () => {
      try {
        const response = await getAllBranchesServices({ page: 1, limit: 1000 });
        const branchOptions = response.data.map((branch: Branch) => ({
          value: branch.id.toString(),
          label: `${branch.name} - ${branch.city}, ${branch.country}`,
        }));
        setBranches(branchOptions);
      } catch (error) {
        console.error("Error loading branches:", error);
        showError("Error al cargar las sucursales");
      } finally {
        setLoadingData(false);
      }
    };

    loadBranches();
  }, []);

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

    if (!formData.branchId) {
      showApiError(new Error("Debe seleccionar una sucursal"));
      return;
    }

    setIsSaving(true);
    
    try {
      const response = await createBuilding({
        name: formData.name,
        floors: formData.floors,
        isActive: formData.isActive,
        description: formData.description,
        branchId: parseInt(formData.branchId),
      });
      await showSuccess("Edificio creado correctamente");
      navigate(`/building/${response.id}`);
    } catch (error: any) {
      showApiError(error);
    } finally {
      setIsSaving(false);
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
    <div className="w-full p-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <Button variant="outline" onClick={() => navigate("/building")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a edificios
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Crear Edificio</h1>
          <p className="text-gray-500">Ingresa la información del nuevo edificio</p>
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

            {/* Sucursal */}
            <div className="space-y-2">
              <Label htmlFor="branchId">
                Sucursal <span className="text-red-500">*</span>
              </Label>
              <Combobox
                options={branches}
                value={formData.branchId}
                onChange={(value: string) => setFormData(prev => ({ ...prev, branchId: value }))}
                placeholder="Selecciona una sucursal"
                searchPlaceholder="Buscar sucursal..."
                emptyMessage="No se encontraron sucursales"
                width="w-full"
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
                    Crear Edificio
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/building")}
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
