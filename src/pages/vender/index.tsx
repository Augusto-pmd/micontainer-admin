import { useState } from "react";
import { createManualSale } from "../../services/sales.services";
import { getFreeRoomsByM2, type FreeRoom } from "../../services/reservation.admin.services";

export default function Vender() {
  const [form, setForm] = useState({
    name: "", email: "", phone: "", dni: "",
    m2: "", storageRoomId: "", bauleraCodigo: "",
    startDate: "", endDate: "", durationMonths: "",
    promoMonths: "0", discountPct: "0", priceOverride: "",
    paymentMode: "subscription",
  });
  const [freeRooms, setFreeRooms] = useState<FreeRoom[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ initPoint: string; monthly: number; duration: number; paymentMode?: string; total?: number } | null>(null);
  const [copied, setCopied] = useState(false);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const buscarBauleras = async () => {
    const m2 = Number(form.m2);
    if (!m2) return;
    setLoadingRooms(true);
    try {
      const rooms = await getFreeRoomsByM2(m2);
      setFreeRooms(rooms);
    } catch {
      setFreeRooms([]);
    } finally {
      setLoadingRooms(false);
    }
  };

  const generar = async () => {
    setError("");
    setResult(null);
    if (!form.email) { setError("Carga el email del cliente"); return; }
    if (!form.m2) { setError("Carga la medida (m2)"); return; }
    if (form.paymentMode === "onetime" && !form.durationMonths) { setError("Carga la cantidad de meses para el pago único"); return; }
    setSubmitting(true);
    try {
      const r = await createManualSale({
        m2: Number(form.m2),
        storageRoomId: form.storageRoomId || undefined,
        bauleraCodigo: form.bauleraCodigo || undefined,
        name: form.name, email: form.email, phone: form.phone, dni: form.dni,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        durationMonths: form.durationMonths ? Number(form.durationMonths) : undefined,
        promoMonths: Number(form.promoMonths) || 0,
        discountPct: Number(form.discountPct) || 0,
        priceOverride: form.priceOverride ? Number(form.priceOverride) : undefined,
        paymentMode: form.paymentMode as "subscription" | "onetime",
      });
      setResult({ initPoint: r.initPoint, monthly: r.monthly, duration: r.duration, paymentMode: r.paymentMode, total: r.total });
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || "No se pudo generar el link");
    } finally {
      setSubmitting(false);
    }
  };

  const link = result?.initPoint || "";
  const msg = `Hola${form.name ? " " + form.name : ""}! Te dejo el link para activar tu baulera en Mi Container: ${link}`;
  // Normaliza el telefono a formato internacional para wa.me (Argentina: 549...)
  const waPhone = (() => {
    let p = form.phone.replace(/\D/g, "");
    if (p && !p.startsWith("54")) {
      p = p.replace(/^0/, "");      // saca 0 inicial (ej. 011)
      p = "549" + p;                 // movil Argentina
    }
    return p;
  })();
  const waUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(msg)}`;
  const mailUrl = `mailto:${form.email}?subject=${encodeURIComponent("Tu link de pago - Mi Container")}&body=${encodeURIComponent(msg)}`;

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  const input = "w-full px-3 py-2.5 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none";
  const label = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Vender</h1>
      <p className="text-sm text-gray-500 mb-6">Carga el cliente y la baulera, genera el link de pago y enviaselo.</p>

      <div className="space-y-5">
        <section className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="font-semibold text-gray-800 mb-3">Cliente</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className={label}>Nombre</label><input className={input} value={form.name} onChange={(e) => set("name", e.target.value)} /></div>
            <div><label className={label}>Email *</label><input className={input} type="email" value={form.email} onChange={(e) => set("email", e.target.value)} /></div>
            <div><label className={label}>Telefono</label><input className={input} value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="549..." /></div>
            <div><label className={label}>DNI</label><input className={input} value={form.dni} onChange={(e) => set("dni", e.target.value)} /></div>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="font-semibold text-gray-800 mb-3">Baulera</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={label}>Medida (m2) *</label>
              <input className={input} type="number" value={form.m2} onChange={(e) => set("m2", e.target.value)} onBlur={buscarBauleras} />
            </div>
            <div>
              <label className={label}>Baulera (opcional)</label>
              <select className={input} value={form.storageRoomId} onChange={(e) => {
                const id = e.target.value;
                const r = freeRooms.find((x) => x.id === id);
                set("storageRoomId", id);
                set("bauleraCodigo", r?.space || r?.name || "");
              }}>
                <option value="">{loadingRooms ? "Buscando..." : freeRooms.length ? "Automatica / elegir" : "Pone la medida y tabula"}</option>
                {freeRooms.map((r) => (<option key={r.id} value={r.id}>{r.space || r.name || r.id}</option>))}
              </select>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="font-semibold text-gray-800 mb-3">Forma de pago y precio</h2>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <button type="button" onClick={() => set("paymentMode", "subscription")}
              className={`py-2.5 rounded-lg text-sm font-semibold border ${form.paymentMode === "subscription" ? "bg-green-600 text-white border-green-600" : "bg-white text-gray-700 border-gray-300"}`}>
              Suscripción mensual
            </button>
            <button type="button" disabled
              title="Falta cargar el token de Mercado Pago"
              className="py-2.5 rounded-lg text-sm font-semibold border bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed">
              Pago único / transferencia (próximamente)
            </button>
          </div>
          <p className="text-xs text-gray-400 mb-3">
            {form.paymentMode === "onetime"
              ? "El cliente paga N meses juntos (por transferencia o tarjeta). Cobro una sola vez."
              : "Cobro mensual automático por Mercado Pago. Corre hasta que el cliente la dé de baja."}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className={label}>Desde</label><input className={input} type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} /></div>
            {form.paymentMode === "onetime" ? (
              <div><label className={label}>Cantidad de meses *</label><input className={input} type="number" value={form.durationMonths} onChange={(e) => set("durationMonths", e.target.value)} placeholder="ej. 6" /></div>
            ) : (
              <div><label className={label}>Meses de promo gratis</label><input className={input} type="number" value={form.promoMonths} onChange={(e) => set("promoMonths", e.target.value)} /></div>
            )}
            <div><label className={label}>Descuento (%)</label><input className={input} type="number" value={form.discountPct} onChange={(e) => set("discountPct", e.target.value)} /></div>
            <div><label className={label}>Precio manual mensual (opcional)</label><input className={input} type="number" value={form.priceOverride} onChange={(e) => set("priceOverride", e.target.value)} placeholder="usa tarifa si vacio" /></div>
          </div>
        </section>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{error}</div>}

        {!result && (
          <button onClick={generar} disabled={submitting}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl disabled:opacity-50">
            {submitting ? "Generando link..." : "Generar link de pago"}
          </button>
        )}

        {result && (
          <section className="bg-green-50 border border-green-200 rounded-xl p-4">
            <p className="text-sm text-gray-700 mb-1">{result.paymentMode === "onetime" ? `Link generado · Pago único $${(result.total || 0).toLocaleString("es-AR")} (${result.duration} ${result.duration === 1 ? "mes" : "meses"})` : `Link generado · $${result.monthly.toLocaleString("es-AR")}/mes · suscripción mensual`}</p>
            <div className="bg-white border border-gray-200 rounded-lg p-2 text-xs break-all text-gray-600 mb-3">{result.initPoint}</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button onClick={copiar} className="bg-gray-800 text-white py-2.5 rounded-lg text-sm font-medium">{copied ? "Copiado!" : "Copiar link"}</button>
              <a href={waUrl} target="_blank" rel="noreferrer" className="bg-green-500 text-white py-2.5 rounded-lg text-sm font-medium text-center">Enviar por WhatsApp</a>
              <a href={mailUrl} className="bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium text-center">Enviar por mail</a>
            </div>
            <button onClick={() => setResult(null)} className="w-full mt-3 text-sm text-gray-500 underline">Generar otra venta</button>
          </section>
        )}
      </div>
    </div>
  );
}
