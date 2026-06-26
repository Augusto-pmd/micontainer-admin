import { useEffect, useState } from "react";
import { getAudit, type AuditRow } from "../../services/audit.services";

const ACTION_LABEL: Record<string, string> = {
  venta_manual: "Venta",
  reasignar_baulera: "Reasignar baulera",
  cambio_precio: "Cambio de precio",
};

function actionBadge(a: string) {
  const map: Record<string, string> = {
    venta_manual: "bg-green-100 text-green-800",
    reasignar_baulera: "bg-blue-100 text-blue-800",
    cambio_precio: "bg-yellow-100 text-yellow-800",
  };
  return map[a] || "bg-gray-100 text-gray-700";
}

export default function Auditoria() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actor, setActor] = useState("");
  const [action, setAction] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const r = await getAudit({ actor, action, from, to, limit: 300 });
      setRows(r.data);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const fmt = (ts: string | null) => (ts ? new Date(ts).toLocaleString("es-AR") : "—");
  const input = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none";

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Auditoría</h1>
      <p className="text-sm text-gray-500 mb-5">Historial de acciones. Cada registro guarda quién (actor), qué y cuándo.</p>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4">
        <input className={input} placeholder="Actor (email / bot)" value={actor} onChange={(e) => setActor(e.target.value)} />
        <input className={input} placeholder="Acción (ej. venta)" value={action} onChange={(e) => setAction(e.target.value)} />
        <input className={input} type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <input className={input} type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>
      <button onClick={load} className="mb-5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-lg">
        Filtrar
      </button>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3">Fecha</th>
                <th className="text-left px-4 py-3">Actor</th>
                <th className="text-left px-4 py-3">Vía</th>
                <th className="text-left px-4 py-3">Acción</th>
                <th className="text-left px-4 py-3">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Cargando…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Sin registros</td></tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600">{fmt(r.ts)}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{r.actor}</td>
                    <td className="px-4 py-3 text-gray-500">{r.via}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${actionBadge(r.action)}`}>
                        {ACTION_LABEL[r.action] || r.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {r.detail && Object.keys(r.detail).length > 0
                        ? Object.entries(r.detail).map(([k, v]) => `${k}: ${v}`).join(" · ")
                        : (r.entityId || "—")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
