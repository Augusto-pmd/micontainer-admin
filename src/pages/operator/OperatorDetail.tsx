import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, User, Mail, Building2, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useOperatorStore } from "@/stores/operatorStore";
import { deleteOperatorServices } from "@/services/operator.services";
import { showSuccess, showApiError, showDeleteConfirm } from "@/utils/alerts";

export const OperatorDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selectedOperator, isLoading, error, fetchOperatorById, clearSelectedOperator } = useOperatorStore();
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (id) {
      fetchOperatorById(Number(id));
    }
    
    return () => {
      clearSelectedOperator();
    };
  }, [id, fetchOperatorById, clearSelectedOperator]);

  const handleDeleteOperator = async () => {
    if (!selectedOperator) return;

    const operatorName = selectedOperator.user 
      ? `${selectedOperator.user.firstName} ${selectedOperator.user.lastName}` 
      : `Operador #${selectedOperator.id}`;

    const confirmed = await showDeleteConfirm(
      operatorName,
      undefined,
      [
        'Los datos del operador',
        'El usuario asociado',
      ]
    );

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteOperatorServices(selectedOperator.id);
      showSuccess("Operador eliminado exitosamente");
      navigate("/operators");
    } catch (error: any) {
      console.error("Error al eliminar operador:", error);
      showApiError(error);
    } finally {
      setIsDeleting(false);
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
          <Button onClick={() => navigate("/operators")} className="mt-4">
            Volver a operadores
          </Button>
        </div>
      </div>
    );
  }

  if (!selectedOperator) {
    return (
      <div className="p-6">
        <p className="text-gray-500">Operador no encontrado</p>
        <Button onClick={() => navigate("/operators")} className="mt-4">
          Volver a operadores
        </Button>
      </div>
    );
  }

  const operator = selectedOperator;
  const user = operator.user;

  return (
    <div className="w-full p-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <Button variant="outline" onClick={() => navigate("/operators")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <div>
          <h1 className="text-3xl font-bold">
            {user ? `${user.firstName} ${user.lastName}` : `Operador #${operator.id}`}
          </h1>
          <p className="text-gray-500">Detalles del operador</p>
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
                  {user.role && (
                    <div className="col-span-2">
                      <p className="text-sm text-gray-500">Rol</p>
                      <span className="inline-block px-2 py-1 rounded text-sm font-medium bg-blue-100 text-blue-800">
                        {user.role.name}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Información de Sucursal */}
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Sucursal Asignada
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Nombre</p>
                <p className="font-medium">{operator.branch.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Ciudad</p>
                <p className="font-medium">{operator.branch.city}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-gray-500">Dirección</p>
                <p className="font-medium">{operator.branch.address}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Teléfono</p>
                <p className="font-medium">{operator.branch.phone}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium">{operator.branch.email}</p>
              </div>
            </div>
          </div>

          {/* Información de Cuenta */}
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Información de Cuenta
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">ID de Operador</p>
                <p className="font-medium">#{operator.id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">ID de Usuario</p>
                <p className="font-medium font-mono text-xs">{user.id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Fecha de registro</p>
                <p className="font-medium">
                  {new Date(operator.createdAt).toLocaleDateString('es-AR')}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Última actualización</p>
                <p className="font-medium">
                  {new Date(operator.updatedAt).toLocaleDateString('es-AR')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Avatar/Inicial */}
          {user && (
            <div className="bg-white rounded-lg border p-6">
              <div className="flex flex-col items-center">
                <div className="w-24 h-24 rounded-full bg-blue-500 text-white flex items-center justify-center text-3xl font-bold mb-4">
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
                <span className="text-gray-600">Sucursal</span>
                <span className="font-semibold">{operator.branch.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Rol</span>
                <span className="font-semibold">
                  {user.role?.name || 'Operador'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Operador desde</span>
                <span className="font-semibold">
                  {new Date(operator.createdAt).toLocaleDateString('es-AR', { 
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
                onClick={() => navigate(`/branches/${operator.branch.id}`)}
              >
                Ver sucursal
              </Button>
              <Button 
                className="w-full" 
                variant="destructive"
                onClick={handleDeleteOperator}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Spinner className="h-4 w-4 mr-2" />
                    Eliminando...
                  </>
                ) : (
                  "Eliminar operador"
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
