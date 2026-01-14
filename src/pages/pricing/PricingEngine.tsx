import { useEffect, useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useBranchStore } from '@/stores/branchStore';
import { showSuccess, showApiError } from '@/utils/alerts';
import { getPricingConfigByBranch, updatePricingConfigByBranch } from '@/services/pricing.services';
import type { BranchPricingConfig, UpdateBranchPricingDto } from '@/types/pricing';

export default function PricingEnginePage() {
  const { branches, fetchBranches } = useBranchStore();
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [config, setConfig] = useState<BranchPricingConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Estados editables
  const [peData, setPeData] = useState({
    basePricePerM2: 0,
    totalUnits: 0,
    occupiedUnits: 0,
    scarcityFactor: 1,
    baseScarcityMultiplier: 1.5,
    expectedDurationMonths: 0,
  });
  
  const [floorMultipliers, setFloorMultipliers] = useState<Array<{ id?: number; floor: number; multiplier: number }>>([]);
  const [sizePerms, setSizePerms] = useState<Array<{ id?: number; minRange: number; maxRange: number; multiplier: number }>>([]);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  useEffect(() => {
    if (selectedBranchId) {
      loadConfig();
    }
  }, [selectedBranchId]);

  const loadConfig = async () => {
    if (!selectedBranchId) return;
    
    setLoading(true);
    try {
      const data = await getPricingConfigByBranch(selectedBranchId);
      setConfig(data);
      
      if (data.pricingEngine) {
        setPeData({
          basePricePerM2: data.pricingEngine.basePricePerM2,
          totalUnits: data.pricingEngine.totalUnits,
          occupiedUnits: data.pricingEngine.occupiedUnits,
          scarcityFactor: data.pricingEngine.scarcityFactor,
          baseScarcityMultiplier: data.pricingEngine.baseScarcityMultiplier,
          expectedDurationMonths: data.pricingEngine.expectedDurationMonths,
        });
      }
      
      setFloorMultipliers(data.floorMultipliers.map(fm => ({
        id: fm.id,
        floor: fm.floor,
        multiplier: fm.multiplier,
      })));
      
      setSizePerms(data.sizePerms.map(sp => ({
        id: sp.id,
        minRange: sp.minRange,
        maxRange: sp.maxRange,
        multiplier: sp.multiplier,
      })));
      
      setHasChanges(false);
    } catch (error) {
      showApiError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAll = async () => {
    if (!selectedBranchId) return;
    
    setLoading(true);
    try {
      const updateData: UpdateBranchPricingDto = {
        pricingEngine: peData,
        floorMultipliers: floorMultipliers,
        sizePerms: sizePerms,
      };
      
      await updatePricingConfigByBranch(selectedBranchId, updateData);
      await showSuccess('Configuración actualizada correctamente');
      await loadConfig();
    } catch (error) {
      showApiError(error);
    } finally {
      setLoading(false);
    }
  };

  // Floor Multiplier handlers
  const addFloorMultiplier = () => {
    setFloorMultipliers([...floorMultipliers, { floor: 0, multiplier: 1 }]);
    setHasChanges(true);
  };

  const updateFloorMultiplier = (index: number, field: 'floor' | 'multiplier', value: number) => {
    const updated = [...floorMultipliers];
    updated[index][field] = value;
    setFloorMultipliers(updated);
    setHasChanges(true);
  };

  const removeFloorMultiplier = (index: number) => {
    setFloorMultipliers(floorMultipliers.filter((_, i) => i !== index));
    setHasChanges(true);
  };

  // Size Perm handlers
  const addSizePerm = () => {
    setSizePerms([...sizePerms, { minRange: 0, maxRange: 0, multiplier: 1 }]);
    setHasChanges(true);
  };

  const updateSizePerm = (index: number, field: 'minRange' | 'maxRange' | 'multiplier', value: number) => {
    const updated = [...sizePerms];
    updated[index][field] = value;
    setSizePerms(updated);
    setHasChanges(true);
  };

  const removeSizePerm = (index: number) => {
    setSizePerms(sizePerms.filter((_, i) => i !== index));
    setHasChanges(true);
  };

  if (loading && !config) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner className="h-12 w-12" />
      </div>
    );
  }

  return (
    <div className="w-full p-6 space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Configuración de Precios</h1>
          <p className="text-gray-500 mt-2">Administra todos los parámetros de pricing por sucursal</p>
        </div>
        {hasChanges && selectedBranchId && (
          <Button onClick={handleSaveAll} size="lg" disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            Guardar Cambios
          </Button>
        )}
      </div>

      {/* Selector de Sucursal */}
      <Card className="p-6">
        <div className="space-y-2">
          <Label htmlFor="branchId">Selecciona una Sucursal</Label>
          <Select
            value={selectedBranchId?.toString()}
            onValueChange={(value) => setSelectedBranchId(parseInt(value))}
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
      </Card>

      {selectedBranchId && config && (
        <>
          {/* Pricing Engine Section */}
          <Card className="p-6">
            <h2 className="text-2xl font-bold mb-4">Motor de Precios</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Precio Base por m²</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={peData.basePricePerM2}
                  onChange={(e) => {
                    setPeData({ ...peData, basePricePerM2: parseFloat(e.target.value) || 0 });
                    setHasChanges(true);
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>Multiplicador Base de Escasez</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={peData.baseScarcityMultiplier}
                  onChange={(e) => {
                    setPeData({ ...peData, baseScarcityMultiplier: parseFloat(e.target.value) || 0 });
                    setHasChanges(true);
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>Total de Unidades</Label>
                <Input
                  type="number"
                  value={peData.totalUnits}
                  onChange={(e) => {
                    setPeData({ ...peData, totalUnits: parseInt(e.target.value) || 0 });
                    setHasChanges(true);
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>Unidades Ocupadas</Label>
                <Input
                  type="number"
                  value={peData.occupiedUnits}
                  onChange={(e) => {
                    setPeData({ ...peData, occupiedUnits: parseInt(e.target.value) || 0 });
                    setHasChanges(true);
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>Factor de Escasez</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={peData.scarcityFactor}
                  onChange={(e) => {
                    setPeData({ ...peData, scarcityFactor: parseFloat(e.target.value) || 0 });
                    setHasChanges(true);
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>Duración Esperada (meses)</Label>
                <Input
                  type="number"
                  value={peData.expectedDurationMonths}
                  onChange={(e) => {
                    setPeData({ ...peData, expectedDurationMonths: parseInt(e.target.value) || 0 });
                    setHasChanges(true);
                  }}
                />
              </div>
            </div>
          </Card>

          {/* Floor Multipliers Section */}
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Multiplicadores por Piso</h2>
              <Button onClick={addFloorMultiplier} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Agregar
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Piso</TableHead>
                  <TableHead>Multiplicador</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {floorMultipliers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-gray-500">
                      No hay multiplicadores configurados
                    </TableCell>
                  </TableRow>
                ) : (
                  floorMultipliers.map((fm, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Input
                          type="number"
                          value={fm.floor}
                          onChange={(e) => updateFloorMultiplier(index, 'floor', parseInt(e.target.value) || 0)}
                          className="w-24"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          value={fm.multiplier}
                          onChange={(e) => updateFloorMultiplier(index, 'multiplier', parseFloat(e.target.value) || 0)}
                          className="w-32"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          onClick={() => removeFloorMultiplier(index)}
                          variant="ghost"
                          size="sm"
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>

          {/* Size Perms Section */}
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Rangos de Tamaño</h2>
              <Button onClick={addSizePerm} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Agregar
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mínimo (m²)</TableHead>
                  <TableHead>Máximo (m²)</TableHead>
                  <TableHead>Multiplicador</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sizePerms.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-gray-500">
                      No hay rangos configurados
                    </TableCell>
                  </TableRow>
                ) : (
                  sizePerms.map((sp, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          value={sp.minRange}
                          onChange={(e) => updateSizePerm(index, 'minRange', parseFloat(e.target.value) || 0)}
                          className="w-32"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          value={sp.maxRange}
                          onChange={(e) => updateSizePerm(index, 'maxRange', parseFloat(e.target.value) || 0)}
                          className="w-32"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          value={sp.multiplier}
                          onChange={(e) => updateSizePerm(index, 'multiplier', parseFloat(e.target.value) || 0)}
                          className="w-32"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          onClick={() => removeSizePerm(index)}
                          variant="ghost"
                          size="sm"
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>

          {/* Botón fijo de guardar cuando hay cambios */}
          {hasChanges && (
            <div className="fixed bottom-6 right-6">
              <Button onClick={handleSaveAll} size="lg" disabled={loading}>
                {loading ? (
                  <>
                    <Spinner className="h-4 w-4 mr-2" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Guardar Todos los Cambios
                  </>
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
