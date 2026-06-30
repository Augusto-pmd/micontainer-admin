const fs = require('fs');
const http = require('http');
const crypto = require('crypto');
const admin = require('firebase-admin');
admin.initializeApp();
const fdb = admin.firestore();

const SECRET = process.env.MP_WEBHOOK_SECRET || 'replace-with-a-random-secret-string';
const INV = process.env.INV;
const PROJ = 'mc-nordelta-2026';
const PREFIX = `/${PROJ}/us-central1/api`;
const sleep = ms => new Promise(r=>setTimeout(r,ms));
const L = (...a)=>{console.log(...a);};

function hreq(opts, data) {
  return new Promise((resolve, reject) => {
    const r = http.request(opts, (res)=>{let b='';res.on('data',c=>b+=c);res.on('end',()=>resolve({status:res.statusCode,body:b}));});
    r.on('error', reject); if(data) r.write(data); r.end();
  });
}
function fn(path, bodyObj, headers={}) {
  const data = typeof bodyObj==='string'?bodyObj:JSON.stringify(bodyObj);
  return hreq({host:'127.0.0.1',port:5001,path:PREFIX+path,method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(data),...headers}}, data);
}
function signedHook(bodyObj){ const raw=JSON.stringify(bodyObj); return {raw, sig:crypto.createHmac('sha256',SECRET).update(raw).digest('hex')}; }

async function getRes(rid){const s=await fdb.collection('reservations').doc(rid).get();return s.exists?s.data():null;}
async function getRoom(id){const s=await fdb.collection('storageRooms').doc(id).get();return s.exists?s.data():null;}
async function payments(rid){const s=await fdb.collection('payments').where('reservationId','==',rid).get();return s.docs.map(d=>({id:d.id,...d.data()}));}
async function audits(rid,action){const s=await fdb.collection('audit_log').where('entityId','==',rid).get();return s.docs.map(d=>d.data()).filter(a=>!action||a.action===action);}

async function dump(label, rid){
  const d=await getRes(rid);
  if(!d){L(`  [${label}] RES ${rid} MISSING`);return {};}
  L(`  [${label}] status=${d.status} paymentMode=${d.paymentMode} monthly=${d.monthly} totalOnetime=${d.totalOnetime} duration=${d.duration} months=${d.months} room=${d.storageRoomId} heldUntil=${d.heldUntil||'-'} preapproval=${d.mpPreapprovalId}`);
  if(d.storageRoomId){const x=await getRoom(d.storageRoomId)||{};L(`        ROOM ${d.storageRoomId} status=${x.status} heldUntil=${x.heldUntil||'-'} heldBy=${x.heldByReservationId||'-'} reservationId=${x.reservationId||'-'} tenant=${x.currentTenant||'-'}`);}
  return d;
}
async function dumpPayAudit(rid){
  const ps=await payments(rid);
  ps.forEach(p=>L(`        PAYMENT ${p.id} amount=${p.amount} type=${p.type} status=${p.status} mpPaymentId=${p.mpPaymentId}`));
  L(`        PAYMENTS count=${ps.length}`);
  const al=await audits(rid,'alta_suscripcion');
  L(`        AUDIT alta_suscripcion count=${al.length}`);
  al.forEach(a=>L(`        AUDIT detail=${JSON.stringify(a.detail)}`));
  return {payCount:ps.length, altaCount:al.length};
}

(async()=>{
  const inv=JSON.parse(fs.readFileSync(INV,'utf8'));
  const bauleras=inv.bauleras||inv;
  const seed=await fn('/sync/import',{branchId:'nordelta',branchName:'Nordelta',bauleras,clientes:[]});
  L('SEED import HTTP',seed.status,seed.body.slice(0,110));

  L('\n===== TEST A: SUSCRIPCION =====');
  const ss=await fn('/admin/reservations/sell',{sucursalId:'nordelta',m2:9,name:'Sub Test',email:'sub@test.com',priceOverride:100000});
  L('A1 sell HTTP',ss.status,ss.body);
  const sj=JSON.parse(ss.body);const SUBID=sj.reservationId,SUBPRE=sj.preapprovalId;
  L('A1 initPoint present=',!!sj.initPoint);
  L('--- A1 HOLD ---');await dump('sub-hold',SUBID);
  const sh=signedHook({type:'payment',data:{id:SUBPRE},date_created:new Date().toISOString()});
  const swh=await fn('/webhooks/mp',sh.raw,{'x-signature':sh.sig});
  L('A2 webhook HTTP',swh.status,swh.body);
  await sleep(7000);
  L('--- A2 AFTER PAY ---');await dump('sub-paid',SUBID);await dumpPayAudit(SUBID);

  L('\n===== TEST B: PAGO UNICO =====');
  const os=await fn('/admin/reservations/sell',{sucursalId:'nordelta',m2:9,name:'Once Test',email:'once@test.com',priceOverride:100000,paymentMode:'onetime',durationMonths:6});
  L('B1 sell HTTP',os.status,os.body);
  const oj=JSON.parse(os.body);const ONCEID=oj.reservationId;const PAYID='pay-distinto-123';
  L(`B1 initPoint present=${!!oj.initPoint} total=${oj.total} duration=${oj.duration} paymentMode=${oj.paymentMode}`);
  L('--- B1 HOLD ---');await dump('once-hold',ONCEID);
  const oh=signedHook({type:'payment',data:{id:PAYID},external_reference:ONCEID,date_created:new Date().toISOString()});
  const owh=await fn('/webhooks/mp',oh.raw,{'x-signature':oh.sig});
  L('B2 webhook HTTP',owh.status,owh.body);
  await sleep(7000);
  L('--- B2 AFTER PAY ---');await dump('once-paid',ONCEID);const b2=await dumpPayAudit(ONCEID);

  L('\n===== TEST B3: IDEMPOTENCIA (reenvio) =====');
  const owh2=await fn('/webhooks/mp',oh.raw,{'x-signature':oh.sig});
  L('B3 re-webhook HTTP',owh2.status,owh2.body);
  await sleep(7000);
  L('--- B3 AFTER REPLAY ---');await dump('once-replay',ONCEID);const b3=await dumpPayAudit(ONCEID);
  L(`B3 IDEMPOTENT: payments ${b2.payCount}->${b3.payCount} alta ${b2.altaCount}->${b3.altaCount}`);

  L('\n===== TEST C: SIN STOCK =====');
  const ns=await fn('/admin/reservations/sell',{sucursalId:'nordelta',m2:999,name:'NoStock',email:'nostock@test.com',priceOverride:50000});
  L('C sell HTTP',ns.status,ns.body.slice(0,400));

  L('\n===== FIN =====');
})().then(()=>process.exit(0)).catch(e=>{console.error('DRIVER ERR',e&&e.stack);process.exit(0);});
