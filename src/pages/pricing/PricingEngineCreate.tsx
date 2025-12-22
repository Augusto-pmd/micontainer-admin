import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import type { CreatePricingEngineDto } from '@/types/pricing';

export default function PricingEngineCreate() {
  const navigate = useNavigate();
  const { createPricingEngine } = usePricingEngineStore();
  const { branches, fetchBranches } = useBranchStore();

  const [formData, setFormData] = useState<CreatePricingEngineDto>({
    totalUnits: 0,
    occupiedUnits: 0,
    scarcityFactor: 1,
    basePricePerM2: 0,
    expectedDurationMonths: 0,
    branchId: 0,
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'branchId' ? parseInt(value) : parseFloat(value) || 0,
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

    if (!formData.branchId) {
      showApiError(new Error('La sucursal es requerida'));
      return;
    }

    if (formData.basePricePerM2 <= 0) {
      showApiError(new Error('El precio base debe ser mayor a 0'));
      return;
    }

    if (formData.totalUnits < 0) {
      showApiError(new Error('Las unidades totales no pueden ser negativas'));
      return;
    }

    setIsSaving(true);

    try {
      const response = await createPricingEngine(formData);
      await showSuccess('Pricing Engine creado correctamente');
      navigate(`/pricing-engine/${response.id}`);
    } catch (error: any) {
      showApiError(error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/pricing-engine')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a Pricing Engines
        </Button>

        <h1 className="text-3xl font-bold text-gray-900">Crear Pricing Engine</h1>
        <p className="text-gray-500 mt-2">Configura el motor de precios para una sucursal</p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Sucursal */}
            <div className="space-y-2">
              <Label htmlFor="branchId">
                Sucursal <span className="text-red-500">*</span>
              </Label>
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
              <Label htmlFor="totalUnits">
                Total de Unidades <span className="text-red-500">*</span>
              </Label>
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
                placeholder="0"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-4 pt-6 border-t">
            <Button type="button" variant="outline" onClick={() => navigate('/pricing-engine')}>
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
                  Crear Pricing Engine
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
