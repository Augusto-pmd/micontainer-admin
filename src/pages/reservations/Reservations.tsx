import { useEffect, useState } from "react";
import { BsPersonBoundingBox } from "react-icons/bs";
import { getAdminReservations, deleteAdminReservation, cancelAdminReservation, getFacePhoto, confirmFaceEnrolled, rejectFacePhoto, getFreeRoomsByM2, reassignReservationRoom, updateAdminReservation, getMpCandidatas, vincularMp, cambiarPrecioSub, type AdminReservation, type FreeRoom, type MpCandidata } from "@/services/reservation.admin.services";
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

// Add-ons que el cliente eligió en la web. Candado/kit se ENTREGAN y COBRAN en persona (no van
// en el pago online), el retiro se coordina → el staff los ve acá para prepararlos/cobrarlos.
const ADDON_LABELS: Record<string, { name: string; action: string }> = {
  lock:   { name: "Candado",      action: "entregar" },
  pack:   { name: "Kit embalaje", action: "entregar" },
  pickup: { name: "Retiro",       action: "coordinar" },
  insure: { name: "Seguro",       action: "—" },
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
    if (!window.confirm('¿Eliminar esta reserva? Esta acción no se puede deshacer.\n\nOJO: Eliminar solo borra el registro interno — NO cancela la suscripción en Mercado Pago. Para cortar el cobro usá "Dar de baja".')) return;
    try { await deleteAdminReservation(id); setReservations((x) => x.filter((rv) => rv.id !== id)); }
    catch { showError('No se pudo eliminar la reserva.'); }
  };

  // ALTA DE FACE ID — paso manual OBLIGATORIO del admin (hasta integrar el dispositivo):
  // ver la foto que subió el cliente, cargarla a mano en el equipo de acceso, y confirmar
  // (o rechazarla si no sirve — el cliente puede volver a subir otra).
  const [faceFor, setFaceFor] = useState<AdminReservation | null>(null);
  const [facePhoto, setFacePhoto] = useState<{ url?: string; path?: string; subida?: string } | null>(null);
  const [faceBusy, setFaceBusy] = useState(false);
  const openFace = async (r: AdminReservation) => {
    setFaceFor(r); setFacePhoto(null); setFaceBusy(true);
    try { setFacePhoto(await getFacePhoto(r.id)); }
    catch (e: any) { showError(e?.response?.data?.error || "No se pudo cargar la foto."); setFaceFor(null); }
    finally { setFaceBusy(false); }
  };
  const closeFace = () => { setFaceFor(null); setFacePhoto(null); };
  const doFaceEnrolled = async () => {
    if (!faceFor) return;
    if (!window.confirm(`¿Confirmás que YA cargaste la cara de ${faceFor.customerName || faceFor.customerEmail} en el dispositivo de acceso?\n\nEl cliente va a ver "Acceso activo" y la foto se borra de los servidores.`)) return;
    setFaceBusy(true);
    try {
      await confirmFaceEnrolled(faceFor.id);
      setReservations((x) => x.map((rv) => rv.id === faceFor.id ? { ...rv, faceEnrollStatus: "enrolled" } : rv));
      closeFace();
    } catch (e: any) { showError(e?.response?.data?.error || "No se pudo confirmar el alta."); }
    finally { setFaceBusy(false); }
  };
  const doFaceReject = async () => {
    if (!faceFor) return;
    if (!window.confirm("¿Rechazar esta foto? Se borra y el cliente ve en su portal que debe subir otra.")) return;
    setFaceBusy(true);
    try {
      await rejectFacePhoto(faceFor.id);
      setReservations((x) => x.map((rv) => rv.id === faceFor.id ? { ...rv, faceEnrollStatus: "failed" } : rv));
      closeFace();
    } catch (e: any) { showError(e?.response?.data?.error || "No se pudo rechazar."); }
    finally { setFaceBusy(false); }
  };

  // DAR DE BAJA: cancela la suscripción en MP (corta el cobro DE VERDAD), marca la reserva
  // cancelada y libera la baulera. Es LA baja real — Eliminar solo borra el registro.
  const darDeBaja = async (r: AdminReservation) => {
    if (!window.confirm(`¿Dar de BAJA a ${r.customerName || r.customerEmail || r.id}?\n\n• Se cancela la suscripción en Mercado Pago (deja de cobrar)\n• La reserva queda cancelada\n• La baulera se libera`)) return;
    try {
      await cancelAdminReservation(r.id);
      setReservations((x) => x.map((rv) => rv.id === r.id ? { ...rv, status: "cancelled", mpSubscriptionStatus: "cancelled" } : rv));
      load(); // refetch real (auditoría ventas M2): la baulera quedó liberada y el update optimista no lo reflejaba
    } catch (e: any) {
      showError(e?.response?.data?.error || "No se pudo dar de baja.");
    }
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

  // VINCULAR SUSCRIPCIÓN DE MP: para altas manuales / pagos con otra cuenta que quedaron sueltas.
  const [vincFor, setVincFor] = useState<AdminReservation | null>(null);
  const [vincCands, setVincCands] = useState<MpCandidata[]>([]);
  const [vincLoading, setVincLoading] = useState(false);
  const [vincBusy, setVincBusy] = useState("");
  const openVincular = async (r: AdminReservation) => {
    setVincFor(r); setVincCands([]); setVincLoading(true);
    try { const d = await getMpCandidatas(r.id); setVincCands(d.candidatos || []); }
    catch (e: any) { showError(e?.response?.data?.error || "No se pudieron buscar suscripciones."); setVincFor(null); }
    finally { setVincLoading(false); }
  };
  const doVincular = async (subId: string, forzar = false) => {
    if (!vincFor) return;
    if (!window.confirm(`¿Vincular esta suscripción de MP a la baulera ${vincFor.bauleraCodigo || vincFor.id}?\n\nSe graba el código de baulera en Mercado Pago (para que los cobros y rechazos futuros se detecten) y queda atada a esta reserva.`)) return;
    setVincBusy(subId);
    try {
      const out = await vincularMp(vincFor.id, subId, forzar);
      setReservations((x) => x.map((rv) => rv.id === vincFor.id
        ? { ...rv, mpPreapprovalId: out.subId, mpSubscriptionStatus: "authorized", status: out.activada ? "active" : rv.status }
        : rv));
      setVincFor(null);
      load(); // refetch real (auditoría ventas M2): el vínculo puede haber asignado baulera y el optimista no la trae
    } catch (e: any) {
      if (e?.response?.status === 409 && window.confirm(`${e.response.data.error}\n\n¿Reasignarla igual a esta baulera?`)) { await doVincular(subId, true); return; }
      showError(e?.response?.data?.error || "No se pudo vincular.");
    } finally { setVincBusy(""); }
  };

  // CAMBIAR PRECIO A UN SUSCRIPTOR PUNTUAL: reprice individual (una sub), no por medida. Rige próximos cobros.
  const [precioFor, setPrecioFor] = useState<AdminReservation | null>(null);
  const [precioVal, setPrecioVal] = useState("");
  const [precioBusy, setPrecioBusy] = useState(false);
  const openPrecio = (r: AdminReservation) => { setPrecioFor(r); setPrecioVal(String(r.monthly || "")); };
  const doPrecio = async () => {
    if (!precioFor) return;
    const nuevo = Number(String(precioVal).replace(/[^\d]/g, ""));
    if (!nuevo || nuevo <= 0) { showError("Poné un monto válido."); return; }
    if (nuevo === Number(precioFor.monthly)) { showError("Es el mismo monto actual."); return; }
    if (!window.confirm(`¿Cambiar el precio de la suscripción de ${precioFor.customerEmail || precioFor.bauleraCodigo || precioFor.id}?\n\n$${Number(precioFor.monthly).toLocaleString("es-AR")}/mes → $${nuevo.toLocaleString("es-AR")}/mes\n\nSe modifica en Mercado Pago y rige para los próximos cobros (no cobra retroactivo).`)) return;
    setPrecioBusy(true);
    try {
      const out = await cambiarPrecioSub(precioFor.id, nuevo);
      setReservations((x) => x.map((rv) => rv.id === precioFor.id ? { ...rv, monthly: out.nuevo } : rv));
      setPrecioFor(null);
    } catch (e: any) {
      showError(e?.response?.data?.error || "No se pudo cambiar el precio.");
    } finally { setPrecioBusy(false); }
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
          <h1 className="text-2xl font-bold text-gray-900">Ventas en curso</h1>
          <p className="text-sm text-gray-500 mt-0.5">Todas las ventas (web + Vender): suscripciones, planes con mes gratis y pagos únicos</p>
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
                      {Array.isArray(r.addons) && r.addons.some((k) => ADDON_LABELS[k] && ADDON_LABELS[k].action !== "—") && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {r.addons.map((k) => {
                            const a = ADDON_LABELS[k];
                            if (!a || a.action === "—") return null;
                            return (
                              <span key={k} title="El cliente lo eligió: preparar y cobrar al entregar" className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                                {a.name} · {a.action}
                              </span>
                            );
                          })}
                        </div>
                      )}
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
                      {r.faceEnrollStatus === "queued" && (
                        <button onClick={() => openFace(r)} className="titila inline-flex items-center gap-1 bg-violet-700 hover:bg-violet-800 text-white text-xs font-bold px-2.5 py-1 rounded-full mr-3">
                          <BsPersonBoundingBox />Alta de Face ID
                        </button>
                      )}
                      {r.status !== "active" && <button onClick={() => activate(r)} className="text-blue-700 hover:text-blue-900 text-xs font-semibold mr-3">Activar</button>}
                      {/* Vincular MP: sub suelta (alta manual / pagó con otra cuenta) → sin preapprovalId atado */}
                      {!r.mpPreapprovalId && r.status !== "cancelled" && (
                        <button onClick={() => openVincular(r)} className="text-violet-700 hover:text-violet-900 text-xs font-semibold mr-3">Vincular MP</button>
                      )}
                      {/* Cambiar precio: reprice individual de ESTA sub (requiere sub vinculada) */}
                      {r.mpPreapprovalId && r.status !== "cancelled" && (
                        <button onClick={() => openPrecio(r)} className="text-indigo-700 hover:text-indigo-900 text-xs font-semibold mr-3">Cambiar precio</button>
                      )}
                      <button onClick={() => openReassign(r)} className="text-green-700 hover:text-green-900 text-xs font-semibold mr-3">Reasignar</button>
                      {r.status !== "cancelled" && <button onClick={() => darDeBaja(r)} className="text-orange-600 hover:text-orange-800 text-xs font-semibold mr-3">Dar de baja</button>}
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

      {vincFor && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setVincFor(null)}>
          <div className="bg-white rounded-xl p-5 w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-gray-900 mb-1">Vincular suscripción de MP</h3>
            <p className="text-xs text-gray-500 mb-3">
              Baulera <b>{vincFor.bauleraCodigo || vincFor.id}</b> · {vincFor.m2} m² · mensual ${Number(vincFor.monthly).toLocaleString("es-AR")} · cliente {vincFor.customerEmail || "—"}.
              Elegí la suscripción del cliente (chequeá el mail y el monto). Al vincular se graba el código de baulera en MP.
            </p>
            {vincLoading ? (
              <div className="py-8 text-center text-sm text-gray-500">Buscando suscripciones…</div>
            ) : vincCands.length === 0 ? (
              <div className="py-6 text-center text-sm text-gray-500">No aparecieron suscripciones candidatas (por mail ni monto cercano). Verificá en Tarifas → Suscripciones sueltas, o que el pago esté acreditado en MP.</div>
            ) : (
              <div className="space-y-2">
                {vincCands.map((c) => (
                  <div key={c.id} className={`border rounded-lg px-3 py-2 flex items-center justify-between gap-3 ${c.mismoEmail ? "border-green-300 bg-green-50" : c.yaOtraBaulera ? "border-red-200 bg-red-50" : "border-gray-200"}`}>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800">${Number(c.amount).toLocaleString("es-AR")}/mes · {c.status}</p>
                      <p className="text-xs text-gray-600 truncate">{c.payerEmail || "(sin email)"}</p>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {c.mismoEmail && <span className="text-[10px] font-bold text-green-700 bg-green-100 rounded px-1.5 py-0.5">mismo mail ✓</span>}
                        {c.yaEstaBaulera && <span className="text-[10px] font-bold text-green-700 bg-green-100 rounded px-1.5 py-0.5">ya nombra esta baulera</span>}
                        {c.yaOtraBaulera && <span className="text-[10px] font-bold text-red-700 bg-red-100 rounded px-1.5 py-0.5">⚠ vinculada a: {c.ref}</span>}
                      </div>
                    </div>
                    <button onClick={() => doVincular(c.id)} disabled={!!vincBusy}
                      className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg text-white bg-violet-700 hover:bg-violet-800 disabled:opacity-50">
                      {vincBusy === c.id ? "Vinculando…" : "Vincular esta"}
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setVincFor(null)} className="w-full mt-4 text-sm text-gray-500 underline">Cerrar</button>
          </div>
        </div>
      )}

      {precioFor && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setPrecioFor(null)}>
          <div className="bg-white rounded-xl p-5 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-gray-900 mb-1">Cambiar precio de la suscripción</h3>
            <p className="text-xs text-gray-500 mb-3">
              Baulera <b>{precioFor.bauleraCodigo || precioFor.id}</b> · cliente {precioFor.customerEmail || "—"}.
              Cambia solo el monto de <b>este</b> suscriptor en Mercado Pago. Rige para los próximos cobros (no cobra retroactivo).
            </p>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Monto actual</label>
            <div className="text-sm text-gray-800 mb-3">${Number(precioFor.monthly).toLocaleString("es-AR")}/mes</div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Nuevo monto mensual</label>
            <input
              autoFocus type="text" inputMode="numeric" value={precioVal}
              onChange={(e) => setPrecioVal(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !precioBusy) doPrecio(); }}
              placeholder="Ej: 233000"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <div className="flex gap-2">
              <button onClick={() => setPrecioFor(null)} className="flex-1 text-sm text-gray-600 border border-gray-200 rounded-lg py-2 hover:bg-gray-50">Cancelar</button>
              <button onClick={doPrecio} disabled={precioBusy}
                className="flex-1 text-sm font-bold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg py-2 disabled:opacity-50">
                {precioBusy ? "Cambiando…" : "Cambiar precio en MP"}
              </button>
            </div>
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

      {faceFor && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={closeFace}>
          <div className="bg-white rounded-xl p-5 w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2"><BsPersonBoundingBox className="text-violet-700" />Alta de Face ID</h3>
            <p className="text-xs text-gray-500 mb-3">
              {faceFor.customerName || faceFor.customerEmail} · Baulera {faceFor.bauleraCodigo || faceFor.storageRoomId || "—"} · Reserva {faceFor.id}
            </p>
            {faceBusy && !facePhoto ? (
              <p className="text-sm text-gray-500 py-6 text-center">Cargando foto…</p>
            ) : facePhoto?.url ? (
              <img src={facePhoto.url} alt="Foto del cliente" className="w-full rounded-lg border mb-3" />
            ) : (
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 mb-3">
                No se pudo mostrar la imagen acá{facePhoto?.path ? ` — path: ${facePhoto.path} (abrir en Firebase → Storage)` : ""}.
              </p>
            )}
            <div className="bg-violet-50 border border-violet-200 rounded-lg p-3 text-xs text-violet-900 mb-4">
              <b>Pasos del alta manual:</b> 1) Descargá/mirá la foto (debe verse de la mitad del torso
              para arriba: hombros y cara). 2) Cargá la cara del cliente en el
              <b> dispositivo Hikvision</b> del local. 3) Recién ahí tocá <b>"Confirmar alta"</b> — el cliente
              pasa a "Acceso activo" y la foto se borra de los servidores. Si la foto no sirve (borrosa,
              lentes, etc.), tocá "Rechazar" y el cliente sube otra desde su portal.
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={doFaceEnrolled} disabled={faceBusy} className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-60">
                {faceBusy ? "..." : "✓ Confirmar alta (ya la cargué en el equipo)"}
              </button>
              <button onClick={doFaceReject} disabled={faceBusy} className="bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 text-sm font-semibold px-3 py-2 rounded-lg disabled:opacity-60">
                Rechazar foto
              </button>
              <button onClick={closeFace} className="text-gray-600 text-sm px-2">Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
