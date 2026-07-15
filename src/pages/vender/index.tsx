import { useEffect, useState } from "react";
import { createManualSale, createOneTimeSale, createPlanSale } from "../../services/sales.services";
import { getFreeRoomsByM2, type FreeRoom } from "../../services/reservation.admin.services";
import { getAllStorageRoomsServices } from "../../services/storageRoom.services";

export default function Vender() {
  const [form, setForm] = useState({
    name: "", email: "", phone: "", dni: "",
    m2: "", storageRoomId: "", bauleraCodigo: "",
    startDate: "", endDate: "", durationMonths: "1",
    promoMonths: "0", promoUnit: "months", discountPct: "0", priceOverride: "",
    // 3 RUTAS SEPARADAS: subscription -> /sell · onetime -> /sell-onetime · plan -> /sell-plan
    paymentMode: "subscription",
    // MES GRATIS: qué pasa con el proporcional de entrada (los días de ESTE mes).
    // "ahora" = sale con los 2 links · "despues" = pre-cargado en Inventario (celeste) ·
    // "regalar" = REGALO LIMPIO: la promo corre desde HOY, sin link 2 ni proporcional, nunca.
    gapCuando: "ahora",
    // Si es "despues": desde qué fecha Inventario lo marca celeste "sin cobrar". Vacío = de una.
    gapRecordar: "",
  });
  const [freeRooms, setFreeRooms] = useState<FreeRoom[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  // Medidas REALES de la sucursal (listado, no tipeo a mano — evita errores de carga).
  const [sizes, setSizes] = useState<Array<{ m2: number; libres: number }>>([]);
  useEffect(() => {
    (async () => {
      try {
        const res: any = await getAllStorageRoomsServices({ limit: 250 } as any);
        const rooms: any[] = res?.data || res?.rooms || (Array.isArray(res) ? res : []);
        const map = new Map<number, number>();
        rooms.forEach((r) => {
          const m2 = Number(r.areaM2) || 0;
          if (m2 <= 0) return; // excluye las anuladas (0 m²)
          map.set(m2, (map.get(m2) || 0) + (r.status === "available" ? 1 : 0));
        });
        setSizes([...map.entries()].map(([m2, libres]) => ({ m2, libres })).sort((a, b) => a.m2 - b.m2));
      } catch { /* si falla, el select queda vacío pero editable */ }
    })();
  }, []);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    initPoint: string; monthly: number; duration: number; paymentMode?: string; total?: number;
    // Mes gratis: link 2 = proporcional de ENTRADA (o 'regalado'); el backend manda las fechas del ciclo.
    gapLink?: string | null; gapAmount?: number; gapDays?: number; gratis?: string; gapModo?: string;
    gapDesde?: string | null; gapHasta?: string | null; finGratis?: string; primerDebito?: string; trialDays?: number;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const buscarBauleras = async (m2v?: number) => {
    const m2 = m2v ?? Number(form.m2);
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
    if (form.paymentMode === "onetime" && !(Number(form.durationMonths) >= 1)) { setError("Carga la cantidad de meses para el pago único"); return; }
    setSubmitting(true);
    try {
      const payload = {
        m2: Number(form.m2),
        storageRoomId: form.storageRoomId || undefined,
        bauleraCodigo: form.bauleraCodigo || undefined,
        name: form.name, email: form.email, phone: form.phone, dni: form.dni,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        durationMonths: form.durationMonths ? Number(form.durationMonths) : undefined,
        // El período gratis SOLO existe en la ruta plan. Suscripción y pago único mandan 0 SIEMPRE
        // (el mecanismo viejo de "promo gratis" en la suscripción no funcionaba y queda muerto).
        promoMonths: form.paymentMode === "plan" ? (Number(form.promoMonths) || 1) : 0,
        promoUnit: form.paymentMode === "plan" ? (form.promoUnit as "days" | "months") : undefined,
        discountPct: Number(form.discountPct) || 0,
        priceOverride: form.priceOverride ? Number(form.priceOverride) : undefined,
        // Mes gratis: link 2 ahora, diferido a Inventario, o REGALADO (sin proporcional, nunca)
        generarGapAhora: form.paymentMode === "plan" && form.gapCuando === "ahora",
        recordarGapDesde: form.paymentMode === "plan" && form.gapCuando === "despues" && form.gapRecordar ? form.gapRecordar : undefined,
        gapModo: form.paymentMode === "plan" && form.gapCuando === "regalar" ? "regalar" as const : undefined,
      };
      // Cada modo llama a SU endpoint (rutas separadas — no se cruzan)
      const r = form.paymentMode === "onetime"
        ? await createOneTimeSale(payload)
        : form.paymentMode === "plan"
          ? await createPlanSale(payload)
          : await createManualSale({ ...payload, paymentMode: "subscription" });
      setResult({
        initPoint: r.initPoint, monthly: r.monthly, duration: r.duration, paymentMode: form.paymentMode, total: r.total,
        gapLink: r.gapLink ?? null, gapAmount: r.gapAmount, gapDays: r.gapDays, gratis: r.gratis, gapModo: r.gapModo,
        gapDesde: r.gapDesde, gapHasta: r.gapHasta, finGratis: r.finGratis, primerDebito: r.primerDebito, trialDays: r.trialDays,
      });
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || "No se pudo generar el link");
    } finally {
      setSubmitting(false);
    }
  };

  const link = result?.initPoint || "";
  const msg = `Hola${form.name ? " " + form.name : ""}! Te dejo el link para activar tu baulera en Mi Container: ${link}`;

  // CICLO del mes gratis: fechas YA calculadas por el backend (misma cuenta que el plan real en MP).
  // Cobrar: proporcional de ENTRADA (hoy → 1°) + gratis desde ese 1°. Regalado: gratis DESDE HOY.
  const fFecha = (s?: string | null) => (s ? s.split("-").reverse().slice(0, 2).join("/") : "");
  const cicloPlan = result?.paymentMode === "plan" && result.finGratis
    ? { desdeTxt: fFecha(result.gapDesde), inicioGratisTxt: fFecha(result.gapHasta), finGratisTxt: fFecha(result.finGratis), primerDebitoTxt: fFecha(result.primerDebito), regalado: result.gapModo === "regalado" }
    : null;
  const gapLink = result?.gapLink || "";
  const gapMsg = `Hola${form.name ? " " + form.name : ""}! Te dejo el link del pago único de alineación (${result?.gapDays ?? 0} días) de tu baulera en Mi Container: ${gapLink}`;
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
              {/* Listado de medidas REALES (pedido Lucas 12/07): evita tipeos incorrectos si vende alguien nuevo */}
              <select
                className={input}
                value={form.m2}
                onChange={(e) => {
                  set("m2", e.target.value);
                  set("storageRoomId", "");
                  set("bauleraCodigo", "");
                  if (e.target.value) buscarBauleras(Number(e.target.value));
                }}
              >
                <option value="">Elegí la medida…</option>
                {sizes.map((s) => (
                  <option key={s.m2} value={s.m2}>{s.m2} m² {s.libres > 0 ? `· ${s.libres} libre${s.libres > 1 ? "s" : ""}` : "· sin stock"}</option>
                ))}
              </select>
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
          <div className="grid grid-cols-3 gap-2 mb-3">
            <button type="button" onClick={() => set("paymentMode", "subscription")}
              className={`py-2.5 rounded-lg text-sm font-semibold border ${form.paymentMode === "subscription" ? "bg-green-600 text-white border-green-600" : "bg-white text-gray-700 border-gray-300"}`}>
              Suscripción mensual
            </button>
            <button type="button" onClick={() => { set("paymentMode", "onetime"); if (!(Number(form.durationMonths) > 1)) set("durationMonths", "6"); }}
              className={`py-2.5 rounded-lg text-sm font-semibold border ${form.paymentMode === "onetime" ? "bg-gray-800 text-white border-gray-800" : "bg-white text-gray-700 border-gray-300"}`}>
              Pago único (N meses)
            </button>
            <button type="button" onClick={() => { set("paymentMode", "plan"); if (!(Number(form.promoMonths) > 0)) set("promoMonths", "1"); }}
              className={`py-2.5 rounded-lg text-sm font-semibold border ${form.paymentMode === "plan" ? "bg-violet-700 text-white border-violet-700" : "bg-white text-gray-700 border-gray-300"}`}>
              Mes gratis (plan)
            </button>
          </div>
          <p className="text-xs text-gray-400 mb-3">
            {form.paymentMode === "subscription" && "Cobro mensual automático por Mercado Pago (suscripción). Corre hasta que el cliente la dé de baja."}
            {form.paymentMode === "onetime" && "El cliente paga TODOS los meses de una (un solo cobro, sin débito automático). Vence al final y hay que renovar a mano. 12+ meses aplica el descuento anual de la tarifa."}
            {form.paymentMode === "plan" && "MES GRATIS = 2 links. Link 2 (pago único): el PROPORCIONAL de los días que quedan de ESTE mes (hoy → 1°) — esos días no se regalan; se paga ahora o después. El período GRATIS arranca ese 1° y dura la promo. Link 1 (suscripción): hoy paga $0 y el primer débito completo cae el 1° al terminar el gratis — y de ahí SIEMPRE el 1°."}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className={label}>Desde</label><input className={input} type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} /></div>
            {form.paymentMode === "onetime" && (
              <div><label className={label}>Meses a pagar de una *</label><input className={input} type="number" min={1} value={form.durationMonths} onChange={(e) => set("durationMonths", e.target.value)} /></div>
            )}
            {form.paymentMode === "plan" && (
              <div>
                <label className={label}>Tiempo gratis * <span className="font-normal text-gray-400">(personalizable por promo)</span></label>
                <div className="flex gap-2">
                  <input className={input} type="number" min={1} value={form.promoMonths} onChange={(e) => set("promoMonths", e.target.value)} />
                  <select className={input} value={form.promoUnit} onChange={(e) => set("promoUnit", e.target.value)}>
                    <option value="months">meses</option>
                    <option value="days">días</option>
                  </select>
                </div>
              </div>
            )}
            {form.paymentMode === "plan" && (
              <div className="sm:col-span-2">
                <label className={label}>Link 2 — pago único del proporcional (gap) <span className="font-normal text-gray-400">(depende del cliente: ahora o después)</span></label>
                <div className="flex items-center gap-4 flex-wrap">
                  <label className="text-sm flex items-center gap-1.5 cursor-pointer">
                    <input type="radio" name="gapCuando" checked={form.gapCuando === "ahora"} onChange={() => set("gapCuando", "ahora")} />
                    Generarlo AHORA (salen los 2 links juntos)
                  </label>
                  <label className="text-sm flex items-center gap-1.5 cursor-pointer">
                    <input type="radio" name="gapCuando" checked={form.gapCuando === "despues"} onChange={() => set("gapCuando", "despues")} />
                    Después — queda pre-cargado en Inventario (botón Proporcional)
                  </label>
                  <label className="text-sm flex items-center gap-1.5 cursor-pointer">
                    <input type="radio" name="gapCuando" checked={form.gapCuando === "regalar"} onChange={() => set("gapCuando", "regalar")} />
                    <span><b>Regalarlo</b> — el gratis corre desde HOY; sin link 2 ni proporcional, nunca</span>
                  </label>
                </div>
                {form.gapCuando === "regalar" && (
                  <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-2 py-1.5 mt-2">
                    REGALO LIMPIO: el período gratis arranca hoy mismo. Si termina justo un 1°, ese día cobra el mes completo; si termina a mitad de mes, MP corre el cobro al 1° siguiente y esos días van de yapa (te lo muestro al generar).
                  </p>
                )}
                {form.gapCuando === "despues" && (
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <label className="text-xs text-gray-600">Marcarlo en Inventario (celeste "sin cobrar") desde:</label>
                    <input type="date" className="text-sm border border-gray-300 rounded-lg px-2 py-1.5" value={form.gapRecordar} onChange={(e) => set("gapRecordar", e.target.value)} />
                    <span className="text-xs text-gray-400">vacío = aparece marcado de una</span>
                  </div>
                )}
              </div>
            )}
            <div><label className={label}>Descuento (%)</label><input className={input} type="number" value={form.discountPct} onChange={(e) => set("discountPct", e.target.value)} /></div>
            <div><label className={label}>Precio manual mensual (opcional)</label><input className={input} type="number" value={form.priceOverride} onChange={(e) => set("priceOverride", e.target.value)} placeholder="usa tarifa si vacio" /></div>
          </div>
          {form.paymentMode === "onetime" && Number(form.m2) > 0 && Number(form.durationMonths) >= 1 && (
            <p className="text-xs text-gray-500 mt-2">El total exacto lo calcula el sistema con la tarifa vigente × {form.durationMonths} meses (menos descuentos) y te lo muestra al generar el link.</p>
          )}
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
            <p className="text-sm text-gray-700 mb-1">
              {result.paymentMode === "onetime"
                ? `Link generado · PAGO ÚNICO $${(result.total || 0).toLocaleString("es-AR")} (${result.duration} ${result.duration === 1 ? "mes" : "meses"} de una)`
                : result.paymentMode === "plan"
                  ? `LINK 1 (suscripción) generado · $${result.monthly.toLocaleString("es-AR")}/mes · hoy paga $0`
                  : `Link generado · $${result.monthly.toLocaleString("es-AR")}/mes · suscripción mensual`}
            </p>
            {/* CICLO completo del mes gratis, para que el operador sepa qué le va a pasar al cliente */}
            {result.paymentMode === "plan" && cicloPlan && (
              <div className={`rounded-lg px-3 py-2 mb-2 text-xs border ${cicloPlan.regalado ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-violet-50 border-violet-200 text-violet-900"}`}>
                <b>Ciclo:</b>{" "}
                {cicloPlan.regalado
                  ? <><b>GRATIS desde HOY</b> hasta el <b>{cicloPlan.finGratisTxt}</b> (entrada REGALADA — sin proporcional, sin link 2) · </>
                  : (result.gapDays ?? 0) > 0
                    ? <>proporcional de <b>{result.gapDays} días</b> (${(result.gapAmount || 0).toLocaleString("es-AR")}, del {cicloPlan.desdeTxt} al {cicloPlan.inicioGratisTxt} — link 2, se paga ahora o después) · <b>gratis</b> del <b>{cicloPlan.inicioGratisTxt}</b> al <b>{cicloPlan.finGratisTxt}</b> · </>
                    : <>entra justo un 1° (sin proporcional) · <b>gratis</b> hasta el <b>{cicloPlan.finGratisTxt}</b> · </>}
                primer débito completo el <b>{cicloPlan.primerDebitoTxt}</b> y de ahí SIEMPRE el 1°.
                {result.trialDays ? <> (cupón del plan en MP: {result.trialDays} días sin débito)</> : null}
              </div>
            )}
            <div className="bg-white border border-gray-200 rounded-lg p-2 text-xs break-all text-gray-600 mb-3">{result.initPoint}</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button onClick={copiar} className="bg-gray-800 text-white py-2.5 rounded-lg text-sm font-medium">{copied ? "Copiado!" : "Copiar link"}</button>
              <a href={waUrl} target="_blank" rel="noreferrer" className="bg-green-500 text-white py-2.5 rounded-lg text-sm font-medium text-center">Enviar por WhatsApp</a>
              <a href={mailUrl} className="bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium text-center">Enviar por mail</a>
            </div>

            {/* LINK 2 (gap): si se generó ahora, mostrarlo con sus botones; si se difirió, decir dónde vive */}
            {result.paymentMode === "plan" && (result.gapDays ?? 0) > 0 && (
              gapLink ? (
                <div className="mt-3 rounded-lg border border-violet-300 bg-white p-3">
                  <p className="text-sm text-gray-700 mb-1">
                    <b>LINK 2 (pago único del proporcional)</b> · ${(result.gapAmount || 0).toLocaleString("es-AR")} por {result.gapDays} días de alineación al 1°
                  </p>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs break-all text-gray-600 mb-2">{gapLink}</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button onClick={() => navigator.clipboard?.writeText(gapLink)} className="bg-violet-700 text-white py-2 rounded-lg text-sm font-medium">Copiar link 2</button>
                    <a href={`https://wa.me/${waPhone}?text=${encodeURIComponent(gapMsg)}`} target="_blank" rel="noreferrer" className="bg-green-500 text-white py-2 rounded-lg text-sm font-medium text-center">WhatsApp link 2</a>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1.5">La cuenta del cliente queda anexada a la SUSCRIPCIÓN (link 1), no a este pago único.</p>
                </div>
              ) : (
                <p className="mt-3 text-xs text-amber-800 bg-amber-50 border border-amber-300 rounded-lg px-3 py-2">
                  El proporcional de <b>{result.gapDays} días</b> (${(result.gapAmount || 0).toLocaleString("es-AR")}) quedó <b>SIN generar</b> (a pedido). Cuando el cliente quiera pagarlo: <b>Inventario → su baulera → Proporcional</b> (ya queda pre-cargado ahí).
                </p>
              )
            )}
            <button onClick={() => setResult(null)} className="w-full mt-3 text-sm text-gray-500 underline">Generar otra venta</button>
          </section>
        )}
      </div>
    </div>
  );
}
