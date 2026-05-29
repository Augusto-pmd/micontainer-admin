import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, Clock, DollarSign, User, MapPin, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useOrderStore } from "@/stores/orderStore";
import { cancelOrderServices } from "@/services/order.services";
import { assignCustomerToStorageRoomServices } from "@/services/storageRoom.services";
import { showDeleteConfirm, showSuccess, showError } from "@/utils/alerts";
import { RESERVATION_ORDER_STATUS } from "@/types/order";

export const OrderDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selectedOrder, isLoading, error, fetchOrderById, clearSelectedOrder } = useOrderStore();

  useEffect(() => {
    if (id) {
      fetchOrderById(id);
    }
    
    return () => {
      clearSelectedOrder();
    };
  }, [id, fetchOrderById, clearSelectedOrder]);

  const handleCancelOrder = async () => {
    if (!selectedOrder) return;

    const confirmed = await showDeleteConfirm(
      "esta orden",
      `¿Estás seguro de que deseas cancelar la orden #${selectedOrder.id}?`,
      [
        "Esta acción no se puede deshacer",
        "El espacio de almacenamiento quedará disponible nuevamente"
      ]
    );

    if (confirmed) {
      try {
        await cancelOrderServices(selectedOrder.id);
        showSuccess("Orden cancelada exitosamente");
        // Recargar los datos de la orden
        fetchOrderById(selectedOrder.id);
      } catch (error: any) {
        console.error("Error canceling order:", error);
        showError(error.response?.data?.message || "Error al cancelar la orden");
      }
    }
  };

  const handleAssignCustomer = async () => {
    if (!selectedOrder || !selectedOrder.storageRoom || !selectedOrder.customer) return;

    try {
      await assignCustomerToStorageRoomServices(
        selectedOrder.storageRoom.id,
        selectedOrder.customer.id
      );
      showSuccess("Cliente asignado al espacio exitosamente");
      // Recargar los datos de la orden para ver el cambio de estado
      fetchOrderById(selectedOrder.id);
    } catch (error: any) {
      console.error("Error assigning customer:", error);
      showError(error.response?.data?.message || "Error al asignar el cliente");
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin" style={{ animationDuration: "0.8s" }}>
          <Spinner className="h-16 w-16 text-green-500" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
          <Button onClick={() => navigate("/orders")} className="mt-4">
            Volver a órdenes
          </Button>
        </div>
      </div>
    );
  }

  if (!selectedOrder) {
    return (
      <div className="p-6">
        <p className="text-gray-500">Orden no encontrada</p>
        <Button onClick={() => navigate("/orders")} className="mt-4">
          Volver a órdenes
        </Button>
      </div>
    );
  }

  const order = selectedOrder;
  const customer = order.customer;
  const storageRoom = order.storageRoom;
  const building = storageRoom?.building;
  const branch = building?.branch;

  const statusMap: Record<string, { label: string; color: string }> = {
    available: { label: "Disponible", color: "bg-green-100 text-green-800" },
    reserved: { label: "Reservado", color: "bg-yellow-100 text-yellow-800" },
    occupied: { label: "Ocupado", color: "bg-blue-100 text-blue-800" },
    maintenance: { label: "Mantenimiento", color: "bg-red-100 text-red-800" },
  };

  const status = statusMap[storageRoom?.status] || { label: storageRoom?.status, color: "bg-gray-100 text-gray-800" };

  return (
    <div className="w-full p-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <Button variant="outline" onClick={() => navigate("/orders")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Orden #{order.id}</h1>
          <p className="text-gray-500">Detalles de la orden de reservación</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Información de la Orden */}
        <div className="lg:col-span-2 space-y-6">
          {/* Datos principales */}
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-4">Información de la Orden</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Fecha de entrada</p>
                  <p className="font-medium">{new Date(order.entryDate).toLocaleDateString('es-AR')}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Hora de entrada</p>
                  <p className="font-medium">{order.entryTime}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <DollarSign className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Monto total</p>
                  <p className="font-medium text-green-600 text-lg">${parseFloat(order.totalAmount).toFixed(2)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Package className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Estado de la orden</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border mt-1 ${
                    order.status === RESERVATION_ORDER_STATUS.PENDING 
                      ? "bg-yellow-100 text-yellow-800 border-yellow-300" 
                      : order.status === RESERVATION_ORDER_STATUS.CONFIRMED 
                      ? "bg-green-100 text-green-800 border-green-300" 
                      : order.status === RESERVATION_ORDER_STATUS.CANCELED 
                      ? "bg-red-100 text-red-800 border-red-300" 
                      : "bg-gray-100 text-gray-800 border-gray-300"
                  }`}>
                    {order.status === RESERVATION_ORDER_STATUS.PENDING 
                      ? "Pendiente" 
                      : order.status === RESERVATION_ORDER_STATUS.CONFIRMED 
                      ? "Confirmada" 
                      : order.status === RESERVATION_ORDER_STATUS.CANCELED 
                      ? "Cancelada" 
                      : order.status}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Información del Cliente */}
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <User className="h-5 w-5" />
              Información del Cliente
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Nombre completo</p>
                <p className="font-medium">
                  {customer?.user ? `${customer.user.firstName} ${customer.user.lastName}` : "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium">{customer?.user?.email || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">DNI</p>
                <p className="font-medium">{customer?.dni || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">CUIT</p>
                <p className="font-medium">{customer?.cuit || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Teléfono</p>
                <p className="font-medium">{customer?.phone || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Tipo de persona</p>
                <p className="font-medium capitalize">
                  {customer?.personType === "fisica" ? "Física" : "Jurídica"}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-gray-500">Dirección</p>
                <p className="font-medium">{customer?.address || "-"}</p>
              </div>
            </div>
          </div>

          {/* Información del Almacén */}
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Package className="h-5 w-5" />
              Almacén Reservado
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Código de espacio</p>
                <p className="font-medium">{storageRoom?.space || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Estado</p>
                <span className={`inline-block px-2 py-1 rounded text-sm font-medium ${status.color}`}>
                  {status.label}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-500">Piso</p>
                <p className="font-medium">{storageRoom?.floor || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Precio</p>
                <p className="font-medium text-green-600">${parseFloat(storageRoom?.price || "0").toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Dimensiones (m)</p>
                <p className="font-medium">
                  {storageRoom?.width} × {storageRoom?.length} × {storageRoom?.height}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Área</p>
                <p className="font-medium">{storageRoom?.areaM2} m²</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Volumen</p>
                <p className="font-medium">{storageRoom?.volumeM3} m³</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Profundidad</p>
                <p className="font-medium">{storageRoom?.depth} m</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-gray-500">Descripción</p>
                <p className="font-medium">{storageRoom?.description || "-"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar - Ubicación */}
        <div className="space-y-6">
          {/* Imagen del almacén */}
          {storageRoom?.image && (
            <div className="bg-white rounded-lg border overflow-hidden">
              <img 
                src={storageRoom.image} 
                alt={storageRoom.space}
                className="w-full h-48 object-cover"
              />
            </div>
          )}

          {/* Ubicación */}
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Ubicación
            </h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Edificio</p>
                <p className="font-medium">{building?.name || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Sucursal</p>
                <p className="font-medium">{branch?.name || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Ciudad</p>
                <p className="font-medium">{branch?.city}, {branch?.country}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Dirección</p>
                <p className="font-medium">{branch?.address || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Código postal</p>
                <p className="font-medium">{branch?.zipCode || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Teléfono</p>
                <p className="font-medium">{branch?.phone || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium">{branch?.email || "-"}</p>
              </div>
            </div>
          </div>

          {/* Acciones */}
          {order.status !== RESERVATION_ORDER_STATUS.CANCELED && (
            <div className="bg-white rounded-lg border p-6">
              <h2 className="text-xl font-semibold mb-4">Acciones</h2>
              <div className="space-y-2">
                {order.status === RESERVATION_ORDER_STATUS.PENDING && 
                 storageRoom?.status === 'reserved' && (
                  <Button 
                    className="w-full bg-green-600 hover:bg-green-700 text-white" 
                    onClick={handleAssignCustomer}
                  >
                    Asignar espacio al cliente
                  </Button>
                )}
                <Button 
                  className="w-full" 
                  variant="outline"
                  onClick={() => navigate(`/orders/${id}/edit`)}
                >
                  Editar orden
                </Button>
                <Button 
                  className="w-full" 
                  variant="destructive"
                  onClick={handleCancelOrder}
                >
                  Cancelar orden
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
