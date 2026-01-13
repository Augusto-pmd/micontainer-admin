import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { useReactTable, getCoreRowModel, flexRender } from '@tanstack/react-table';
import { MoreHorizontal, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';
import type { SizePerm } from '@/types/pricing';
import { useSizePermStore } from '@/stores/sizePermStore';
import { showDeleteConfirm } from '@/utils/alerts';

const columns: ColumnDef<SizePerm>[] = [
  { accessorKey: 'id', header: 'ID' },
  {
    accessorKey: 'minRange',
    header: 'Rango Mínimo (m²)',
    cell: ({ row }) => `${row.getValue('minRange')} m²`,
  },
  {
    accessorKey: 'maxRange',
    header: 'Rango Máximo (m²)',
    cell: ({ row }) => `${row.getValue('maxRange')} m²`,
  },
  {
    accessorKey: 'multiplier',
    header: 'Multiplicador',
    cell: ({ row }) => {
      const value = Number(row.getValue('multiplier')) || 0;
      return `${value.toFixed(2)}x`;
    },
  },
  {
    accessorKey: 'branchId',
    header: 'Sucursal',
    cell: ({ row }) => `#${row.original.branchId}`,
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const sizePerm = row.original;
      const navigate = useNavigate();
      const { deleteSizePerm } = useSizePermStore();

      const handleDelete = async () => {
        const confirmed = await showDeleteConfirm(
          `¿Eliminar size permission para rango ${sizePerm.minRange}-${sizePerm.maxRange}m²?`
        );
        if (confirmed) {
          await deleteSizePerm(sizePerm.id);
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
            <DropdownMenuItem onClick={() => navigate(`/size-perm/edit/${sizePerm.id}`)}>
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

export default function SizePermPage() {
  const navigate = useNavigate();
  const { sizePerms, loading, fetchSizePerms } = useSizePermStore();

  useEffect(() => {
    fetchSizePerms();
  }, [fetchSizePerms]);

  const table = useReactTable({
    data: sizePerms,
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
        <h1 className="text-3xl font-bold">Rangos de Tamaño</h1>
        <Button onClick={() => navigate('/size-perm/create')}>
          <Plus className="mr-2 h-4 w-4" />
          Crear Rango de Tamaño
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
                  No hay size permissions.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
