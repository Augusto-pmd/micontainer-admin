import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface PricingEngineFormProps {
  peData: {
    basePricePerM2: number;
    totalUnits: number;
    occupiedUnits: number;
    scarcityFactor: number;
    baseScarcityMultiplier: number;
    expectedDurationMonths: number;
  };
  onChange: (data: Partial<PricingEngineFormProps['peData']>) => void;
}

export default function PricingEngineForm({ peData, onChange }: PricingEngineFormProps) {
  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold mb-4">Motor de Precios</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Precio Base por m²</Label>
          <Input
            type="number"
            min="0"
            step="1"
            value={peData.basePricePerM2 || ''}
            onChange={(e) => {
              const value = e.target.value;
              if (value === '') {
                onChange({ basePricePerM2: 0 });
              } else {
                const numValue = parseInt(value);
                if (!isNaN(numValue) && numValue >= 0) {
                  onChange({ basePricePerM2: numValue });
                }
              }
            }}
            onKeyDown={(e) => {
              if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '.' || e.key === ',') {
                e.preventDefault();
              }
            }}
            placeholder="0"
          />
        </div>
        <div className="space-y-2">
          <Label>Multiplicador Base de Escasez</Label>
          <Input
            type="number"
            step="0.01"
            value={peData.baseScarcityMultiplier}
            readOnly
            className="bg-gray-100 cursor-not-allowed"
          />
        </div>
        <div className="space-y-2">
          <Label>Total de Unidades</Label>
          <Input
            type="number"
            value={peData.totalUnits}
            readOnly
            className="bg-gray-100 cursor-not-allowed"
          />
        </div>
        <div className="space-y-2">
          <Label>Unidades Ocupadas</Label>
          <Input
            type="number"
            value={peData.occupiedUnits}
            readOnly
            className="bg-gray-100 cursor-not-allowed"
          />
        </div>
        <div className="space-y-2">
          <Label>Factor de Escasez</Label>
          <Input
            type="number"
            step="0.01"
            value={peData.scarcityFactor}
            readOnly
            className="bg-gray-100 cursor-not-allowed"
          />
        </div>
        <div className="space-y-2">
          <Label>Duración Esperada (meses)</Label>
          <Input
            type="number"
            value={peData.expectedDurationMonths}
            readOnly
            className="bg-gray-100 cursor-not-allowed"
          />
        </div>
      </div>
    </Card>
  );
}
