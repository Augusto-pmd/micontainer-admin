import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Building2, MapPin, Layers, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useBuildingStore } from "@/stores/buildingStore";

export const BuildingDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selectedBuilding, isLoading, error, fetchBuildingById, clearSelectedBuilding } = useBuildingStore();

  useEffect(() => {
    if (id) {
      fetchBuildingById(Number(id));
    }
    
    return () => {
      clearSelectedBuilding();
    };
  }, [id, fetchBuildingById, clearSelectedBuilding]);

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
          <Button onClick={() => navigate("/building")} className="mt-4">
            Volver a edificios
          </Button>
        </div>
      </div>
    );
  }

  if (!selectedBuilding) {
    return (
      <div className="p-6">
        <p className="text-gray-500">Edificio no encontrado</p>
        <Button onClick={() => navigate("/building")} className="mt-4">
          Volver a edificios
        </Button>
      </div>
    );
  }

  const building = selectedBuilding;
  const branch = building.branch;

  return (
    <div className="w-full p-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <Button variant="outline" onClick={() => navigate("/building")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{building.name}</h1>
          <p className="text-gray-500">Detalles del edificio</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Información Principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Datos del Edificio */}
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Información del Edificio
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Nombre</p>
                <p className="font-medium">{building.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">ID</p>
                <p className="font-medium">#{building.id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Número de pisos</p>
                <p className="font-medium flex items-center gap-2">
                  <Layers className="h-4 w-4 text-gray-400" />
                  {building.floors}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Estado</p>
                <span className={`inline-block px-2 py-1 rounded text-sm font-medium ${
                  building.isActive 
                    ? "bg-green-100 text-green-800" 
                    : "bg-red-100 text-red-800"
                }`}>
                  {building.isActive ? "Activo" : "Inactivo"}
                </span>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-gray-500">Descripción</p>
                <p className="font-medium">{building.description || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Fecha de creación</p>
                <p className="font-medium">
                  {new Date(building.createdAt).toLocaleDateString('es-AR')}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Última actualización</p>
                <p className="font-medium">
                  {new Date(building.updatedAt).toLocaleDateString('es-AR')}
                </p>
              </div>
            </div>
          </div>

          {/* Almacenes */}
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Archive className="h-5 w-5" />
              Almacenes ({building.storageRooms?.length || 0})
            </h2>
            {building.storageRooms && building.storageRooms.length > 0 ? (
              <div className="space-y-3">
                {building.storageRooms.map((room) => (
                  <div key={room.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Espacio</p>
                        <p className="font-medium">{room.space}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Piso</p>
                        <p className="font-medium">{room.floor}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Estado</p>
                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                          room.status === 'available' ? 'bg-green-100 text-green-800' :
                          room.status === 'reserved' ? 'bg-yellow-100 text-yellow-800' :
                          room.status === 'occupied' ? 'bg-blue-100 text-blue-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {room.status === 'available' ? 'Disponible' :
                           room.status === 'reserved' ? 'Reservado' :
                           room.status === 'occupied' ? 'Ocupado' : 'Mantenimiento'}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Área</p>
                        <p className="font-medium">{room.areaM2} m²</p>
                      </div>
                    </div>
                    {room.description && (
                      <p className="text-sm text-gray-600 mt-2">{room.description}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No hay almacenes registrados</p>
            )}
          </div>
        </div>

        {/* Sidebar - Sucursal */}
        <div className="space-y-6">
          {/* Información de la Sucursal */}
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Sucursal
            </h2>
            {branch ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Nombre</p>
                  <p className="font-medium">{branch.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Ciudad</p>
                  <p className="font-medium">{branch.city}, {branch.country}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Dirección</p>
                  <p className="font-medium">{branch.address}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Código postal</p>
                  <p className="font-medium">{branch.zipCode}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Teléfono</p>
                  <p className="font-medium">{branch.phone}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium">{branch.email}</p>
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
                <Button 
                  className="w-full mt-4" 
                  variant="outline"
                  onClick={() => navigate(`/branch/${branch.id}`)}
                >
                  Ver detalles de la sucursal
                </Button>
              </div>
            ) : (
              <p className="text-gray-500">No hay sucursal asociada</p>
            )}
          </div>

          {/* Acciones */}
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-4">Acciones</h2>
            <div className="space-y-2">
              <Button className="w-full" variant="outline">
                Editar edificio
              </Button>
              <Button 
                className="w-full" 
                variant={building.isActive ? "destructive" : "default"}
              >
                {building.isActive ? "Desactivar edificio" : "Activar edificio"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
