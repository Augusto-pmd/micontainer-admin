import { useEffect, useMemo, useState } from 'react';
import {
  getBranches,
  getPricingTable,
  savePricingTable,
  getAllRooms,
  saveRoomOverride,
  repriceSubscriptions,
  repriceAll,
  type PricingByM2,
  type RoomLite,
  type BranchLite,
} from '../../services/tarifas.services';

const fmt = (n: number) => (Number(n) || 0).toLocaleString('es-AR');
const normM2 = (m2: string | number) => String(Number(m2));
// Etiqueta de medida: 22.1 es la variante planta baja (mas cara).
const sizeLabel = (k: string) => (k === '22.1' ? '22 m\u00b2 PB' : `${k} m\u00b2`);

export default function Tarifas() {
  const [branches, setBranches] = useState<BranchLite[]>([]);
  const [branchId, setBranchId] = useState<string>('');
  const [byM2, setByM2] = useState<PricingByM2>({});
  const [savedByM2, setSavedByM2] = useState<PricingByM2>({});
  const [rooms, setRooms] = useState<RoomLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingPrices, setSavingPrices] = useState(false);
  const [savingRoom, setSavingRoom] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todas' | 'available' | 'occupied'>('todas');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [repriceM2, setRepriceM2] = useState<string | null>(null);
  const [repriceAmount, setRepriceAmount] = useState(0);
  const [repricePreview, setRepricePreview] = useState<any[] | null>(null);
  const [repriceLoading, setRepriceLoading] = useState(false);
  const [repriceNotify, setRepriceNotify] = useState(true);
  const [repriceMsg, setRepriceMsg] = useState('');
  const [allOpen, setAllOpen] = useState(false);
  const [allPreview, setAllPreview] = useState<any[] | null>(null);
  const [allLoading, setAllLoading] = useState(false);
  const [allMsg, setAllMsg] = useState('');
  const [repriceNoMatch, setRepriceNoMatch] = useState<any[]>([]);
  const [allNoMatch, setAllNoMatch] = useState<any[]>([]);

  // Cargar sucursales
  useEffect(() => {
    (async () => {
      try {
        const bs = await getBranches();
        setBranches(bs);
        setBranchId((prev) => prev || bs[0]?.id || 'nordelta');
      } catch {
        setBranchId('nordelta');
      }
    })();
  }, []);

  // Cargar precios + bauleras de la sucursal elegida
  const load = async (bid: string) => {
    if (!bid) return;
    setLoading(true);
    setMsg(null);
    try {
      const [p, r] = await Promise.all([getPricingTable(bid), getAllRooms(bid)]);
      const roomsArr = Array.isArray(r) ? r : [];
      // Precio de grupo por medida = el mas comun entre sus bauleras (si no esta configurado)
      const priceCount: Record<string, Record<string, number>> = {};
      roomsArr.forEach((rm) => {
        const k = normM2(rm.areaM2 || 0);
        const pr = String(Number(rm.price) || 0);
        if (Number(k) <= 0 || pr === '0') return;
        (priceCount[k] ??= {})[pr] = ((priceCount[k] || {})[pr] || 0) + 1;
      });
      const merged: PricingByM2 = { ...p };
      Object.keys(priceCount).forEach((k) => {
        if (merged[k] === undefined) {
          const best = Object.entries(priceCount[k]).sort(
            (a, b) => b[1] - a[1] || Number(a[0]) - Number(b[0])
          )[0];
          if (best) merged[k] = Number(best[0]);
        }
      });
      setByM2(merged);
      setSavedByM2(merged);
      setRooms(roomsArr);
    } catch {
      setMsg('No se pudieron cargar los datos de esta sucursal.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (branchId) load(branchId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  const sizes = useMemo(
    () => Object.keys(byM2).sort((a, b) => Number(a) - Number(b)),
    [byM2]
  );

  const setSizePrice = (k: string, v: string) =>
    setByM2((prev) => ({ ...prev, [k]: Number(v.replace(/\D/g, '')) }));

  const savePrices = async () => {
    setSavingPrices(true);
    setMsg(null);
    try {
      await savePricingTable(branchId, byM2, effectiveDate || undefined);
      const today = new Date().toISOString().slice(0, 10);
      setMsg(effectiveDate && effectiveDate > today
        ? `Cambio PROGRAMADO para el ${effectiveDate}. Hasta esa fecha sigue el precio actual.`
        : 'Precios guardados — aplican ya (web y ventas nuevas).');
    } catch {
      setMsg('Error guardando precios.');
    } finally {
      setSavingPrices(false);
    }
  };

  const openReprice = async (k: string) => {
    const amount = Number(byM2[k]) || 0;
    if (!(amount > 0)) { setMsg('Pone primero el precio nuevo de esa medida.'); return; }
    const current = Number(savedByM2[k]) || amount;
    setRepriceM2(k); setRepriceAmount(amount); setRepricePreview(null); setRepriceMsg(''); setRepriceLoading(true);
    try {
      const res: any = await repriceSubscriptions(branchId, Number(k), current, amount, true);
      setRepricePreview(res.afectados || []);
      setRepriceNoMatch(res.noMatch || []);
    } catch { setRepriceMsg('No se pudo cargar la vista previa.'); setRepricePreview([]); }
    finally { setRepriceLoading(false); }
  };
  const closeReprice = () => { setRepriceM2(null); setRepricePreview(null); setRepriceMsg(''); };
  const doReprice = async () => {
    if (repriceM2 == null) return;
    setRepriceLoading(true); setRepriceMsg('');
    try {
      const current = Number(savedByM2[repriceM2]) || repriceAmount;
      const res: any = await repriceSubscriptions(branchId, Number(repriceM2), current, repriceAmount, false, repriceNotify);
      setRepriceMsg('Listo: ' + res.actualizados + ' suscripcion(es) actualizada(s)' + (res.errores && res.errores.length ? (', ' + res.errores.length + ' con error') : '') + '.');
      setRepricePreview(null);
    } catch { setRepriceMsg('Error al aplicar el cambio.'); }
    finally { setRepriceLoading(false); }
  };

  const buildAllItems = () =>
    sizes
      .map((k) => ({ m2: Number(k), currentAmount: Number(savedByM2[k]) || 0, newAmount: Number(byM2[k]) || 0 }))
      .filter((it) => it.m2 > 0 && it.newAmount > 0);
  const openRepriceAll = async () => {
    setAllOpen(true); setAllPreview(null); setAllMsg(''); setAllLoading(true);
    try {
      const res: any = await repriceAll(branchId, buildAllItems(), true);
      setAllPreview(res.afectados || []);
      setAllNoMatch(res.noMatch || []);
    } catch { setAllMsg('No se pudo cargar la vista previa.'); setAllPreview([]); }
    finally { setAllLoading(false); }
  };
  const closeRepriceAll = () => { setAllOpen(false); setAllPreview(null); setAllMsg(''); };
  const doRepriceAll = async () => {
    setAllLoading(true); setAllMsg('');
    try {
      const res: any = await repriceAll(branchId, buildAllItems(), false, repriceNotify);
      setAllMsg('Listo: ' + res.actualizados + ' suscripcion(es) actualizada(s)' + (res.errores && res.errores.length ? (', ' + res.errores.length + ' con error') : '') + '.');
      setAllPreview(null);
    } catch { setAllMsg('Error al aplicar el cambio.'); }
    finally { setAllLoading(false); }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rooms
      .filter((r) => statusFilter === 'todas' || r.status === statusFilter)
      .filter(
        (r) =>
          !q ||
          String(r.space || r.name || r.id).toLowerCase().includes(q) ||
          String(r.areaM2).includes(q)
      )
      .sort((a, b) => String(a.space || a.id).localeCompare(String(b.space || b.id)));
  }, [rooms, search, statusFilter]);

  const updateRoomLocal = (id: string, patch: Partial<RoomLite>) =>
    setRooms((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const saveRoom = async (r: RoomLite) => {
    setSavingRoom(r.id);
    try {
      const ov =
        r.priceOverride === null || r.priceOverride === undefined
          ? null
          : Number(r.priceOverride);
      await saveRoomOverride(r.id, { priceOverride: ov, lockPrice: !!r.lockPrice });
      setMsg(`Baulera ${r.space || r.id} actualizada.`);
    } catch {
      setMsg(`Error guardando ${r.space || r.id}.`);
    } finally {
      setSavingRoom(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tarifas / Precios</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Precio por medida (web + ventas nuevas) y ajuste individual por baulera. Cada sucursal con su propia tarifa.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Sucursal</span>
          <select
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
          >
            {branches.length === 0 && <option value={branchId}>{branchId || 'nordelta'}</option>}
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name || b.id}</option>
            ))}
          </select>
        </div>
      </div>

      {msg && (
        <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-2 text-sm text-gray-700">
          {msg}
        </div>
      )}

      {loading ? (
        <div className="p-6 text-gray-500">Cargando tarifas…</div>
      ) : (
        <>
          <section className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-3">Precio por medida (m²)</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {sizes.map((k) => (
                <div key={k} className="flex items-center gap-2">
                  <span className="w-20 text-sm text-gray-600">{sizeLabel(k)}</span>
                  <div className="flex items-center gap-1 flex-1">
                    <span className="text-gray-400">$</span>
                    <input
                      type="text"
                      value={fmt(byM2[k] || 0)}
                      onChange={(e) => setSizePrice(k, e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                    />
                  </div>
                  <button type="button" onClick={() => openReprice(k)} title="Cambiar el valor a los clientes que ya alquilan esta medida" className="text-blue-700 hover:text-blue-900 text-xs font-semibold whitespace-nowrap">susc.</button>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-3 flex-wrap">
              <label className="text-sm text-gray-600 flex items-center gap-2">
                Aplicar desde:
                <input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)}
                  className="border border-gray-300 rounded-lg px-2 py-1 text-sm" />
              </label>
              <button
                onClick={savePrices}
                disabled={savingPrices}
                className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-60"
              >
                {savingPrices ? 'Guardando…' : 'Guardar precios'}
              </button>
              <button
                onClick={openRepriceAll}
                className="border border-blue-700 text-blue-700 hover:bg-blue-50 text-sm font-semibold px-4 py-2 rounded-lg"
                title="Aplicar los precios nuevos a TODAS las suscripciones activas ya alquiladas"
              >
                Aplicar a suscripciones
              </button>
              <span className="text-xs text-gray-400">
                Vacío = aplica ya. Con fecha futura, el cambio queda <b>programado</b> y entra solo ese día. Las medidas salen del inventario real.
              </span>
            </div>
          </section>

          {repriceM2 != null && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={closeReprice}>
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="px-5 py-4 border-b flex items-center justify-between">
                  <h3 className="font-bold text-gray-900">Actualizar suscripciones - {repriceM2} m2</h3>
                  <button onClick={closeReprice} className="text-gray-400 text-xl leading-none">x</button>
                </div>
                <div className="px-5 py-4">
                  {repriceLoading && !repricePreview ? (
                    <p className="text-sm text-gray-500">Cargando vista previa...</p>
                  ) : repricePreview ? (
                    <>
                      <p className="text-sm text-gray-700 mb-2">
                        Se cambia el valor a <b>${repriceAmount.toLocaleString('es-AR')}</b>/mes en <b>{repricePreview.length}</b> cliente(s) con suscripcion activa de {repriceM2} m2:
                      </p>
                      {repricePreview.length === 0 ? (
                        <p className="text-sm text-gray-500">No hay suscripciones activas de esta medida.</p>
                      ) : (
                        <div className="border rounded-lg divide-y max-h-64 overflow-y-auto mb-3">
                          {repricePreview.map((t: any) => (
                            <div key={t.id} className="flex justify-between items-center px-3 py-2 text-sm">
                              <span className="text-gray-800">{t.cliente || t.email || t.id}</span>
                              <span className="text-gray-600">${Number(t.actual).toLocaleString('es-AR')} &rarr; <b className="text-gray-900">${Number(t.nuevo).toLocaleString('es-AR')}</b></span>
                            </div>
                          ))}
                        </div>
                      )}
                      {repriceNoMatch.length > 0 && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 text-xs text-yellow-800 mb-3">
                          {repriceNoMatch.length} cliente(s) de esta medida sin suscripcion MP encontrada (email distinto o pago por otro medio): {repriceNoMatch.map((n: any) => n.name || n.email).filter(Boolean).slice(0, 8).join(', ')}{repriceNoMatch.length > 8 ? '...' : ''}
                        </div>
                      )}
                      {repricePreview.length > 0 && (
                        <>
                          <label className="flex items-center gap-2 text-sm text-gray-700 mb-3">
                            <input type="checkbox" checked={repriceNotify} onChange={(e) => setRepriceNotify(e.target.checked)} />
                            Avisar por mail a cada cliente del nuevo valor
                          </label>
                          <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-xs text-amber-800 mb-3">
                            Esto le cobra el nuevo valor a estos clientes desde su proximo debito en Mercado Pago. Revisa la lista antes de confirmar.
                          </div>
                          <div className="flex gap-2">
                            <button onClick={doReprice} disabled={repriceLoading} className="bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-60">
                              {repriceLoading ? 'Aplicando...' : ('Confirmar y aplicar a ' + repricePreview.length)}
                            </button>
                            <button onClick={closeReprice} className="text-gray-600 text-sm px-3">Cancelar</button>
                          </div>
                        </>
                      )}
                    </>
                  ) : null}
                  {repriceMsg && <p className="text-sm mt-3 text-gray-800">{repriceMsg}</p>}
                </div>
              </div>
            </div>
          )}

          {allOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={closeRepriceAll}>
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="px-5 py-4 border-b flex items-center justify-between">
                  <h3 className="font-bold text-gray-900">Aplicar precios a todas las suscripciones</h3>
                  <button onClick={closeRepriceAll} className="text-gray-400 text-xl leading-none">x</button>
                </div>
                <div className="px-5 py-4">
                  {allLoading && !allPreview ? (
                    <p className="text-sm text-gray-500">Cargando vista previa...</p>
                  ) : allPreview ? (
                    <>
                      <p className="text-sm text-gray-700 mb-2">
                        Se cambia el valor a <b>{allPreview.length}</b> suscripcion(es) activa(s) segun los precios nuevos:
                      </p>
                      {allPreview.length === 0 ? (
                        <p className="text-sm text-gray-500">No hay suscripciones con cambios para aplicar.</p>
                      ) : (
                        <div className="border rounded-lg divide-y max-h-64 overflow-y-auto mb-3">
                          {allPreview.map((t: any) => (
                            <div key={t.id} className="flex justify-between items-center px-3 py-2 text-sm">
                              <span className="text-gray-800">{t.m2} m2 &middot; {t.cliente || t.email || t.id}</span>
                              <span className="text-gray-600">${Number(t.actual).toLocaleString('es-AR')} &rarr; <b className="text-gray-900">${Number(t.nuevo).toLocaleString('es-AR')}</b></span>
                            </div>
                          ))}
                        </div>
                      )}
                      {allNoMatch.length > 0 && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 text-xs text-yellow-800 mb-3">
                          {allNoMatch.length} cliente(s) alquilado(s) sin suscripcion MP encontrada (email distinto o pago por otro medio).
                        </div>
                      )}
                      {allPreview.length > 0 && (
                        <>
                          <label className="flex items-center gap-2 text-sm text-gray-700 mb-3">
                            <input type="checkbox" checked={repriceNotify} onChange={(e) => setRepriceNotify(e.target.checked)} />
                            Avisar por mail a cada cliente del nuevo valor
                          </label>
                          <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-xs text-amber-800 mb-3">
                            Esto le cobra el nuevo valor a estos clientes desde su proximo debito en Mercado Pago. Revisa la lista antes de confirmar.
                          </div>
                          <div className="flex gap-2">
                            <button onClick={doRepriceAll} disabled={allLoading} className="bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-60">
                              {allLoading ? 'Aplicando...' : ('Confirmar y aplicar a ' + allPreview.length)}
                            </button>
                            <button onClick={closeRepriceAll} className="text-gray-600 text-sm px-3">Cancelar</button>
                          </div>
                        </>
                      )}
                    </>
                  ) : null}
                  {allMsg && <p className="text-sm mt-3 text-gray-800">{allMsg}</p>}
                </div>
              </div>
            </div>
          )}

          <section className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="font-semibold text-gray-800">Ajuste por baulera</h2>
                <div className="flex rounded-lg border border-gray-300 overflow-hidden text-sm">
                  {([['todas', 'Todas'], ['available', 'Vacías'], ['occupied', 'Ocupadas']] as const).map(
                    ([val, label]) => (
                      <button
                        key={val}
                        onClick={() => setStatusFilter(val)}
                        className={`px-3 py-1.5 ${
                          statusFilter === val
                            ? 'bg-green-600 text-white'
                            : 'bg-white text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {label}
                        {val !== 'todas' && (
                          <span className="ml-1 opacity-70">
                            ({rooms.filter((r) => r.status === val).length})
                          </span>
                        )}
                      </button>
                    )
                  )}
                </div>
              </div>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar baulera…"
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-56"
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="py-2 pr-3">Baulera</th>
                    <th className="py-2 pr-3">m²</th>
                    <th className="py-2 pr-3">Estado</th>
                    <th className="py-2 pr-3">Precio grupo</th>
                    <th className="py-2 pr-3">Precio propio</th>
                    <th className="py-2 pr-3">No aumentar</th>
                    <th className="py-2 pr-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, 1000).map((r) => {
                    const groupPrice = byM2[normM2(r.areaM2 || 0)] || 0;
                    const occ = r.status === 'occupied';
                    return (
                      <tr key={r.id} className="border-b last:border-0">
                        <td className="py-2 pr-3 font-medium">{r.space || r.name || r.id}</td>
                        <td className="py-2 pr-3 text-gray-500">{r.areaM2}</td>
                        <td className="py-2 pr-3">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              occ ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'
                            }`}
                          >
                            {occ ? 'Ocupada' : 'Vacía'}
                          </span>
                        </td>
                        <td className="py-2 pr-3 text-gray-500">${fmt(groupPrice)}</td>
                        <td className="py-2 pr-3">
                          <input
                            type="text"
                            placeholder="(grupo)"
                            value={
                              r.priceOverride === null || r.priceOverride === undefined
                                ? ''
                                : fmt(Number(r.priceOverride))
                            }
                            onChange={(e) => {
                              const digits = e.target.value.replace(/\D/g, '');
                              updateRoomLocal(r.id, {
                                priceOverride: digits === '' ? null : Number(digits),
                              });
                            }}
                            className="w-28 border border-gray-300 rounded px-2 py-1"
                          />
                        </td>
                        <td className="py-2 pr-3">
                          <input
                            type="checkbox"
                            checked={!!r.lockPrice}
                            onChange={(e) => updateRoomLocal(r.id, { lockPrice: e.target.checked })}
                          />
                        </td>
                        <td className="py-2 pr-3">
                          <button
                            onClick={() => saveRoom(r)}
                            disabled={savingRoom === r.id}
                            className="text-green-700 hover:underline disabled:opacity-50"
                          >
                            {savingRoom === r.id ? '…' : 'Guardar'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="text-xs text-gray-400 mt-2">
                Mostrando {Math.min(filtered.length, 1000)} de {rooms.length} bauleras · Sucursal: {branchId}
              </p>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
