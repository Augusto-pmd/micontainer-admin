import { useEffect, useMemo, useState } from 'react';
import { getWaitlistServices, deleteWaitlistServices } from '../../services/waitlist.services';

const normM2 = (m2: unknown) => String(Number(m2));

interface WLItem {
  id: string; email?: string; name?: string; phone?: string;
  m2?: number | null; category?: string; type?: string;
  desiredDate?: string | null; createdAt?: string;
}

export default function Waitlist() {
  const [items, setItems] = useState<WLItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeF, setTypeF] = useState<'todas' | 'futuro' | 'sin_stock'>('todas');
  const [m2F, setM2F] = useState('todas');

  const load = async () => {
    setLoading(true);
    try { const r = await getWaitlistServices(); setItems(r.data || []); }
    catch { setError('No se pudo cargar.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const remove = async (id: string) => {
    if (!window.confirm('¿Eliminar este anotado?')) return;
    try { await deleteWaitlistServices(id); setItems((x) => x.filter((i) => i.id !== id)); }
    catch { window.alert('No se pudo eliminar.'); }
  };

  const medidas = useMemo(
    () => Array.from(new Set(items.filter((i) => i.m2 != null).map((i) => normM2(i.m2)))).sort((a, b) => Number(a) - Number(b)),
    [items]);

  // prioridad: el que se anotó primero va primero (createdAt asc)
  const filtered = useMemo(() => items
    .filter((i) => typeF === 'todas' || (i.type || 'sin_stock') === typeF)
    .filter((i) => m2F === 'todas' || normM2(i.m2) === m2F)
    .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt))),
    [items, typeF, m2F]);

  const demanda = useMemo(() => {
    const map: Record<string, number> = {};
    items.forEach((i) => { if (i.m2 != null) { const k = normM2(i.m2); map[k] = (map[k] || 0) + 1; } });
    return Object.entries(map).sort((a, b) => Number(a[0]) - Number(b[0]));
  }, [items]);

  if (loading) return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600" /></div>;
  if (error) return <div className="text-center py-16 text-red-500 text-sm">{error}</div>;

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Reservas a futuro / diferidas</h1>
        <p className="text-sm text-gray-500 mt-0.5">Anotados por orden de prioridad (el primero que se anotó, va primero). {items.length} en total.</p>
      </div>

      {demanda.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          <span className="text-xs text-gray-400 self-center">Demanda:</span>
          {demanda.map(([m, n]) => (
            <span key={m} className="text-xs bg-gray-100 text-gray-700 rounded-full px-3 py-1">{m} m²: <b>{n}</b></span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex rounded-lg border border-gray-300 overflow-hidden text-sm">
          {([['todas', 'Todas'], ['futuro', 'A futuro'], ['sin_stock', 'Sin stock']] as const).map(([v, l]) => (
            <button key={v} onClick={() => setTypeF(v)} className={`px-3 py-1.5 ${typeF === v ? 'bg-green-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>{l}</button>
          ))}
        </div>
        <select value={m2F} onChange={(e) => setM2F(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
          <option value="todas">Todas las medidas</option>
          {medidas.map((m) => <option key={m} value={m}>{m} m²</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400"><p className="text-lg font-medium">No hay anotados</p></div>
      ) : (
        <div className="overflow-x-auto border border-gray-200 rounded-xl">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">#</th>
                <th className="text-left px-4 py-3 font-semibold">Tipo</th>
                <th className="text-left px-4 py-3 font-semibold">Medida</th>
                <th className="text-left px-4 py-3 font-semibold">Quiere entrar</th>
                <th className="text-left px-4 py-3 font-semibold">Contacto</th>
                <th className="text-left px-4 py-3 font-semibold">Anotado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((it, i) => {
                const futuro = (it.type || 'sin_stock') === 'futuro';
                return (
                  <tr key={it.id} className="border-t border-gray-100">
                    <td className="px-4 py-3 font-semibold text-gray-700">{i + 1}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${futuro ? 'bg-violet-100 text-violet-700' : 'bg-amber-100 text-amber-700'}`}>{futuro ? 'A futuro' : 'Sin stock'}</span>
                    </td>
                    <td className="px-4 py-3">{it.m2 ? `${it.m2} m²` : (it.category || '—')}</td>
                    <td className="px-4 py-3">{it.desiredDate ? new Date(it.desiredDate).toLocaleDateString('es-AR') : '—'}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{it.name || '—'}</div>
                      <div className="text-xs text-gray-500">{it.email || ''}{it.phone ? ` · ${it.phone}` : ''}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{it.createdAt ? new Date(it.createdAt).toLocaleDateString('es-AR') : '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => remove(it.id)} className="text-red-600 hover:text-red-800 text-sm font-semibold">Eliminar</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
