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

interface SizePerm {
  id?: number;
  minRange: number;
  maxRange: number;
  multiplier: number;
}

interface SizePermTableProps {
  sizePerms: SizePerm[];
  onAdd: () => void;
  onUpdate: (index: number, field: 'minRange' | 'maxRange' | 'multiplier', value: number) => void;
  onRemove: (index: number) => void;
}

export default function SizePermTable({
  sizePerms,
  onAdd,
  onUpdate,
  onRemove,
}: SizePermTableProps) {
  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Rangos de Tamaño</h2>
        <Button onClick={onAdd} size="sm">
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
                    min="0"
                    step="1"
                    value={sp.minRange || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '') {
                        onUpdate(index, 'minRange', 0);
                      } else {
                        const numValue = parseInt(value);
                        if (!isNaN(numValue) && numValue >= 0) {
                          onUpdate(index, 'minRange', numValue);
                        }
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '.' || e.key === ',') {
                        e.preventDefault();
                      }
                    }}
                    className="w-32"
                    placeholder="0"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={sp.maxRange || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '') {
                        onUpdate(index, 'maxRange', 0);
                      } else {
                        const numValue = parseInt(value);
                        if (!isNaN(numValue) && numValue >= 0) {
                          onUpdate(index, 'maxRange', numValue);
                        }
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '.' || e.key === ',') {
                        e.preventDefault();
                      }
                    }}
                    className="w-32"
                    placeholder="0"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    step="0.01"
                    value={sp.multiplier}
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
