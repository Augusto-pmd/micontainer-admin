import { useEffect, useState } from "react";
import { getAdminReservations, type AdminReservation } from "../../services/reservation.admin.services";

function estado(r: AdminReservation, nowMs: number) {
  if (r.status === "active" || r.mpSubscriptionStatus === "authorized")
    return { txt: "Pagado / Activo", cls: "bg-green-100 text-green-800", min: null as number | null };
  if (r.status === "payment_failed")
    return { txt: "Pago rechazado", cls: "bg-red-100 text-red-800", min: null };
  if (r.status === "cancelled")
    return { txt: "Cancelado", cls: "bg-gray-100 text-gray-600", min: null };
  if (r.heldUntil) {
    const left = Math.round((new Date(r.heldUntil).getTime() - nowMs) / 60000);
    if (left > 0) return { txt: "Esperando pago", cls: "bg-yellow-100 text-yellow-800", min: left };
    return { txt: "Venció sin pago", cls: "bg-orange-100 text-orange-800", min: 0 };
  }
  return { txt: "Pendiente", cls: "bg-yellow-100 text-yellow-800", min: null };
}

const via = (r: AdminReservation) =>
  r.source === "manual_admin" ? "Vender (admin)" : r.source === "online" || !r.source ? "Web" : r.source;

export default function Ventas() {
  const [rows, setRows] = useState<AdminReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());

  const load = async () => {
    try {
      const r = await getAdminReservations({ limit: 100 });
      setRows(r.data);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, []);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  const enCurso = rows.filter((r) => r.status === "pending_payment");
  const resueltas = rows.filter((r) => r.status !== "pending_payment").slice(0, 25);
  const fmt = (ts: string | null) => (ts ? new Date(ts).toLocaleString("es-AR") : "—");

  const Tabla = ({ data, vacio }: { data: AdminReservation[]; vacio: string }) => (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3">Cliente</th>
              <th className="text-left px-4 py-3">Baulera</th>
              <th className="text-left px-4 py-3">Monto</th>
              <th className="text-left px-4 py-3">Estado</th>
              <th className="text-left px-4 py-3">Vía</th>
              <th className="text-left px-4 py-3">Creada</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">{vacio}</td></tr>
            ) : (
              data.map((r) => {
                const e = estado(r, now);
                return (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3"><div className="font-medium text-gray-800">{r.customerName || r.customerEmail || "—"}</div><div className="text-xs text-gray-400">{r.customerPhone}</div></td>
                    <td className="px-4 py-3 text-gray-600">{r.bauleraCodigo || r.storageRoomId || `${r.m2}m²`}</td>
                    <td className="px-4 py-3 text-gray-600">${(r.monthly || 0).toLocaleString("es-AR")}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${e.cls}`}>
                        {e.txt}{e.min != null && e.min > 0 ? ` · ${e.min} min` : ""}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{via(r)}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{fmt(r.createdAt)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Ventas en curso</h1>
      <p className="text-sm text-gray-500 mb-5">Links enviados, minutos que quedan, y si el pago entró o se rechazó. Se actualiza solo.</p>

      <h2 className="font-semibold text-gray-800 mb-2">Esperando pago ({enCurso.length})</h2>
      <Tabla data={enCurso} vacio={loading ? "Cargando…" : "No hay ventas esperando pago"} />

      <h2 className="font-semibold text-gray-800 mb-2 mt-7">Resueltas recientes</h2>
      <Tabla data={resueltas} vacio={loading ? "Cargando…" : "Sin ventas recientes"} />
    </div>
  );
}
