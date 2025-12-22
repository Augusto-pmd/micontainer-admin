import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSizePermStore } from '@/stores/sizePermStore';
import { useBranchStore } from '@/stores/branchStore';
import { showSuccess, showApiError } from '@/utils/alerts';
import type { CreateSizePermDto } from '@/types/pricing';

export default function SizePermCreate() {
  const navigate = useNavigate();
  const { createSizePerm } = useSizePermStore();
  const { branches, fetchBranches } = useBranchStore();

  const [formData, setFormData] = useState<CreateSizePermDto>({
    multiplier: 1,
    minRange: 0,
    maxRange: 0,
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

    if (!formData.branchId) {
      showApiError(new Error('La sucursal es requerida'));
      return;
    }

    if (formData.minRange >= formData.maxRange) {
      showApiError(new Error('El rango mínimo debe ser menor al rango máximo'));
      return;
    }

    setIsSaving(true);

    try {
      await createSizePerm(formData);
      await showSuccess('Size Permission creado correctamente');
      navigate('/size-perm');
    } catch (error: any) {
      showApiError(error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/size-perm')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a Size Permissions
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">Crear Size Permission</h1>
        <p className="text-gray-500 mt-2">Configura el multiplicador de precio por tamaño</p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="branchId">
                Sucursal <span className="text-red-500">*</span>
              </Label>
              <Select value={formData.branchId?.toString()} onValueChange={handleBranchChange}>
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

            <div className="space-y-2">
              <Label htmlFor="multiplier">
                Multiplicador <span className="text-red-500">*</span>
              </Label>
              <Input
                id="multiplier"
                name="multiplier"
                type="number"
                step="0.01"
                value={formData.multiplier}
                onChange={handleChange}
                placeholder="1.2"
              />
              <p className="text-sm text-gray-500">Mayor a 1 aumenta el precio, menor a 1 lo reduce</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="minRange">
                Rango Mínimo (m²) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="minRange"
                name="minRange"
                type="number"
                step="0.01"
                value={formData.minRange}
                onChange={handleChange}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxRange">
                Rango Máximo (m²) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="maxRange"
                name="maxRange"
                type="number"
                step="0.01"
                value={formData.maxRange}
                onChange={handleChange}
                placeholder="10"
              />
            </div>
          </div>

          {/* Ejemplos */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">💡 Ejemplos de rangos:</h3>
            <ul className="text-sm space-y-1 text-gray-700">
              <li>• Rango 1: 0-10 m² → multiplier 1.3 (+30% más caro)</li>
              <li>• Rango 2: 10.01-25 m² → multiplier 1.15 (+15%)</li>
              <li>• Rango 3: 25.01-50 m² → multiplier 1.0 (precio base)</li>
              <li>• Rango 4: 50.01-100 m² → multiplier 0.9 (-10% más barato)</li>
            </ul>
          </div>

          <div className="flex justify-end space-x-4 pt-6 border-t">
            <Button type="button" variant="outline" onClick={() => navigate('/size-perm')}>
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
