import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Edit, Trash2, Building2, MapPin, Ruler, DollarSign, Calendar, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useStorageRoomStore } from "@/stores/storageRoomStore";
import { deleteStorageRoomServices } from "@/services/storageRoom.services";
import { showDeleteConfirm, showSuccess, showError } from "@/utils/alerts";
import type { StorageRoomStatus } from "@/types/storageRoom";

export const StorageRoomDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selectedStorageRoom, isLoading, fetchStorageRoomById, clearSelectedStorageRoom } =
    useStorageRoomStore();

  useEffect(() => {
    if (id) {
      fetchStorageRoomById(parseInt(id));
    }
    return () => clearSelectedStorageRoom();
  }, [id]);

  const handleDelete = async () => {
    if (!selectedStorageRoom) return;

    const confirmed = await showDeleteConfirm(
      "este espacio de almacenamiento",
      `¿Estás seguro de que deseas eliminar el espacio "${selectedStorageRoom.space}"?`,
      ["Esta acción no se puede deshacer", "Las reservas asociadas podrían verse afectadas"]
    );

    if (confirmed) {
      try {
        await deleteStorageRoomServices(selectedStorageRoom.id);
        showSuccess("Espacio eliminado exitosamente");
        navigate("/storage-rooms");
      } catch (error: any) {
        console.error("Error deleting storage room:", error);
        showError(error.response?.data?.message || "Error al eliminar el espacio");
      }
    }
  };

  const getStatusBadge = (status: StorageRoomStatus) => {
    const styles = {
      available: "bg-green-100 text-green-800 border-green-200",
      occupied: "bg-red-100 text-red-800 border-red-200",
      reserved: "bg-yellow-100 text-yellow-800 border-yellow-200",
      blocked: "bg-gray-100 text-gray-800 border-gray-200",
    };

    const labels = {
      available: "Disponible",
      occupied: "Ocupado",
      reserved: "Reservado",
      blocked: "Bloqueado",
    };

    return (
      <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full border ${styles[status]}`}>
        {labels[status]}
      </span>
    );
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

  if (!selectedStorageRoom) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Espacio no encontrado
          </h2>
          <Button onClick={() => navigate("/storage-rooms")}>
            Volver a la lista
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 max-w-5xl">
      <Button
        variant="ghost"
        onClick={() => navigate("/storage-rooms")}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Volver a Espacios
      </Button>

      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">{selectedStorageRoom.space}</h1>
          <div className="flex items-center gap-2">
            {getStatusBadge(selectedStorageRoom.status)}
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate(`/storage-rooms/${selectedStorageRoom.id}/edit`)}
          >
            <Edit className="mr-2 h-4 w-4" />
            Editar
          </Button>
          <Button variant="outline" onClick={handleDelete} className="text-red-600 hover:text-red-700">
            <Trash2 className="mr-2 h-4 w-4" />
            Eliminar
          </Button>
        </div>
      </div>

      {/* Imagen del espacio */}
      {selectedStorageRoom.image && (
        <Card className="mb-6">
          <CardContent className="p-0">
            <img
              src={selectedStorageRoom.image}
              alt={selectedStorageRoom.space}
              className="w-full h-64 object-cover rounded-t-lg"
            />
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Información de Ubicación */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-green-600" />
              Ubicación
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">Edificio</p>
              <p className="font-medium">{selectedStorageRoom.building?.name || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Sucursal</p>
              <p className="font-medium">{selectedStorageRoom.building?.branch?.name || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Ciudad</p>
              <p className="font-medium">{selectedStorageRoom.building?.branch?.city || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Piso</p>
              <p className="font-medium">{selectedStorageRoom.floor}</p>
            </div>
          </CardContent>
        </Card>

        {/* Dimensiones */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ruler className="h-5 w-5 text-green-600" />
              Dimensiones
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-sm text-gray-500">Ancho</p>
                <p className="font-medium">{selectedStorageRoom.width} m</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Largo</p>
                <p className="font-medium">{selectedStorageRoom.length} m</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Alto</p>
                <p className="font-medium">{selectedStorageRoom.height} m</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Profundidad</p>
                <p className="font-medium">{selectedStorageRoom.depth || "N/A"} m</p>
              </div>
            </div>
            <div className="pt-3 border-t">
              <div>
                <p className="text-sm text-gray-500">Área Total</p>
                <p className="font-medium text-lg">{selectedStorageRoom.areaM2} m²</p>
              </div>
              {selectedStorageRoom.volumeM3 && (
                <div className="mt-2">
                  <p className="text-sm text-gray-500">Volumen</p>
                  <p className="font-medium text-lg">{selectedStorageRoom.volumeM3} m³</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Precio */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              Precio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <p className="text-sm text-gray-500">Precio Mensual</p>
              <p className="font-bold text-3xl text-green-600">
                ${parseFloat(selectedStorageRoom.price).toFixed(2)}
              </p>
              <p className="text-sm text-gray-500 mt-1">ARS por mes</p>
            </div>
          </CardContent>
        </Card>

        {/* Descripción */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-green-600" />
              Descripción
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700">
              {selectedStorageRoom.description || "Sin descripción disponible"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Información de registro */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Información de Registro</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Fecha de Creación</p>
            <p className="font-medium">
              {new Date(selectedStorageRoom.createdAt).toLocaleDateString("es-AR", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Última Actualización</p>
            <p className="font-medium">
              {new Date(selectedStorageRoom.updatedAt).toLocaleDateString("es-AR", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Órdenes de Reserva */}
      {selectedStorageRoom.reservationOrders && selectedStorageRoom.reservationOrders.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-green-600" />
              Órdenes de Reserva ({selectedStorageRoom.reservationOrders.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Fecha de Entrada</TableHead>
                  <TableHead>Hora</TableHead>
                  <TableHead>Monto Total</TableHead>
                  <TableHead>Fecha de Creación</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedStorageRoom.reservationOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">#{order.id}</TableCell>
                    <TableCell>
                      {new Date(order.entryDate).toLocaleDateString("es-AR", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </TableCell>
                    <TableCell>{order.entryTime}</TableCell>
                    <TableCell className="font-semibold text-green-600">
                      ${parseFloat(order.totalAmount).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {new Date(order.createdAt).toLocaleDateString("es-AR", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/orders/${order.id}`)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Ver Detalles
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Sin órdenes de reserva */}
      {(!selectedStorageRoom.reservationOrders || selectedStorageRoom.reservationOrders.length === 0) && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-green-600" />
              Órdenes de Reserva
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No hay órdenes de reserva asociadas a este espacio</p>
              <p className="text-sm text-gray-400 mt-2">
                Este espacio está {selectedStorageRoom.status === "available" ? "disponible" : "no disponible"} para nuevas reservas
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
