import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save } from 'lucide-react';
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
import type { UpdatePricingEngineDto, CreatePricingEngineDto } from '@/types/pricing';

export default function PricingEnginePage() {
  const navigate = useNavigate();
  const {
    pricingEngines,
    currentPricingEngine,
    fetchPricingEngines,
    updatePricingEngine,
    createPricingEngine,
    loading,
  } = usePricingEngineStore();
  const { branches, fetchBranches } = useBranchStore();

  const [formData, setFormData] = useState<UpdatePricingEngineDto>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchPricingEngines();
    fetchBranches();
  }, [fetchPricingEngines, fetchBranches]);

  useEffect(() => {
    // Si hay pricing engines, usar el primero
    if (pricingEngines.length > 0) {
      const engine = pricingEngines[0];
      setFormData({
        totalUnits: engine.totalUnits,
        occupiedUnits: engine.occupiedUnits,
        scarcityFactor: engine.scarcityFactor,
        basePricePerM2: engine.basePricePerM2,
        expectedDurationMonths: engine.expectedDurationMonths,
        branchId: engine.branchId,
      });
    }
  }, [pricingEngines]);

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

    setIsSaving(true);

    try {
      if (pricingEngines.length > 0) {
        // Actualizar el existente
        await updatePricingEngine(pricingEngines[0].id, formData);
        await showSuccess('Configuración de precios actualizada correctamente');
      } else {
        // Crear uno nuevo si no existe
        const createData: CreatePricingEngineDto = {
          totalUnits: formData.totalUnits || 0,
          occupiedUnits: formData.occupiedUnits || 0,
          scarcityFactor: formData.scarcityFactor || 1,
          basePricePerM2: formData.basePricePerM2 || 0,
          expectedDurationMonths: formData.expectedDurationMonths || 0,
          branchId: formData.branchId || 0,
        };
        await createPricingEngine(createData);
        await showSuccess('Configuración de precios creada correctamente');
      }
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

  const pricingEngine = pricingEngines[0];

  return (
    <div className="w-full p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Configuración de Precios</h1>
        <p className="text-gray-500 mt-2">Configura el precio base por metro cuadrado del sistema</p>
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
              <Label htmlFor="basePricePerM2">
                Precio Base por m² <span className="text-red-500">*</span>
              </Label>
              <Input
                id="basePricePerM2"
                name="basePricePerM2"
                type="number"
                step="0.01"
                value={formData.basePricePerM2}
                onChange={handleChange}
                placeholder="5000"
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
                placeholder="100"
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
                placeholder="0"
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
                placeholder="1"
              />
              <p className="text-sm text-gray-500">
                Se calcula automáticamente basado en la ocupación
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
                placeholder="0"
              />
            </div>
          </div>

          {/* Estadísticas si existe */}
          {pricingEngine && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold mb-2">Estadísticas Actuales</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Factor de Escasez</p>
                  <p className="font-bold">{Number(pricingEngine.scarcityFactor).toFixed(2)}x</p>
                </div>
                <div>
                  <p className="text-gray-600">Ocupación</p>
                  <p className="font-bold">
                    {((Number(pricingEngine.occupiedUnits) / (Number(pricingEngine.totalUnits) || 1)) * 100).toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">ID</p>
                  <p className="font-bold">#{pricingEngine.id}</p>
                </div>
                <div>
                  <p className="text-gray-600">Última Actualización</p>
                  <p className="font-bold">{new Date(pricingEngine.updatedAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-4 pt-6 border-t">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Spinner className="h-4 w-4 mr-2" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Guardar Configuración
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
