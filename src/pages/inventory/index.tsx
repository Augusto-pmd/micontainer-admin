import { useState, useEffect, useMemo } from 'react';
import { getAllStorageRoomsServices, getStorageRoomByIdServices, updateStorageRoomServices } from '../../services/storageRoom.services';
import { getAllBranchesServices } from '../../services/branch.services';
import { getOrdersByCustomerIdServices } from '../../services/order.services';
import { updateCustomerServices } from '../../services/customer.services';
import type { StorageRoom, StorageRoomStatus } from '../../types/storageRoom';
import type { Branch } from '../../types/branch';

const STATUS_CONFIG: Record<StorageRoomStatus, { label: string; cellBg: string; cellText: string; dot: string; statBg: string }> = {
  available: { label: 'Disponible', cellBg: 'bg-green-100 border-green-400 hover:bg-green-200', cellText: 'text-green-800', dot: 'bg-green-500', statBg: 'bg-green-50 border-green-200 text-green-700' },
  occupied:  { label: 'Ocupada',   cellBg: 'bg-red-100 border-red-400 hover:bg-red-200',      cellText: 'text-red-800',   dot: 'bg-red-500',   statBg: 'bg-red-50 border-red-200 text-red-700' },
  reserved:  { label: 'Reservada', cellBg: 'bg-yellow-100 border-yellow-400 hover:bg-yellow-200', cellText: 'text-yellow-800', dot: 'bg-yellow-400', statBg: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
  blocked:   { label: 'Bloqueada', cellBg: 'bg-gray-100 border-gray-400 hover:bg-gray-200',  cellText: 'text-gray-600',  dot: 'bg-gray-400',  statBg: 'bg-gray-50 border-gray-200 text-gray-600' },
};

// Estado del contrato -> al día / debe (lo que rige la credencial de acceso)
function contractBadge(status?: string): { label: string; cls: string } {
  const s = (status || '').toLowerCase();
  if (s === 'active' || s === 'confirmed' || s === 'activa') return { label: 'Al día', cls: 'bg-green-100 text-green-800' };
  if (s === 'pending' || s === 'pending_payment') return { label: 'Debe (pago pendiente)', cls: 'bg-yellow-100 text-yellow-800' };
  if (s === 'payment_failed') return { label: 'Debe (pago fallido)', cls: 'bg-red-100 text-red-800' };
  if (s === 'cancelled' || s === 'canceled') return { label: 'Cancelada', cls: 'bg-gray-100 text-gray-700' };
  return { label: status || 'Sin estado', cls: 'bg-gray-100 text-gray-700' };
}

function fmtDate(d?: string) {
  if (!d) return '—';
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? d : dt.toLocaleDateString('es-AR');
}
function monthsSince(d?: string) {
  if (!d) return null;
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return null;
  const months = Math.max(0, Math.round((Date.now() - dt.getTime()) / (1000 * 60 * 60 * 24 * 30)));
  return months;
}

export default function Inventory() {
  const [rooms, setRooms] = useState<StorageRoom[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

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

  const reload = async () => {
    try { const r = await getAllStorageRoomsServices({ limit: 1000 }); setRooms(r.data); } catch (e) { /* */ }
  };

  const openDetail = async (room: StorageRoom) => {
    setDetail({ room, tenant: null, order: null });
    setDetailLoading(true);
    try {
      const full: any = await getStorageRoomByIdServices(room.id);
      let order: any = null;
      const tenant = full?.tenant || null;
      if (tenant?.id) {
        try {
          const orders: any[] = await getOrdersByCustomerIdServices(tenant.id as any);
          order = orders.find((o) => o.storageRoomId === room.id || o.contractNumber === full.contractNumber) || orders[0] || null;
        } catch { /* sin órdenes */ }
      }
      setDetail({ room: full, tenant, order });
    } catch {
      setDetail({ room, tenant: null, order: null, error: true });
    } finally {
      setDetailLoading(false);
    }
  };

  const filtered = useMemo(
    () => selectedBranchId !== null
      ? rooms.filter(r => (((r as unknown) as { branchId?: string }).branchId ?? r.building?.branch?.id) === selectedBranchId)
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
          <p className="text-sm text-gray-500 mt-0.5">Estado en tiempo real · tocá una baulera para ver el detalle</p>
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
                      {floorRooms.map(room => <UnitCell key={room.id} room={room} onClick={() => openDetail(room)} />)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {detail && (
        <RoomDetailModal detail={detail} loading={detailLoading} onClose={() => setDetail(null)} onChanged={() => { setDetail(null); reload(); }} />
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

function UnitCell({ room, onClick }: { room: StorageRoom; onClick: () => void }) {
  const cfg = STATUS_CONFIG[room.status] ?? STATUS_CONFIG.available;
  return (
    <button
      onClick={onClick}
      title={`${room.space} · ${cfg.label}${room.areaM2 ? ' · ' + room.areaM2 + ' m²' : ''} — tocá para ver detalle`}
      className={`w-14 h-14 rounded-lg border-2 flex flex-col items-center justify-center cursor-pointer select-none transition-colors ${cfg.cellBg}`}
    >
      <span className={`text-[11px] font-bold leading-tight ${cfg.cellText}`}>{room.space}</span>
      {room.areaM2 && (
        <span className={`text-[9px] leading-tight ${cfg.cellText} opacity-60`}>{room.areaM2}m²</span>
      )}
    </button>
  );
}

function Row({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900 text-right">{value ?? '—'}</span>
    </div>
  );
}

function RoomDetailModal({ detail, loading, onClose, onChanged }: { detail: any; loading: boolean; onClose: () => void; onChanged?: () => void }) {
  const room = detail.room || {};
  const tenant = detail.tenant || room.tenant || null;
  const order = detail.order || null;
  const cfg = STATUS_CONFIG[(room.status as StorageRoomStatus)] ?? STATUS_CONFIG.available;
  const occupied = room.status === 'occupied';
  const start = order?.entryDate || order?.startDate || room.assignedAt;
  const months = monthsSince(start);
  const badge = contractBadge(order?.status);
  const [debt, setDebt] = useState<boolean>(!!(tenant && tenant.manualDebt));
  const [debtNote, setDebtNote] = useState<string>((tenant && tenant.debtNote) || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [blockMode, setBlockMode] = useState('indef');
  const [blockDate, setBlockDate] = useState('');
  const [savingBlock, setSavingBlock] = useState(false);
  const cambiarBloqueo = async (st: string, until: string | null) => {
    setSavingBlock(true);
    try { await updateStorageRoomServices(room.id as any, { status: st, blockedUntil: until, blockReason: st === 'blocked' ? 'Bloqueo manual' : null } as any); if (onChanged) onChanged(); }
    catch (e) { /* */ } finally { setSavingBlock(false); }
  };
  const saveDebt = async () => {
    if (!tenant || !tenant.id) return;
    setSaving(true); setSaved(false);
    try { await updateCustomerServices(tenant.id as any, { manualDebt: debt, debtNote, debtUpdatedAt: new Date().toISOString() } as any); setSaved(true); } catch (e) { /* */ } finally { setSaving(false); }
  };
  const tenantName = tenant ? (tenant.fullName || `${tenant.user?.firstName || tenant.firstName || ''} ${tenant.user?.lastName || tenant.lastName || ''}`.trim()) : (room.currentTenant || null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-sm ${cfg.dot}`} />
            <h2 className="text-lg font-bold text-gray-900">Baulera {room.space || room.name}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
        </div>

        <div className="px-5 py-4">
          {loading ? (
            <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" /></div>
          ) : (
            <>
              <div className="mb-4">
                <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.statBg}`}>{cfg.label}</span>
              </div>

              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Baulera</h3>
              <Row label="Código" value={room.space || room.name} />
              <Row label="Área" value={room.areaM2 ? `${room.areaM2} m²` : '—'} />
              <Row label="Piso" value={room.floor || '—'} />
              <Row label="Precio" value={room.price ? `$${Number(room.price).toLocaleString('es-AR')}/mes` : '—'} />
              <Row label="Edificio" value={room.building?.name} />

              {occupied || tenant ? (
                <>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1 mt-5">Inquilino</h3>
                  <Row label="Nombre" value={tenantName} />
                  <Row label="DNI" value={tenant?.dni} />
                  <Row label="Teléfono" value={tenant?.phone} />
                  <Row label="Email" value={tenant?.user?.email || tenant?.email} />

                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1 mt-5">Contrato</h3>
                  <Row label="N° de contrato" value={room.contractNumber || order?.contractNumber} />
                  <Row label="Desde" value={fmtDate(start)} />
                  <Row label="Antigüedad" value={months != null ? `${months} mes(es)` : '—'} />
                  <div className="flex justify-between items-center gap-4 py-1.5">
                    <span className="text-sm text-gray-500">Estado (credencial)</span>
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${badge.cls}`}>{badge.label}</span>
                  </div>
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-800">
                      <input type="checkbox" checked={debt} onChange={(e) => setDebt(e.target.checked)} />
                      Marcar manualmente como que debe
                    </label>
                    <input value={debtNote} onChange={(e) => setDebtNote(e.target.value)} placeholder="Nota (opcional): ej. debe mayo" className="w-full mt-2 border border-gray-300 rounded px-2 py-1.5 text-sm" />
                    <div className="mt-2 flex items-center gap-2">
                      <button onClick={saveDebt} disabled={saving} className="px-3 py-1.5 bg-violet-700 text-white rounded text-sm font-semibold disabled:opacity-50">{saving ? 'Guardando...' : 'Guardar'}</button>
                      {saved && <span className="text-sm text-green-700">Guardado</span>}
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-500 mt-5">Esta baulera está {cfg.label.toLowerCase()} — sin inquilino asignado.</p>
              )}
              {room.status !== "occupied" && (
                <div className="mt-5 p-3 bg-gray-50 rounded-lg">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Bloqueo</h3>
                  {room.status === "blocked" ? (
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-gray-700">Bloqueada{room.blockedUntil ? " hasta " + fmtDate(room.blockedUntil) : " (indefinida)"}</span>
                      <button onClick={() => cambiarBloqueo("available", null)} disabled={savingBlock} className="px-3 py-1.5 bg-green-600 text-white rounded text-sm font-semibold disabled:opacity-50">{savingBlock ? "..." : "Desbloquear"}</button>
                    </div>
                  ) : !blockOpen ? (
                    <button onClick={() => setBlockOpen(true)} className="px-3 py-1.5 bg-gray-700 text-white rounded text-sm font-semibold">Bloquear baulera</button>
                  ) : (
                    <div>
                      <label className="flex items-center gap-2 text-sm mb-1"><input type="radio" name="bk" checked={blockMode === "indef"} onChange={() => setBlockMode("indef")} /> Indefinida</label>
                      <label className="flex items-center gap-2 text-sm mb-2"><input type="radio" name="bk" checked={blockMode === "fecha"} onChange={() => setBlockMode("fecha")} /> Hasta una fecha</label>
                      {blockMode === "fecha" && <input type="date" value={blockDate} onChange={(e) => setBlockDate(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm mb-2 block" />}
                      <div className="flex gap-2">
                        <button onClick={() => cambiarBloqueo("blocked", blockMode === "fecha" ? blockDate : null)} disabled={savingBlock || (blockMode === "fecha" && !blockDate)} className="px-3 py-1.5 bg-gray-700 text-white rounded text-sm font-semibold disabled:opacity-50">{savingBlock ? "Guardando..." : "Confirmar bloqueo"}</button>
                        <button onClick={() => setBlockOpen(false)} className="px-3 py-1.5 text-gray-600 text-sm">Cancelar</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
