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
import {
  getAllCustomersServices,
  deleteCustomerServices,
  approveCustomerServices,
} from "@/services/customer.services";
import type {
  Customer as CustomerType,
  PaginatedCustomers,
} from "@/types/customer";
import { useCustomerStore } from "@/stores/customerStore";
import { showSuccess, showApiError, showDeleteConfirm } from "@/utils/alerts";

const columnLabels: Record<string, string> = {
  id: "ID",
  dni: "DNI",
  cuit: "CUIT",
  "user.firstName": "Nombre",
  "user.lastName": "Apellido",
  "user.email": "Email",
  isActive: "Activo",
  isApproved: "Aprobado",
  phone: "Teléfono",
  address: "Dirección",
  personType: "Tipo de Persona",
};

const columns: ColumnDef<CustomerType>[] = [
  {
    accessorKey: "id",
    header: columnLabels.id,
  },
  {
    accessorKey: "user.firstName",
    header: columnLabels["user.firstName"],
    cell: ({ row }) => row.original.user?.firstName || "-",
  },
  {
    accessorKey: "user.lastName",
    header: columnLabels["user.lastName"],
    cell: ({ row }) => row.original.user?.lastName || "-",
  },
  {
    accessorKey: "dni",
    header: columnLabels.dni,
  },
  {
    accessorKey: "cuit",
    header: columnLabels.cuit,
  },
  {
    accessorKey: "user.email",
    header: columnLabels["user.email"],
    cell: ({ row }) => row.original.user?.email || "-",
  },

  {
    accessorKey: "isApproved",
    header: columnLabels.isApproved,
    cell: ({ row }) => (row.original.isApproved ? "Sí" : "No"),
  },
  {
    accessorKey: "phone",
    header: columnLabels.phone,
  },
  {
    accessorKey: "address",
    header: columnLabels.address,
  },
  {
    accessorKey: "personType",
    header: columnLabels.personType,
    cell: ({ row }) => {
      const type = row.getValue("personType") as string;
      return type === "fisica" ? "Física" : "Jurídica";
    },
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const customer = row.original;
      const navigate = useNavigate();
      const { setSelectedCustomer } = useCustomerStore();

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
                navigator.clipboard.writeText(customer.id.toString())
              }
            >
              Copiar ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                setSelectedCustomer(customer);
                navigate(`/customers/${customer.id}`);
              }}
            >
              Ver detalles
            </DropdownMenuItem>
            <DropdownMenuItem>Editar cliente</DropdownMenuItem>
            <DropdownMenuItem className="text-red-600">
              Eliminar cliente
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

export const Customers = () => {
  const navigate = useNavigate();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [customers, setCustomers] = useState<CustomerType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");

  const loadCustomers = () => {
    setLoading(true);
    getAllCustomersServices({ page, limit, search: searchQuery || undefined })
      .then((res: PaginatedCustomers) => {
        setCustomers(res.data);
        setTotal(res.total);
        setTotalPages(res.totalPages);
        setError(null);
      })
      .catch(() => {
        setError("Error al cargar clientes");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadCustomers();
    }, 300); // Debounce de 300ms

    return () => clearTimeout(timeoutId);
  }, [page, limit, searchQuery]);

  const handleDeleteCustomer = async (
    customerId: number,
    customerName: string
  ) => {
    const confirmed = await showDeleteConfirm(customerName);

    if (!confirmed) {
      return;
    }

    try {
      await deleteCustomerServices(customerId);
      showSuccess("Cliente eliminado exitosamente");
      loadCustomers(); // Recargar la lista
    } catch (error: any) {
      console.error("Error al eliminar cliente:", error);
      showApiError(error);
    }
  };

  const handleApproveCustomer = async (customerId: number, customerName: string) => {
    try {
      await approveCustomerServices(customerId);
      showSuccess(`Cliente ${customerName} aprobado exitosamente`);
      loadCustomers(); // Recargar la lista
    } catch (error: any) {
      console.error("Error al aprobar cliente:", error);
      showApiError(error);
    }
  };

  const columnsWithActions: ColumnDef<CustomerType>[] = [
    ...columns.filter((col) => col.id !== "actions"),
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const customer = row.original;
        const { setSelectedCustomer } = useCustomerStore();

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
                  navigator.clipboard.writeText(customer.id.toString())
                }
              >
                Copiar ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  setSelectedCustomer(customer);
                  navigate(`/customers/${customer.id}`);
                }}
              >
                Ver detalles
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigate(`/customers/${customer.id}/edit`)}
              >
                Editar cliente
              </DropdownMenuItem>
              {!customer.isApproved && (
                <DropdownMenuItem
                  className="text-green-600"
                  onClick={() =>
                    handleApproveCustomer(
                      customer.id,
                      `${customer.user?.firstName} ${customer.user?.lastName}`
                    )
                  }
                >
                  Aprobar cliente
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                className="text-red-600"
                onClick={() =>
                  handleDeleteCustomer(
                    customer.id,
                    `${customer.user?.firstName} ${customer.user?.lastName}`
                  )
                }
              >
                Eliminar cliente
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const table = useReactTable({
    data: customers,
    columns: columnsWithActions,
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

  if (loading && customers.length === 0) {
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
      <div className="flex items-center justify-between py-4">
        <div>
          {/* <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-gray-600 mt-1">
            Total de clientes: {total}
          </p> */}
        </div>
        <Button
          onClick={() => navigate("/customers/create")}
          className="bg-green-600 hover:bg-green-700"
        >
          <Plus className="mr-2 h-4 w-4" />
          Crear Cliente
        </Button>
      </div>

      <div className="flex items-center py-4">
        <Input
          placeholder="Buscar por nombre, email, DNI, CUIT..."
          value={searchQuery}
          onChange={(event) => {
            setSearchQuery(event.target.value);
            setPage(1); // Reset a la primera página al buscar
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
            {loading && customers.length > 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columnsWithActions.length}
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
                  colSpan={columnsWithActions.length}
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
