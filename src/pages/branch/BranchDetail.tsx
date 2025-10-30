import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, MapPin, Building2, Phone, Mail, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useBranchStore } from "@/stores/branchStore";

export const BranchDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selectedBranch, isLoading, error, fetchBranchById, clearSelectedBranch } = useBranchStore();

  useEffect(() => {
    if (id) {
      fetchBranchById(Number(id));
    }
    
    return () => {
      clearSelectedBranch();
    };
  }, [id, fetchBranchById, clearSelectedBranch]);

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
          <Button onClick={() => navigate("/branch")} className="mt-4">
            Volver a sucursales
          </Button>
        </div>
      </div>
    );
  }

  if (!selectedBranch) {
    return (
      <div className="p-6">
        <p className="text-gray-500">Sucursal no encontrada</p>
        <Button onClick={() => navigate("/branch")} className="mt-4">
          Volver a sucursales
        </Button>
      </div>
    );
  }

  const branch = selectedBranch;

  return (
    <div className="w-full p-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <Button variant="outline" onClick={() => navigate("/branch")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{branch.name}</h1>
          <p className="text-gray-500">Detalles de la sucursal</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Información Principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Datos de la Sucursal */}
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Información de la Sucursal
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Nombre</p>
                <p className="font-medium">{branch.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">ID</p>
                <p className="font-medium">#{branch.id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Estado</p>
                <span className={`inline-block px-2 py-1 rounded text-sm font-medium ${
                  branch.isActive 
                    ? "bg-green-100 text-green-800" 
                    : "bg-red-100 text-red-800"
                }`}>
                  {branch.isActive ? "Activo" : "Inactivo"}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-500">País</p>
                <p className="font-medium flex items-center gap-2">
                  <Globe className="h-4 w-4 text-gray-400" />
                  {branch.country}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Ciudad</p>
                <p className="font-medium">{branch.city}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Código postal</p>
                <p className="font-medium">{branch.zipCode}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-gray-500">Dirección</p>
                <p className="font-medium">{branch.address}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Teléfono</p>
                <p className="font-medium flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-400" />
                  {branch.phone}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  {branch.email}
                </p>
              </div>
              {branch.gps_location && (
                <div className="col-span-2">
                  <p className="text-sm text-gray-500">Ubicación GPS</p>
                  <p className="font-medium">{branch.gps_location}</p>
                </div>
              )}
              <div className="col-span-2">
                <p className="text-sm text-gray-500">Descripción</p>
                <p className="font-medium">{branch.description || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Fecha de creación</p>
                <p className="font-medium">
                  {new Date(branch.createdAt).toLocaleDateString('es-AR')}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Última actualización</p>
                <p className="font-medium">
                  {new Date(branch.updatedAt).toLocaleDateString('es-AR')}
                </p>
              </div>
            </div>
          </div>

          {/* Edificios */}
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Edificios ({branch.buildings?.length || 0})
            </h2>
            {branch.buildings && branch.buildings.length > 0 ? (
              <div className="space-y-3">
                {branch.buildings.map((building) => (
                  <div 
                    key={building.id} 
                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/building/${building.id}`)}
                  >
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Nombre</p>
                        <p className="font-medium">{building.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Pisos</p>
                        <p className="font-medium">{building.floors}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Estado</p>
                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                          building.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {building.isActive ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">ID</p>
                        <p className="font-medium">#{building.id}</p>
                      </div>
                    </div>
                    {building.description && (
                      <p className="text-sm text-gray-600 mt-2">{building.description}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No hay edificios registrados</p>
            )}
          </div>
        </div>

        {/* Sidebar - Resumen */}
        <div className="space-y-6">
          {/* Resumen */}
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-4">Resumen</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total edificios</span>
                <span className="font-semibold text-lg">{branch.buildings?.length || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Estado</span>
                <span className={`px-2 py-1 rounded text-sm font-medium ${
                  branch.isActive 
                    ? "bg-green-100 text-green-800" 
                    : "bg-red-100 text-red-800"
                }`}>
                  {branch.isActive ? "Activa" : "Inactiva"}
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
                onClick={() => navigate(`/branch/${id}/edit`)}
              >
                Editar sucursal
              </Button>
              {/* <Button 
                className="w-full" 
                variant={branch.isActive ? "destructive" : "default"}
              >
                {branch.isActive ? "Desactivar sucursal" : "Activar sucursal"}
              </Button> */}
              {/* {branch.gps_location && (
                <Button className="w-full" variant="outline">
                  Ver en mapa
                </Button>
              )} */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
