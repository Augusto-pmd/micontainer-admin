import { useState } from "react";
import { getRoomsReport, cleanupRooms, renameBuilding, getHuerfanos, limpiarHuerfanos, type RoomsReport, type HuerfanosReport } from "../../services/maintenance.services";

export default function Mantenimiento() {
  const [report, setReport] = useState<RoomsReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [names, setNames] = useState<Record<string, string>>({});
  // Inquilinos huérfanos en bauleras libres (bug 05/08)
  const [huer, setHuer] = useState<HuerfanosReport | null>(null);
  const [huerLoading, setHuerLoading] = useState(false);
  const [huerMsg, setHuerMsg] = useState("");

  const cargar = async () => {
    setLoading(true); setMsg("");
    try {
      const r = await getRoomsReport();
      setReport(r);
      const n: Record<string, string> = {};
      r.edificios.forEach((e) => (n[e.id] = e.name || ""));
      setNames(n);
    } catch (e: any) {
      setMsg(e?.response?.data?.error || "Error al diagnosticar");
    } finally {
      setLoading(false);
    }
  };

  const limpiar = async () => {
    if (!report) return;
    const viejas = report.esquemaViejo_sinPrefijo;
    if (viejas === 0) return;
    const ok = window.confirm(
      `Se respaldarán y borrarán ${viejas} bauleras del esquema viejo (duplicadas). ` +
      `Quedarán ${report.esquemaNuevo_conPrefijo}. Los datos de CLIENTES no se tocan. ¿Confirmás?`
    );
    if (!ok) return;
    setLoading(true); setMsg("");
    try {
      const r = await cleanupRooms();
      setMsg(`✓ Listo: respaldadas ${r.backed}, borradas ${r.deleted}, quedan ${r.restantes}.`);
      await cargar();
    } catch (e: any) {
      setMsg(e?.response?.data?.error || "Error al limpiar");
    } finally {
      setLoading(false);
    }
  };

  const renombrar = async (id: string) => {
    if (!names[id]) return;
    setLoading(true); setMsg("");
    try {
      await renameBuilding(id, names[id]);
      setMsg("✓ Edificio renombrado.");
      await cargar();
    } catch (e: any) {
      setMsg(e?.response?.data?.error || "Error al renombrar");
    } finally {
      setLoading(false);
    }
  };

  const revisarHuerfanos = async () => {
    setHuerLoading(true); setHuerMsg("");
    try { setHuer(await getHuerfanos()); }
    catch (e: any) { setHuerMsg(e?.response?.data?.error || "Error al revisar"); }
    finally { setHuerLoading(false); }
  };

  const limpiarHuer = async () => {
    if (!huer || huer.bauleras === 0) return;
    const ok = window.confirm(
      `Se van a despegar los datos del inquilino anterior de ${huer.bauleras} baulera(s) LIBRE(S) ` +
      `y ${huer.customersAfectados} cliente(s).\n\n` +
      `• NO se borra ningún cliente — solo se despega el puntero a la baulera\n` +
      `• NO se tocan las bauleras ocupadas\n` +
      `• Cada baulera se respalda antes (reversible)\n\n¿Confirmás?`
    );
    if (!ok) return;
    setHuerLoading(true); setHuerMsg("");
    try {
      const r = await limpiarHuerfanos();
      setHuerMsg(`✓ Listo: ${r.bauleras} baulera(s) limpiada(s), ${r.customersDesanexados} cliente(s) desanexado(s). Respaldo: ${r.backupStamp}`);
      await revisarHuerfanos();
    } catch (e: any) { setHuerMsg(e?.response?.data?.error || "Error al limpiar"); }
    finally { setHuerLoading(false); }
  };

  const card = "bg-white border border-gray-200 rounded-xl p-4";

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Mantenimiento</h1>
      <p className="text-sm text-gray-500 mb-5">Diagnóstico de bauleras y limpieza de duplicados. No toca datos de clientes.</p>

      <button onClick={cargar} disabled={loading} className="mb-5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg disabled:opacity-50">
        {loading ? "Procesando…" : "Diagnosticar inventario"}
      </button>

      {msg && <div className="mb-4 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg p-3 text-sm">{msg}</div>}

      {/* Inquilinos huérfanos — arriba, sin tener que bajar por el reporte de inventario */}
      <div className={`${card} mb-5`}>
        <h2 className="font-semibold text-gray-800">Inquilinos pegados en bauleras libres</h2>
        <p className="text-xs text-gray-500 mt-0.5 mb-3">
          Bauleras <b>disponibles</b> que quedaron con los datos del inquilino anterior (mail, DNI, nombre) o con
          clientes todavía apuntando a ellas. Pasaba al liberar antes del arreglo del 05/08. Limpiarlo evita que
          la ficha muestre al cliente viejo y que el mailing le siga escribiendo.
          <b> No borra ningún cliente</b> — solo despega el puntero. Cada baulera se respalda antes.
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={revisarHuerfanos} disabled={huerLoading}
            className="bg-gray-900 hover:bg-black text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50">
            {huerLoading ? "Revisando…" : "Revisar"}
          </button>
          {huer && huer.bauleras > 0 && (
            <button onClick={limpiarHuer} disabled={huerLoading}
              className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50">
              Limpiar {huer.bauleras} baulera{huer.bauleras !== 1 ? "s" : ""}
            </button>
          )}
        </div>
        {huerMsg && <p className={`text-sm mt-3 ${huerMsg.startsWith("✓") ? "text-green-700" : "text-red-700"}`}>{huerMsg}</p>}
        {huer && (
          huer.bauleras === 0 ? (
            <p className="text-sm text-green-700 mt-3">✓ Todo limpio: ninguna baulera libre tiene datos del inquilino anterior.</p>
          ) : (
            <div className="mt-3 border rounded-lg overflow-hidden">
              <div className="max-h-56 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 text-gray-500 sticky top-0">
                    <tr className="text-left">
                      <th className="px-3 py-2 font-semibold">Baulera</th>
                      <th className="px-3 py-2 font-semibold">Le quedó pegado</th>
                      <th className="px-3 py-2 font-semibold text-right">Clientes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {huer.detalle.map((d) => (
                      <tr key={d.roomId}>
                        <td className="px-3 py-1.5 font-mono">{d.baulera}</td>
                        <td className="px-3 py-1.5 text-gray-600">{d.enBaulera.join(", ") || "—"}</td>
                        <td className="px-3 py-1.5 text-right">{d.customers.length || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        )}
      </div>

      {report && (
        <div className="space-y-5">
          <div className={card}>
            <h2 className="font-semibold text-gray-800 mb-3">Diagnóstico</h2>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div><p className="text-2xl font-bold text-gray-900">{report.total}</p><p className="text-xs text-gray-500">Total cargadas</p></div>
              <div><p className="text-2xl font-bold text-green-700">{report.esquemaNuevo_conPrefijo}</p><p className="text-xs text-gray-500">Esquema nuevo (se conserva)</p></div>
              <div><p className="text-2xl font-bold text-red-600">{report.esquemaViejo_sinPrefijo}</p><p className="text-xs text-gray-500">Esquema viejo (duplicadas)</p></div>
            </div>
            <div className="mt-4 text-xs text-gray-500">
              <p className="mb-1"><b>Por sucursal:</b> {Object.entries(report.porBranchId).map(([k, v]) => `${k}: ${v}`).join(" · ")}</p>
              <p className="mb-1"><b>Ej. nuevo:</b> {report.ejemploNuevo.join(", ")}</p>
              <p><b>Ej. viejo:</b> {report.ejemploViejo.join(", ") || "(ninguno)"}</p>
            </div>
          </div>

          {report.esquemaViejo_sinPrefijo > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-sm text-gray-800 mb-1 font-semibold">Hay {report.esquemaViejo_sinPrefijo} bauleras duplicadas (esquema viejo).</p>
              <p className="text-xs text-gray-600 mb-3">Al limpiar, se respaldan primero (colección de backup) y luego se quitan de la lista. <b>Los clientes, contratos y pagos no se tocan.</b></p>
              <button onClick={limpiar} disabled={loading} className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg disabled:opacity-50">
                Limpiar duplicados (con backup)
              </button>
            </div>
          )}

          <div className={card}>
            <h2 className="font-semibold text-gray-800 mb-3">Edificios (renombrar)</h2>
            <div className="space-y-2">
              {report.edificios.map((e) => (
                <div key={e.id} className="flex gap-2 items-center">
                  <input
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    value={names[e.id] ?? ""}
                    onChange={(ev) => setNames((n) => ({ ...n, [e.id]: ev.target.value }))}
                  />
                  <span className="text-xs text-gray-400 w-32 truncate" title={e.id}>{e.id}</span>
                  <button onClick={() => renombrar(e.id)} disabled={loading} className="bg-gray-900 text-white text-xs font-medium px-3 py-2 rounded-lg disabled:opacity-50">
                    Renombrar
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
