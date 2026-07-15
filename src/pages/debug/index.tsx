import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../stores/authStore';

// DEBUG — sección del PROGRAMADOR (Lucas). Acceso: solo role-programador (guard en AppRouter).
// Base extensible: acá se van sumando herramientas de diagnóstico a medida que hagan falta
// (la vieja ruta /debug-cobros-* del backend se eliminó por seguridad — sin auth; lo que se
// re-agregue acá va SIEMPRE detrás del login + requireStaff del backend).
export default function Debug() {
  const { user } = useAuth();
  const [health, setHealth] = useState<{ ok: boolean | null; ms: number | null; detalle: string }>({ ok: null, ms: null, detalle: '' });
  const [checking, setChecking] = useState(false);

  const pingBackend = async () => {
    setChecking(true);
    const t0 = performance.now();
    try {
      const r = await api.get('/health');
      setHealth({ ok: true, ms: Math.round(performance.now() - t0), detalle: JSON.stringify(r.data) });
    } catch (e: any) {
      setHealth({ ok: false, ms: Math.round(performance.now() - t0), detalle: e?.message || 'sin respuesta' });
    } finally { setChecking(false); }
  };
  useEffect(() => { pingBackend(); }, []);

  const card = 'bg-white rounded-xl border border-gray-200 p-4';
  const h2 = 'font-semibold text-gray-800 mb-2';

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Debug</h1>
      <p className="text-sm text-gray-500 mb-6">Herramientas del programador. Esta sección crece a medida que agregamos diagnósticos.</p>

      <div className="space-y-4">
        <section className={card}>
          <h2 className={h2}>Sesión</h2>
          <div className="text-sm text-gray-700 space-y-1">
            <p>Email: <b>{user?.email}</b></p>
            <p>Rol: <b className="text-violet-700">{String(user?.role)}</b></p>
          </div>
        </section>

        <section className={card}>
          <div className="flex items-center justify-between mb-2">
            <h2 className={h2} style={{ marginBottom: 0 }}>Backend (Functions)</h2>
            <button onClick={pingBackend} disabled={checking}
              className="px-3 py-1.5 bg-gray-800 text-white rounded-lg text-sm font-semibold disabled:opacity-50">
              {checking ? 'Consultando…' : 'Re-consultar'}
            </button>
          </div>
          <div className="text-sm text-gray-700 space-y-1">
            <p>Estado: {health.ok === null ? '…' : health.ok
              ? <b className="text-green-700">OK ({health.ms} ms)</b>
              : <b className="text-red-700">SIN RESPUESTA ({health.detalle})</b>}
            </p>
            {health.ok && <p className="text-xs text-gray-500 break-all">{health.detalle}</p>}
            <p className="text-xs text-gray-400">API: {String((api.defaults as any).baseURL || '(base relativa)')}</p>
          </div>
        </section>

        <section className={card}>
          <h2 className={h2}>Accesos directos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            <a className="text-violet-700 underline" href="https://console.firebase.google.com/project/mc-nordelta-2026/overview" target="_blank" rel="noreferrer">Consola Firebase (mc-nordelta-2026)</a>
            <a className="text-violet-700 underline" href="https://www.mercadopago.com.ar/subscription-plans/list" target="_blank" rel="noreferrer">Mercado Pago — Suscripciones/Planes</a>
            <a className="text-violet-700 underline" href="https://vercel.com" target="_blank" rel="noreferrer">Vercel — deploys del panel</a>
            <a className="text-violet-700 underline" href="https://github.com/Augusto-pmd/Micofrontend" target="_blank" rel="noreferrer">GitHub — backend/web (master)</a>
            <a className="text-violet-700 underline" href="https://github.com/Augusto-pmd/micontainer-admin" target="_blank" rel="noreferrer">GitHub — admin (dev)</a>
            <a className="text-violet-700 underline" href="/auditoria">Auditoría interna (audit_log)</a>
          </div>
        </section>

        <section className={card}>
          <h2 className={h2}>Próximas herramientas</h2>
          <ul className="text-sm text-gray-500 list-disc pl-5 space-y-1">
            <li>Inspector de reservas/deudas por baulera (lectura, con auth — reemplazo seguro del viejo debug)</li>
            <li>Estado de suscripciones MP vs tarifa (las 10 sin matchear del reprice)</li>
            <li>Log de webhooks recientes (cobros procesados / errores)</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
