import { useState, useEffect, useMemo } from 'react';
import { getAllStorageRoomsServices, getStorageRoomByIdServices, updateStorageRoomServices } from '../../services/storageRoom.services';
import { getAllBranchesServices } from '../../services/branch.services';
import { getOrdersByCustomerIdServices } from '../../services/order.services';
import { updateCustomerServices } from '../../services/customer.services';
import { getCobrosRechazadosServices, type CobroRechazado, type DeudaPendiente } from '../../services/pricing.services';
import { generarDeuda, getAdminReservationById, getAdminReservations, type AdminReservationFull } from '../../services/reservation.admin.services';
import type { StorageRoom, StorageRoomStatus } from '../../types/storageRoom';
import type { Branch } from '../../types/branch';

// Motivos de rechazo de MP en cristiano
function rechazoMotivo(detalle?: string): string {
  const d = (detalle || '').toLowerCase();
  if (d.includes('insufficient')) return 'fondos insuficientes';
  if (d.includes('high_risk')) return 'rechazado por riesgo';
  if (d.includes('card_disabled')) return 'tarjeta deshabilitada';
  if (d.includes('expired')) return 'tarjeta vencida';
  return detalle || 'rechazado';
}

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
  const [sizeOpen, setSizeOpen] = useState(false);
  const [selectedM2, setSelectedM2] = useState<string | null>(null);
  const [rechazados, setRechazados] = useState<CobroRechazado[]>([]);
  const [plazoDias, setPlazoDias] = useState(10);

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
    // Pagos rechazados (MP) + DEUDAS con link enviado: titilan en el plano (cache 10 min server;
    // las deudas se leen frescas). deudasPendientes = fuente PERSISTENTE del violeta (antes se
    // derivaba de rebillAt del flujo viejo → no sobrevivía al reload y podía duplicar el link).
    getCobrosRechazadosServices()
      .then((r) => {
        setRechazados(r.rechazados || []);
        setPlazoDias(r.plazoDias || 10);
        const dm = new Map<string, DeudaPendiente>();
        (r.deudasPendientes || []).forEach((d) => dm.set(String(d.baulera).trim().toUpperCase(), d));
        setRecobros(dm);
      })
      .catch(() => { /* sin datos de rechazos; el inventario carga igual */ });
  }, []);

  // baulera (space) -> rechazo. Mismos códigos que storageRooms.space (misma fuente).
  const rechazoByCode = useMemo(() => {
    const m = new Map<string, CobroRechazado>();
    for (const r of rechazados) m.set(String(r.baulera).trim().toUpperCase(), r);
    return m;
  }, [rechazados]);
  const rechazoDe = (room: StorageRoom) => rechazoByCode.get(String(room.space || '').trim().toUpperCase());

  // DEUDAS con link ENVIADO y aún sin pagar → titilan VIOLETA. Vienen del backend (deudasPendientes),
  // persistente: sobrevive al reload y trae el link vigente (así no se genera un 2° link = doble cobro).
  const [recobros, setRecobros] = useState<Map<string, DeudaPendiente>>(new Map());
  const recobroDe = (room: StorageRoom) => recobros.get(String(room.space || '').trim().toUpperCase());

  const reload = async () => {
    try { const r = await getAllStorageRoomsServices({ limit: 1000 }); setRooms(r.data); } catch (e) { /* */ }
  };

  const openDetail = async (room: StorageRoom) => {
    const rechazo = rechazoDe(room) || null;
    const deudaPendiente = recobroDe(room) || null;
    setDetail({ room, tenant: null, order: null, rechazo, deudaPendiente });
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
      // Reserva vinculada (para mostrar si YA se envió un link de recobro y si lo pagó).
      let resv: AdminReservationFull | null = null;
      try {
        if (full?.reservationId) {
          resv = await getAdminReservationById(String(full.reservationId));
        } else if (full?.status === 'occupied') {
          // Legacy sin reservationId en la baulera: buscar por baulera/room en las reservas.
          const rl = await getAdminReservations({ limit: 200 });
          const hit = (rl.data || []).find((x: any) => x.storageRoomId === full.id || (x.bauleraCodigo && x.bauleraCodigo === full.space));
          if (hit) resv = await getAdminReservationById(hit.id);
        }
      } catch { /* sin reserva vinculada */ }
      setDetail({ room: full, tenant, order, rechazo, resv, deudaPendiente: recobroDe(room) || null });
    } catch {
      setDetail({ room, tenant: null, order: null, rechazo, error: true, deudaPendiente: recobroDe(room) || null });
    } finally {
      setDetailLoading(false);
    }
  };

  const branchFiltered = useMemo(
    () => selectedBranchId !== null
      ? rooms.filter(r => (((r as unknown) as { branchId?: string }).branchId ?? r.building?.branch?.id) === selectedBranchId)
      : rooms,
    [rooms, selectedBranchId],
  );

  // Tamaños (m²) que existen en el inventario de la sucursal, con cuántas bauleras hay de cada uno.
  const sizes = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of branchFiltered) {
      const k = String(r.areaM2 ?? '').trim();
      if (!k || Number(k) <= 0) continue; // excluye bauleras con m² 0 / sin cargar
      m.set(k, (m.get(k) || 0) + 1);
    }
    return Array.from(m.entries()).sort((a, b) => Number(a[0]) - Number(b[0]));
  }, [branchFiltered]);

  // Búsqueda por CLIENTE o código de baulera (además del filtro por m²) — pedido Lucas 13/07.
  const [buscarCliente, setBuscarCliente] = useState('');
  const filtered = useMemo(() => {
    let list = selectedM2 ? branchFiltered.filter(r => String(r.areaM2 ?? '').trim() === selectedM2) : branchFiltered;
    const q = buscarCliente.trim().toLowerCase();
    if (q) {
      list = list.filter(r =>
        String((r as any).currentTenant || '').toLowerCase().includes(q) ||
        String(r.space || (r as any).name || '').toLowerCase().includes(q));
    }
    return list;
  }, [branchFiltered, selectedM2, buscarCliente]);

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
        <div className="flex items-center gap-2 flex-wrap">
          {/* Búsqueda por cliente / baulera */}
          <input
            type="text"
            value={buscarCliente}
            onChange={(e) => setBuscarCliente(e.target.value)}
            placeholder="Buscar cliente o baulera…"
            className={`border rounded-lg px-3 py-2 text-sm w-56 ${buscarCliente ? 'border-green-500' : 'border-gray-300'}`}
          />

          {/* Filtro por tamaño (m²) — lista desplegable con los tamaños del inventario */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setSizeOpen(o => !o)}
              className={`border rounded-lg px-3 py-2 text-sm bg-white flex items-center gap-2 ${selectedM2 ? 'border-green-500 text-green-700 font-semibold' : 'border-gray-300 text-gray-700'}`}
            >
              {selectedM2 ? `Tamaño: ${selectedM2} m²` : 'Filtrar por tamaño'}
              {selectedM2
                ? <span onClick={(e) => { e.stopPropagation(); setSelectedM2(null); setSizeOpen(false); }} className="text-gray-400 hover:text-gray-700" title="Quitar filtro">✕</span>
                : <span className={`text-gray-400 transition-transform ${sizeOpen ? 'rotate-180' : ''}`}>▾</span>}
            </button>
            {sizeOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setSizeOpen(false)} />
                <div className="absolute right-0 mt-1 w-52 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-80 overflow-y-auto py-1">
                  <button
                    type="button"
                    onClick={() => { setSelectedM2(null); setSizeOpen(false); }}
                    className={`w-full flex justify-between items-center px-3 py-2 text-sm hover:bg-gray-50 ${!selectedM2 ? 'font-semibold text-green-700' : 'text-gray-700'}`}
                  >
                    <span>Todos los tamaños</span>
                    <span className="text-xs text-gray-400">{branchFiltered.length}</span>
                  </button>
                  {sizes.length === 0 && <p className="px-3 py-2 text-sm text-gray-400">Sin tamaños</p>}
                  {sizes.map(([m2, count]) => (
                    <button
                      key={m2}
                      type="button"
                      onClick={() => { setSelectedM2(m2); setSizeOpen(false); }}
                      className={`w-full flex justify-between items-center px-3 py-2 text-sm hover:bg-gray-50 ${selectedM2 === m2 ? 'font-semibold text-green-700 bg-green-50' : 'text-gray-700'}`}
                    >
                      <span>{m2} m²</span>
                      <span className="text-xs text-gray-400">{count} baulera{count !== 1 ? 's' : ''}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
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
      </div>

      {/* Alerta de pagos rechazados (MP) */}
      {rechazados.length > 0 && (
        <div className="mb-4 border border-red-300 bg-red-50 rounded-xl px-4 py-3 flex items-start gap-3">
          <span className="titila text-xl leading-none mt-0.5">🚨</span>
          <div className="text-sm text-red-800">
            <b>{rechazados.length} pago{rechazados.length !== 1 ? 's' : ''} rechazado{rechazados.length !== 1 ? 's' : ''} en Mercado Pago</b>
            {' — '}las bauleras titilan en el plano (tocá una para ver el detalle). Plazo para regularizar: {plazoDias} días.
            <span className="block mt-0.5 text-red-700">
              {rechazados.map(r => `${r.baulera} (${r.cliente}${r.vencido ? ' · VENCIDO' : ` · quedan ${r.diasRestantes}d`})`).join(' · ')}
            </span>
          </div>
        </div>
      )}

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
        {rechazados.length > 0 && (
          <>
            <div className="flex items-center gap-1.5 text-sm text-gray-600">
              <div className="w-3 h-3 rounded-sm bg-orange-500 titila" />
              Pago rechazado (en plazo)
            </div>
            <div className="flex items-center gap-1.5 text-sm text-gray-600">
              <div className="w-3 h-3 rounded-sm bg-red-600 titila" />
              Pago rechazado (plazo vencido)
            </div>
          </>
        )}
        {recobros.size > 0 && (
          <div className="flex items-center gap-1.5 text-sm text-gray-600">
            <div className="w-3 h-3 rounded-sm bg-violet-500 titila" />
            Recobro en curso (link enviado)
          </div>
        )}
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
                      {floorRooms.map(room => <UnitCell key={room.id} room={room} rechazo={rechazoDe(room)} recobro={recobroDe(room)} onClick={() => openDetail(room)} />)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {detail && (
        <RoomDetailModal detail={detail} loading={detailLoading} onClose={() => setDetail(null)} onChanged={() => { setDetail(null); reload(); }}
          onRebilled={() => {
            // Refetch: el backend invalidó el cache al generar la deuda → deudasPendientes trae el
            // link vigente y la baulera pasa a violeta (persistente, sin duplicar el link).
            getCobrosRechazadosServices()
              .then((r) => {
                setRechazados(r.rechazados || []);
                const dm = new Map<string, DeudaPendiente>();
                (r.deudasPendientes || []).forEach((d) => dm.set(String(d.baulera).trim().toUpperCase(), d));
                setRecobros(dm);
              })
              .catch(() => { /* */ });
          }} />
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

function UnitCell({ room, rechazo, recobro, onClick }: { room: StorageRoom; rechazo?: CobroRechazado; recobro?: DeudaPendiente; onClick: () => void }) {
  const cfg = STATUS_CONFIG[room.status] ?? STATUS_CONFIG.available;
  const diasRecobro = recobro ? Math.floor((Date.now() - Date.parse(recobro.sentAt)) / 86400000) : 0;
  // Prioridad: si YA hay un pago único enviado (recobro/deuda pendiente) → VIOLETA (falta que pague).
  // Si no, rechazado → naranja intento 1-2 / rojo intento 3-4 (SPEC §7: por N° de intento, no por plazo).
  const intento = rechazo?.reintentos ?? 0;
  const rojo = intento >= 3;
  const estado: 'recobro' | 'rojo' | 'naranja' | null = recobro ? 'recobro' : rechazo ? (rojo ? 'rojo' : 'naranja') : null;
  const cls = estado === 'recobro' ? 'bg-violet-100 border-violet-500 hover:bg-violet-200 titila'
    : estado === 'rojo' ? 'bg-red-200 border-red-600 hover:bg-red-300 titila'
    : estado === 'naranja' ? 'bg-orange-100 border-orange-500 hover:bg-orange-200 titila'
    : '';
  const title = estado === 'recobro'
    ? `${room.space} · RECOBRO EN CURSO (link enviado ${diasRecobro <= 0 ? 'hoy' : `hace ${diasRecobro} día${diasRecobro === 1 ? '' : 's'}`}, falta que pague) — tocá para ver`
    : rechazo
      ? `${room.space} · PAGO RECHAZADO (intento ${intento || '?'}${rechazo.vencido ? ', plazo VENCIDO' : rechazo.diasRestantes != null ? `, quedan ${rechazo.diasRestantes} días` : ''}) — tocá para ver`
      : `${room.space} · ${cfg.label}${room.areaM2 ? ' · ' + room.areaM2 + ' m²' : ''} — tocá para ver detalle`;
  const inkCls = estado === 'recobro' ? 'text-violet-800' : estado === 'rojo' ? 'text-red-900' : estado === 'naranja' ? 'text-orange-800' : cfg.cellText;
  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-14 h-14 rounded-lg border-2 flex flex-col items-center justify-center cursor-pointer select-none transition-colors ${cls || cfg.cellBg}`}
    >
      <span className={`text-[11px] font-bold leading-tight ${inkCls}`}>{room.space}</span>
      {estado === 'recobro' ? (
        <span className="text-[9px] leading-tight font-bold text-violet-700">$ ⟳</span>
      ) : rechazo ? (
        <span className={`text-[9px] leading-tight font-bold ${rojo ? 'text-red-800' : 'text-orange-700'}`}>$ !</span>
      ) : room.areaM2 ? (
        <span className={`text-[9px] leading-tight ${cfg.cellText} opacity-60`}>{room.areaM2}m²</span>
      ) : null}
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

function RoomDetailModal({ detail, loading, onClose, onChanged, onRebilled }: { detail: any; loading: boolean; onClose: () => void; onChanged?: () => void; onRebilled?: () => void }) {
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
  const [blockNote, setBlockNote] = useState('');
  const [savingBlock, setSavingBlock] = useState(false);
  // Reenvío de link de cobro: con rechazo detectado usa sus datos; MANUAL (sin rechazo, ej:
  // MP muestra el rechazo pero acá no titila) usa la ficha y el backend busca la sub vieja.
  const [rebillState, setRebillState] = useState<{ loading?: boolean; link?: string; email?: string; err?: string; warn?: string }>({});
  // TIPO de cobro (SPEC §5.3): 'mes_adeudado' (deuda de un mes rechazado) o 'proporcional'
  // (alineación / gap del mes gratis). Define el mensaje pre-escrito. Ambos = PAGO ÚNICO.
  const [tipoDeuda, setTipoDeuda] = useState<'mes_adeudado' | 'proporcional'>('mes_adeudado');
  // MONTO del link: visible y EDITABLE antes de mandar (pedido Lucas: "el importe correcto").
  // Prefijado con el débito RECHAZADO real de MP si existe; si no, el precio de la ficha.
  const montoSugerido = Number((detail.rechazo as Partial<CobroRechazado> | null)?.monto || (detail.resv as AdminReservationFull | null)?.monthly || room.price) || 0;
  const [montoLink, setMontoLink] = useState<string>('');
  useEffect(() => { setMontoLink(montoSugerido > 0 ? String(montoSugerido) : ''); }, [detail]);
  const rebillParams = () => {
    const r = (detail.rechazo || {}) as Partial<CobroRechazado>;
    return {
      bauleraCodigo: String(r.baulera || room.space || '').trim(),
      monto: Number(montoLink) > 0 ? Number(montoLink) : 0,
      tipo: tipoDeuda,
      periodo: (r as { periodo?: string }).periodo || undefined,
      email: String(r.email || tenant?.email || tenant?.user?.email || resv?.customerEmail || '').trim().toLowerCase(),
      cliente: String(r.cliente || tenantName || '').trim() || undefined,
      reservationId: resv?.id,
    };
  };
  const confirmMsg = (p: ReturnType<typeof rebillParams>, conWsp: boolean) =>
    `¿${conWsp ? 'Generar link y abrir WhatsApp' : 'Generar link de cobro'} para ${p.cliente || p.email || 'este cliente'}?\n\n` +
    `• Es un PAGO ÚNICO ${p.tipo === 'proporcional' ? '(proporcional de alineación)' : '(mes adeudado)'} de $${Number(p.monto).toLocaleString('es-AR')}\n` +
    `• NO se toca la suscripción del cliente — sigue viva y cobra el mes que viene sola\n` +
    `• Se manda por mail${conWsp ? '\n• WhatsApp se abre con el mensaje de cobranza listo' : ''}\n` +
    `• Cuando lo pague, la baulera deja de titilar (queda al día)`;
  const applyResult = (out: Awaited<ReturnType<typeof generarDeuda>>) => {
    setRebillState({ link: out.initPoint, email: out.email });
    if (onRebilled) onRebilled(); // refetch → la baulera pasa a violeta (deuda con link enviado)
  };
  // WhatsApp de cobranza (texto de Lucas): chat del cliente con el mensaje armado
  // (nombre + mes rechazado + link). Si no hay teléfono cargado, abre el selector de chat.
  const waUrl = (link: string) => {
    // Tolerante a que la baulera YA no figure rechazada (ej: reabrir el modal días después):
    // usa los datos del rechazo si están, si no el inquilino y el mes actual.
    const r = (detail.rechazo || {}) as Partial<CobroRechazado>;
    const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const mesIdx = Number(String(r.fechaRechazo || '').split('-')[1]) - 1;
    const mes = MESES[mesIdx] ?? MESES[new Date().getMonth()];
    const nombre = String(r.cliente || tenantName || '').trim().split(' ')[0] || '';
    const texto = `Hola ${nombre}, como estas?\nTe contacto debido a que no se pudo debitar el pago correspondiente al mes de ${mes}.\nMercado Pago hizo 4 intentos de cobro, en un lapso de 10 dias, pero no se pudo realizar el cobro.\nPara regularizar el saldo pendiente te envio un link de pago. Por favor, cuando realices el pago, envianos el comprobante:\n${link}`;
    const telRaw = String((tenant && (tenant.phone || tenant.user?.phone)) || '').replace(/\D/g, '');
    const tel = telRaw ? (telRaw.startsWith('54') ? telRaw : `549${telRaw.replace(/^0/, '').replace(/^15/, '')}`) : '';
    return tel
      ? `https://wa.me/${tel}?text=${encodeURIComponent(texto)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`;
  };
  // Botón WhatsApp SIEMPRE visible: si el link ya se generó lo usa; si no, lo genera primero
  // (mismo reenvío: cancela la sub rechazada + mail) y abre WhatsApp con el mensaje listo.
  const validarDeuda = (p: ReturnType<typeof rebillParams>): boolean => {
    if (!(p.monto > 0)) { setRebillState({ err: 'Poné el monto antes de mandar.' }); return false; }
    if (!p.email) { setRebillState({ err: 'Falta el email del cliente para mandarle el link.' }); return false; }
    if (!p.bauleraCodigo) { setRebillState({ err: 'Sin código de baulera.' }); return false; }
    return true;
  };
  const abrirWhatsApp = async () => {
    if (rebillState.link) { window.open(waUrl(rebillState.link), '_blank'); return; }
    const p = rebillParams();
    if (!validarDeuda(p)) return;
    if (!window.confirm(confirmMsg(p, true))) return;
    // Reservar la pestaña ANTES del await (si no, el bloqueador de pop-ups la mata)
    const w = window.open('about:blank', '_blank');
    setRebillState({ loading: true });
    try {
      const out = await generarDeuda(p);
      applyResult(out);
      const url = waUrl(out.initPoint || '');
      if (w) w.location.href = url; else window.open(url, '_blank');
    } catch (e: any) {
      if (w) w.close();
      setRebillState({ err: e?.response?.data?.error || 'No se pudo generar el link' });
    }
  };
  const reenviarLink = async () => {
    const p = rebillParams();
    if (!validarDeuda(p)) return;
    if (!window.confirm(confirmMsg(p, false))) return;
    setRebillState({ loading: true });
    try { applyResult(await generarDeuda(p)); }
    catch (e: any) { setRebillState({ err: e?.response?.data?.error || 'No se pudo generar el link' }); }
  };
  const cambiarBloqueo = async (st: string, until: string | null) => {
    setSavingBlock(true);
    try { await updateStorageRoomServices(room.id as any, { status: st, blockedUntil: until, blockReason: st === 'blocked' ? (blockNote.trim() || 'Bloqueo manual') : null } as any); if (onChanged) onChanged(); }
    catch (e) { /* */ } finally { setSavingBlock(false); }
  };
  const saveDebt = async () => {
    if (!tenant || !tenant.id) return;
    setSaving(true); setSaved(false);
    try { await updateCustomerServices(tenant.id as any, { manualDebt: debt, debtNote, debtUpdatedAt: new Date().toISOString() } as any); setSaved(true); } catch (e) { /* */ } finally { setSaving(false); }
  };
  const tenantName = tenant ? (tenant.fullName || `${tenant.user?.firstName || tenant.firstName || ''} ${tenant.user?.lastName || tenant.lastName || ''}`.trim()) : (room.currentTenant || null);

  // ¿YA hay un pago único ENVIADO y sin pagar? deudaPendiente = fuente PERSISTENTE del backend
  // (o rebillState.link si se acaba de generar). Es el GUARD anti-doble-link: si hay uno vivo, se
  // muestra ese en vez del formulario de generación (antes colgaba de rebillAt → no persistía y
  // se podía generar un 2° link = doble cobro).
  const resv: AdminReservationFull | null = detail.resv || null;
  const deudaPend: DeudaPendiente | null = detail.deudaPendiente || null;
  const recobroEnviado = !!deudaPend || !!rebillState.link;
  const recobroLink = rebillState.link || deudaPend?.initPoint || '';
  const fechaEnvio = deudaPend ? new Date(deudaPend.sentAt).toLocaleDateString('es-AR') : '';
  const diasRebill = deudaPend ? Math.floor((Date.now() - Date.parse(deudaPend.sentAt)) / 86400000) : 0;
  const haceRebillTxt = diasRebill <= 0 ? 'hoy' : `hace ${diasRebill} día${diasRebill === 1 ? '' : 's'}`;

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

              {detail.rechazo && (
                <div className={`mb-4 rounded-lg border px-3 py-2.5 ${detail.rechazo.vencido ? 'bg-red-50 border-red-400' : 'bg-orange-50 border-orange-400'}`}>
                  <p className={`text-sm font-bold flex items-center gap-1.5 ${detail.rechazo.vencido ? 'text-red-800' : 'text-orange-800'}`}>
                    <span className="titila">🚨</span> Pago rechazado
                  </p>
                  <p className={`text-xs mt-1 ${detail.rechazo.vencido ? 'text-red-700' : 'text-orange-700'}`}>
                    {/* fecha YYYY-MM-DD mostrada tal cual (sin new Date: el parse UTC la corre un día en ART) */}
                    El débito de <b>${Number(detail.rechazo.monto).toLocaleString('es-AR')}</b> fue rechazado el <b>{String(detail.rechazo.fechaRechazo).split('-').reverse().join('/')}</b>
                    {' '}({rechazoMotivo(detail.rechazo.mpDetalle)}).
                    {detail.rechazo.reintentos != null && <> MP hizo <b>{detail.rechazo.reintentos}</b> intento{detail.rechazo.reintentos === 1 ? '' : 's'} de cobro.</>}
                  </p>
                  <p className={`text-xs mt-1 font-semibold ${detail.rechazo.vencido ? 'text-red-800' : 'text-orange-800'}`}>
                    {detail.rechazo.vencido
                      ? `⏰ PLAZO VENCIDO — pasaron ${detail.rechazo.diasTranscurridos} días (el plazo para regularizar era de 10).`
                      : `Le quedan ${detail.rechazo.diasRestantes} día(s) para regularizar (plazo de 10 días — MP reintenta el débito).`}
                  </p>
                  {/* GUARD anti-doble-link: alcanza con que HAYA una deuda pendiente (recobroEnviado),
                      no que tenga link. Si la deuda existe pero el initPoint vino vacío, NO se muestra
                      el formulario de generación (crearía un 2° cobro) — se avisa que ya hay uno. */}
                  {(rebillState.link || recobroEnviado) ? (
                    <div className="mt-2 rounded-md bg-green-50 border border-green-300 px-2.5 py-2">
                      <p className="text-xs font-bold text-green-800">
                        {rebillState.link
                          ? <>✓ Link de pago enviado{rebillState.email ? ` a ${rebillState.email}` : ''} — es un pago único; la suscripción sigue viva.</>
                          : <>✓ YA se le envió un link de pago el <b>{fechaEnvio}</b>{deudaPend?.sentBy ? <> (por {deudaPend.sentBy})</> : null} — no generes otro: reenviale este.</>}
                      </p>
                      {rebillState.warn && <p className="text-[10px] font-bold text-orange-700 mt-1">OJO: {rebillState.warn}</p>}
                      {recobroLink ? (
                        <>
                          <div className="flex gap-1.5 mt-1.5">
                            <input readOnly value={recobroLink} onFocus={(e) => e.target.select()}
                              className="flex-1 text-[10px] border border-green-200 rounded px-1.5 py-1 bg-white text-gray-600" />
                            <button onClick={() => window.open(waUrl(recobroLink), '_blank')} title="Abre WhatsApp con el mensaje de cobranza armado (nombre + mes + link)"
                              className="text-xs font-semibold bg-[#25D366] hover:bg-[#1ebe5b] text-white px-2 py-1 rounded">WhatsApp</button>
                            <button onClick={() => navigator.clipboard?.writeText(recobroLink)}
                              className="text-xs font-semibold bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded">Copiar</button>
                          </div>
                          <p className="text-[10px] text-green-700 mt-1">Cuando el cliente lo pague, la baulera se regulariza sola. WhatsApp abre el chat con el mensaje de cobranza listo.</p>
                        </>
                      ) : (
                        <p className="text-[10px] text-amber-800 bg-amber-50 border border-amber-300 rounded px-1.5 py-1 mt-1.5">
                          Ya hay un <b>pago único pendiente</b> para esta baulera, pero el link no quedó guardado acá. Buscalo en <b>Mercado Pago</b> (Cobros) para reenviarlo — <b>no generes otro</b> o habría doble cobro.
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="mt-2">
                      {rebillState.err && <p className="text-xs text-red-700 font-semibold mb-1">{rebillState.err}</p>}
                      {/* Guarda de 10 días: durante el recycling MP todavía reintenta → si se manda el
                          pago único ahora y justo MP cobra en un reintento, puede haber doble cobro. */}
                      {!detail.rechazo.vencido && detail.rechazo.diasRestantes != null && (
                        <p className="text-[10px] text-amber-800 bg-amber-50 border border-amber-300 rounded px-1.5 py-1 mb-1.5">
                          ⚠ MP todavía reintenta este cobro (quedan {detail.rechazo.diasRestantes} días del plazo de 10). Ideal generar el pago único <b>cuando termine el plazo</b>: si lo mandás ahora y justo MP cobra en un reintento, puede haber doble cobro.
                        </p>
                      )}
                      {/* SPEC §5.3: casilla del tipo de cobro (define el mensaje). Ambos = PAGO ÚNICO. */}
                      <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                        <span className="text-[10px] font-bold text-gray-700">Cobrar:</span>
                        <label className="text-[11px] flex items-center gap-1 cursor-pointer"><input type="radio" name={`tipo-${room.id}`} checked={tipoDeuda === 'mes_adeudado'} onChange={() => setTipoDeuda('mes_adeudado')} /> Mes adeudado</label>
                        <label className="text-[11px] flex items-center gap-1 cursor-pointer"><input type="radio" name={`tipo-${room.id}`} checked={tipoDeuda === 'proporcional'} onChange={() => setTipoDeuda('proporcional')} /> Proporcional (alineación / gap)</label>
                      </div>
                      <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                        <label className="text-[10px] font-bold text-gray-700">Monto del link: $</label>
                        <input type="number" value={montoLink} onChange={(e) => setMontoLink(e.target.value)}
                          className="w-28 text-xs border border-gray-300 rounded px-1.5 py-1" />
                        <span className="text-[10px] text-gray-500">el débito rechazado fue ${Number(detail.rechazo.monto).toLocaleString('es-AR')} — corregilo si debe otra cosa</span>
                      </div>
                      <div className="flex gap-1.5 flex-wrap">
                        <button onClick={reenviarLink} disabled={rebillState.loading}
                          className={`text-xs font-bold px-3 py-1.5 rounded-lg text-white disabled:opacity-50 ${detail.rechazo.vencido ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-600 hover:bg-orange-700'}`}>
                          {rebillState.loading ? 'Generando…' : 'Generar link de pago'}
                        </button>
                        <button onClick={abrirWhatsApp} disabled={rebillState.loading}
                          title="Genera el pago único (si hace falta) y abre WhatsApp con el mensaje de cobranza listo"
                          className="text-xs font-bold px-3 py-1.5 rounded-lg text-white bg-[#25D366] hover:bg-[#1ebe5b] disabled:opacity-50">
                          {rebillState.loading ? '…' : 'Enviar por WhatsApp'}
                        </button>
                      </div>
                      <p className="text-[10px] text-gray-500 mt-1">Genera un <b>PAGO ÚNICO</b> por ese mes — <b>no toca la suscripción</b> (sigue viva y cobra el mes que viene sola) — y lo manda por mail/WhatsApp. Al pagarlo, la baulera deja de titilar (queda al día).</p>
                    </div>
                  )}
                </div>
              )}

              {/* Recobro EN CURSO: link ya enviado y el cliente todavía no pagó (la baulera ya no titila,
                  pero el operador tiene que saber que ese cliente YA tiene un link mandado). */}
              {!detail.rechazo && recobroEnviado && (
                <div className="mb-4 rounded-lg border-2 border-violet-400 bg-violet-50 px-3 py-2.5">
                  <p className="text-sm font-bold text-violet-800">
                    Recobro en curso — link enviado {haceRebillTxt}{diasRebill > 0 ? ' sin pagar' : ''}
                  </p>
                  <p className="text-xs text-violet-700 mt-1">
                    Se le envió un link de <b>pago único</b>{deudaPend ? <> de <b>${Number(deudaPend.monto).toLocaleString('es-AR')}</b></> : null} el <b>{fechaEnvio}</b>{deudaPend?.sentBy ? <> por <b>{deudaPend.sentBy}</b></> : null}.
                    La suscripción <b>sigue viva</b> (no se tocó) y <b>todavía no pagó el link</b>. No generes otro: reenviale este.
                  </p>
                  {recobroLink && (
                    <div className="flex gap-1.5 mt-1.5">
                      <input readOnly value={recobroLink} onFocus={(e) => e.target.select()}
                        className="flex-1 text-[10px] border border-violet-200 rounded px-1.5 py-1 bg-white text-gray-600" />
                      <button onClick={() => window.open(waUrl(recobroLink), '_blank')}
                        className="text-xs font-semibold bg-[#25D366] hover:bg-[#1ebe5b] text-white px-2 py-1 rounded">WhatsApp</button>
                      <button onClick={() => navigator.clipboard?.writeText(recobroLink)}
                        className="text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white px-2 py-1 rounded">Copiar</button>
                    </div>
                  )}
                </div>
              )}

              {/* COBRO MANUAL: MP muestra el rechazo pero acá NO titila (sub sin matchear, pausada,
                  legacy). Se puede reenviar el link igual: el backend busca la sub vieja en MP
                  por código de baulera / email y la cancela para que no cobre doble. */}
              {room.status === 'occupied' && !detail.rechazo && !recobroEnviado && (
                <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
                  {rebillState.link ? (
                    <div className="rounded-md bg-green-50 border border-green-300 px-2.5 py-2">
                      <p className="text-xs font-bold text-green-800">✓ Link de pago enviado{rebillState.email ? ` a ${rebillState.email}` : ''}.</p>
                      {rebillState.warn && <p className="text-[10px] font-bold text-orange-700 mt-1">OJO: {rebillState.warn}</p>}
                      <div className="flex gap-1.5 mt-1.5">
                        <input readOnly value={rebillState.link} onFocus={(e) => e.target.select()}
                          className="flex-1 text-[10px] border border-green-200 rounded px-1.5 py-1 bg-white text-gray-600" />
                        <button onClick={() => window.open(waUrl(rebillState.link!), '_blank')}
                          className="text-xs font-semibold bg-[#25D366] hover:bg-[#1ebe5b] text-white px-2 py-1 rounded">WhatsApp</button>
                        <button onClick={() => navigator.clipboard?.writeText(rebillState.link!)}
                          className="text-xs font-semibold bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded">Copiar</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-xs font-semibold text-gray-700">Cobro manual (PAGO ÚNICO) — mes adeudado o proporcional de alineación. No toca la suscripción.</p>
                      {rebillState.err && <p className="text-xs text-red-700 font-semibold mt-1">{rebillState.err}</p>}
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <span className="text-[10px] font-bold text-gray-700">Cobrar:</span>
                        <label className="text-[11px] flex items-center gap-1 cursor-pointer"><input type="radio" name={`tipom-${room.id}`} checked={tipoDeuda === 'mes_adeudado'} onChange={() => setTipoDeuda('mes_adeudado')} /> Mes adeudado</label>
                        <label className="text-[11px] flex items-center gap-1 cursor-pointer"><input type="radio" name={`tipom-${room.id}`} checked={tipoDeuda === 'proporcional'} onChange={() => setTipoDeuda('proporcional')} /> Proporcional (alineación / gap)</label>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        <label className="text-[10px] font-bold text-gray-700">Monto del link: $</label>
                        <input type="number" value={montoLink} onChange={(e) => setMontoLink(e.target.value)}
                          className="w-28 text-xs border border-gray-300 rounded px-1.5 py-1" />
                        <span className="text-[10px] text-orange-700 font-semibold">VERIFICÁ el monto (acá está el precio de ficha, puede diferir)</span>
                      </div>
                      <div className="flex gap-1.5 mt-1.5 flex-wrap">
                        <button onClick={reenviarLink} disabled={rebillState.loading}
                          className="text-xs font-bold px-3 py-1.5 rounded-lg text-white bg-gray-700 hover:bg-gray-800 disabled:opacity-50">
                          {rebillState.loading ? 'Generando…' : 'Generar link de pago'}
                        </button>
                        <button onClick={abrirWhatsApp} disabled={rebillState.loading}
                          className="text-xs font-bold px-3 py-1.5 rounded-lg text-white bg-[#25D366] hover:bg-[#1ebe5b] disabled:opacity-50">
                          {rebillState.loading ? '…' : 'Enviar por WhatsApp'}
                        </button>
                      </div>
                      <p className="text-[10px] text-gray-500 mt-1">Busca y cancela su suscripción actual en MP (si existe — no cobra doble), genera un link nuevo para esta baulera y lo manda por mail.</p>
                    </>
                  )}
                </div>
              )}

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
                      <span className="text-sm text-gray-700">Bloqueada{room.blockedUntil ? " hasta " + fmtDate(room.blockedUntil) : " (indefinida)"}{(room as any).blockReason && (room as any).blockReason !== 'Bloqueo manual' ? " · " + (room as any).blockReason : ""}</span>
                      <button onClick={() => cambiarBloqueo("available", null)} disabled={savingBlock} className="px-3 py-1.5 bg-green-600 text-white rounded text-sm font-semibold disabled:opacity-50">{savingBlock ? "..." : "Desbloquear"}</button>
                    </div>
                  ) : !blockOpen ? (
                    <button onClick={() => setBlockOpen(true)} className="px-3 py-1.5 bg-gray-700 text-white rounded text-sm font-semibold">Bloquear baulera</button>
                  ) : (
                    <div>
                      <label className="flex items-center gap-2 text-sm mb-1"><input type="radio" name="bk" checked={blockMode === "indef"} onChange={() => setBlockMode("indef")} /> Indefinida</label>
                      <label className="flex items-center gap-2 text-sm mb-2"><input type="radio" name="bk" checked={blockMode === "fecha"} onChange={() => setBlockMode("fecha")} /> Hasta una fecha</label>
                      {blockMode === "fecha" && <input type="date" value={blockDate} onChange={(e) => setBlockDate(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm mb-2 block" />}
                      <input value={blockNote} onChange={(e) => setBlockNote(e.target.value)} placeholder="Motivo del bloqueo (ej. mantenimiento, reservada)" className="border border-gray-300 rounded px-2 py-1.5 text-sm mb-2 block w-full" />
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
