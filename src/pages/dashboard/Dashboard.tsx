import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MdMap } from "react-icons/md";
import { BsGrid, BsPersonBoundingBox } from "react-icons/bs";
import { FaClipboardList, FaUserTie, FaFileInvoiceDollar, FaBoxOpen } from "react-icons/fa6";
import { HiUsers, HiOfficeBuilding } from "react-icons/hi";
import { IoMdSettings } from "react-icons/io";
import { useAuth } from "@/stores/authStore";
import { UserRole } from "@/types/auth";
import { getAllStorageRoomsServices } from "@/services/storageRoom.services";
import { getAdminReservations } from "@/services/reservation.admin.services";
import { getMetricasServices, type MetricasNegocio } from "@/services/pricing.services";
import { useTour } from "@/hooks/useTour";

interface Stats {
  total: number;
  available: number;
  occupied: number;
  blocked: number;
  billing: number | null;
  loading: boolean;
}

function greeting(firstName: string) {
  const h = new Date().getHours();
  const saludo = h < 12 ? "Buenos días" : h < 20 ? "Buenas tardes" : "Buenas noches";
  return `${saludo}, ${firstName}`;
}

function formatDate() {
  const d = new Date().toLocaleDateString("es-AR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  return d.charAt(0).toUpperCase() + d.slice(1).toLowerCase().replace(/ de /g, " de ");
}

function KpiCard({ label, value, sub, color }: {
  label: string; value: string | number; sub?: string;
  color: "brand" | "green" | "red" | "gray";
}) {
  const wrap = {
    brand: "bg-green-500 text-white",
    green: "bg-green-50 border border-green-200",
    red:   "bg-red-50 border border-red-200",
    gray:  "bg-gray-50 border border-gray-200",
  }[color];
  const val = {
    brand: "text-white",
    green: "text-green-700",
    red:   "text-red-600",
    gray:  "text-gray-900",
  }[color];
  const muted = color === "brand" ? "text-white/70" : "text-gray-400";

  return (
    <div className={`rounded-xl p-4 ${wrap}`}>
      <p className={`text-xs font-semibold uppercase tracking-widest mb-1 ${muted}`}>{label}</p>
      <p className={`text-3xl font-bold tracking-tight tabular-nums ${val}`}>{value}</p>
      {sub && <p className={`text-xs mt-1 ${muted}`}>{sub}</p>}
    </div>
  );
}

const QUICK_LINKS = [
  { href: "/inventory",      Icon: BsGrid,          label: "Inventario",   desc: "Estado de bauleras por piso",    roles: [UserRole.ADMIN, UserRole.OPERATOR] },
  { href: "/orders",         Icon: FaClipboardList,  label: "Órdenes",      desc: "Reservas y contratos activos",   roles: [UserRole.ADMIN, UserRole.OPERATOR] },
  { href: "/customers",      Icon: HiUsers,          label: "Clientes",     desc: "Base de datos de inquilinos",    roles: [UserRole.ADMIN, UserRole.OPERATOR] },
  { href: "/branch",         Icon: HiOfficeBuilding, label: "Sucursales",   desc: "Nordelta y futuras sucursales",  roles: [UserRole.ADMIN] },
  { href: "/operators",      Icon: FaUserTie,        label: "Operadores",   desc: "Usuarios del panel admin",       roles: [UserRole.ADMIN] },
  // "Precios" (/pricing-engine) apuntaba a la pantalla ROTA que se retiró del menú el 11/07
  // (auditoría v3 N5: este acceso quedó vivo por error). Los precios reales viven en Tarifas.
  { href: "/tarifas",        Icon: IoMdSettings,     label: "Tarifas",      desc: "Precios por medida y planes MP", roles: [UserRole.ADMIN] },
  { href: "/global-map",     Icon: MdMap,            label: "Mapa global",  desc: "Vista de edificios y espacios",  roles: [UserRole.ADMIN, UserRole.OPERATOR] },
];

export default function Dashboard() {
  const { user } = useAuth();
  useTour(true);
  const [stats, setStats] = useState<Stats>({ total: 0, available: 0, occupied: 0, blocked: 0, billing: null, loading: true });
  // Altas de Face ID esperando (clientes que subieron su foto desde el portal): botón violeta
  // titilante que lleva a Ventas en curso, donde está el alta manual (dispositivo Hikvision).
  const [faceQueued, setFaceQueued] = useState(0);
  // Clientes que eligieron candado/kit: se entregan y cobran en persona → hay que prepararlos.
  const [addonsPending, setAddonsPending] = useState(0);
  // MÉTRICAS DEL NEGOCIO (26/08): SOLO dueño (ADMIN/PROGRAMADOR) — plata por m², facturación,
  // potencial y brecha. Los operadores no ven este cuadro ni se consulta el endpoint para ellos.
  const esDueno = user?.role === UserRole.PROGRAMADOR || user?.role === UserRole.ADMIN;
  const [met, setMet] = useState<MetricasNegocio | null>(null);
  const [metErr, setMetErr] = useState(false);
  useEffect(() => {
    if (!esDueno) return;
    (async () => {
      try { setMet(await getMetricasServices()); }
      catch { setMetErr(true); }
    })();
  }, [esDueno]);

  // DESCARGAR / IMPRIMIR el cuadro (pedido Lucas 28/08): abre una vista lista para imprimir con los
  // números del cuadro MÁS un "Puntos clave" que no está en pantalla (anualizado, ticket promedio,
  // descuento efectivo vs lista, palanca principal, US$/m²/año). Desde el diálogo de impresión se
  // guarda como PDF ("Guardar como PDF") o se imprime — mismo botón para las dos cosas.
  const imprimirMetricas = () => {
    if (!met) return;
    const ar = (n: number) => `$${Math.round(n).toLocaleString("es-AR")}`;
    const rate = met.dolar?.blue || met.dolar?.oficial || null;
    const rateTag = met.dolar?.blue ? "blue" : "oficial";
    const usd = (n: number, dec = 0) => rate ? `US$ ${(n / rate).toLocaleString("es-AR", { maximumFractionDigits: dec, minimumFractionDigits: dec })}` : "—";
    const pctOcup = met.padron.m2 > 0 ? ((met.ocupadas.m2 / met.padron.m2) * 100).toFixed(1) : "—";
    const descEfectivo = met.porM2.tarifaPromedio && met.porM2.realOcupado
      ? (100 - (met.porM2.realOcupado / met.porM2.tarifaPromedio) * 100).toFixed(1) : null;
    const ticket = met.ocupadas.unidades > 0 ? met.facturacion.total / met.ocupadas.unidades : 0;
    const palanca = met.brecha.porLibres >= met.brecha.porPrecios ? "llenar lo libre" : "alinear precios de lo ocupado";
    const hoy = new Date().toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });
    const fila = (k: string, v: string, s?: string) =>
      `<tr><td>${k}</td><td class="v">${v}</td><td class="s">${s || ""}</td></tr>`;
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Métricas MiContainer — ${hoy}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Segoe UI',system-ui,sans-serif;color:#14201a;background:#fff;padding:32px;max-width:800px;margin:0 auto}
  h1{font-size:22px;letter-spacing:-.02em} .sub{color:#5c6b62;font-size:12px;margin-top:2px}
  .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #16a34a;padding-bottom:12px;margin-bottom:20px}
  .badge{font-size:10px;font-weight:700;letter-spacing:.08em;color:#166534;border:1px solid #86efac;border-radius:99px;padding:3px 10px;text-transform:uppercase}
  .tiles{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:22px}
  .tile{border:1px solid #d8e0da;border-radius:10px;padding:12px}
  .tile.hero{background:#16a34a;border-color:#16a34a;color:#fff}
  .tile p.l{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#7a8a80;margin-bottom:4px}
  .tile.hero p.l{color:rgba(255,255,255,.75)}
  .tile p.n{font-size:17px;font-weight:800;font-variant-numeric:tabular-nums;letter-spacing:-.01em}
  .tile p.s{font-size:10px;color:#5c6b62;margin-top:3px;font-variant-numeric:tabular-nums}
  .tile.hero p.s{color:rgba(255,255,255,.75)}
  h2{font-size:13px;text-transform:uppercase;letter-spacing:.08em;color:#166534;margin:0 0 8px}
  table{width:100%;border-collapse:collapse;font-size:12px}
  td{padding:7px 8px;border-bottom:1px solid #e5eae6;vertical-align:top}
  td.v{font-weight:700;text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}
  td.s{color:#5c6b62;font-size:11px;text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}
  .foot{margin-top:20px;font-size:9.5px;color:#7a8a80;border-top:1px solid #e5eae6;padding-top:8px;line-height:1.5}
  @media print{body{padding:0} .noprint{display:none}}
  .noprint{margin:18px 0;text-align:center}
  .noprint button{background:#16a34a;color:#fff;border:0;border-radius:8px;padding:10px 22px;font-size:14px;font-weight:700;cursor:pointer}
</style></head><body>
<div class="head">
  <div><h1>MiContainer · Métricas del negocio</h1><p class="sub">Sucursal Nordelta · ${hoy} · uso interno</p></div>
  <span class="badge">Confidencial</span>
</div>
<div class="tiles">
  <div class="tile hero"><p class="l">Rinde 1 m² ocupado</p><p class="n">${met.porM2.realOcupado ? ar(met.porM2.realOcupado) + "/mes" : "—"}</p><p class="s">${met.porM2.realOcupado && rate ? usd(met.porM2.realOcupado, 1) + "/mes" : ""}</p></div>
  <div class="tile"><p class="l">Facturación mensual</p><p class="n">${ar(met.facturacion.total)}</p><p class="s">${usd(met.facturacion.total)} · MP + efectivo</p></div>
  <div class="tile"><p class="l">Ocupación de m²</p><p class="n">${pctOcup}%</p><p class="s">${Math.round(met.ocupadas.m2).toLocaleString("es-AR")} de ${Math.round(met.padron.m2).toLocaleString("es-AR")} m²</p></div>
  <div class="tile"><p class="l">Libre para alquilar</p><p class="n">${met.libres.unidades} baul. · ${Math.round(met.libres.m2)} m²</p><p class="s">potencial +${ar(met.potencialLibres)}/mes</p></div>
  <div class="tile"><p class="l">Techo a tarifa plena</p><p class="n">${ar(met.techo)}</p><p class="s">${usd(met.techo)}/mes</p></div>
  <div class="tile"><p class="l">Brecha al techo</p><p class="n">${ar(met.brecha.total)}</p><p class="s">libres ${ar(met.brecha.porLibres)} · precios ${ar(met.brecha.porPrecios)}</p></div>
</div>
<h2>Puntos clave</h2>
<table>
${fila("Facturación anualizada (run-rate)", ar(met.facturacion.total * 12), usd(met.facturacion.total * 12) + "/año")}
${fila("Rendimiento anual de 1 m² ocupado", met.porM2.realOcupado ? ar(met.porM2.realOcupado * 12) : "—", met.porM2.realOcupado ? usd(met.porM2.realOcupado * 12) + "/m²/año" : "")}
${fila("Ticket promedio por baulera ocupada", ar(ticket) + "/mes", usd(ticket) + " · " + met.ocupadas.unidades + " bauleras")}
${fila("Precio de lista promedio del padrón", met.porM2.tarifaPromedio ? ar(met.porM2.tarifaPromedio) + "/m²" : "—", descEfectivo ? "descuento efectivo vs lista: " + descEfectivo + "%" : "")}
${fila("Rendimiento del m² libre (a tarifa)", met.porM2.potencialLibre ? ar(met.porM2.potencialLibre) + "/m²/mes" : "—", "mejor mix que lo ya ocupado")}
${fila("Palanca principal de crecimiento", palanca, "libres " + ar(met.brecha.porLibres) + " vs precios " + ar(met.brecha.porPrecios))}
${fila("Padrón físico", met.padron.unidades + " bauleras · " + Math.round(met.padron.m2).toLocaleString("es-AR") + " m²", met.padron.sinMedida ? met.padron.sinMedida + " sin m² cargados" : "")}
${fila("Contratos", met.facturacion.subsActivas + " suscripciones activas", (met.facturacion.subsPausadas ? met.facturacion.subsPausadas + " pausadas · " : "") + met.facturacion.baulerasEfectivo + " en efectivo")}
</table>
<p class="foot">Facturación <b>configurada</b> (MP + efectivo), no cobranza efectiva · ${rate ? `conversión a dólar ${rateTag} $${rate.toLocaleString("es-AR")}` : "sin cotización de dólar disponible"} · calculado en vivo el ${hoy} ${new Date(met.generado).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })} hs · MiContainer — documento interno, no distribuir sin autorización.</p>
<div class="noprint"><button onclick="window.print()">Imprimir / Guardar como PDF</button></div>
</body></html>`;
    const w = window.open("", "_blank");
    if (!w) { alert("El navegador bloqueó la ventana — permití pop-ups para el panel."); return; }
    w.document.write(html);
    w.document.close();
  };
  useEffect(() => {
    (async () => {
      try {
        const res: any = await getAdminReservations({ limit: 200 } as any);
        const rows: any[] = Array.isArray(res) ? res : (res.data || res.reservations || []);
        setFaceQueued(rows.filter((r) => r.faceEnrollStatus === "queued").length);
        setAddonsPending(rows.filter((r) =>
          (r.status === "active" || r.status === "pending_payment") &&
          Array.isArray(r.addons) && r.addons.some((k: string) => k === "lock" || k === "pack")
        ).length);
      } catch { /* sin badge */ }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [allRes, occRes, blkRes] = await Promise.all([
          getAllStorageRoomsServices({ limit: 1 }),
          // Ocupadas CON data: el KPI Facturación = Σ precio mensual de las bauleras ocupadas.
          // (Antes sumaba o.price de las ÓRDENES — campo que no existe → daba $0 siempre.)
          getAllStorageRoomsServices({ limit: 500, status: "occupied" }),
          getAllStorageRoomsServices({ limit: 1, status: "blocked" }),
        ]);
        const occRows: any[] = (occRes as any).data || [];
        const billing = occRows.length > 0
          ? occRows.reduce((sum: number, r: any) => sum + (Number(r.price) || 0), 0)
          : null;
        const blocked = blkRes.total;
        setStats({ total: allRes.total, occupied: occRes.total, blocked, available: allRes.total - occRes.total - blocked, billing, loading: false });
      } catch {
        setStats(s => ({ ...s, loading: false }));
      }
    })();
  }, []);

  const occupancyPct = stats.total > 0 ? ((stats.occupied / stats.total) * 100).toFixed(1) : "—";
  const availablePct = stats.total > 0 ? (100 - parseFloat(occupancyPct === "—" ? "0" : occupancyPct)).toFixed(1) : "—";
  // PROGRAMADOR = súper-rol: ve TODOS los accesos rápidos (el filtro exacto lo dejaba sin ninguno)
  const visibleLinks = user?.role === UserRole.PROGRAMADOR ? QUICK_LINKS : QUICK_LINKS.filter(l => l.roles.includes(user?.role as any));

  return (
    <div id="tour-dashboard" className="p-6 max-w-5xl">
      {/* Encabezado */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
          {user?.firstName ? greeting(user.firstName) : "Panel de administración"}
        </h1>
        <p className="text-sm text-gray-400 mt-0.5 capitalize">{formatDate()}</p>
        <div className="flex items-center gap-3 mt-4 flex-wrap">
          <Link to="/vender" className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-5 py-2.5 rounded-xl shadow-sm transition-colors">
            <FaFileInvoiceDollar className="text-lg" /> Vender / Generar link de pago
          </Link>
          {faceQueued > 0 && (
            <Link to="/ventas" className="titila inline-flex items-center gap-2 bg-violet-700 hover:bg-violet-800 text-white font-semibold px-5 py-2.5 rounded-xl shadow-sm transition-colors">
              <BsPersonBoundingBox className="text-lg" /> Altas de Face ID pendientes
              <span className="bg-white text-violet-700 text-xs font-bold rounded-full px-2 py-0.5">{faceQueued}</span>
            </Link>
          )}
          {addonsPending > 0 && (
            <Link to="/ventas" className="inline-flex items-center gap-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-semibold px-5 py-2.5 rounded-xl shadow-sm transition-colors">
              <FaBoxOpen className="text-lg" /> Add-ons por entregar (candado/kit)
              <span className="bg-amber-600 text-white text-xs font-bold rounded-full px-2 py-0.5">{addonsPending}</span>
            </Link>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div id="tour-kpis" className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-10">
        <KpiCard label="Bauleras" value={stats.loading ? "…" : stats.total}   sub="Nordelta · Sector A"                  color="brand" />
        <KpiCard label="Disponibles" value={stats.loading ? "…" : stats.available} sub={`${availablePct}% libre`}        color="green" />
        <KpiCard label="Ocupadas"    value={stats.loading ? "…" : stats.occupied}  sub={`${occupancyPct}% ocupación`}    color={stats.occupied > 0 ? "red" : "gray"} />
        <KpiCard label="Bloqueadas"  value={stats.loading ? "…" : stats.blocked}   sub={stats.blocked > 0 ? "fuera de servicio" : "ninguna"} color="gray" />
        <KpiCard label="Facturación" value={stats.loading ? "…" : stats.billing !== null ? `$${stats.billing.toLocaleString("es-AR")}` : "—"} sub={stats.billing !== null ? "mensual · bauleras ocupadas" : "Sin datos aún"} color={stats.billing ? "green" : "gray"} />
      </div>

      {/* MÉTRICAS DEL NEGOCIO — solo dueño (ADMIN/PROGRAMADOR). Rendimiento por m², facturación
          en pesos y dólares, potencial de lo libre y brecha al techo. Calculado en vivo. */}
      {esDueno && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-10">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Métricas del negocio</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Visible solo para el dueño · facturación configurada (MP + efectivo), no cobrado</p>
            </div>
            <div className="flex items-center gap-2">
              {met && (
                <button onClick={imprimirMetricas}
                  title="Abre el reporte con los números del cuadro + puntos clave (anualizado, ticket promedio, descuento vs lista). Desde ahí: Imprimir o Guardar como PDF."
                  className="text-xs font-bold px-3 py-1.5 rounded-lg text-white bg-green-600 hover:bg-green-700">
                  ⬇ Descargar / Imprimir
                </button>
              )}
              <span className="text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5 uppercase tracking-wide">solo dueño</span>
            </div>
          </div>
          {metErr ? (
            <p className="text-sm text-red-600">No se pudieron calcular las métricas — reintentá recargando.</p>
          ) : !met ? (
            <p className="text-sm text-gray-400">Calculando…</p>
          ) : (() => {
            const ar = (n: number) => `$${Math.round(n).toLocaleString("es-AR")}`;
            const rate = met.dolar?.blue || met.dolar?.oficial || null;
            const rateTag = met.dolar?.blue ? "blue" : "oficial";
            const usd = (n: number, dec = 0) => rate ? `US$ ${(n / rate).toLocaleString("es-AR", { maximumFractionDigits: dec, minimumFractionDigits: dec })}` : null;
            const pctOcup = met.padron.m2 > 0 ? ((met.ocupadas.m2 / met.padron.m2) * 100).toFixed(1) : "—";
            const Tile = ({ label, value, sub, strong }: { label: string; value: string; sub?: string | null; strong?: boolean }) => (
              <div className={`rounded-xl border p-3.5 ${strong ? "bg-green-600 border-green-600" : "bg-gray-50 border-gray-200"}`}>
                <p className={`text-[10px] font-semibold uppercase tracking-widest mb-1 ${strong ? "text-white/70" : "text-gray-400"}`}>{label}</p>
                <p className={`text-xl font-bold tracking-tight tabular-nums ${strong ? "text-white" : "text-gray-900"}`}>{value}</p>
                {sub && <p className={`text-[11px] mt-0.5 tabular-nums ${strong ? "text-white/70" : "text-gray-500"}`}>{sub}</p>}
              </div>
            );
            return (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  <Tile strong label="Rinde 1 m² ocupado" value={met.porM2.realOcupado ? `${ar(met.porM2.realOcupado)}/mes` : "—"}
                    sub={met.porM2.realOcupado && rate ? `${usd(met.porM2.realOcupado, 1)}/mes · lista ${ar(met.porM2.tarifaPromedio || 0)}` : `lista ${ar(met.porM2.tarifaPromedio || 0)}/m²`} />
                  <Tile label="Facturación mensual" value={ar(met.facturacion.total)}
                    sub={`${usd(met.facturacion.total) || ""}${rate ? " · " : ""}MP ${ar(met.facturacion.mpAuthorized + met.facturacion.mpPaused)} + efectivo ${ar(met.facturacion.efectivo)}`} />
                  <Tile label="Ocupación de m²" value={`${pctOcup}%`}
                    sub={`${Math.round(met.ocupadas.m2).toLocaleString("es-AR")} de ${Math.round(met.padron.m2).toLocaleString("es-AR")} m² · ${met.ocupadas.unidades} bauleras`} />
                  <Tile label="Libre para alquilar" value={`${met.libres.unidades} bauleras · ${Math.round(met.libres.m2)} m²`}
                    sub={`potencial +${ar(met.potencialLibres)}/mes${rate ? ` (${usd(met.potencialLibres)})` : ""}`} />
                  <Tile label="Techo a tarifa plena" value={ar(met.techo)}
                    sub={`${usd(met.techo) || ""}${rate ? "/mes" : "por mes, todo alquilado a lista"}`} />
                  <Tile label="Brecha al techo" value={ar(met.brecha.total)}
                    sub={`llenar libres ${ar(met.brecha.porLibres)} · alinear precios ${ar(met.brecha.porPrecios)}`} />
                </div>
                <p className="text-[10px] text-gray-400 mt-3">
                  {met.facturacion.subsActivas} subs activas{met.facturacion.subsPausadas ? ` · ${met.facturacion.subsPausadas} pausadas (no cobran)` : ""} · {met.facturacion.baulerasEfectivo} en efectivo
                  {rate ? ` · dólar ${rateTag} $${rate.toLocaleString("es-AR")}` : " · sin cotización de dólar ahora"}
                  {met.padron.sinMedida ? ` · ${met.padron.sinMedida} bauleras sin m² cargados` : ""} · calculado {new Date(met.generado).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </>
            );
          })()}
        </div>
      )}

      {/* Acceso rápido */}
      <div id="tour-quicklinks">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
          Acceso rápido
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {visibleLinks.map(({ href, Icon, label, desc }) => (
            <Link
              key={href}
              to={href}
              className="flex items-start gap-3 p-3.5 rounded-xl border border-gray-100 bg-white hover:border-green-300 hover:bg-green-50 transition-colors duration-150 group"
            >
              <div className="mt-0.5 bg-green-100 text-green-700 p-2 rounded-lg group-hover:bg-green-200 transition-colors shrink-0">
                <Icon className="text-base" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800 group-hover:text-green-800">{label}</p>
                <p className="text-xs text-gray-400 mt-0.5 truncate">{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
