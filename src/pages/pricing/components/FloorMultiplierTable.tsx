import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface FloorMultiplier {
  id?: number;
  floor: number;
  multiplier: number;
}

interface FloorMultiplierTableProps {
  floorMultipliers: FloorMultiplier[];
  onAdd: () => void;
  onUpdate: (index: number, field: 'floor' | 'multiplier', value: number) => void;
  onRemove: (index: number) => void;
}

export default function FloorMultiplierTable({
  floorMultipliers,
  onAdd,
  onUpdate,
  onRemove,
}: FloorMultiplierTableProps) {
  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Multiplicadores por Piso</h2>
        <Button onClick={onAdd} size="sm">
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
                    onChange={(e) => onUpdate(index, 'floor', parseInt(e.target.value) || 0)}
                    className="w-24"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    step="0.01"
                    value={fm.multiplier}
                    onChange={(e) => onUpdate(index, 'multiplier', parseFloat(e.target.value) || 0)}
                    className="w-32"
                  />
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    onClick={() => onRemove(index)}
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
  );
}
