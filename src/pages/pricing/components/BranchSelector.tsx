import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Branch {
  id: number;
  name: string;
}

interface BranchSelectorProps {
  branches: Branch[];
  selectedBranchId: number | null;
  onSelectBranch: (branchId: number) => void;
}

export default function BranchSelector({
  branches,
  selectedBranchId,
  onSelectBranch,
}: BranchSelectorProps) {
  return (
    <Card className="p-6">
      <div className="space-y-2">
        <Label htmlFor="branchId">Selecciona una Sucursal</Label>
        <Select
          value={selectedBranchId?.toString()}
          onValueChange={(value) => onSelectBranch(parseInt(value))}
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
  );
}
