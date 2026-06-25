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
  const [from, setFrom] = useState('Mi Container <onboarding@resend.dev>');
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

  const list = useMemo(() => {
    if (group === 'clientes') return clientes;
    if (group === 'noClientes') return noClientes;
    return [...clientes, ...noClientes];
  }, [group, clientes, noClientes]);

  const allSel = list.length > 0 && list.every((l) => selected[l.id]);
  const toggleAll = () => { const v = !allSel; const s: Record<string, boolean> = { ...selected }; list.forEach((l) => (s[l.id] = v)); setSelected(s); };
  const selectedLeads = list.filter((l) => selected[l.id]);
  const emails = selectedLeads.map((l) => l.email).filter(Boolean);

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
          <div className="flex items-center justify-between text-sm mb-2">
            <label className="flex items-center gap-2"><input type="checkbox" checked={allSel} onChange={toggleAll} /> Seleccionar todos</label>
            <span className="text-gray-400">{selectedLeads.length} elegidos</span>
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
            {list.map((l) => (
              <label key={l.id} className="flex items-center gap-3 py-2 text-sm cursor-pointer">
                <input type="checkbox" checked={!!selected[l.id]} onChange={(e) => setSelected((s) => ({ ...s, [l.id]: e.target.checked }))} />
                <span className="flex-1">
                  <span className="font-medium text-gray-900">{l.name || '—'}</span>
                  <span className="text-gray-500"> · {l.email || l.phone || 'sin contacto'}</span>
                </span>
              </label>
            ))}
            {list.length === 0 && <p className="text-sm text-gray-400 py-6 text-center">No hay contactos en este grupo.</p>}
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
