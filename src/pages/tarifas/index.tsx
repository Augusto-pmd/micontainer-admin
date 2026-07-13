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
import { getPlanesMPServices, syncPlanesMPServices, type PlanMP, type SuscriptoViaPlan } from '../../services/pricing.services';

const fmt = (n: number) => (Number(n) || 0).toLocaleString('es-AR');
const normM2 = (m2: string | number) => String(Number(m2));

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
                  <span className="w-20 text-sm text-gray-600">{k} m²</span>
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
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
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
                        Nuevo valor: <b>${repriceAmount.toLocaleString('es-AR')}</b>/mes en {repriceM2} m². <b>{repricePreview.filter((t: any) => t.cambia !== false).length}</b> cambian · <b>{repricePreview.filter((t: any) => t.cambia === false).length}</b> ya en ese valor (no se tocan ni avisan):
                      </p>
                      {repricePreview.length === 0 ? (
                        <p className="text-sm text-gray-500">No hay suscripciones activas de esta medida.</p>
                      ) : (
                        <div className="border rounded-lg overflow-hidden mb-3">
                          <div className="max-h-72 overflow-y-auto">
                            <table className="w-full text-xs border-collapse">
                              <thead className="bg-gray-50 text-gray-500 sticky top-0">
                                <tr className="text-left">
                                  <th className="px-3 py-2 font-semibold">Cliente</th>
                                  <th className="px-3 py-2 font-semibold text-right">Último cobro</th>
                                  <th className="px-3 py-2 font-semibold text-right">Configurado</th>
                                  <th className="px-3 py-2 font-semibold text-right">Nuevo</th>
                                  <th className="px-3 py-2 font-semibold text-center">Estado</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {repricePreview.map((t: any) => (
                                  <tr key={t.id} className={t.cambia === false ? 'bg-gray-50/60 text-gray-400' : 'text-gray-800'}>
                                    <td className="px-3 py-2 font-medium">{t.cliente || t.email || t.id}</td>
                                    <td className="px-3 py-2 text-right whitespace-nowrap">
                                      {t.sinCobro ? (
                                        <span className="text-amber-600">sin cobro aún</span>
                                      ) : (
                                        <>
                                          <span className="tabular-nums">${Number(t.actual).toLocaleString('es-AR')}</span>
                                          {t.actualFecha && <span className="block text-[10px] text-gray-400">{String(t.actualFecha).slice(0, 10)}</span>}
                                        </>
                                      )}
                                    </td>
                                    <td className="px-3 py-2 text-right whitespace-nowrap">
                                      <span className="tabular-nums">${Number(t.configurado).toLocaleString('es-AR')}</span>
                                      {t.desde && <span className="block text-[10px] text-gray-400">desde {String(t.desde).slice(0, 10)}</span>}
                                    </td>
                                    <td className="px-3 py-2 text-right whitespace-nowrap tabular-nums font-semibold text-gray-900">${Number(t.nuevo).toLocaleString('es-AR')}</td>
                                    <td className="px-3 py-2 text-center">
                                      {t.cambia === false ? (
                                        <span className="inline-block px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-[10px]">ya en valor</span>
                                      ) : (
                                        <span className="inline-block px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px]">cambia</span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
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
                              {repriceLoading ? 'Aplicando...' : ('Confirmar y aplicar a ' + repricePreview.filter((t: any) => t.cambia !== false).length)}
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
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
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
                        <div className="border rounded-lg overflow-hidden mb-3">
                          <div className="max-h-72 overflow-y-auto">
                            <table className="w-full text-xs border-collapse">
                              <thead className="bg-gray-50 text-gray-500 sticky top-0">
                                <tr className="text-left">
                                  <th className="px-3 py-2 font-semibold">m²</th>
                                  <th className="px-3 py-2 font-semibold">Cliente</th>
                                  <th className="px-3 py-2 font-semibold text-right">Último cobro</th>
                                  <th className="px-3 py-2 font-semibold text-right">Nuevo</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100 text-gray-800">
                                {allPreview.map((t: any) => (
                                  <tr key={t.id}>
                                    <td className="px-3 py-2 whitespace-nowrap text-gray-500">{t.m2} m²</td>
                                    <td className="px-3 py-2 font-medium">{t.cliente || t.email || t.id}</td>
                                    <td className="px-3 py-2 text-right whitespace-nowrap tabular-nums">${Number(t.actual).toLocaleString('es-AR')}</td>
                                    <td className="px-3 py-2 text-right whitespace-nowrap tabular-nums font-semibold text-gray-900">${Number(t.nuevo).toLocaleString('es-AR')}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
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

          {/* Planes de MP: pegado a los precios (antes estaba al fondo, tras ~500 bauleras) */}
          <PlanesMP branchId={branchId} />

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

// ── Planes de MP (mes gratis): monto REAL en MP vs tarifa vigente + sincronizar ──
// Cada plan tiene su PROPIO precio en Mercado Pago: cambiar la tarifa o repricear las
// suscripciones NO lo actualiza (y el reprice dice "ya aplicado" si ninguna sub cambia).
// Este panel consulta MP en vivo y pone los planes al día de un click.
function PlanesMP({ branchId }: { branchId: string }) {
  const [data, setData] = useState<{ total: number; desactualizados: number; planes: PlanMP[]; suscriptosViaPlan: number; suscriptos: SuscriptoViaPlan[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [pmsg, setPmsg] = useState<string | null>(null);

  const cargar = async () => {
    setLoading(true); setPmsg(null);
    try { setData(await getPlanesMPServices(branchId || 'nordelta')); }
    catch { setPmsg('No se pudieron listar los planes de MP'); }
    finally { setLoading(false); }
  };

  const sincronizar = async () => {
    if (!data) return;
    if (!window.confirm(`¿Poner ${data.desactualizados} plan(es) desactualizado(s) al precio de la tarifa vigente?\n\n• Los links de plan ya compartidos pasan a vender al precio NUEVO\n• No se borra ni cancela ningún plan\n• No toca a los clientes ya suscriptos`)) return;
    setSyncing(true); setPmsg(null);
    try {
      const r = await syncPlanesMPServices(branchId || 'nordelta');
      setPmsg(`✓ ${r.actualizados.length} actualizados · ${r.yaEnPrecio} ya en precio${r.sinMedida ? ` · ${r.sinMedida} sin medida detectable` : ''}${r.errores.length ? ` · ${r.errores.length} con ERROR` : ''}`);
      await cargar();
    } catch { setPmsg('No se pudo sincronizar'); }
    finally { setSyncing(false); }
  };

  return (
    <section className="bg-white border border-gray-200 rounded-xl p-4 mt-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="font-bold text-gray-900">Planes de MP (mes gratis)</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Cada plan tiene su <b>propio precio</b> en Mercado Pago: cambiar la tarifa no lo actualiza solo.
            Acá ves el monto real que quedó en MP y los ponés al día de un click.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={cargar} disabled={loading}
            className="text-sm font-semibold border border-gray-300 hover:bg-gray-50 rounded-lg px-3 py-1.5 disabled:opacity-50">
            {loading ? 'Consultando MP…' : (data ? 'Actualizar' : 'Ver planes en MP')}
          </button>
          {data && data.desactualizados > 0 && (
            <button onClick={sincronizar} disabled={syncing}
              className="text-sm font-bold bg-green-600 hover:bg-green-700 text-white rounded-lg px-3 py-1.5 disabled:opacity-50">
              {syncing ? 'Sincronizando…' : `Sincronizar ${data.desactualizados} con la tarifa`}
            </button>
          )}
        </div>
      </div>
      {pmsg && <p className="text-sm font-semibold text-green-700 mt-2">{pmsg}</p>}
      {data && (data.planes.length === 0 ? (
        <p className="text-sm text-gray-500 mt-3">No hay planes en la cuenta de MP.</p>
      ) : (
        <div className="overflow-x-auto mt-3">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 uppercase">
                <th className="py-1.5 pr-3">Plan</th>
                <th className="py-1.5 pr-3">Medida</th>
                <th className="py-1.5 pr-3">Precio en MP</th>
                <th className="py-1.5 pr-3">Tarifa vigente</th>
                <th className="py-1.5 pr-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {data.planes.map((p) => (
                <tr key={p.planId} className="border-t border-gray-100">
                  <td className="py-1.5 pr-3">{p.nombre}{!p.registrado && <span className="ml-1.5 text-[10px] text-gray-400">(viejo/manual)</span>}</td>
                  <td className="py-1.5 pr-3">{p.m2 != null ? `${p.m2} m²` : '—'}</td>
                  <td className="py-1.5 pr-3 font-semibold">${fmt(p.montoMP)}</td>
                  <td className="py-1.5 pr-3">{p.tarifa != null ? `$${fmt(p.tarifa)}` : '—'}</td>
                  <td className="py-1.5 pr-3">
                    {p.estado !== 'active'
                      ? <span className="text-xs text-gray-400">{p.estado}</span>
                      : p.desactualizado
                        ? <span className="text-xs font-bold text-orange-600">DESACTUALIZADO</span>
                        : <span className="text-xs font-semibold text-green-700">al día</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {data && (
        <div className="mt-5">
          <h3 className="text-sm font-bold text-gray-900">
            Clientes suscriptos vía plan <span className="text-gray-400 font-normal">({data.suscriptosViaPlan})</span>
          </h3>
          <p className="text-[11px] text-gray-500 mt-0.5 mb-2">
            Entraron por un link de plan (mes gratis). Ojo: el precio del plan aplica a los que se suscriban
            <b> de acá en adelante</b> — a los ya suscriptos se les cambia el valor desde "Cambiar valor" (suscripciones), como al resto.
          </p>
          {data.suscriptos.length === 0 ? (
            <p className="text-sm text-gray-500">Nadie está suscripto vía plan todavía — el resto de los clientes tiene suscripción directa.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 uppercase">
                    <th className="py-1.5 pr-3">Baulera</th>
                    <th className="py-1.5 pr-3">Cliente</th>
                    <th className="py-1.5 pr-3">Email</th>
                    <th className="py-1.5 pr-3">Paga</th>
                    <th className="py-1.5 pr-3">Plan</th>
                  </tr>
                </thead>
                <tbody>
                  {data.suscriptos.map((s, i) => (
                    <tr key={i} className="border-t border-gray-100">
                      <td className="py-1.5 pr-3 font-mono text-xs">{s.baulera}</td>
                      <td className="py-1.5 pr-3">{s.cliente || '—'}</td>
                      <td className="py-1.5 pr-3 text-xs text-gray-500">{s.email || '—'}</td>
                      <td className="py-1.5 pr-3 font-semibold">${fmt(s.monto)}</td>
                      <td className="py-1.5 pr-3 text-xs">{s.plan}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
