import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
} from '@tanstack/react-table';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { ChevronDown, MoreHorizontal, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';
import type { PricingEngine } from '@/types/pricing';
import { usePricingEngineStore } from '@/stores/pricingEngineStore';
import { showDeleteConfirm } from '@/utils/alerts';

const columnLabels: Record<string, string> = {
  id: 'ID',
  branchId: 'Sucursal',
  basePricePerM2: 'Precio Base/m²',
  scarcityFactor: 'Factor de Escasez',
  totalUnits: 'Unidades Totales',
  occupiedUnits: 'Unidades Ocupadas',
  expectedDurationMonths: 'Duración Esperada (meses)',
};

const columns: ColumnDef<PricingEngine>[] = [
  {
    accessorKey: 'id',
    header: columnLabels.id,
  },
  {
    accessorKey: 'branchId',
    header: columnLabels.branchId,
    cell: ({ row }) => row.original.branch?.name || row.original.branchId,
  },
  {
    accessorKey: 'basePricePerM2',
    header: columnLabels.basePricePerM2,
    cell: ({ row }) => `$${row.getValue('basePricePerM2')}`,
  },
  {
    accessorKey: 'scarcityFactor',
    header: columnLabels.scarcityFactor,
    cell: ({ row }) => `${(row.getValue('scarcityFactor') as number).toFixed(2)}x`,
  },
  {
    accessorKey: 'totalUnits',
    header: columnLabels.totalUnits,
  },
  {
    accessorKey: 'occupiedUnits',
    header: columnLabels.occupiedUnits,
    cell: ({ row }) => {
      const occupied = row.getValue('occupiedUnits') as number;
      const total = row.original.totalUnits;
      const percentage = ((occupied / total) * 100).toFixed(1);
      return `${occupied} (${percentage}%)`;
    },
  },
  {
    accessorKey: 'expectedDurationMonths',
    header: columnLabels.expectedDurationMonths,
  },
  {
    id: 'actions',
    enableHiding: false,
    cell: ({ row }) => {
      const pricingEngine = row.original;
      const navigate = useNavigate();
      const { deletePricingEngine } = usePricingEngineStore();

      const handleDelete = async () => {
        const confirmed = await showDeleteConfirm(
          `¿Estás seguro de eliminar este pricing engine?`
        );
        if (confirmed) {
          try {
            await deletePricingEngine(pricingEngine.id);
          } catch (error) {
            console.error('Error deleting pricing engine:', error);
          }
        }
      };

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Abrir menú</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => navigate(`/pricing-engine/${pricingEngine.id}`)}>
              Ver detalles
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate(`/pricing-engine/edit/${pricingEngine.id}`)}>
              Editar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleDelete} className="text-red-600">
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

export default function PricingEnginePage() {
  const navigate = useNavigate();
  const { pricingEngines, loading, fetchPricingEngines } = usePricingEngineStore();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});

  useEffect(() => {
    fetchPricingEngines();
  }, [fetchPricingEngines]);

  const table = useReactTable({
    data: pricingEngines,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
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
        <h1 className="text-3xl font-bold">Pricing Engines</h1>
        <Button onClick={() => navigate('/pricing-engine/create')}>
          <Plus className="mr-2 h-4 w-4" />
          Crear Pricing Engine
        </Button>
      </div>

      <div className="flex items-center py-4">
        <Input
          placeholder="Buscar..."
          value={(table.getColumn('id')?.getFilterValue() as string) ?? ''}
          onChange={(event) => table.getColumn('id')?.setFilterValue(event.target.value)}
          className="max-w-sm"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto">
              Columnas <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
                  >
                    {columnLabels[column.id] || column.id}
                  </DropdownMenuCheckboxItem>
                );
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
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
                  No hay resultados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
