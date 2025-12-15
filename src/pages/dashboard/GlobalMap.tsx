import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Building2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAllBranchesServices } from "@/services/branch.services";
import { getAllBuildings } from "@/services/building.services";
import { getAllStorageRoomsServices } from "@/services/storageRoom.services";
import type { Branch } from "@/types/branch";
import type { Building } from "@/types/building";
import type { StorageRoom } from "@/types/storageRoom";

export default function GlobalMap() {
  const navigate = useNavigate();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [storageRooms, setStorageRooms] = useState<StorageRoom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>("");
  const [selectedFloor, setSelectedFloor] = useState<string>("all");

  useEffect(() => {
    const loadBranches = async () => {
      try {
        setIsLoading(true);
        const branchesData = await getAllBranchesServices({ page: 1, limit: 1000 });
        setBranches(branchesData.data);
      } catch (error) {
        console.error("Error loading branches:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadBranches();
  }, []);

  useEffect(() => {
    const loadBuildings = async () => {
      if (!selectedBranchId) {
        setBuildings([]);
        setSelectedBuildingId("");
        return;
      }

      try {
        setIsLoading(true);
        const buildingsData = await getAllBuildings({ page: 1, limit: 1000 });
        const filteredBuildings = buildingsData.data.filter(
          (building: Building) => building.branch?.id === parseInt(selectedBranchId)
        );
        setBuildings(filteredBuildings);
        setSelectedBuildingId("");
      } catch (error) {
        console.error("Error loading buildings:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadBuildings();
  }, [selectedBranchId]);

  useEffect(() => {
    const loadStorageRooms = async () => {
      if (!selectedBuildingId) {
        setStorageRooms([]);
        return;
      }

      try {
        setIsLoading(true);
        const storageRoomsData = await getAllStorageRoomsServices({ page: 1, limit: 1000 });
        const filteredStorageRooms = storageRoomsData.data.filter(
          (sr: StorageRoom) => sr.building?.id === parseInt(selectedBuildingId)
        );
        setStorageRooms(filteredStorageRooms);
        setSelectedFloor("all");
      } catch (error) {
        console.error("Error loading storage rooms:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadStorageRooms();
  }, [selectedBuildingId]);

  // Obtener pisos únicos
  const floors = Array.from(new Set(storageRooms.map(sr => sr.floor))).sort();

  // Filtrar storage rooms por piso
  const filteredStorageRooms = selectedFloor === "all" 
    ? storageRooms 
    : storageRooms.filter(sr => sr.floor === selectedFloor);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return {
          bg: "bg-green-100 hover:bg-green-200",
          border: "border-green-300",
          text: "text-green-800",
          label: "Disponible"
        };
      case "occupied":
        return {
          bg: "bg-red-100 hover:bg-red-200",
          border: "border-red-300",
          text: "text-red-800",
          label: "Ocupado"
        };
      case "reserved":
        return {
          bg: "bg-yellow-100 hover:bg-yellow-200",
          border: "border-yellow-300",
          text: "text-yellow-800",
          label: "Reservado"
        };
      case "blocked":
        return {
          bg: "bg-gray-100 hover:bg-gray-200",
          border: "border-gray-300",
          text: "text-gray-800",
          label: "Bloqueado"
        };
      default:
        return {
          bg: "bg-gray-100 hover:bg-gray-200",
          border: "border-gray-300",
          text: "text-gray-800",
          label: "Desconocido"
        };
    }
  };

  const handleStorageRoomClick = (storageRoomId: number) => {
    navigate(`/storage-rooms/${storageRoomId}`);
  };

  // Estadísticas
  const stats = {
    available: storageRooms.filter(sr => sr.status === "available").length,
    occupied: storageRooms.filter(sr => sr.status === "occupied").length,
    reserved: storageRooms.filter(sr => sr.status === "reserved").length,
    blocked: storageRooms.filter(sr => sr.status === "blocked").length,
    total: storageRooms.length
  };

  const selectedBuilding = buildings.find(b => b.id === parseInt(selectedBuildingId));
  const selectedBranch = branches.find(b => b.id === parseInt(selectedBranchId));

  return (
    <div className="container mx-auto py-6">
      <Button
        variant="ghost"
        onClick={() => navigate("/dashboard")}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Volver al Dashboard
      </Button>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-4">Mapa Global de Edificios</h1>
        
        {/* Selectores */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Seleccionar Sucursal
            </label>
            <Select
              value={selectedBranchId}
              onValueChange={setSelectedBranchId}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecciona una sucursal" />
              </SelectTrigger>
              <SelectContent>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id.toString()}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Seleccionar Edificio
            </label>
            <Select
              value={selectedBuildingId}
              onValueChange={setSelectedBuildingId}
              disabled={!selectedBranchId || buildings.length === 0}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecciona un edificio" />
              </SelectTrigger>
              <SelectContent>
                {buildings.map((building) => (
                  <SelectItem key={building.id} value={building.id.toString()}>
                    {building.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {selectedBuilding && (
          <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
            <Building2 className="h-6 w-6 text-green-600" />
            <div>
              <h2 className="text-xl font-semibold">{selectedBuilding.name}</h2>
              <p className="text-gray-600 flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4" />
                {selectedBranch?.name || "Sin sucursal"}
              </p>
            </div>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="animate-spin" style={{ animationDuration: "0.8s" }}>
            <Spinner className="h-16 w-16 text-green-500" />
          </div>
        </div>
      ) : !selectedBuildingId ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium text-gray-600 mb-2">
              Selecciona una sucursal y un edificio
            </p>
            <p className="text-sm text-gray-500">
              Usa los selectores de arriba para visualizar el mapa de espacios
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Estadísticas */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
                <div className="text-sm text-gray-600">Total Espacios</div>
              </CardContent>
            </Card>
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-6 text-center">
                <div className="text-2xl font-bold text-green-800">{stats.available}</div>
                <div className="text-sm text-green-700">Disponibles</div>
              </CardContent>
            </Card>
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6 text-center">
                <div className="text-2xl font-bold text-red-800">{stats.occupied}</div>
                <div className="text-sm text-red-700">Ocupados</div>
              </CardContent>
            </Card>
            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="pt-6 text-center">
                <div className="text-2xl font-bold text-yellow-800">{stats.reserved}</div>
                <div className="text-sm text-yellow-700">Reservados</div>
              </CardContent>
            </Card>
            <Card className="border-gray-200 bg-gray-50">
              <CardContent className="pt-6 text-center">
                <div className="text-2xl font-bold text-gray-800">{stats.blocked}</div>
                <div className="text-sm text-gray-700">Bloqueados</div>
              </CardContent>
            </Card>
          </div>

          {/* Filtro por piso */}
          {floors.length > 1 && (
            <div className="mb-6 flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Filtrar por piso:</span>
              <div className="flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant={selectedFloor === "all" ? "default" : "outline"}
                  onClick={() => setSelectedFloor("all")}
                  className={selectedFloor === "all" ? "bg-green-600 hover:bg-green-700" : ""}
                >
                  Todos
                </Button>
                {floors.map((floor) => (
                  <Button
                    key={floor}
                    size="sm"
                    variant={selectedFloor === floor ? "default" : "outline"}
                    onClick={() => setSelectedFloor(floor)}
                    className={selectedFloor === floor ? "bg-green-600 hover:bg-green-700" : ""}
                  >
                    {floor}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Mapa de Storage Rooms */}
          <Card>
            <CardHeader>
              <CardTitle>
                Mapa de Espacios
                {selectedFloor !== "all" && ` - ${selectedFloor}`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredStorageRooms.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                  {filteredStorageRooms.map((storageRoom) => {
                    const statusColor = getStatusColor(storageRoom.status);
                    return (
                      <button
                        key={storageRoom.id}
                        onClick={() => handleStorageRoomClick(storageRoom.id)}
                        className={`
                          relative p-4 rounded-lg border-2 
                          ${statusColor.bg} ${statusColor.border}
                          transition-all duration-200 transform hover:scale-105
                          focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2
                          cursor-pointer group
                        `}
                        title={`${storageRoom.space} - ${statusColor.label}`}
                      >
                        {/* Contenido del espacio */}
                        <div className="flex flex-col items-center justify-center">
                          <div className={`text-xs font-bold ${statusColor.text} mb-1`}>
                            {storageRoom.space}
                          </div>
                          <div className="text-[10px] text-gray-600">
                            {parseFloat(storageRoom.areaM2).toFixed(0)}m²
                          </div>
                        </div>

                        {/* Indicador de estado */}
                        <div className={`
                          absolute top-1 right-1 w-2 h-2 rounded-full
                          ${storageRoom.status === 'available' ? 'bg-green-500' : ''}
                          ${storageRoom.status === 'occupied' ? 'bg-red-500' : ''}
                          ${storageRoom.status === 'reserved' ? 'bg-yellow-500' : ''}
                          ${storageRoom.status === 'blocked' ? 'bg-gray-500' : ''}
                        `} />

                        {/* Tooltip en hover */}
                        <div className="
                          absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2
                          bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap
                          opacity-0 group-hover:opacity-100 transition-opacity duration-200
                          pointer-events-none z-10
                        ">
                          {storageRoom.space} - {statusColor.label}
                          <div className="text-[10px] text-gray-300">
                            ${parseFloat(storageRoom.price).toFixed(2)}/mes
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Building2 className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium mb-2">No hay espacios en este piso</p>
                  <p className="text-sm">Selecciona otro piso o crea nuevos espacios</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Leyenda */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base">Leyenda</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-green-500"></div>
                  <span className="text-sm">Disponible</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-red-500"></div>
                  <span className="text-sm">Ocupado</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
                  <span className="text-sm">Reservado</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-gray-500"></div>
                  <span className="text-sm">Bloqueado</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
