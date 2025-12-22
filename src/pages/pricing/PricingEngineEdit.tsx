import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePricingEngineStore } from '@/stores/pricingEngineStore';
import { useBranchStore } from '@/stores/branchStore';
import { showSuccess, showApiError } from '@/utils/alerts';
import type { UpdatePricingEngineDto } from '@/types/pricing';

export default function PricingEngineEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    currentPricingEngine,
    fetchPricingEngineById,
    updatePricingEngine,
    loading,
  } = usePricingEngineStore();
  const { branches, fetchBranches } = useBranchStore();

  const [formData, setFormData] = useState<UpdatePricingEngineDto>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (id) {
      fetchPricingEngineById(parseInt(id));
    }
    fetchBranches();
  }, [id, fetchPricingEngineById, fetchBranches]);

  useEffect(() => {
    if (currentPricingEngine) {
      setFormData({
        totalUnits: currentPricingEngine.totalUnits,
        occupiedUnits: currentPricingEngine.occupiedUnits,
        scarcityFactor: currentPricingEngine.scarcityFactor,
        basePricePerM2: currentPricingEngine.basePricePerM2,
        expectedDurationMonths: currentPricingEngine.expectedDurationMonths,
        branchId: currentPricingEngine.branchId,
      });
    }
  }, [currentPricingEngine]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: parseFloat(value) || 0,
    }));
  };

  const handleBranchChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      branchId: parseInt(value),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!id) return;

    setIsSaving(true);

    try {
      await updatePricingEngine(parseInt(id), formData);
      await showSuccess('Pricing Engine actualizado correctamente');
      navigate(`/pricing-engine/${id}`);
    } catch (error: any) {
      showApiError(error);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner className="h-12 w-12" />
      </div>
    );
  }

  if (!currentPricingEngine) {
    return (
      <div className="container mx-auto p-6">
        <p>No se encontró el pricing engine</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate(`/pricing-engine/${id}`)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a detalles
        </Button>

        <h1 className="text-3xl font-bold text-gray-900">Editar Pricing Engine</h1>
        <p className="text-gray-500 mt-2">Actualiza la configuración del motor de precios</p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Sucursal */}
            <div className="space-y-2">
              <Label htmlFor="branchId">Sucursal</Label>
              <Select
                value={formData.branchId?.toString()}
                onValueChange={handleBranchChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una sucursal" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id.toString()}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Precio Base por m² */}
            <div className="space-y-2">
              <Label htmlFor="basePricePerM2">Precio Base por m²</Label>
              <Input
                id="basePricePerM2"
                name="basePricePerM2"
                type="number"
                step="0.01"
                value={formData.basePricePerM2}
                onChange={handleChange}
              />
            </div>

            {/* Total de Unidades */}
            <div className="space-y-2">
              <Label htmlFor="totalUnits">Total de Unidades</Label>
              <Input
                id="totalUnits"
                name="totalUnits"
                type="number"
                value={formData.totalUnits}
                onChange={handleChange}
              />
            </div>

            {/* Unidades Ocupadas */}
            <div className="space-y-2">
              <Label htmlFor="occupiedUnits">Unidades Ocupadas</Label>
              <Input
                id="occupiedUnits"
                name="occupiedUnits"
                type="number"
                value={formData.occupiedUnits}
                onChange={handleChange}
              />
            </div>

            {/* Factor de Escasez */}
            <div className="space-y-2">
              <Label htmlFor="scarcityFactor">Factor de Escasez</Label>
              <Input
                id="scarcityFactor"
                name="scarcityFactor"
                type="number"
                step="0.01"
                value={formData.scarcityFactor}
                onChange={handleChange}
              />
              <p className="text-sm text-gray-500">
                Este valor se calcula automáticamente basado en la ocupación
              </p>
            </div>

            {/* Duración Esperada */}
            <div className="space-y-2">
              <Label htmlFor="expectedDurationMonths">Duración Esperada (meses)</Label>
              <Input
                id="expectedDurationMonths"
                name="expectedDurationMonths"
                type="number"
                value={formData.expectedDurationMonths}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-4 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`/pricing-engine/${id}`)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving}>
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
}
