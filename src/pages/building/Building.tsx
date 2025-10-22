import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
} from "@tanstack/react-table";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ChevronDown, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Spinner } from "@/components/ui/spinner";
import { getAllBuildings } from "@/services/building.services";
import type { Building as BuildingType } from "@/types/building";
import { useBuildingStore } from "@/stores/buildingStore";

interface PaginatedBuildings {
  data: BuildingType[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const columnLabels: Record<string, string> = {
  id: "ID",
  name: "Nombre",
  floors: "Pisos",
  isActive: "Activo",
  description: "Descripción",
  "branch.name": "Sucursal",
  storageRooms: "Almacenes",
};

const columns: ColumnDef<BuildingType>[] = [
  {
    accessorKey: "id",
    header: columnLabels.id,
  },
  {
    accessorKey: "name",
    header: columnLabels.name,
  },
  {
    accessorKey: "floors",
    header: columnLabels.floors,
  },
  {
    accessorKey: "isActive",
    header: columnLabels.isActive,
    cell: ({ row }) => (row.getValue("isActive") ? "Sí" : "No"),
  },
  {
    accessorKey: "description",
    header: columnLabels.description,
  },
  {
    id: "branch.name",
    accessorKey: "branch.name",
    header: columnLabels["branch.name"],
    cell: ({ row }) => row.original.branch?.name || "-",
  },
  {
    accessorKey: "storageRooms",
    header: columnLabels.storageRooms,
    cell: ({ row }) => row.original.storageRooms?.length || 0,
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const building = row.original;
      const navigate = useNavigate();
      const { setSelectedBuilding } = useBuildingStore();

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Abrir menú</span>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() =>
                navigator.clipboard.writeText(building.id.toString())
              }
            >
              Copiar ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                setSelectedBuilding(building);
                navigate(`/building/${building.id}`);
              }}
            >
              Ver detalles
            </DropdownMenuItem>
            <DropdownMenuItem>Editar edificio</DropdownMenuItem>
            <DropdownMenuItem className="text-red-600">
              Eliminar edificio
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

export const Building = () => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [buildings, setBuildings] = useState<BuildingType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setLoading(true);
      getAllBuildings({ page, limit, search: searchQuery || undefined })
        .then((res: PaginatedBuildings) => {
          setBuildings(res.data);
          setTotal(res.total);
          setTotalPages(res.totalPages);
          setError(null);
          setIsInitialLoad(false);
        })
        .catch(() => {
          setError("Error al cargar edificios");
          setIsInitialLoad(false);
        })
        .finally(() => setLoading(false));
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [page, limit, searchQuery]);

  const table = useReactTable({
    data: buildings,
    columns,
    pageCount: totalPages,
    manualPagination: true,
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
      pagination: { pageIndex: page - 1, pageSize: limit },
    },
  });

  if (isInitialLoad && loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin" style={{ animationDuration: "0.8s" }}>
          <Spinner className="h-16 w-16 text-green-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {error && <div className="p-4 text-red-500">{error}</div>}
      <div className="flex items-center py-4">
        <Input
          placeholder="Buscar por nombre, sucursal..."
          value={searchQuery}
          onChange={(event) => {
            setSearchQuery(event.target.value);
            setPage(1);
          }}
          className="max-w-sm"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto">
              Columnas <ChevronDown />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                const label = columnLabels[column.id as string] || column.id;
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {label}
                  </DropdownMenuCheckboxItem>
                );
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading && buildings.length > 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  <div className="flex justify-center items-center">
                    <div className="animate-spin" style={{ animationDuration: "0.8s" }}>
                      <Spinner className="h-8 w-8 text-green-500" />
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  {searchQuery ? "No se encontraron resultados para tu búsqueda." : "No hay resultados."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between space-x-2 py-4">
        <div className="text-muted-foreground flex-1 text-sm">
          Página {page} de {totalPages} | Total: {total}
        </div>
        <div className="space-x-2 flex items-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
          >
            Anterior
          </Button>
          <span>Página {page}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || loading}
          >
            Siguiente
          </Button>
          <select
            className="ml-2 border rounded px-2 py-1"
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(1);
            }}
            disabled={loading}
          >
            {[10, 20, 50, 100].map((size) => (
              <option key={size} value={size}>
                {size} por página
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};
