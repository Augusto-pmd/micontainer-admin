import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFloorMultiplierStore } from '@/stores/floorMultiplierStore';
import { usePricingEngineStore } from '@/stores/pricingEngineStore';
import { showSuccess, showApiError } from '@/utils/alerts';
import type { CreateFloorMultiplierDto } from '@/types/pricing';

export default function FloorMultiplierCreate() {
  const navigate = useNavigate();
  const { createFloorMultiplier } = useFloorMultiplierStore();
  const { pricingEngines, fetchPricingEngines } = usePricingEngineStore();

  const [formData, setFormData] = useState<CreateFloorMultiplierDto>({
    floor: 0,
    multiplier: 1,
    pricingEngineId: 0,
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchPricingEngines();
  }, [fetchPricingEngines]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: parseFloat(value) || 0,
    }));
  };

  const handlePricingEngineChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      pricingEngineId: parseInt(value),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.pricingEngineId) {
      showApiError(new Error('El pricing engine es requerido'));
      return;
    }

    setIsSaving(true);

    try {
      await createFloorMultiplier(formData);
      await showSuccess('Floor Multiplier creado correctamente');
      navigate('/floor-multiplier');
    } catch (error: any) {
      showApiError(error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/floor-multiplier')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a Floor Multipliers
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">Crear Floor Multiplier</h1>
        <p className="text-gray-500 mt-2">Configura el multiplicador de precio por piso</p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="pricingEngineId">
                Pricing Engine <span className="text-red-500">*</span>
              </Label>
              <Select value={formData.pricingEngineId?.toString()} onValueChange={handlePricingEngineChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un pricing engine" />
                </SelectTrigger>
                <SelectContent>
                  {pricingEngines.map((pe) => (
                    <SelectItem key={pe.id} value={pe.id.toString()}>
                      #{pe.id} - {pe.branch?.name || `Branch ${pe.branchId}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="floor">
                Piso <span className="text-red-500">*</span>
              </Label>
              <Input id="floor" name="floor" type="number" value={formData.floor} onChange={handleChange} placeholder="0 = PB, 1 = 1er piso" />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="multiplier">
                Multiplicador <span className="text-red-500">*</span>
              </Label>
              <Input id="multiplier" name="multiplier" type="number" step="0.01" value={formData.multiplier} onChange={handleChange} placeholder="1.2" />
              <p className="text-sm text-gray-500">Mayor a 1 aumenta el precio, menor a 1 lo reduce</p>
            </div>
          </div>

          <div className="flex justify-end space-x-4 pt-6 border-t">
            <Button type="button" variant="outline" onClick={() => navigate('/floor-multiplier')}>
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
                  Crear
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
