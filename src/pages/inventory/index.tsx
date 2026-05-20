import { useState, useEffect, useMemo } from 'react';
import { getAllStorageRoomsServices } from '../../services/storageRoom.services';
import { getAllBranchesServices } from '../../services/branch.services';
import type { StorageRoom, StorageRoomStatus } from '../../types/storageRoom';
import type { Branch } from '../../types/branch';

const STATUS_CONFIG: Record<StorageRoomStatus, { label: string; cellBg: string; cellText: string; dot: string; statBg: string }> = {
  available: { label: 'Disponible', cellBg: 'bg-green-100 border-green-400 hover:bg-green-200', cellText: 'text-green-800', dot: 'bg-green-500', statBg: 'bg-green-50 border-green-200 text-green-700' },
  occupied:  { label: 'Ocupada',   cellBg: 'bg-red-100 border-red-400 hover:bg-red-200',      cellText: 'text-red-800',   dot: 'bg-red-500',   statBg: 'bg-red-50 border-red-200 text-red-700' },
  reserved:  { label: 'Reservada', cellBg: 'bg-yellow-100 border-yellow-400 hover:bg-yellow-200', cellText: 'text-yellow-800', dot: 'bg-yellow-400', statBg: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
  blocked:   { label: 'Bloqueada', cellBg: 'bg-gray-100 border-gray-400 hover:bg-gray-200',  cellText: 'text-gray-600',  dot: 'bg-gray-400',  statBg: 'bg-gray-50 border-gray-200 text-gray-600' },
};

export default function Inventory() {
  const [rooms, setRooms] = useState<StorageRoom[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [roomsRes, branchesRes] = await Promise.all([
          getAllStorageRoomsServices({ limit: 1000 }),
          getAllBranchesServices({ limit: 100 }),
        ]);
        setRooms(roomsRes.data);
        setBranches(branchesRes.data);
        if (branchesRes.data.length > 0) setSelectedBranchId(branchesRes.data[0].id);
      } catch {
        setError('No se pudo cargar el inventario.');
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(
    () => selectedBranchId !== null
      ? rooms.filter(r => r.building?.branch?.id === selectedBranchId)
      : rooms,
    [rooms, selectedBranchId],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, Map<string, StorageRoom[]>>();
    for (const room of filtered) {
      const bName = room.building?.name ?? 'Sin edificio';
      const floor = room.floor ?? 'PB';
      if (!map.has(bName)) map.set(bName, new Map());
      const floorMap = map.get(bName)!;
      if (!floorMap.has(floor)) floorMap.set(floor, []);
      floorMap.get(floor)!.push(room);
    }
    return Array.from(map.entries()).map(([buildingName, floorMap]) => ({
      buildingName,
      floors: Array.from(floorMap.entries())
        .sort(([a], [b]) => {
          const order = (f: string) => f === 'PB' ? -1 : parseInt(f);
          return order(a) - order(b);
        })
        .map(([floor, roomList]) => ({
          floor,
          rooms: roomList.sort((a, b) => a.space.localeCompare(b.space, undefined, { numeric: true })),
        })),
    }));
  }, [filtered]);

  const stats = useMemo(() => ({
    total: filtered.length,
    available: filtered.filter(r => r.status === 'available').length,
    occupied:  filtered.filter(r => r.status === 'occupied').length,
    reserved:  filtered.filter(r => r.status === 'reserved').length,
    blocked:   filtered.filter(r => r.status === 'blocked').length,
  }), [filtered]);

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
    </div>
  );

  if (error) return (
    <div className="text-center py-16 text-red-500 text-sm">{error}</div>
  );

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventario de Bauleras</h1>
          <p className="text-sm text-gray-500 mt-0.5">Estado en tiempo real por sucursal y edificio</p>
        </div>
        <select
          value={selectedBranchId ?? ''}
          onChange={e => setSelectedBranchId(e.target.value ? Number(e.target.value) : null)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">Todas las sucursales</option>
          {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total" value={stats.total} cls="bg-gray-50 border-gray-200 text-gray-900" />
        <StatCard label="Disponibles" value={stats.available} cls={STATUS_CONFIG.available.statBg} />
        <StatCard label="Ocupadas" value={stats.occupied} cls={STATUS_CONFIG.occupied.statBg} />
        <StatCard label="Bloq. / Reservadas" value={stats.blocked + stats.reserved} cls={STATUS_CONFIG.blocked.statBg} />
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-6">
        {(Object.entries(STATUS_CONFIG) as [StorageRoomStatus, typeof STATUS_CONFIG[StorageRoomStatus]][]).map(([status, cfg]) => (
          <div key={status} className="flex items-center gap-1.5 text-sm text-gray-600">
            <div className={`w-3 h-3 rounded-sm ${cfg.dot}`} />
            {cfg.label}
          </div>
        ))}
      </div>

      {/* Grid por edificio / piso */}
      {grouped.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium">Sin bauleras registradas</p>
          <p className="text-sm mt-1">Seleccioná otra sucursal o creá espacios en Sucursales → Edificios → Espacios</p>
        </div>
      ) : (
        <div className="space-y-5">
          {grouped.map(({ buildingName, floors }) => (
            <div key={buildingName} className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center gap-2">
                <span className="text-green-600 text-base font-bold">▪</span>
                <h2 className="font-semibold text-gray-800">{buildingName}</h2>
                <span className="ml-auto text-xs text-gray-400">
                  {floors.reduce((acc, f) => acc + f.rooms.length, 0)} espacios
                </span>
              </div>
              <div className="p-4 space-y-5">
                {floors.map(({ floor, rooms: floorRooms }) => (
                  <div key={floor}>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
                      {floor === 'PB' ? 'Planta Baja' : `Piso ${floor}`} — {floorRooms.length} espacios
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {floorRooms.map(room => <UnitCell key={room.id} room={room} />)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, cls }: { label: string; value: number; cls: string }) {
  return (
    <div className={`border rounded-lg p-3 ${cls}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs mt-0.5 opacity-70">{label}</div>
    </div>
  );
}

function UnitCell({ room }: { room: StorageRoom }) {
  const cfg = STATUS_CONFIG[room.status] ?? STATUS_CONFIG.available;
  return (
    <div
      title={`${room.space} · ${cfg.label}${room.areaM2 ? ' · ' + room.areaM2 + ' m²' : ''}`}
      className={`w-14 h-14 rounded-lg border-2 flex flex-col items-center justify-center cursor-default select-none transition-colors ${cfg.cellBg}`}
    >
      <span className={`text-[11px] font-bold leading-tight ${cfg.cellText}`}>{room.space}</span>
      {room.areaM2 && (
        <span className={`text-[9px] leading-tight ${cfg.cellText} opacity-60`}>{room.areaM2}m²</span>
      )}
    </div>
  );
}
