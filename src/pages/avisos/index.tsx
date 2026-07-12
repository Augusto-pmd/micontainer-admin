import { useEffect, useMemo, useState } from 'react';
import { getLeads, type Lead } from '../../services/leads.services';
import { sendMailing } from '../../services/mailing.services';
import { getBranches, type BranchLite } from '../../services/tarifas.services';

export default function Avisos() {
  const [branches, setBranches] = useState<BranchLite[]>([]);
  const [branchId, setBranchId] = useState('');
  const [clientes, setClientes] = useState<Lead[]>([]);
  const [noClientes, setNoClientes] = useState<Lead[]>([]);
  const [group, setGroup] = useState<'clientes' | 'noClientes' | 'todos'>('clientes');
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  // OJO: 'onboarding@resend.dev' es el remitente de PRUEBA de Resend → 403 a cualquier
  // destinatario externo (por esto los avisos rebotaban aunque el backend estuviera bien).
  const [from, setFrom] = useState('Mi Container <comercial@micontainer.com>');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => { (async () => {
    try { const bs = await getBranches(); setBranches(bs); setBranchId((p) => p || bs[0]?.id || 'nordelta'); }
    catch { setBranchId('nordelta'); }
  })(); }, []);

  const load = async (bid: string) => {
    setLoading(true);
    try { const l = await getLeads(bid); setClientes(l.clientes || []); setNoClientes(l.noClientes || []); setSelected({}); }
    catch { setMsg('No se pudieron cargar los contactos.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { if (branchId) load(branchId); /* eslint-disable-next-line */ }, [branchId]);

  // FILTROS (pedido Lucas 12/07): por grupo de metros, por baulera o cliente específico.
  const [m2Filter, setM2Filter] = useState('');
  const [buscar, setBuscar] = useState('');

  const m2Options = useMemo(() => {
    const s = new Set<number>();
    clientes.forEach((c: any) => (c.m2s || []).forEach((n: number) => s.add(n)));
    noClientes.forEach((c: any) => { const n = Number(c.m2); if (n > 0) s.add(n); });
    return [...s].sort((a, b) => a - b);
  }, [clientes, noClientes]);

  const list = useMemo(() => {
    let base = group === 'clientes' ? clientes : group === 'noClientes' ? noClientes : [...clientes, ...noClientes];
    if (m2Filter) {
      const m = Number(m2Filter);
      base = base.filter((l: any) => (l.m2s || []).includes(m) || Number(l.m2) === m);
    }
    if (buscar.trim()) {
      const q = buscar.toLowerCase().trim();
      base = base.filter((l: any) =>
        (l.name || '').toLowerCase().includes(q) ||
        (l.email || '').toLowerCase().includes(q) ||
        (l.bauleras || []).some((b: string) => b.toLowerCase().includes(q))
      );
    }
    return base;
  }, [group, clientes, noClientes, m2Filter, buscar]);

  const allSel = list.length > 0 && list.every((l) => selected[l.id]);
  const toggleAll = () => { const v = !allSel; const s: Record<string, boolean> = { ...selected }; list.forEach((l) => (s[l.id] = v)); setSelected(s); };
  const selectedLeads = list.filter((l) => selected[l.id]);
  // Dedupe por casilla: aunque una persona figure 2 veces (2 contratos), recibe UN solo mail
  const emails = [...new Set(selectedLeads.map((l) => (l.email || '').trim().toLowerCase()).filter(Boolean))];

  const copyEmails = () => { navigator.clipboard.writeText(emails.join(', ')); setMsg(`${emails.length} emails copiados.`); };
  const openMail = () => {
    if (emails.length === 0) { setMsg('Seleccioná destinatarios.'); return; }
    window.location.href = `mailto:?bcc=${encodeURIComponent(emails.join(','))}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const send = async () => {
    if (emails.length === 0) { setMsg('Seleccioná destinatarios.'); return; }
    if (!subject.trim()) { setMsg('Poné un asunto.'); return; }
    if (!window.confirm(`¿Enviar a ${emails.length} destinatario(s)?`)) return;
    setSending(true); setMsg(null);
    try {
      const r = await sendMailing(emails, subject, body, from);
      setMsg(`Enviados ${r.sent}/${r.total}.` + (r.errors?.length ? ` Con ${r.errors.length} error(es): ${r.errors[0]}` : ''));
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      setMsg(err?.response?.data?.error || 'No se pudo enviar. ¿Está cargada la API key de Resend?');
    } finally { setSending(false); }
  };

  if (loading) return <div className="p-6 text-gray-500">Cargando contactos…</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mailing / WSP avisos</h1>
          <p className="text-sm text-gray-500 mt-0.5">Avisos por email/WhatsApp. Elegí grupo, redactá y enviá.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Sucursal</span>
          <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
            {branches.length === 0 && <option value={branchId}>{branchId || 'nordelta'}</option>}
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name || b.id}</option>)}
          </select>
        </div>
      </div>

      {msg && <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-2 text-sm text-gray-700">{msg}</div>}

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {([['clientes', `Clientes (${clientes.length})`], ['noClientes', `No clientes (${noClientes.length})`], ['todos', `Todos (${clientes.length + noClientes.length})`]] as const).map(([v, l]) => (
              <button key={v} onClick={() => setGroup(v)} className={`px-3 py-1.5 rounded-lg text-sm ${group === v ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'}`}>{l}</button>
            ))}
          </div>
          {/* Filtros: por metros (grupo de m²), por baulera o cliente puntual */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <select value={m2Filter} onChange={(e) => { setM2Filter(e.target.value); }} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
              <option value="">Todos los m²</option>
              {m2Options.map((m) => <option key={m} value={m}>{m} m²</option>)}
            </select>
            <input
              value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
              placeholder="Buscar cliente, email o baulera (ej. A3-037)…"
              className="flex-1 min-w-[180px] border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
            />
            {(m2Filter || buscar) && (
              <button onClick={() => { setM2Filter(''); setBuscar(''); }} className="text-xs text-gray-500 underline">limpiar</button>
            )}
          </div>
          <div className="flex items-center justify-between text-sm mb-2">
            <label className="flex items-center gap-2"><input type="checkbox" checked={allSel} onChange={toggleAll} /> Seleccionar todos {m2Filter || buscar ? '(los filtrados)' : ''}</label>
            <span className="text-gray-400">{selectedLeads.length} elegidos</span>
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
            {list.map((l: any) => (
              <label key={l.id} className="flex items-center gap-3 py-2 text-sm cursor-pointer">
                <input type="checkbox" checked={!!selected[l.id]} onChange={(e) => setSelected((s) => ({ ...s, [l.id]: e.target.checked }))} />
                <span className="flex-1">
                  <span className="font-medium text-gray-900">{l.name || '—'}</span>
                  <span className="text-gray-500"> · {l.email || l.phone || 'sin contacto'}</span>
                  {(l.roomsInfo || []).length > 0 && (
                    <span className="ml-2 inline-flex gap-1 flex-wrap align-middle">
                      {l.roomsInfo.map((r: any) => (
                        <span key={r.baulera} className="bg-green-50 text-green-700 border border-green-200 rounded px-1.5 py-0.5 text-[11px] font-medium">
                          {r.baulera}{r.m2 ? ` · ${r.m2}m²` : ''}
                        </span>
                      ))}
                    </span>
                  )}
                </span>
              </label>
            ))}
            {list.length === 0 && <p className="text-sm text-gray-400 py-6 text-center">No hay contactos {m2Filter || buscar ? 'que matcheen el filtro' : 'en este grupo'}.</p>}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <h2 className="font-semibold text-gray-800">Mensaje</h2>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Asunto (ej. Aumento de tarifas / Promo del mes)" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={8} placeholder="Escribí el aviso…" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          <div>
            <label className="block text-xs text-gray-500 mb-1">Remitente (from)</label>
            <input value={from} onChange={(e) => setFrom(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={send} disabled={sending} className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-60">{sending ? 'Enviando…' : `Enviar con Resend (${emails.length})`}</button>
            <button onClick={copyEmails} className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg">Copiar emails</button>
            <button onClick={openMail} className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg">Abrir en mi email</button>
          </div>
          <p className="text-xs text-gray-400">Envía 1 mail por destinatario vía Resend. Para probar: dejá el remitente <b>onboarding@resend.dev</b> y mandate a vos mismo. Para usar <b>info@micontainer.com</b> hay que verificar el dominio en Resend.</p>
        </div>
      </div>
    </div>
  );
}
