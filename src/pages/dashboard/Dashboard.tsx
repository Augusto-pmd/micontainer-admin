import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MdMap } from "react-icons/md";
import { BsGrid } from "react-icons/bs";
import { FaClipboardList, FaUserTie } from "react-icons/fa6";
import { HiUsers, HiOfficeBuilding } from "react-icons/hi";
import { IoMdSettings } from "react-icons/io";
import { useAuth } from "@/stores/authStore";
import { UserRole } from "@/types/auth";
import { getAllStorageRoomsServices } from "@/services/storageRoom.services";
import { getAllOrdersServices } from "@/services/order.services";
import { useTour } from "@/hooks/useTour";

interface Stats {
  total: number;
  available: number;
  occupied: number;
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
  { href: "/pricing-engine", Icon: IoMdSettings,     label: "Precios",      desc: "Motor de precios por tamaño",    roles: [UserRole.ADMIN] },
  { href: "/global-map",     Icon: MdMap,            label: "Mapa global",  desc: "Vista de edificios y espacios",  roles: [UserRole.ADMIN, UserRole.OPERATOR] },
];

export default function Dashboard() {
  const { user } = useAuth();
  useTour(true);
  const [stats, setStats] = useState<Stats>({ total: 0, available: 0, occupied: 0, billing: null, loading: true });

  useEffect(() => {
    (async () => {
      try {
        const [allRes, occRes, ordersRes] = await Promise.all([
          getAllStorageRoomsServices({ limit: 1 }),
          getAllStorageRoomsServices({ limit: 1, status: "occupied" }),
          getAllOrdersServices({ limit: 1000 }).catch(() => null),
        ]);
        // Sumar precios de órdenes activas para facturación real
        let billing: number | null = null;
        if (ordersRes && ordersRes.data?.length > 0) {
          billing = ordersRes.data.reduce((sum: number, o: any) => sum + (parseFloat(o.price) || 0), 0);
        }
        setStats({ total: allRes.total, occupied: occRes.total, available: allRes.total - occRes.total, billing, loading: false });
      } catch {
        setStats(s => ({ ...s, loading: false }));
      }
    })();
  }, []);

  const occupancyPct = stats.total > 0 ? ((stats.occupied / stats.total) * 100).toFixed(1) : "—";
  const availablePct = stats.total > 0 ? (100 - parseFloat(occupancyPct === "—" ? "0" : occupancyPct)).toFixed(1) : "—";
  const visibleLinks = QUICK_LINKS.filter(l => l.roles.includes(user?.role as any));

  return (
    <div id="tour-dashboard" className="p-6 max-w-5xl">
      {/* Encabezado */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
          {user?.firstName ? greeting(user.firstName) : "Panel de administración"}
        </h1>
        <p className="text-sm text-gray-400 mt-0.5 capitalize">{formatDate()}</p>
      </div>

      {/* KPIs */}
      <div id="tour-kpis" className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-10">
        <KpiCard label="Bauleras" value={stats.loading ? "…" : stats.total}   sub="Nordelta · Sector A"                  color="brand" />
        <KpiCard label="Disponibles" value={stats.loading ? "…" : stats.available} sub={`${availablePct}% libre`}        color="green" />
        <KpiCard label="Ocupadas"    value={stats.loading ? "…" : stats.occupied}  sub={`${occupancyPct}% ocupación`}    color={stats.occupied > 0 ? "red" : "gray"} />
        <KpiCard label="Facturación" value={stats.loading ? "…" : stats.billing !== null ? `$${stats.billing.toLocaleString("es-AR")}` : "—"} sub={stats.billing !== null ? "Órdenes activas" : "Sin datos aún"} color="gray" />
      </div>

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
