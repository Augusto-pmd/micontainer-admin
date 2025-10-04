import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, User, Phone, Mail, MapPin, CreditCard, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useCustomerStore } from "@/stores/customerStore";

export const CustomerDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selectedCustomer, isLoading, error, fetchCustomerById, clearSelectedCustomer } = useCustomerStore();

  useEffect(() => {
    if (id) {
      fetchCustomerById(Number(id));
    }
    
    return () => {
      clearSelectedCustomer();
    };
  }, [id, fetchCustomerById, clearSelectedCustomer]);

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

          {/* Actividad Reciente - Placeholder para futuras órdenes */}
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-4">Órdenes Recientes</h2>
            <p className="text-gray-500 text-center py-8">
              No hay órdenes registradas para este cliente
            </p>
            {/* Aquí se pueden mostrar las órdenes del cliente en el futuro */}
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
              <Button className="w-full" variant="outline">
                Ver órdenes
              </Button>
              <Button className="w-full" variant="outline">
                Enviar email
              </Button>
              <Button className="w-full" variant="destructive">
                Eliminar cliente
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
