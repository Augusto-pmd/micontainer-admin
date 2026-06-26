import { useEffect, useState } from "react";
import { getCancellations, resolveCancellation, type Cancellation } from "../services/cancellations.services";

export default function CancellationAlerts() {
  const [items, setItems] = useState<Cancellation[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [decision, setDecision] = useState("");
  const [nota, setNota] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const r = await getCancellations(true);
      setItems(r.data || []);
    } catch {
      /* silencioso: no molestar si falla el poll */
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, []);

  if (items.length === 0) return null;

  const resolver = async (id: string) => {
    setSaving(true);
    try {
      await resolveCancellation(id, decision || "Gestionada", nota);
      setItems((xs) => xs.filter((x) => x.id !== id));
      setOpenId(null);
      setDecision("");
      setNota("");
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  };

  const fmt = (ts: string | null) => (ts ? new Date(ts).toLocaleString("es-AR") : "—");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <span className="text-xl">⚠️</span>
          <h2 className="font-bold text-gray-900">Bajas de suscripción sin gestionar ({items.length})</h2>
        </div>
        <div className="p-4 space-y-3">
          {items.map((c) => (
            <div key={c.id} className="border border-red-100 bg-red-50 rounded-xl p-3">
              <p className="text-sm text-gray-800 font-semibold">
                {c.customerName || c.customerEmail || "Cliente"} dio de baja su suscripción
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Baulera {c.bauleraCodigo || c.storageRoomId || `${c.m2}m²`} · dada de baja por {c.cancelledBy} · {fmt(c.cancelledAt)}
              </p>
              {c.customerPhone && <p className="text-xs text-gray-500">Tel: {c.customerPhone}</p>}

              {openId === c.id ? (
                <div className="mt-3 space-y-2">
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" value={decision} onChange={(e) => setDecision(e.target.value)}>
                    <option value="">¿Qué hacés?</option>
                    <option>Contacté al cliente</option>
                    <option>Verificar baulera en sucursal</option>
                    <option>Baja confirmada (sin deuda)</option>
                    <option>Posible deuda — seguir</option>
                    <option>Otro</option>
                  </select>
                  <textarea className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" rows={2} placeholder="Nota (opcional)" value={nota} onChange={(e) => setNota(e.target.value)} />
                  <div className="flex gap-2">
                    <button disabled={saving} onClick={() => resolver(c.id)} className="bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50">Guardar</button>
                    <button onClick={() => { setOpenId(null); setDecision(""); setNota(""); }} className="text-sm text-gray-500 px-3">Cancelar</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setOpenId(c.id)} className="mt-2 bg-gray-900 text-white text-xs font-medium px-3 py-1.5 rounded-lg">Gestionar</button>
              )}
            </div>
          ))}
        </div>
        <div className="px-5 py-3 border-t border-gray-100 text-right">
          <button onClick={() => setItems([])} className="text-sm text-gray-400">Cerrar por ahora</button>
        </div>
      </div>
    </div>
  );
}
