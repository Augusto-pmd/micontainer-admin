import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, User, Phone, Mail, MapPin, CreditCard, FileText, Package, Calendar, DollarSign, Eye, Download, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useCustomerStore } from "@/stores/customerStore";
import { getOrdersByCustomerIdServices } from "@/services/order.services";
import { downloadCustomerFile, deleteCustomerServices, approveCustomerServices } from "@/services/customer.services";
import { showError, showSuccess, showApiError, showDeleteConfirm } from "@/utils/alerts";
import { RESERVATION_ORDER_STATUS, type ReservationOrder } from "@/types/order";

export const CustomerDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selectedCustomer, isLoading, error, fetchCustomerById, clearSelectedCustomer } = useCustomerStore();
  
  const [orders, setOrders] = useState<ReservationOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (id) {
      fetchCustomerById(Number(id));
      loadCustomerOrders(Number(id));
    }
    
    return () => {
      clearSelectedCustomer();
    };
  }, [id, fetchCustomerById, clearSelectedCustomer]);

  const loadCustomerOrders = async (customerId: number) => {
    setLoadingOrders(true);
    try {
      const customerOrders = await getOrdersByCustomerIdServices(customerId);
      setOrders(customerOrders);
    } catch (error) {
      console.error("Error loading customer orders:", error);
      setOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  };

  const getFileNameFromUrl = (url: string): string => {
    try {
      const decodedUrl = decodeURIComponent(url);
      const parts = decodedUrl.split('/');
      const lastPart = parts[parts.length - 1];
      
      // Extraer el nombre del archivo (quitar el UUID si existe)
      const match = lastPart.match(/(.+?)-[a-f0-9-]{36}\.(.+)$/i);
      if (match) {
        return `${match[1]}.${match[2]}`;
      }
      
      return lastPart;
    } catch (error) {
      console.error("Error al extraer nombre del archivo:", error);
      return "Archivo";
    }
  };

  const handleDownloadFile = async (fileUrl: string) => {
    setDownloadingFile(fileUrl);
    try {
      const fileName = getFileNameFromUrl(fileUrl);
      await downloadCustomerFile(fileUrl, fileName);
    } catch (error: any) {
      console.error("Error al descargar archivo:", error);
      showError("Error al descargar el archivo");
    } finally {
      setDownloadingFile(null);
    }
  };

  const handleDeleteCustomer = async () => {
    if (!selectedCustomer) return;

    const customerName = selectedCustomer.user 
      ? `${selectedCustomer.user.firstName} ${selectedCustomer.user.lastName}` 
      : `Cliente #${selectedCustomer.id}`;

    const confirmed = await showDeleteConfirm(
      customerName,
      undefined,
      [
        'Los datos del cliente',
        'Todos sus documentos',
        'El usuario asociado',
      ]
    );

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteCustomerServices(selectedCustomer.id);
      showSuccess("Cliente eliminado exitosamente");
      navigate("/customers");
    } catch (error: any) {
      console.error("Error al eliminar cliente:", error);
      showApiError(error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleApproveCustomer = async () => {
    if (!selectedCustomer) return;

    try {
      await approveCustomerServices(selectedCustomer.id);
      showSuccess("Cliente aprobado exitosamente");
      // Recargar los datos del cliente
      fetchCustomerById(selectedCustomer.id);
    } catch (error: any) {
      console.error("Error al aprobar cliente:", error);
      showApiError(error);
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
          <Button onClick={() => navigate("/customers")} className="mt-4">
            Volver a clientes
          </Button>
        </div>
      </div>
    );
  }

  if (!selectedCustomer) {
    return (
      <div className="p-6">
        <p className="text-gray-500">Cliente no encontrado</p>
        <Button onClick={() => navigate("/customers")} className="mt-4">
          Volver a clientes
        </Button>
      </div>
    );
  }

  const customer = selectedCustomer;
  const user = customer.user;

  return (
    <div className="w-full p-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <Button variant="outline" onClick={() => navigate("/customers")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <div>
          <h1 className="text-3xl font-bold">
            {user ? `${user.firstName} ${user.lastName}` : `Cliente #${customer.id}`}
          </h1>
          <p className="text-gray-500">Detalles del cliente</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Información Principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Información Personal */}
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <User className="h-5 w-5" />
              Información Personal
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {user && (
                <>
                  <div>
                    <p className="text-sm text-gray-500">Nombre</p>
                    <p className="font-medium">{user.firstName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Apellido</p>
                    <p className="font-medium">{user.lastName}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-400" />
                      {user.email}
                    </p>
                  </div>
                </>
              )}
              <div>
                <p className="text-sm text-gray-500">DNI</p>
                <p className="font-medium flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-gray-400" />
                  {customer.dni}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">CUIT</p>
                <p className="font-medium">{customer.cuit}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Teléfono</p>
                <p className="font-medium flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-400" />
                  {customer.phone}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Tipo de persona</p>
                <span className={`inline-block px-2 py-1 rounded text-sm font-medium ${
                  customer.personType === 'fisica' 
                    ? "bg-blue-100 text-blue-800" 
                    : "bg-purple-100 text-purple-800"
                }`}>
                  {customer.personType === 'fisica' ? 'Física' : 'Jurídica'}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-500">Estado de aprobación</p>
                <span className={`inline-block px-2 py-1 rounded text-sm font-medium ${
                  customer.isApproved 
                    ? "bg-green-100 text-green-800" 
                    : "bg-yellow-100 text-yellow-800"
                }`}>
                  {customer.isApproved ? 'Aprobado' : 'Pendiente'}
                </span>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-gray-500">Dirección</p>
                <p className="font-medium flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  {customer.address}
                </p>
              </div>
            </div>
          </div>

          {/* Información de Cuenta */}
          {user && (
            <div className="bg-white rounded-lg border p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Información de Cuenta
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">ID de Usuario</p>
                  <p className="font-medium font-mono text-xs">{user.id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">ID de Cliente</p>
                  <p className="font-medium">#{customer.id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Fecha de registro</p>
                  <p className="font-medium">
                    {new Date(customer.createdAt).toLocaleDateString('es-AR')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Última actualización</p>
                  <p className="font-medium">
                    {new Date(customer.updatedAt).toLocaleDateString('es-AR')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Cuenta creada</p>
                  <p className="font-medium">
                    {new Date(user.createdAt).toLocaleDateString('es-AR')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Última actualización de usuario</p>
                  <p className="font-medium">
                    {new Date(user.updatedAt).toLocaleDateString('es-AR')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Documentos del Cliente */}
          {customer.documentUrls && customer.documentUrls.length > 0 && (
            <div className="bg-white rounded-lg border p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <FolderOpen className="h-5 w-5" />
                Documentos del Cliente
              </h2>
              <div className="space-y-2">
                <p className="text-sm text-gray-500 mb-3">
                  {customer.documentUrls.length} {customer.documentUrls.length === 1 ? 'archivo' : 'archivos'}
                </p>
                <div className="space-y-2">
                  {customer.documentUrls.map((fileUrl, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <FileText className="h-5 w-5 text-gray-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {getFileNameFromUrl(fileUrl)}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownloadFile(fileUrl)}
                        disabled={downloadingFile === fileUrl}
                        className="flex-shrink-0 hover:bg-green-100 hover:text-green-700"
                        title="Descargar archivo"
                      >
                        {downloadingFile === fileUrl ? (
                          <Spinner className="h-4 w-4" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Actividad Reciente - Órdenes del Cliente */}
          <div className="bg-white rounded-lg border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Package className="h-5 w-5" />
                Órdenes del Cliente
              </h2>
              <span className="text-sm text-gray-500">
                {orders.length} {orders.length === 1 ? 'orden' : 'órdenes'}
              </span>
            </div>
            
            {loadingOrders ? (
              <div className="flex justify-center py-8">
                <Spinner className="h-8 w-8 text-green-500" />
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No hay órdenes registradas para este cliente</p>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map((order) => (
                  <div 
                    key={order.id} 
                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/orders/${order.id}`)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-gray-900">Orden #{order.id}</span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            order.status === RESERVATION_ORDER_STATUS.PENDING 
                              ? 'bg-yellow-100 text-yellow-800'
                              : order.status === RESERVATION_ORDER_STATUS.CONFIRMED
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {order.status === RESERVATION_ORDER_STATUS.PENDING ? 'Pendiente' : 
                             order.status === RESERVATION_ORDER_STATUS.CONFIRMED ? 'Confirmada' : 
                             order.status === RESERVATION_ORDER_STATUS.CANCELED ? 'Cancelada' : 
                             order.storageRoom.status}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center gap-2 text-gray-600">
                            <Calendar className="h-4 w-4" />
                            <span>{new Date(order.entryDate).toLocaleDateString('es-AR')} - {order.entryTime}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600">
                            <DollarSign className="h-4 w-4" />
                            <span className="font-medium">${order.totalAmount}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600">
                            <Package className="h-4 w-4" />
                            <span>{order.storageRoom.space} - {order.storageRoom.floor}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600">
                            <MapPin className="h-4 w-4" />
                            <span>{order.storageRoom.building.name}</span>
                          </div>
                        </div>
                      </div>
                      
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/orders/${order.id}`);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Avatar/Inicial */}
          {user && (
            <div className="bg-white rounded-lg border p-6">
              <div className="flex flex-col items-center">
                <div className="w-24 h-24 rounded-full bg-green-500 text-white flex items-center justify-center text-3xl font-bold mb-4">
                  {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                </div>
                <h3 className="text-xl font-semibold text-center">
                  {user.firstName} {user.lastName}
                </h3>
                <p className="text-gray-500 text-sm">{user.email}</p>
              </div>
            </div>
          )}

          {/* Resumen */}
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-4">Resumen</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Tipo</span>
                <span className="font-semibold capitalize">
                  {customer.personType === 'fisica' ? 'Física' : 'Jurídica'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">DNI</span>
                <span className="font-semibold">{customer.dni}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">CUIT</span>
                <span className="font-semibold">{customer.cuit}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Órdenes activas</span>
                <span className="font-semibold text-green-600">
                  {loadingOrders ? '...' : orders.length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Documentos</span>
                <span className="font-semibold text-blue-600">
                  {customer.documentUrls?.length || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Cliente desde</span>
                <span className="font-semibold">
                  {new Date(customer.createdAt).toLocaleDateString('es-AR', { 
                    month: 'short', 
                    year: 'numeric' 
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Acciones */}
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-4">Acciones</h2>
            <div className="space-y-2">
              <Button 
                className="w-full" 
                variant="outline"
                onClick={() => navigate(`/customers/${id}/edit`)}
              >
                Editar cliente
              </Button>
              {!customer.isApproved && (
                <Button 
                  className="w-full bg-green-600 hover:bg-green-700 text-white" 
                  onClick={handleApproveCustomer}
                >
                  Aprobar cliente
                </Button>
              )}
              <Button 
                className="w-full" 
                variant="outline"
                onClick={() => navigate('/orders', { state: { customerId: customer.id } })}
              >
                Ver todas las órdenes
              </Button>
              <Button className="w-full" variant="outline">
                Enviar email
              </Button>
              <Button 
                className="w-full" 
                variant="destructive"
                onClick={handleDeleteCustomer}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Spinner className="h-4 w-4 mr-2" />
                    Eliminando...
                  </>
                ) : (
                  "Eliminar cliente"
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
