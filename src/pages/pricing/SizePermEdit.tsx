import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
import type { UpdateSizePermDto } from '@/types/pricing';

export default function SizePermEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentSizePerm, fetchSizePermById, updateSizePerm, loading } = useSizePermStore();
  const { branches, fetchBranches } = useBranchStore();

  const [formData, setFormData] = useState<UpdateSizePermDto>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (id) {
      fetchSizePermById(parseInt(id));
    }
    fetchBranches();
  }, [id, fetchSizePermById, fetchBranches]);

  useEffect(() => {
    if (currentSizePerm) {
      setFormData({
        multiplier: currentSizePerm.multiplier,
        minRange: currentSizePerm.minRange,
        maxRange: currentSizePerm.maxRange,
        branchId: currentSizePerm.branchId,
      });
    }
  }, [currentSizePerm]);

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

    if (formData.minRange !== undefined && formData.maxRange !== undefined) {
      if (formData.minRange >= formData.maxRange) {
        showApiError(new Error('El rango mínimo debe ser menor al rango máximo'));
        return;
      }
    }

    setIsSaving(true);

    try {
      await updateSizePerm(parseInt(id), formData);
      await showSuccess('Size Permission actualizado correctamente');
      navigate('/size-perm');
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

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/size-perm')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a Size Permissions
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">Editar Size Permission</h1>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="branchId">Sucursal</Label>
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
              <Label htmlFor="multiplier">Multiplicador</Label>
              <Input
                id="multiplier"
                name="multiplier"
                type="number"
                step="0.01"
                value={formData.multiplier}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="minRange">Rango Mínimo (m²)</Label>
              <Input
                id="minRange"
                name="minRange"
                type="number"
                step="0.01"
                value={formData.minRange}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxRange">Rango Máximo (m²)</Label>
              <Input
                id="maxRange"
                name="maxRange"
                type="number"
                step="0.01"
                value={formData.maxRange}
                onChange={handleChange}
              />
            </div>
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
                  Guardar
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
