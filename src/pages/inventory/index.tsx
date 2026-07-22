import { useState, useEffect, useMemo } from 'react';
import { getAllStorageRoomsServices, getStorageRoomByIdServices, updateStorageRoomServices, updateRoomTenantServices } from '../../services/storageRoom.services';
import { getAllBranchesServices } from '../../services/branch.services';
import { getOrdersByCustomerIdServices } from '../../services/order.services';
import { updateCustomerServices } from '../../services/customer.services';
import { getCobrosRechazadosServices, type CobroRechazado, type DeudaPendiente, type DeudaPagada, type GapPendiente } from '../../services/pricing.services';
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
    cargarCobros();
  }, []);

  // ÚNICA función de refresco de rechazados/deudas/gaps (auditoría integridad 16/07: antes el
  // mount y onRebilled tenían copias distintas y onChanged no refrescaba nada de esto → los
  // titileos violeta/celeste quedaban viejos tras completar datos/bloquear/pagar).
  const cargarCobros = () => {
    getCobrosRechazadosServices()
      .then((r) => {
        setRechazados(r.rechazados || []);
        setPlazoDias(r.plazoDias || 10);
        const dm = new Map<string, DeudaPendiente>();
        (r.deudasPendientes || []).forEach((d) => dm.set(String(d.baulera).trim().toUpperCase(), d));
        setRecobros(dm);
        // Deudas PAGADAS (queda asentado "✓ Pagó deuda" en la ficha) + GAPs sin cobrar (celeste)
        const pm = new Map<string, DeudaPagada[]>();
        (r.deudasPagadas || []).forEach((d) => {
          const k = String(d.baulera).trim().toUpperCase();
          if (!pm.has(k)) pm.set(k, []);
          pm.get(k)!.push(d);
        });
        setPagadas(pm);
        const gm = new Map<string, GapPendiente>();
        (r.gapsPendientes || []).forEach((g) => { if (g.baulera) gm.set(String(g.baulera).trim().toUpperCase(), g); });
        setGapsPend(gm);
      })
      .catch(() => { /* sin datos de rechazos; el inventario carga igual */ });
  };

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
  // DEUDAS PAGADAS: quedan asentadas en la ficha ("✓ Pagó deuda") — el rastro visible de qué se cobró.
  const [pagadas, setPagadas] = useState<Map<string, DeudaPagada[]>>(new Map());
  const pagadasDe = (room: StorageRoom) => pagadas.get(String(room.space || '').trim().toUpperCase()) || [];
  // GAPs del mes gratis SIN cobrar (proporcional diferido) → marcan CELESTE (plata pendiente de cobrar).
  const [gapsPend, setGapsPend] = useState<Map<string, GapPendiente>>(new Map());
  const gapPendDe = (room: StorageRoom) => gapsPend.get(String(room.space || '').trim().toUpperCase());

  const reload = async () => {
    try { const r = await getAllStorageRoomsServices({ limit: 1000 }); setRooms(r.data); } catch (e) { /* */ }
  };

  const openDetail = async (room: StorageRoom) => {
    const rechazo = rechazoDe(room) || null;
    const deudaPendiente = recobroDe(room) || null;
    const deudasPagadas = pagadasDe(room);
    const gapPendiente = gapPendDe(room) || null;
    setDetail({ room, tenant: null, order: null, rechazo, deudaPendiente, deudasPagadas, gapPendiente });
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
      setDetail({ room: full, tenant, order, rechazo, resv, deudaPendiente: recobroDe(room) || null, deudasPagadas, gapPendiente });
    } catch {
      setDetail({ room, tenant: null, order: null, rechazo, error: true, deudaPendiente: recobroDe(room) || null, deudasPagadas, gapPendiente });
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
            {/* Leyenda alineada a la semántica REAL de las celdas (SPEC §7: por N° de intento) */}
            <div className="flex items-center gap-1.5 text-sm text-gray-600">
              <div className="w-3 h-3 rounded-sm bg-orange-500 titila" />
              Rechazado (intento 1-2 · MP reintenta)
            </div>
            <div className="flex items-center gap-1.5 text-sm text-gray-600">
              <div className="w-3 h-3 rounded-sm bg-red-600 titila" />
              Rechazado (intento 3-4 · por vencerse)
            </div>
          </>
        )}
        {recobros.size > 0 && (
          <div className="flex items-center gap-1.5 text-sm text-gray-600">
            <div className="w-3 h-3 rounded-sm bg-violet-500 titila" />
            Recobro en curso (link enviado)
          </div>
        )}
        {gapsPend.size > 0 && (
          <div className="flex items-center gap-1.5 text-sm text-gray-600">
            <div className="w-3 h-3 rounded-sm bg-sky-500 titila" />
            Proporcional sin cobrar (mes gratis)
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
                      {floorRooms.map(room => <UnitCell key={room.id} room={room} rechazo={rechazoDe(room)} recobro={recobroDe(room)} gapPend={gapPendDe(room)} onClick={() => openDetail(room)} />)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {detail && (
        <RoomDetailModal detail={detail} loading={detailLoading} onClose={() => setDetail(null)}
          onChanged={() => { setDetail(null); reload(); cargarCobros(); }}
          buscarTenant={async (code: string) => {
            // "Copiar de otra baulera": el OPERADOR confirma la identidad (por eso acá sí vale
            // cruzar — no es matcheo automático por nombre); solo le ahorramos el tipeo.
            const c = code.trim().toUpperCase();
            const r = rooms.find((x: any) => String(x.space || '').trim().toUpperCase() === c);
            if (!r) return null;
            const full: any = await getStorageRoomByIdServices(r.id);
            return full?.tenant || null;
          }}
          onRebilled={() => {
            // Refetch UNIFICADO: el backend invalidó el cache al generar la deuda → violeta al
            // toque; y también se refrescan las bauleras (misma función que el mount/onChanged).
            cargarCobros();
            reload();
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

function UnitCell({ room, rechazo, recobro, gapPend, onClick }: { room: StorageRoom; rechazo?: CobroRechazado; recobro?: DeudaPendiente; gapPend?: GapPendiente; onClick: () => void }) {
  const cfg = STATUS_CONFIG[room.status] ?? STATUS_CONFIG.available;
  const diasRecobro = recobro ? Math.floor((Date.now() - Date.parse(recobro.sentAt)) / 86400000) : 0;
  // Prioridad: si YA hay un pago único enviado (recobro/deuda pendiente) → VIOLETA (falta que pague).
  // Si no, rechazado → naranja intento 1-2 / rojo intento 3-4 (SPEC §7: por N° de intento, no por plazo).
  // Si no, GAP del mes gratis sin cobrar → CELESTE (proporcional pendiente de generar/cobrar).
  const intento = rechazo?.reintentos ?? 0;
  const rojo = intento >= 3;
  const estado: 'recobro' | 'rojo' | 'naranja' | 'gap' | null = recobro ? 'recobro' : rechazo ? (rojo ? 'rojo' : 'naranja') : gapPend ? 'gap' : null;
  const cls = estado === 'recobro' ? 'bg-violet-100 border-violet-500 hover:bg-violet-200 titila'
    : estado === 'rojo' ? 'bg-red-200 border-red-600 hover:bg-red-300 titila'
    : estado === 'naranja' ? 'bg-orange-100 border-orange-500 hover:bg-orange-200 titila'
    : estado === 'gap' ? 'bg-sky-100 border-sky-500 hover:bg-sky-200 titila'
    : '';
  const title = estado === 'recobro'
    ? `${room.space} · RECOBRO EN CURSO (link enviado ${diasRecobro <= 0 ? 'hoy' : `hace ${diasRecobro} día${diasRecobro === 1 ? '' : 's'}`}, falta que pague) — tocá para ver`
    : rechazo
      ? `${room.space} · PAGO RECHAZADO (intento ${intento || '?'}${rechazo.vencido ? ', plazo VENCIDO' : rechazo.diasRestantes != null ? `, quedan ${rechazo.diasRestantes} días` : ''}) — tocá para ver`
      : estado === 'gap'
        ? `${room.space} · PROPORCIONAL SIN COBRAR ($${Number(gapPend!.gapAmount).toLocaleString('es-AR')} por ${gapPend!.gapDays} días — de la venta con mes gratis) — tocá para generar el link`
        : `${room.space} · ${cfg.label}${room.areaM2 ? ' · ' + room.areaM2 + ' m²' : ''} — tocá para ver detalle`;
  const inkCls = estado === 'recobro' ? 'text-violet-800' : estado === 'rojo' ? 'text-red-900' : estado === 'naranja' ? 'text-orange-800' : estado === 'gap' ? 'text-sky-800' : cfg.cellText;
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
      ) : estado === 'gap' ? (
        <span className="text-[9px] leading-tight font-bold text-sky-700">$ ◔</span>
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

function RoomDetailModal({ detail, loading, onClose, onChanged, onRebilled, buscarTenant }: { detail: any; loading: boolean; onClose: () => void; onChanged?: () => void; onRebilled?: () => void; buscarTenant?: (code: string) => Promise<any> }) {
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
  // PERÍODO de la deuda, EDITABLE (pedido Lucas 14/07): desde/hasta van al TÍTULO del link que ve
  // el cliente ("Mi Container A0-002 — mes adeudado 01/06 al 30/06"), para que sepa QUÉ mes paga.
  // Si quedan vacíos, el título usa el período del rechazo (o el mes actual) — igual que antes.
  const [deudaDesde, setDeudaDesde] = useState<string>('');
  const [deudaHasta, setDeudaHasta] = useState<string>('');
  useEffect(() => { setDeudaDesde(''); setDeudaHasta(''); }, [detail]);
  // PROPORCIONAL: la cuenta sale SOLA (pedido Lucas 14/07) — días × precio/30. Pre-carga: el gap
  // guardado en la venta (mes gratis diferido) o, si no hay, de HOY al 1° próximo. Días EDITABLES
  // por si es otro período (recalcula el monto al tocarlos).
  const precioMes = Number((detail.resv as AdminReservationFull | null)?.monthly || room.price) || 0;
  const [diasProp, setDiasProp] = useState<string>('');
  useEffect(() => {
    if (tipoDeuda !== 'proporcional') {
      // Al VOLVER a "Mes adeudado": restaurar el monto de la baulera y limpiar el período del
      // proporcional (sin esto quedaba el monto prorrateado y un desde/hasta equivocados en el
      // título del link — auditoría v3 N1).
      setDiasProp('');
      setMontoLink(montoSugerido > 0 ? String(montoSugerido) : '');
      setDeudaDesde(''); setDeudaHasta('');
      return;
    }
    const g = (detail.resv || {}) as any;
    if (Number(g.gapDays) > 0 && Number(g.gapAmount) > 0 && !g.gapInitPoint && !g.gapPaidAt) {
      // Gap del mes gratis calculado en la venta, sin link y SIN PAGAR → pre-cargar tal cual.
      // (si gapPaidAt existe ya se cobró — NO volver a ofrecerlo: doble cobro, auditoría v3 N2)
      setDiasProp(String(g.gapDays)); setMontoLink(String(g.gapAmount));
      if (g.gapDesde) setDeudaDesde(String(g.gapDesde));
      if (g.gapHasta) setDeudaHasta(String(g.gapHasta));
    } else {
      const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
      const prox1 = hoy.getDate() === 1 ? new Date(hoy) : new Date(hoy.getFullYear(), hoy.getMonth() + 1, 1);
      const dias = Math.round((prox1.getTime() - hoy.getTime()) / 86400000);
      setDiasProp(String(dias));
      if (precioMes > 0) setMontoLink(String(Math.round(precioMes * dias / 30)));
      setDeudaDesde(hoy.toISOString().slice(0, 10)); setDeudaHasta(prox1.toISOString().slice(0, 10));
    }
  }, [tipoDeuda, detail]);
  const onDiasProp = (v: string) => {
    setDiasProp(v);
    const d = Number(v);
    if (d > 0 && precioMes > 0) setMontoLink(String(Math.round(precioMes * d / 30)));
  };
  // EMAIL del cliente, EDITABLE (bug real 14/07, A3-012: baulera legacy sin mail en la ficha →
  // "Falta el email" bloqueaba el cobro). Se pre-carga con lo que la ficha resuelva; si no hay,
  // el operador lo escribe y cobra igual.
  const [deudaEmail, setDeudaEmail] = useState<string>('');
  useEffect(() => {
    const r = (detail.rechazo || {}) as Partial<CobroRechazado>;
    const em = String(r.email || tenant?.email || tenant?.user?.email || (detail.resv as AdminReservationFull | null)?.customerEmail || '').trim().toLowerCase();
    setDeudaEmail(em);
  }, [detail]);
  const rebillParams = () => {
    const r = (detail.rechazo || {}) as Partial<CobroRechazado>;
    return {
      bauleraCodigo: String(r.baulera || room.space || '').trim(),
      monto: Number(montoLink) > 0 ? Number(montoLink) : 0,
      tipo: tipoDeuda,
      periodo: (r as { periodo?: string }).periodo || undefined,
      desde: deudaDesde || undefined,
      hasta: deudaHasta || undefined,
      email: deudaEmail.trim().toLowerCase(),
      cliente: String(r.cliente || tenantName || '').trim() || undefined,
      reservationId: resv?.id,
    };
  };
  const confirmMsg = (p: ReturnType<typeof rebillParams>, conWsp: boolean) =>
    `¿${conWsp ? 'Generar link y abrir WhatsApp' : 'Generar link de cobro'} para ${p.cliente || p.email || 'este cliente'}?\n\n` +
    `• Es un PAGO ÚNICO ${p.tipo === 'proporcional' ? '(proporcional de alineación)' : '(mes adeudado)'} de $${Number(p.monto).toLocaleString('es-AR')}\n` +
    (p.desde || p.hasta ? `• Período: ${p.desde ? p.desde.split('-').reverse().join('/') : '…'} al ${p.hasta ? p.hasta.split('-').reverse().join('/') : '…'} (sale en el link)\n` : '') +
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
  // (genera el PAGO ÚNICO vía /deuda — NO toca la suscripción — y abre WhatsApp con el mensaje listo).
  const validarDeuda = (p: ReturnType<typeof rebillParams>): boolean => {
    if (!(p.monto > 0)) { setRebillState({ err: 'Poné el monto antes de mandar.' }); return false; }
    if (!p.email) { setRebillState({ err: 'Falta el email del cliente para mandarle el link.' }); return false; }
    if (!p.bauleraCodigo) { setRebillState({ err: 'Sin código de baulera.' }); return false; }
    return true;
  };
  // GUARD del server (409): ya hay un link de deuda vivo → el backend devuelve ESE link.
  // Se muestra para reenviar en vez de fallar (nunca dos links vivos del mismo mes).
  const linkVivoDe409 = (e: any): boolean => {
    if (e?.response?.status === 409 && e?.response?.data?.initPoint) {
      setRebillState({ link: e.response.data.initPoint, email: e.response.data.email || undefined, warn: e.response.data.error });
      if (onRebilled) onRebilled();
      return true;
    }
    return false;
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
      if (linkVivoDe409(e)) { const url = waUrl(e.response.data.initPoint); if (w) w.location.href = url; else window.open(url, '_blank'); return; }
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
    catch (e: any) { if (linkVivoDe409(e)) return; setRebillState({ err: e?.response?.data?.error || 'No se pudo generar el link' }); }
  };
  // Errores VISIBLES (auditoría integridad 16/07): antes bloqueo y deuda manual tenían catch {}
  // vacío — si el guardado fallaba, el operador creía que quedó y no quedó nada.
  const [blockErr, setBlockErr] = useState('');
  const [saveErr, setSaveErr] = useState('');
  const cambiarBloqueo = async (st: string, until: string | null) => {
    setSavingBlock(true); setBlockErr('');
    try { await updateStorageRoomServices(room.id as any, { status: st, blockedUntil: until, blockReason: st === 'blocked' ? (blockNote.trim() || 'Bloqueo manual') : null } as any); if (onChanged) onChanged(); }
    catch (e: any) { setBlockErr(e?.response?.data?.message || e?.response?.data?.error || 'NO se guardó el cambio de bloqueo — reintentá'); }
    finally { setSavingBlock(false); }
  };
  const saveDebt = async () => {
    setSaving(true); setSaved(false); setSaveErr('');
    try {
      if (tenant && tenant.id) {
        await updateCustomerServices(tenant.id as any, { manualDebt: debt, debtNote, debtUpdatedAt: new Date().toISOString() } as any);
      } else {
        // Baulera legacy SIN customer (auditoría 16/07): antes esto retornaba sin guardar ni avisar
        // — el flag "debe" se leía en el portal del cliente y nunca llegaba. Ahora va por el
        // endpoint de tenant, que crea/actualiza el customer real de la baulera.
        await updateRoomTenantServices(room.id, { manualDebt: debt, debtNote });
      }
      setSaved(true);
    } catch (e: any) { setSaveErr(e?.response?.data?.error || e?.response?.data?.message || 'NO se guardó — reintentá'); }
    finally { setSaving(false); }
  };
  const tenantName = tenant ? (tenant.fullName || `${tenant.user?.firstName || tenant.firstName || ''} ${tenant.user?.lastName || tenant.lastName || ''}`.trim()) : (room.currentTenant || null);
  // COMPLETAR/CORREGIR datos del inquilino (bauleras legacy con datos incompletos — caso Débora A3-012):
  // se cargan una vez desde la ficha y quedan guardados en el cliente real de la baulera.
  const [fixTOpen, setFixTOpen] = useState(false);
  const [fixT, setFixT] = useState({ nombre: '', email: '', telefono: '', dni: '' });
  const [fixTSaving, setFixTSaving] = useState(false);
  const [fixTMsg, setFixTMsg] = useState('');
  useEffect(() => {
    setFixTOpen(false); setFixTMsg('');
    setFixT({
      nombre: String(tenantName || ''),
      email: String(tenant?.user?.email || tenant?.email || ''),
      telefono: String(tenant?.phone || tenant?.user?.phone || ''),
      dni: String(tenant?.dni || ''),
    });
  }, [detail]);
  const guardarInquilino = async () => {
    setFixTSaving(true); setFixTMsg('');
    try {
      await updateRoomTenantServices(room.id, { nombre: fixT.nombre || undefined, email: fixT.email || undefined, telefono: fixT.telefono || undefined, dni: fixT.dni || undefined });
      setFixTMsg('Guardado ✓ — recargá la ficha para verlo');
      if (fixT.email) setDeudaEmail(fixT.email.trim().toLowerCase()); // el cobro lo usa al toque
      if (onChanged) onChanged();
    } catch (e: any) {
      setFixTMsg(e?.response?.data?.error || 'No se pudo guardar');
    } finally { setFixTSaving(false); }
  };
  // "Copiar de otra baulera" (caso Débora: A3-012 sin datos, A1-006 completa — misma persona).
  // El operador escribe el código y confirma la identidad; solo se ahorra el tipeo.
  const [copiaDe, setCopiaDe] = useState('');
  const [copiando, setCopiando] = useState(false);
  const traerDatosDe = async () => {
    if (!buscarTenant || !copiaDe.trim()) return;
    setCopiando(true); setFixTMsg('');
    try {
      const t = await buscarTenant(copiaDe);
      if (!t) { setFixTMsg(`No encontré la baulera ${copiaDe.trim().toUpperCase()}`); return; }
      setFixT({
        nombre: String(t.fullName || `${t.firstName || ''} ${t.lastName || ''}`.trim() || fixT.nombre),
        email: String(t.user?.email || t.email || fixT.email || ''),
        telefono: String(t.phone || t.user?.phone || fixT.telefono || ''),
        dni: String(t.dni || fixT.dni || ''),
      });
      setFixTMsg(`Datos traídos de ${copiaDe.trim().toUpperCase()} — revisá y Guardar`);
    } catch { setFixTMsg('No se pudieron traer los datos'); }
    finally { setCopiando(false); }
  };

  // ¿YA hay un pago único ENVIADO y sin pagar? deudaPendiente = fuente PERSISTENTE del backend
  // (o rebillState.link si se acaba de generar). Es el GUARD anti-doble-link: si hay uno vivo, se
  // muestra ese en vez del formulario de generación (antes colgaba de rebillAt → no persistía y
  // se podía generar un 2° link = doble cobro).
  const resv: AdminReservationFull | null = detail.resv || null;
  const deudaPend: DeudaPendiente | null = detail.deudaPendiente || null;
  // Memoria de cobros (pedido Lucas 15/07): deudas PAGADAS asentadas + gap del mes gratis sin cobrar.
  const deudasPagadas: DeudaPagada[] = detail.deudasPagadas || [];
  const gapPendiente: GapPendiente | null = detail.gapPendiente || null;
  // Link 2 del gap VIVO (generado en la venta, aún sin pagar): avisar en vez de dejar generar otro.
  const gapLink2Vivo = !!(resv?.gapInitPoint && !(resv as any)?.gapPaidAt);
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

              {/* ✓ PAGÓ DEUDA — el registro VISIBLE de los pagos únicos cobrados (Lucas 15/07: pagó
                  Débora el mes adeudado y no quedaba rastro en ningún lado). */}
              {deudasPagadas.length > 0 && (
                <div className="mb-4 rounded-lg border border-green-300 bg-green-50 px-3 py-2.5">
                  <p className="text-sm font-bold text-green-800">✓ Pagó deuda</p>
                  {deudasPagadas.map((d, i) => (
                    <p key={i} className="text-xs text-green-700 mt-1">
                      {d.tipo === 'proporcional' ? 'Proporcional' : 'Mes adeudado'} <b>{d.desde ? `${String(d.desde).split('-').reverse().join('/')}${d.hasta ? ' al ' + String(d.hasta).split('-').reverse().join('/') : ''}` : d.periodo}</b>
                      {' '}— <b>${Number(d.monto).toLocaleString('es-AR')}</b>
                      {d.paidAt ? <> · pagado el <b>{String(d.paidAt).slice(0, 10).split('-').reverse().join('/')}</b></> : null}
                    </p>
                  ))}
                </div>
              )}

              {/* PROPORCIONAL SIN COBRAR (gap del mes gratis diferido): antes solo se veía si alguien
                  tocaba la casilla — si nadie se acordaba, esa plata no se cobraba nunca. */}
              {gapPendiente && (
                <div className="mb-4 rounded-lg border-2 border-sky-400 bg-sky-50 px-3 py-2.5">
                  <p className="text-sm font-bold text-sky-800">◔ Proporcional de la venta SIN cobrar</p>
                  <p className="text-xs text-sky-700 mt-1">
                    De la venta con mes gratis quedó pendiente el pago único de <b>{gapPendiente.gapDays} días</b> (${Number(gapPendiente.gapAmount).toLocaleString('es-AR')})
                    {gapPendiente.gapDesde ? <> del <b>{String(gapPendiente.gapDesde).split('-').reverse().join('/')}</b> al <b>{String(gapPendiente.gapHasta || '').split('-').reverse().join('/')}</b></> : null}.
                    Generalo abajo con la casilla <b>Proporcional</b> (ya viene pre-cargado con estos números).
                  </p>
                </div>
              )}

              {/* LINK 2 del gap VIVO (se generó en la venta y el cliente aún no lo pagó): mostrarlo
                  para reenviar — sin esto se generaba un 2° link del mismo proporcional. */}
              {gapLink2Vivo && (
                <div className="mb-4 rounded-lg border border-sky-300 bg-sky-50 px-3 py-2.5">
                  <p className="text-xs font-bold text-sky-800">Ya hay un link del proporcional VIVO (generado en la venta{resv?.gapAmount ? ` por $${Number(resv.gapAmount).toLocaleString('es-AR')}` : ''}) — no generes otro: reenviale este.</p>
                  <div className="flex gap-1.5 mt-1.5">
                    <input readOnly value={resv?.gapInitPoint || ''} onFocus={(e) => e.target.select()}
                      className="flex-1 text-[10px] border border-sky-200 rounded px-1.5 py-1 bg-white text-gray-600" />
                    <button onClick={() => navigator.clipboard?.writeText(resv?.gapInitPoint || '')}
                      className="text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white px-2 py-1 rounded">Copiar</button>
                  </div>
                </div>
              )}

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
                      {tipoDeuda === 'proporcional' && (
                        <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                          <label className="text-[10px] font-bold text-gray-700">Días a cobrar</label>
                          <input type="number" min={1} value={diasProp} onChange={(e) => onDiasProp(e.target.value)}
                            className="w-16 text-xs border border-gray-300 rounded px-1.5 py-1" />
                          <span className="text-[10px] text-gray-500">la cuenta sale sola (días × precio/30, de hoy al 1° o el gap de la venta) — tocá los días si es otro período</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                        <label className="text-[10px] font-bold text-gray-700">Monto del link: $</label>
                        <input type="number" value={montoLink} onChange={(e) => setMontoLink(e.target.value)}
                          className="w-28 text-xs border border-gray-300 rounded px-1.5 py-1" />
                        <span className="text-[10px] text-gray-500">el débito rechazado fue ${Number(detail.rechazo.monto).toLocaleString('es-AR')} — corregilo si debe otra cosa</span>
                      </div>
                      {/* Período EDITABLE (Lucas 14/07): va al título del link — el cliente ve QUÉ paga.
                          Vacío = usa el mes del rechazo (el caso común). Editar solo si es deuda vieja. */}
                      <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                        <label className="text-[10px] font-bold text-gray-700">Deuda desde</label>
                        <input type="date" value={deudaDesde} onChange={(e) => setDeudaDesde(e.target.value)}
                          className="text-xs border border-gray-300 rounded px-1.5 py-1" />
                        <label className="text-[10px] font-bold text-gray-700">hasta</label>
                        <input type="date" value={deudaHasta} onChange={(e) => setDeudaHasta(e.target.value)}
                          className="text-xs border border-gray-300 rounded px-1.5 py-1" />
                        <span className="text-[10px] text-gray-500">opcional — sale en el link que ve el cliente; vacío = mes del rechazo</span>
                      </div>
                      <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                        <label className="text-[10px] font-bold text-gray-700">Email del cliente</label>
                        <input type="email" value={deudaEmail} onChange={(e) => setDeudaEmail(e.target.value)} placeholder="si la ficha no lo tiene, escribilo acá"
                          className="flex-1 min-w-[180px] text-xs border border-gray-300 rounded px-1.5 py-1" />
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
                  legacy). Se genera un PAGO ÚNICO (/deuda) por el mes adeudado o el proporcional —
                  NO toca la suscripción del cliente (antes el rebill cancelaba la sub; ya no lo hace). */}
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
                      {tipoDeuda === 'proporcional' && (
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          <label className="text-[10px] font-bold text-gray-700">Días a cobrar</label>
                          <input type="number" min={1} value={diasProp} onChange={(e) => onDiasProp(e.target.value)}
                            className="w-16 text-xs border border-gray-300 rounded px-1.5 py-1" />
                          <span className="text-[10px] text-gray-500">la cuenta sale sola (días × precio/30, de hoy al 1° o el gap de la venta) — tocá los días si es otro período</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        <label className="text-[10px] font-bold text-gray-700">Monto del link: $</label>
                        <input type="number" value={montoLink} onChange={(e) => setMontoLink(e.target.value)}
                          className="w-28 text-xs border border-gray-300 rounded px-1.5 py-1" />
                        <span className="text-[10px] text-orange-700 font-semibold">VERIFICÁ el monto (acá está el precio de ficha, puede diferir)</span>
                      </div>
                      {/* Período EDITABLE: sale en el título del link (el cliente ve QUÉ paga). En el
                          cobro manual suele ser deuda vieja → conviene ponerlo. Vacío = mes actual. */}
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        <label className="text-[10px] font-bold text-gray-700">Deuda desde</label>
                        <input type="date" value={deudaDesde} onChange={(e) => setDeudaDesde(e.target.value)}
                          className="text-xs border border-gray-300 rounded px-1.5 py-1" />
                        <label className="text-[10px] font-bold text-gray-700">hasta</label>
                        <input type="date" value={deudaHasta} onChange={(e) => setDeudaHasta(e.target.value)}
                          className="text-xs border border-gray-300 rounded px-1.5 py-1" />
                        <span className="text-[10px] text-gray-500">opcional — vacío = mes actual</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        <label className="text-[10px] font-bold text-gray-700">Email del cliente</label>
                        <input type="email" value={deudaEmail} onChange={(e) => setDeudaEmail(e.target.value)} placeholder="si la ficha no lo tiene, escribilo acá"
                          className="flex-1 min-w-[180px] text-xs border border-gray-300 rounded px-1.5 py-1" />
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
                      <p className="text-[10px] text-gray-500 mt-1">Genera un <b>PAGO ÚNICO</b> por ese mes (o el proporcional) para esta baulera y lo manda por mail/WhatsApp. <b>No toca la suscripción</b> del cliente — no da de baja nada. Al pagarlo, la baulera queda al día.</p>
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
                  <div className="flex items-center justify-between mt-5 mb-1">
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Inquilino</h3>
                    <button onClick={() => setFixTOpen((v) => !v)} className="text-[11px] font-semibold text-violet-700 hover:text-violet-900 underline">
                      {fixTOpen ? 'Cerrar' : (tenant?.email || tenant?.user?.email) ? 'Corregir datos' : 'Completar datos'}
                    </button>
                  </div>
                  <Row label="Nombre" value={tenantName} />
                  <Row label="DNI" value={tenant?.dni} />
                  <Row label="Teléfono" value={tenant?.phone} />
                  <Row label="Email" value={tenant?.user?.email || tenant?.email} />
                  {fixTOpen && (
                    <div className="mt-2 p-3 bg-violet-50 border border-violet-200 rounded-lg space-y-1.5">
                      <p className="text-[11px] text-violet-800 font-semibold">Se guardan en la ficha del cliente de esta baulera (una sola vez, queda para siempre).</p>
                      {buscarTenant && (
                        <div className="flex items-center gap-1.5">
                          <input value={copiaDe} onChange={(e) => setCopiaDe(e.target.value)} placeholder="¿Mismo cliente que otra baulera? ej. A1-006"
                            className="flex-1 text-sm border border-gray-300 rounded px-2 py-1.5" />
                          <button onClick={traerDatosDe} disabled={copiando || !copiaDe.trim()}
                            className="px-2.5 py-1.5 bg-white border border-violet-400 text-violet-700 rounded text-sm font-semibold disabled:opacity-50">
                            {copiando ? '…' : 'Traer datos'}
                          </button>
                        </div>
                      )}
                      <input value={fixT.nombre} onChange={(e) => setFixT({ ...fixT, nombre: e.target.value })} placeholder="Nombre y apellido" className="w-full text-sm border border-gray-300 rounded px-2 py-1.5" />
                      <input value={fixT.email} onChange={(e) => setFixT({ ...fixT, email: e.target.value })} placeholder="Email" type="email" className="w-full text-sm border border-gray-300 rounded px-2 py-1.5" />
                      <div className="flex gap-1.5">
                        <input value={fixT.telefono} onChange={(e) => setFixT({ ...fixT, telefono: e.target.value })} placeholder="Teléfono" className="flex-1 text-sm border border-gray-300 rounded px-2 py-1.5" />
                        <input value={fixT.dni} onChange={(e) => setFixT({ ...fixT, dni: e.target.value })} placeholder="DNI" className="w-28 text-sm border border-gray-300 rounded px-2 py-1.5" />
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={guardarInquilino} disabled={fixTSaving} className="px-3 py-1.5 bg-violet-700 text-white rounded text-sm font-semibold disabled:opacity-50">{fixTSaving ? 'Guardando…' : 'Guardar datos'}</button>
                        {fixTMsg && <span className={`text-xs font-semibold ${fixTMsg.startsWith('Guardado') ? 'text-green-700' : 'text-red-700'}`}>{fixTMsg}</span>}
                      </div>
                    </div>
                  )}

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
                      {saved && <span className="text-sm text-green-700">Guardado ✓</span>}
                      {saveErr && <span className="text-sm text-red-700 font-semibold">{saveErr}</span>}
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
                      {blockErr && <span className="text-sm text-red-700 font-semibold">{blockErr}</span>}
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
                      {blockErr && <p className="text-sm text-red-700 font-semibold mt-1">{blockErr}</p>}
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
