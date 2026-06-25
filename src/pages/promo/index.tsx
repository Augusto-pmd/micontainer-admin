import { useEffect, useMemo, useRef, useState } from 'react';
import { getPromo, savePromo, type PromoConfig } from '../../services/promo.services';
import { getBranches, getAllRooms, type BranchLite } from '../../services/tarifas.services';

const normM2 = (m2: string | number) => String(Number(m2));
const FONTS: Record<string, string> = {
  cond: "'Roboto Condensed', system-ui, sans-serif",
  sans: "'Roboto', system-ui, sans-serif",
  mono: "'Roboto Mono', monospace",
};

const EMPTY: PromoConfig = {
  active: false, type: 'text', imageData: '', title: '', text: '',
  fontFamily: 'cond', color: '#0a0a0a', bgColor: '#ffffff',
  animation: 'fade', autoCloseSec: 5, ctaText: '', ctaLink: '',
  discountPct: 0, discountM2: [], startDate: '', endDate: '',
};

export default function PromoWeb() {
  const [branches, setBranches] = useState<BranchLite[]>([]);
  const [branchId, setBranchId] = useState('');
  const [p, setP] = useState<PromoConfig>(EMPTY);
  const [medidas, setMedidas] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const bs = await getBranches();
        setBranches(bs);
        setBranchId((prev) => prev || bs[0]?.id || 'nordelta');
      } catch { setBranchId('nordelta'); }
    })();
  }, []);

  const load = async (bid: string) => {
    if (!bid) return;
    setLoading(true); setMsg(null);
    try {
      const [promo, rooms] = await Promise.all([getPromo(bid), getAllRooms(bid)]);
      setP({ ...EMPTY, ...promo });
      const set = new Set<string>();
      rooms.forEach((r) => { const k = normM2(r.areaM2 || 0); if (Number(k) > 0) set.add(k); });
      setMedidas(Array.from(set).sort((a, b) => Number(a) - Number(b)));
    } catch { setMsg('No se pudo cargar la promo de esta sucursal.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { if (branchId) load(branchId); /* eslint-disable-next-line */ }, [branchId]);

  const upd = (patch: Partial<PromoConfig>) => setP((prev) => ({ ...prev, ...patch }));

  const onImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxW = 1000;
        const scale = Math.min(1, maxW / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
        const kb = Math.round((dataUrl.length * 3 / 4) / 1024);
        if (kb > 900) { setMsg(`La imagen pesa ~${kb}KB incluso comprimida. Probá una más liviana.`); return; }
        upd({ imageData: dataUrl, type: 'image' });
        setMsg(`Imagen lista (~${kb}KB).`);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const toggleM2 = (m: string) =>
    upd({ discountM2: p.discountM2.includes(m) ? p.discountM2.filter((x) => x !== m) : [...p.discountM2, m] });

  const save = async () => {
    setSaving(true); setMsg(null);
    try { await savePromo(branchId, p); setMsg('Promoción guardada para esta sucursal.'); }
    catch { setMsg('Error al guardar.'); }
    finally { setSaving(false); }
  };

  const animStyle = useMemo(() => {
    switch (p.animation) {
      case 'pulse': return { animation: 'promoPulse 1.4s ease-in-out infinite' };
      case 'slide': return { animation: 'promoSlide .5s ease-out' };
      case 'fade': return { animation: 'promoFade .5s ease-out' };
      default: return {};
    }
  }, [p.animation]);

  if (loading) return <div className="p-6 text-gray-500">Cargando…</div>;

  return (
    <div className="space-y-6">
      <style>{`
        @keyframes promoFade { from {opacity:0} to {opacity:1} }
        @keyframes promoSlide { from {transform:translateY(16px);opacity:0} to {transform:translateY(0);opacity:1} }
        @keyframes promoPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.04)} }
      `}</style>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Promoción web</h1>
          <p className="text-sm text-gray-500 mt-0.5">Cartel emergente que ve el cliente al entrar a la web. Por sucursal.</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={p.active} onChange={(e) => upd({ active: e.target.checked })} />
            <span className={p.active ? 'text-green-700 font-semibold' : 'text-gray-500'}>{p.active ? 'Activa' : 'Inactiva'}</span>
          </label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Sucursal</span>
            <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
              {branches.length === 0 && <option value={branchId}>{branchId || 'nordelta'}</option>}
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name || b.id}</option>)}
            </select>
          </div>
        </div>
      </div>

      {msg && <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-2 text-sm text-gray-700">{msg}</div>}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* ---------- Editor ---------- */}
        <div className="space-y-5">
          {/* modo */}
          <div className="flex rounded-lg border border-gray-300 overflow-hidden text-sm w-fit">
            {(['image', 'text'] as const).map((t) => (
              <button key={t} onClick={() => upd({ type: t })}
                className={`px-4 py-1.5 ${p.type === t ? 'bg-green-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                {t === 'image' ? 'Imagen' : 'Texto'}
              </button>
            ))}
          </div>

          {p.type === 'image' ? (
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
              <h2 className="font-semibold text-gray-800">Imagen de la promo</h2>
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => e.target.files?.[0] && onImage(e.target.files[0])} />
              <button onClick={() => fileRef.current?.click()}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg">
                Subir imagen
              </button>
              {p.imageData && (
                <button onClick={() => upd({ imageData: '' })} className="ml-2 text-xs text-red-600 hover:underline">Quitar</button>
              )}
              <p className="text-xs text-gray-400">Se comprime automáticamente. Ideal: un JPG/PNG ya armado con la promo.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <h2 className="font-semibold text-gray-800">Texto de la promo</h2>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Título</label>
                <input value={p.title} onChange={(e) => upd({ title: e.target.value })}
                  placeholder="¡Mes de descuento!" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Texto</label>
                <textarea value={p.text} onChange={(e) => upd({ text: e.target.value })} rows={3}
                  placeholder="Baulera de 5 m² este mes con 10% off." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Tipografía</label>
                  <select value={p.fontFamily} onChange={(e) => upd({ fontFamily: e.target.value })} className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm">
                    <option value="cond">Condensada</option>
                    <option value="sans">Normal</option>
                    <option value="mono">Mono</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Color texto</label>
                  <input type="color" value={p.color} onChange={(e) => upd({ color: e.target.value })} className="w-full h-9 border border-gray-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Fondo</label>
                  <input type="color" value={p.bgColor} onChange={(e) => upd({ bgColor: e.target.value })} className="w-full h-9 border border-gray-300 rounded-lg" />
                </div>
              </div>
            </div>
          )}

          {/* comunes */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Animación</label>
                <select value={p.animation} onChange={(e) => upd({ animation: e.target.value })} className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm">
                  <option value="none">Ninguna</option>
                  <option value="fade">Aparecer (fade)</option>
                  <option value="slide">Deslizar</option>
                  <option value="pulse">Latido</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Auto-cierre (seg)</label>
                <input type="number" min={2} max={30} value={p.autoCloseSec}
                  onChange={(e) => upd({ autoCloseSec: Number(e.target.value) || 5 })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Válida desde</label>
                <input type="date" value={p.startDate} onChange={(e) => upd({ startDate: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Hasta</label>
                <input type="date" value={p.endDate} onChange={(e) => upd({ endDate: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm" />
              </div>
            </div>
            <p className="text-xs text-gray-400">Vacío = sin límite. Fuera del rango, la promo no se muestra y el precio vuelve al normal solo.</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Botón (opcional)</label>
                <input value={p.ctaText} onChange={(e) => upd({ ctaText: e.target.value })} placeholder="Reservar ahora" className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Link del botón</label>
                <input value={p.ctaLink} onChange={(e) => upd({ ctaLink: e.target.value })} placeholder="#/reservar" className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm" />
              </div>
            </div>
          </div>

          {/* descuento */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <h2 className="font-semibold text-gray-800">Descuento (opcional)</h2>
            <div className="flex items-center gap-2">
              <input type="number" min={0} max={90} value={p.discountPct}
                onChange={(e) => upd({ discountPct: Number(e.target.value) || 0 })}
                className="w-24 border border-gray-300 rounded-lg px-3 py-1.5 text-sm" />
              <span className="text-sm text-gray-500">% off — solo para quien entra por la promo</span>
            </div>
            {p.discountPct > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-2">Aplica a estas medidas (vacío = todas):</p>
                <div className="flex flex-wrap gap-2">
                  {medidas.map((m) => (
                    <button key={m} onClick={() => toggleM2(m)}
                      className={`px-2.5 py-1 rounded-full text-xs border ${p.discountM2.includes(m) ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-300'}`}>
                      {m} m²
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button onClick={save} disabled={saving}
            className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg disabled:opacity-60">
            {saving ? 'Guardando…' : 'Guardar promoción'}
          </button>
        </div>

        {/* ---------- Preview ---------- */}
        <div>
          <p className="text-xs uppercase tracking-widest text-gray-400 font-semibold mb-2">Vista previa</p>
          <div className="rounded-xl border border-gray-200 bg-gray-900/90 p-8 flex items-center justify-center min-h-[320px]">
            <div className="relative w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden"
              style={{ background: p.type === 'text' ? p.bgColor : '#fff', ...animStyle }}>
              <button className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/10 text-gray-600 flex items-center justify-center text-sm">×</button>
              {p.type === 'image' ? (
                p.imageData
                  ? <img src={p.imageData} alt="promo" className="w-full block" />
                  : <div className="p-10 text-center text-gray-400 text-sm">Subí una imagen para verla acá</div>
              ) : (
                <div className="p-7 text-center" style={{ fontFamily: FONTS[p.fontFamily], color: p.color }}>
                  {p.title && <h3 className="text-2xl font-extrabold mb-2" style={{ letterSpacing: '-0.02em' }}>{p.title}</h3>}
                  {p.text && <p className="text-sm leading-relaxed whitespace-pre-wrap opacity-90">{p.text}</p>}
                  {p.discountPct > 0 && <div className="mt-3 inline-block text-xs font-bold px-3 py-1 rounded-full" style={{ background: p.color, color: p.bgColor }}>{p.discountPct}% OFF</div>}
                  {p.ctaText && <div className="mt-4"><span className="inline-block bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-lg">{p.ctaText} →</span></div>}
                </div>
              )}
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">Así se ve el cartel. Se cierra solo a los {p.autoCloseSec}s o con la X. {p.active ? '' : '(Está inactiva — no se muestra en la web.)'}</p>
        </div>
      </div>
    </div>
  );
}
