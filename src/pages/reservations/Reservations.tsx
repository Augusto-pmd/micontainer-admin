import { useEffect, useState } from "react";
import { getAdminReservations, deleteAdminReservation, getFreeRoomsByM2, reassignReservationRoom, updateAdminReservation, type AdminReservation, type FreeRoom } from "@/services/reservation.admin.services";
import { showError } from "@/utils/alerts";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending_payment: { label: "Pago pendiente", color: "bg-yellow-100 text-yellow-800" },
  active:          { label: "Activa",          color: "bg-green-100 text-green-800" },
  cancelled:       { label: "Cancelada",       color: "bg-red-100 text-red-800" },
  payment_failed:  { label: "Pago fallido",    color: "bg-red-100 text-red-800" },
};

const MP_STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending:    { label: "MP: Pendiente",  color: "bg-yellow-50 text-yellow-700" },
  authorized: { label: "MP: Autorizado", color: "bg-green-50 text-green-700" },
  paused:     { label: "MP: Pausada",    color: "bg-gray-100 text-gray-600" },
  cancelled:  { label: "MP: Cancelada",  color: "bg-red-50 text-red-600" },
};

export default function Reservations() {
  const [reservations, setReservations] = useState<AdminReservation[]>([]);
  const [filtered, setFiltered] = useState<AdminReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [reassignFor, setReassignFor] = useState<AdminReservation | null>(null);
  const [freeRooms, setFreeRooms] = useState<FreeRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState("");
  const [reassigning, setReassigning] = useState(false);
  const [loadingFree, setLoadingFree] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getAdminReservations({ limit: 200 });
      setReservations(res.data);
      setFiltered(res.data);
    } catch {
      showError("Error al cargar reservas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const remove = async (id: string) => {
    if (!window.confirm('¿Eliminar esta reserva? Esta acción no se puede deshacer.')) return;
    try { await deleteAdminReservation(id); setReservations((x) => x.filter((rv) => rv.id !== id)); }
    catch { showError('No se pudo eliminar la reserva.'); }
  };

  const openReassign = async (r: AdminReservation) => {
    setReassignFor(r);
    setSelectedRoom("");
    setLoadingFree(true);
    try { setFreeRooms(await getFreeRoomsByM2(r.m2)); }
    catch { setFreeRooms([]); }
    finally { setLoadingFree(false); }
  };
  const closeReassign = () => { setReassignFor(null); setFreeRooms([]); setSelectedRoom(""); };
  const doReassign = async () => {
    if (!reassignFor) return;
    setReassigning(true);
    try {
      const res = await reassignReservationRoom(reassignFor.id, selectedRoom || undefined);
      setReservations((x) => x.map((rv) => rv.id === reassignFor.id ? { ...rv, storageRoomId: res.storageRoomId } : rv));
      closeReassign();
    } catch { showError("No se pudo reasignar. ¿Hay una baulera libre de esa medida?"); }
    finally { setReassigning(false); }
  };

  // Alta manual: para cuando el cliente pagó pero no llegó el webhook. Asigna la baulera
  // (ocupa + crea el contrato, idempotente) y marca la reserva como activa/pagada.
  const activate = async (r: AdminReservation) => {
    if (!window.confirm(`¿Dar de alta y marcar como PAGADA la reserva de ${r.customerName || r.customerEmail || "este cliente"}?\n\nSe le asigna una baulera de ${r.m2}m² y se crea el contrato. Hacelo solo si confirmaste el pago.`)) return;
    try {
      const res = await reassignReservationRoom(r.id, r.storageRoomId || undefined);
      await updateAdminReservation(r.id, { status: "active", mpSubscriptionStatus: "authorized" });
      setReservations((x) => x.map((rv) => rv.id === r.id
        ? { ...rv, status: "active", mpSubscriptionStatus: "authorized", storageRoomId: res.storageRoomId }
        : rv));
    } catch { showError("No se pudo activar. ¿Hay una baulera libre de esa medida?"); }
  };

  useEffect(() => {
    let list = reservations;
    if (statusFilter !== "all") list = list.filter(r => r.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        r.id.toLowerCase().includes(q) ||
        r.customerName.toLowerCase().includes(q) ||
        r.customerEmail.toLowerCase().includes(q) ||
        r.customerDni.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q)
      );
    }
    setFiltered(list);
  }, [search, statusFilter, reservations]);

  const fmt = (n: number) => `$${n?.toLocaleString("es-AR")}`;
  const fmtDate = (s: string | null) => s ? new Date(s).toLocaleDateString("es-AR") : "—";

  // Estadísticas rápidas
  const stats = {
    total:   reservations.length,
    active:  reservations.filter(r => r.status === "active").length,
    pending: reservations.filter(r => r.status === "pending_payment").length,
    mrr:     reservations.filter(r => r.status === "active").reduce((s, r) => s + (r.monthly || 0), 0),
  };

  return (
    <div className="p-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reservas online</h1>
          <p className="text-sm text-gray-500 mt-0.5">Reservas realizadas desde micontainer.com vía Mercado Pago</p>
        </div>
        <button onClick={load} className="text-sm text-green-700 hover:text-green-900 font-medium">
          ↻ Actualizar
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Activas</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{stats.active}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Pago pendiente</p>
          <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.pending}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">MRR estimado</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{fmt(stats.mrr)}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 mb-4">
        <Input
          placeholder="Buscar por nombre, email, DNI, ID..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="active">Activas</SelectItem>
            <SelectItem value="pending_payment">Pago pendiente</SelectItem>
            <SelectItem value="cancelled">Canceladas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">Cargando reservas...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          {reservations.length === 0 ? "Todavía no hay reservas online." : "No hay resultados para la búsqueda."}
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">ID</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Cliente</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Espacio</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Baulera</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Precio/mes</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Duración</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Inicio</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Estado</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">MP</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Creada</th>
                <th className="px-4 py-3 font-semibold text-gray-600 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map(r => {
                const st  = STATUS_LABEL[r.status]    || { label: r.status, color: "bg-gray-100 text-gray-600" };
                const mp  = MP_STATUS_LABEL[r.mpSubscriptionStatus] || { label: r.mpSubscriptionStatus, color: "bg-gray-100 text-gray-600" };
                return (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500 whitespace-nowrap">{r.id}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{r.customerName || <span className="text-gray-400 italic">Sin nombre</span>}</div>
                      <div className="text-xs text-gray-500">{r.customerEmail}</div>
                      {r.customerPhone && <div className="text-xs text-gray-400">{r.customerPhone}</div>}
                      {r.customerDni  && <div className="text-xs text-gray-400">DNI: {r.customerDni}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{r.category}</div>
                      <div className="text-xs text-gray-500">{r.m2} m² · {r.sucursalId}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {r.storageRoomId
                        ? <span className="font-mono text-xs text-gray-700">{r.storageRoomId}</span>
                        : <span className="text-xs text-gray-400 italic">Sin asignar</span>}
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">
                      {fmt(r.monthly)}
                      <div className="text-xs text-gray-400 font-normal">1er: {fmt(r.firstMonth)}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{r.duration} {r.duration === 1 ? "mes" : "meses"}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-700">{r.startDate}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>
                        {st.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${mp.color}`}>
                        {mp.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">{fmtDate(r.createdAt)}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {r.status !== "active" && <button onClick={() => activate(r)} className="text-blue-700 hover:text-blue-900 text-xs font-semibold mr-3">Activar</button>}
                      <button onClick={() => openReassign(r)} className="text-green-700 hover:text-green-900 text-xs font-semibold mr-3">Reasignar</button>
                      <button onClick={() => remove(r.id)} className="text-red-600 hover:text-red-800 text-xs font-semibold">Eliminar</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="px-4 py-3 border-t text-xs text-gray-500 bg-gray-50">
            {filtered.length} reserva{filtered.length !== 1 ? "s" : ""}
            {statusFilter !== "all" || search ? ` (filtradas de ${reservations.length})` : ""}
          </div>
        </div>
      )}

      {reassignFor && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={closeReassign}>
          <div className="bg-white rounded-xl p-5 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-gray-900 mb-1">Reasignar baulera</h3>
            <p className="text-xs text-gray-500 mb-4">
              Reserva {reassignFor.id} · {reassignFor.m2} m²
              {reassignFor.storageRoomId ? ` · actual: ${reassignFor.storageRoomId}` : " · sin asignar"}
            </p>
            <label className="block text-sm text-gray-600 mb-1">Baulera</label>
            <select
              value={selectedRoom}
              onChange={(e) => setSelectedRoom(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-3"
            >
              <option value="">Automática (primera libre de {reassignFor.m2} m²)</option>
              {freeRooms.map((fr) => (
                <option key={fr.id} value={fr.id}>{fr.space || fr.name || fr.id}</option>
              ))}
            </select>
            {loadingFree && <p className="text-xs text-gray-400 mb-2">Cargando libres…</p>}
            {!loadingFree && freeRooms.length === 0 && (
              <p className="text-xs text-amber-600 mb-2">No hay bauleras libres de {reassignFor.m2} m².</p>
            )}
            <div className="flex justify-end gap-2 mt-2">
              <button onClick={closeReassign} className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
              <button onClick={doReassign} disabled={reassigning} className="px-4 py-2 text-sm font-semibold bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-60">
                {reassigning ? "Asignando…" : "Reasignar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
