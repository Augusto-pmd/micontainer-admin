import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Card } from '@/components/ui/card';
import { useFloorMultiplierStore } from '@/stores/floorMultiplierStore';
import { showSuccess, showApiError } from '@/utils/alerts';
import type { UpdateFloorMultiplierDto } from '@/types/pricing';

export default function FloorMultiplierEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentFloorMultiplier, fetchFloorMultiplierById, updateFloorMultiplier, loading } = useFloorMultiplierStore();

  const [formData, setFormData] = useState<UpdateFloorMultiplierDto>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (id) {
      fetchFloorMultiplierById(parseInt(id));
    }
  }, [id, fetchFloorMultiplierById]);

  useEffect(() => {
    if (currentFloorMultiplier) {
      setFormData({
        floor: currentFloorMultiplier.floor,
        multiplier: currentFloorMultiplier.multiplier,
      });
    }
  }, [currentFloorMultiplier]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: parseFloat(value) || 0,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    setIsSaving(true);

    try {
      await updateFloorMultiplier(parseInt(id), formData);
      await showSuccess('Floor Multiplier actualizado correctamente');
      navigate('/floor-multiplier');
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
        <Button variant="ghost" onClick={() => navigate('/floor-multiplier')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a Floor Multipliers
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">Editar Floor Multiplier</h1>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="floor">Piso</Label>
              <Input id="floor" name="floor" type="number" value={formData.floor} onChange={handleChange} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="multiplier">Multiplicador</Label>
              <Input id="multiplier" name="multiplier" type="number" step="0.01" value={formData.multiplier} onChange={handleChange} />
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
