import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useBranchStore } from '@/stores/branchStore';
import { showSuccess, showApiError } from '@/utils/alerts';
import { getPricingConfigByBranch, updatePricingConfigByBranch } from '@/services/pricing.services';
import type { BranchPricingConfig, UpdateBranchPricingDto } from '@/types/pricing';
import BranchSelector from './components/BranchSelector';
import PricingEngineForm from './components/PricingEngineForm';
import FloorMultiplierTable from './components/FloorMultiplierTable';
import SizePermTable from './components/SizePermTable';

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
      <BranchSelector
        branches={branches}
        selectedBranchId={selectedBranchId}
        onSelectBranch={setSelectedBranchId}
      />

      {selectedBranchId && config && (
        <>
          {/* Pricing Engine Section */}
          <PricingEngineForm
            peData={peData}
            onChange={(data) => {
              setPeData({ ...peData, ...data });
              setHasChanges(true);
            }}
          />

          {/* Floor Multipliers Section */}
          <FloorMultiplierTable
            floorMultipliers={floorMultipliers}
            onAdd={addFloorMultiplier}
            onUpdate={(index, field, value) => updateFloorMultiplier(index, field, value)}
            onRemove={removeFloorMultiplier}
          />

          {/* Size Perms Section */}
          <SizePermTable
            sizePerms={sizePerms}
            onAdd={addSizePerm}
            onUpdate={(index, field, value) => updateSizePerm(index, field, value)}
            onRemove={removeSizePerm}
          />

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
