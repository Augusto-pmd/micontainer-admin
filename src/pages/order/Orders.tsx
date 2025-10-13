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
import { ChevronDown, MoreHorizontal, Plus } from "lucide-react";
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
import { getAllOrdersServices, cancelOrderServices } from "@/services/order.services";
import type { ReservationOrder as OrderType, PaginatedOrders } from "@/types/order";
import { RESERVATION_ORDER_STATUS } from "@/types/order";
import { useOrderStore } from "@/stores/orderStore";
import { showDeleteConfirm, showSuccess, showError } from "@/utils/alerts";

const columnLabels: Record<string, string> = {
  id: "ID",
  entryDate: "Fecha de Entrada",
  entryTime: "Hora de Entrada",
  totalAmount: "Monto Total",
  status: "Estado de la Orden",
  "customer.fullName": "Cliente",
  "customer.cuit": "CUIT Cliente",
  "storageRoom.space": "Espacio",
  "storageRoom.floor": "Piso",
  "storageRoom.status": "Estado del Espacio",
  "storageRoom.building.name": "Edificio",
  "storageRoom.building.branch.name": "Sucursal",
  "storageRoom.building.branch.city": "Ciudad",
};

const getColumns = (
  navigate: ReturnType<typeof useNavigate>,
  setSelectedOrder: (order: OrderType) => void,
  handleCancelOrder: (orderId: number, orderLabel: string) => Promise<void>
): ColumnDef<OrderType>[] => [
  {
    accessorKey: "id",
    header: columnLabels.id,
  },
  {
    accessorKey: "customer.fullName",
    header: columnLabels["customer.fullName"],
    cell: ({ row }) => {
      const user = row.original.customer?.user;
      if (user) {
        return `${user.firstName} ${user.lastName}`;
      }
      return "-";
    },
  },
  {
    accessorKey: "customer.cuit",
    header: columnLabels["customer.cuit"],
    cell: ({ row }) => row.original.customer?.cuit || "-",
  },
  {
    accessorKey: "entryDate",
    header: columnLabels.entryDate,
    cell: ({ row }) => {
      const date = new Date(row.getValue("entryDate"));
      return date.toLocaleDateString('es-AR');
    },
  },
  {
    accessorKey: "entryTime",
    header: columnLabels.entryTime,
  },
  {
    accessorKey: "totalAmount",
    header: columnLabels.totalAmount,
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("totalAmount"));
      return `$${amount.toFixed(2)}`;
    },
  },
  {
    accessorKey: "status",
    header: columnLabels.status,
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      const statusMap: Record<string, { label: string; color: string }> = {
        [RESERVATION_ORDER_STATUS.PENDING]: { 
          label: "Pendiente", 
          color: "bg-yellow-100 text-yellow-800 border-yellow-300" 
        },
        [RESERVATION_ORDER_STATUS.CONFIRMED]: { 
          label: "Confirmada", 
          color: "bg-green-100 text-green-800 border-green-300" 
        },
        [RESERVATION_ORDER_STATUS.CANCELED]: { 
          label: "Cancelada", 
          color: "bg-red-100 text-red-800 border-red-300" 
        },
      };
      const statusInfo = statusMap[status] || { label: status, color: "bg-gray-100 text-gray-800" };
      return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${statusInfo.color}`}>
          {statusInfo.label}
        </span>
      );
    },
  },
  {
    accessorKey: "storageRoom.space",
    header: columnLabels["storageRoom.space"],
    cell: ({ row }) => row.original.storageRoom?.space || "-",
  },
  {
    accessorKey: "storageRoom.floor",
    header: columnLabels["storageRoom.floor"],
    cell: ({ row }) => row.original.storageRoom?.floor || "-",
  },
  {
    accessorKey: "storageRoom.status",
    header: columnLabels["storageRoom.status"],
    cell: ({ row }) => {
      const status = row.original.storageRoom?.status;
      const statusMap: Record<string, string> = {
        available: "Disponible",
        reserved: "Reservado",
        occupied: "Ocupado",
        maintenance: "Mantenimiento",
      };
      return statusMap[status] || status;
    },
  },
  {
    accessorKey: "storageRoom.building.name",
    header: columnLabels["storageRoom.building.name"],
    cell: ({ row }) => row.original.storageRoom?.building?.name || "-",
  },
  {
    accessorKey: "storageRoom.building.branch.name",
    header: columnLabels["storageRoom.building.branch.name"],
    cell: ({ row }) => row.original.storageRoom?.building?.branch?.name || "-",
  },
  {
    accessorKey: "storageRoom.building.branch.city",
    header: columnLabels["storageRoom.building.branch.city"],
    cell: ({ row }) => row.original.storageRoom?.building?.branch?.city || "-",
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const order = row.original;

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
                navigator.clipboard.writeText(order.id.toString())
              }
            >
              Copiar ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                setSelectedOrder(order);
                navigate(`/orders/${order.id}`);
              }}
            >
              Ver detalles
            </DropdownMenuItem>
            {order.status !== RESERVATION_ORDER_STATUS.CANCELED && (
              <>
                <DropdownMenuItem>Editar orden</DropdownMenuItem>
                <DropdownMenuItem 
                  className="text-red-600"
                  onClick={() => handleCancelOrder(order.id, `#${order.id}`)}
                >
                  Cancelar orden
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

export const Orders = () => {
  const navigate = useNavigate();
  const { setSelectedOrder } = useOrderStore();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [orders, setOrders] = useState<OrderType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const handleCancelOrder = async (orderId: number, orderLabel: string) => {
    const isConfirmed = await showDeleteConfirm(
      `¿Estás seguro de que deseas cancelar la orden ${orderLabel}?`,
      "Esta acción no se puede deshacer"
    );

    if (isConfirmed) {
      try {
        await cancelOrderServices(orderId);
        showSuccess("Orden cancelada exitosamente");
        // Recargar las órdenes
        setLoading(true);
        const res = await getAllOrdersServices({ page, limit });
        setOrders(res.data);
        setTotal(res.total);
        setTotalPages(res.totalPages);
        setLoading(false);
      } catch (error) {
        showError("Error al cancelar la orden");
      }
    }
  };

  const columns = getColumns(navigate, setSelectedOrder, handleCancelOrder);

  useEffect(() => {
    setLoading(true);
    getAllOrdersServices({ page, limit })
      .then((res: PaginatedOrders) => {
        setOrders(res.data);
        setTotal(res.total);
        setTotalPages(res.totalPages);
        setError(null);
      })
      .catch(() => {
        setError("Error al cargar órdenes");
      })
      .finally(() => setLoading(false));
  }, [page, limit]);

  const table = useReactTable({
    data: orders,
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

  if (loading) {
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
      
      {/* Header with title and create button */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Órdenes</h1>
        <Button 
          onClick={() => navigate('/orders/create')}
          className="bg-green-600 hover:bg-green-700"
        >
          <Plus className="mr-2 h-4 w-4" />
          Crear Orden
        </Button>
      </div>

      <div className="flex items-center py-4">
        <Input
          placeholder="Filtrar por cliente..."
          value={(table.getColumn("customer.fullName")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("customer.fullName")?.setFilterValue(event.target.value)
          }
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
            {table.getRowModel().rows?.length ? (
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
                  No hay resultados.
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
            disabled={page === 1}
          >
            Anterior
          </Button>
          <span>Página {page}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
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
