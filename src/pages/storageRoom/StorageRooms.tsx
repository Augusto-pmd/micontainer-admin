import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Eye, Pencil, Trash2, MoreHorizontal, ChevronDown } from "lucide-react";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type ColumnDef,
  flexRender,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getAllStorageRoomsServices, deleteStorageRoomServices } from "@/services/storageRoom.services";
import { showDeleteConfirm, showSuccess, showError } from "@/utils/alerts";
import { formatFloor } from "@/utils/formatters";
import type { StorageRoom, StorageRoomStatus } from "@/types/storageRoom";

const columnLabels: Record<string, string> = {
  space: "Espacio",
  "building.name": "Edificio",
  "building.branch.name": "Sucursal",
  floor: "Piso",
  areaM2: "Área (m²)",
  price: "Precio",
  status: "Estado",
};

export const StorageRooms = () => {
  const navigate = useNavigate();
  const [storageRooms, setStorageRooms] = useState<StorageRoom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const loadStorageRooms = async () => {
    setIsLoading(true);
    try {
      const response = await getAllStorageRoomsServices({
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        search: searchQuery || undefined,
      });
      setStorageRooms(response.data);
      setTotal(response.total);
      setTotalPages(response.totalPages);
      setIsInitialLoad(false);
    } catch (error: any) {
      console.error("Error loading storage rooms:", error);
      showError("Error al cargar los espacios de almacenamiento");
      setIsInitialLoad(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadStorageRooms();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [pagination.pageIndex, pagination.pageSize, searchQuery]);

  const handleDeleteStorageRoom = async (id: number, space: string) => {
    const confirmed = await showDeleteConfirm(
      "este espacio de almacenamiento",
      `¿Estás seguro de que deseas eliminar el espacio "${space}"?`,
      ["Esta acción no se puede deshacer"]
    );

    if (confirmed) {
      try {
        await deleteStorageRoomServices(id);
        await showSuccess("Espacio eliminado exitosamente");
        await loadStorageRooms();
      } catch (error: any) {
        console.error("Error deleting storage room:", error);
        showError(error.response?.data?.message || "Error al eliminar el espacio");
      }
    }
  };

  const getStatusBadge = (status: StorageRoomStatus) => {
    const styles = {
      available: "bg-green-100 text-green-800",
      occupied: "bg-red-100 text-red-800",
      reserved: "bg-yellow-100 text-yellow-800",
      blocked: "bg-gray-100 text-gray-800",
    };

    const labels = {
      available: "Disponible",
      occupied: "Ocupado",
      reserved: "Reservado",
      blocked: "Bloqueado",
    };

    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const columns: ColumnDef<StorageRoom>[] = [
    {
      accessorKey: "space",
      header: "Espacio",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.space}</span>
      ),
    },
    {
      id: "building.name",
      accessorKey: "building.name",
      header: "Edificio",
      cell: ({ row }) => row.original.building?.name || "N/A",
    },
    {
      id: "building.branch.name",
      accessorKey: "building.branch.name",
      header: "Sucursal",
      cell: ({ row }) => row.original.building?.branch?.name || "N/A",
    },
    {
      accessorKey: "floor",
      header: "Piso",
      cell: ({ row }) => formatFloor(row.original.floor),
    },
    {
      accessorKey: "areaM2",
      header: "Área (m²)",
      cell: ({ row }) => `${row.original.areaM2} m²`,
    },
    {
      accessorKey: "price",
      header: "Precio",
      cell: ({ row }) => `$${row.original.price}`,
    },
    {
      accessorKey: "status",
      header: "Estado",
      cell: ({ row }) => getStatusBadge(row.original.status),
    },
    {
      id: "actions",
      enableHiding: false,
      header: "Acciones",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => navigate(`/storage-rooms/${row.original.id}`)}
            >
              <Eye className="mr-2 h-4 w-4" />
              Ver detalles
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => navigate(`/storage-rooms/${row.original.id}/edit`)}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleDeleteStorageRoom(row.original.id, row.original.space)}
              className="text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const table = useReactTable({
    data: storageRooms,
    columns,
    state: {
      sorting,
      pagination,
      columnVisibility,
    },
    pageCount: totalPages,
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
  });

  if (isInitialLoad && isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin" style={{ animationDuration: "0.8s" }}>
          <Spinner className="h-16 w-16 text-green-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Espacios de Almacenamiento</h1>
          <p className="text-gray-600 mt-1">
            Total de espacios: {total}
          </p>
        </div>
        <Button
          onClick={() => navigate("/storage-rooms/create")}
          className="bg-green-600 hover:bg-green-700"
        >
          <Plus className="mr-2 h-4 w-4" />
          Crear Espacio
        </Button>
      </div>

      <div className="flex items-center py-4">
        <Input
          placeholder="Buscar por espacio, piso, edificio, sucursal..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setPagination(prev => ({ ...prev, pageIndex: 0 }));
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

      <div className="bg-white rounded-lg shadow">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading && storageRooms.length > 0 ? (
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
            ) : table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
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
                  {searchQuery ? "No se encontraron resultados para tu búsqueda." : "No se encontraron espacios de almacenamiento."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Paginación */}
        <div className="flex items-center justify-between px-4 py-4 border-t">
          <div className="text-sm text-gray-700">
            Mostrando {pagination.pageIndex * pagination.pageSize + 1} a{" "}
            {Math.min((pagination.pageIndex + 1) * pagination.pageSize, total)} de{" "}
            {total} resultados
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage() || isLoading}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage() || isLoading}
            >
              Siguiente
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
