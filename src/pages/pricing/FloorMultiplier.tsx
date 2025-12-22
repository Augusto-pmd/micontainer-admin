import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { useReactTable, getCoreRowModel, flexRender } from '@tanstack/react-table';
import { MoreHorizontal, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';
import type { FloorMultiplier } from '@/types/pricing';
import { useFloorMultiplierStore } from '@/stores/floorMultiplierStore';
import { showDeleteConfirm } from '@/utils/alerts';

const columns: ColumnDef<FloorMultiplier>[] = [
  { accessorKey: 'id', header: 'ID' },
  {
    accessorKey: 'floor',
    header: 'Piso',
    cell: ({ row }) => {
      const floor = row.getValue('floor') as number;
      return floor === 0 ? 'PB' : `Piso ${floor}`;
    },
  },
  {
    accessorKey: 'multiplier',
    header: 'Multiplicador',
    cell: ({ row }) => `${(row.getValue('multiplier') as number).toFixed(2)}x`,
  },
  {
    accessorKey: 'pricingEngineId',
    header: 'Pricing Engine',
    cell: ({ row }) => `#${row.original.pricingEngineId}`,
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const floorMultiplier = row.original;
      const navigate = useNavigate();
      const { deleteFloorMultiplier } = useFloorMultiplierStore();

      const handleDelete = async () => {
        const confirmed = await showDeleteConfirm(
          `¿Eliminar multiplicador del ${floorMultiplier.floor === 0 ? 'PB' : `Piso ${floorMultiplier.floor}`}?`
        );
        if (confirmed) {
          await deleteFloorMultiplier(floorMultiplier.id);
        }
      };

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => navigate(`/floor-multiplier/edit/${floorMultiplier.id}`)}>
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDelete} className="text-red-600">
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

export default function FloorMultiplierPage() {
  const navigate = useNavigate();
  const { floorMultipliers, loading, fetchFloorMultipliers } = useFloorMultiplierStore();

  useEffect(() => {
    fetchFloorMultipliers();
  }, [fetchFloorMultipliers]);

  const table = useReactTable({
    data: floorMultipliers,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner className="h-12 w-12" />
      </div>
    );
  }

  return (
    <div className="w-full p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Floor Multipliers</h1>
        <Button onClick={() => navigate('/floor-multiplier/create')}>
          <Plus className="mr-2 h-4 w-4" />
          Crear Multiplicador
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No hay multiplicadores de piso.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
