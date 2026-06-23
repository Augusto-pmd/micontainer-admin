import { useEffect, useState } from 'react';
import { getWaitlistServices, deleteWaitlistServices } from '../../services/waitlist.services';

export default function Waitlist() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try { const r = await getWaitlistServices(); setItems(r.data || []); }
    catch { setError('No se pudo cargar la lista de espera.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const remove = async (id: string) => {
    if (!window.confirm('¿Eliminar este anotado de la lista de espera?')) return;
    try { await deleteWaitlistServices(id); setItems((x) => x.filter((i) => i.id !== id)); }
    catch { window.alert('No se pudo eliminar.'); }
  };

  if (loading) return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600" /></div>;
  if (error) return <div className="text-center py-16 text-red-500 text-sm">{error}</div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Lista de espera</h1>
        <p className="text-sm text-gray-500 mt-0.5">Clientes anotados cuando una medida no tenía stock — {items.length} en total</p>
      </div>
      {items.length === 0 ? (
        <div className="text-center py-16 text-gray-400"><p className="text-lg font-medium">No hay anotados</p></div>
      ) : (
        <div className="overflow-x-auto border border-gray-200 rounded-xl">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Email</th>
                <th className="text-left px-4 py-3 font-semibold">Nombre</th>
                <th className="text-left px-4 py-3 font-semibold">Teléfono</th>
                <th className="text-left px-4 py-3 font-semibold">Medida</th>
                <th className="text-left px-4 py-3 font-semibold">Fecha</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-t border-gray-100">
                  <td className="px-4 py-3">{it.email || '—'}</td>
                  <td className="px-4 py-3">{it.name || '—'}</td>
                  <td className="px-4 py-3">{it.phone || '—'}</td>
                  <td className="px-4 py-3">{it.m2 ? `${it.m2} m²` : (it.category || '—')}</td>
                  <td className="px-4 py-3">{it.createdAt ? new Date(it.createdAt).toLocaleDateString('es-AR') : '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => remove(it.id)} className="text-red-600 hover:text-red-800 text-sm font-semibold">Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
