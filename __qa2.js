const fs=require('fs'),http=require('http'),crypto=require('crypto');
const SECRET=process.env.MP_WEBHOOK_SECRET,INV=process.env.INV,PROJ='mc-nordelta-2026',PREFIX=`/${PROJ}/us-central1/api`;
const sleep=ms=>new Promise(r=>setTimeout(r,ms)),L=(...a)=>console.log(...a);
function hreq(o,d){return new Promise((res,rej)=>{const r=http.request(o,x=>{let b='';x.on('data',c=>b+=c);x.on('end',()=>res({status:x.statusCode,body:b}))});r.on('error',rej);if(d)r.write(d);r.end();});}
function fn(p,b,h={}){const d=typeof b==='string'?b:JSON.stringify(b);return hreq({host:'127.0.0.1',port:5001,path:PREFIX+p,method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(d),...h}},d);}
function conv(v){return v.stringValue??(v.integerValue!==undefined?Number(v.integerValue):undefined)??v.doubleValue??v.booleanValue??(v.nullValue!==undefined?null:undefined);}
async function gd(coll,id){const p=`/v1/projects/${PROJ}/databases/(default)/documents/${coll}/${encodeURIComponent(id)}`;const r=await hreq({host:'127.0.0.1',port:8080,path:p,method:'GET',headers:{Authorization:'Bearer owner'}});if(r.status!==200)return{exists:false,http:r.status};const j=JSON.parse(r.body),o={},f=j.fields||{};for(const k of Object.keys(f))o[k]=conv(f[k]);return{exists:true,data:o};}
function sign(b){const raw=JSON.stringify(b);return{raw,sig:crypto.createHmac('sha256',SECRET).update(raw).digest('hex')};}
const period=new Date().toISOString().slice(0,7);
async function dump(t,rid){const r=await gd('reservations',rid);if(!r.exists){L(`  [${t}] RES MISSING`);return{};}const d=r.data;L(`  [${t}] status=${d.status} paymentMode=${d.paymentMode} monthly=${d.monthly} totalOnetime=${d.totalOnetime} duration=${d.duration} months=${d.months} room=${d.storageRoomId} heldUntil=${d.heldUntil||'-'}`);if(d.storageRoomId){const x=(await gd('storageRooms',d.storageRoomId)).data||{};L(`        ROOM ${d.storageRoomId} status=${x.status} heldUntil=${x.heldUntil||'-'} heldBy=${x.heldByReservationId||'-'} resId=${x.reservationId||'-'} tenant=${x.currentTenant||'-'}`);}return d;}
async function pay(t,pid){const p=await gd('payments',`${pid}-${period}`);if(p.exists)L(`        PAYMENT ${pid}-${period} amount=${p.data.amount} type=${p.data.type} status=${p.data.status} mpPaymentId=${p.data.mpPaymentId}`);else L(`        PAYMENT ${pid}-${period} MISSING (http ${p.http})`);return p;}
(async()=>{
const inv=JSON.parse(fs.readFileSync(INV,'utf8'));const seed=await fn('/sync/import',{branchId:'nordelta',branchName:'Nordelta',bauleras:inv.bauleras||inv,clientes:[]});L('SEED',seed.status,seed.body.slice(0,90));
L('\n== TEST A SUSCRIPCION ==');
const a=JSON.parse((await fn('/admin/reservations/sell',{sucursalId:'nordelta',m2:9,name:'Sub',email:'sub@test.com',priceOverride:100000})).body);
L('A1 sell initPoint?',!!a.initPoint,'res',a.reservationId,'pre',a.preapprovalId);await dump('A1-hold',a.reservationId);
const ah=sign({type:'payment',data:{id:a.preapprovalId},date_created:new Date().toISOString()});L('A2 webhook',(await fn('/webhooks/mp',ah.raw,{'x-signature':ah.sig})).status);await sleep(6000);
await dump('A2-paid',a.reservationId);await pay('A2',a.preapprovalId);
L('\n== TEST B PAGO UNICO ==');
const b=JSON.parse((await fn('/admin/reservations/sell',{sucursalId:'nordelta',m2:9,name:'Once',email:'once@test.com',priceOverride:100000,paymentMode:'onetime',durationMonths:6})).body);
L('B1 sell initPoint?',!!b.initPoint,'res',b.reservationId,'total',b.total,'dur',b.duration,'mode',b.paymentMode);await dump('B1-hold',b.reservationId);
const PAYID='pay-distinto-123';const bh=sign({type:'payment',data:{id:PAYID},external_reference:b.reservationId,date_created:new Date().toISOString()});
L('B2 webhook',(await fn('/webhooks/mp',bh.raw,{'x-signature':bh.sig})).status);await sleep(6000);
await dump('B2-paid',b.reservationId);await pay('B2',PAYID);
L('\n== TEST B3 IDEMPOTENCIA ==');
L('B3 re-webhook',(await fn('/webhooks/mp',bh.raw,{'x-signature':bh.sig})).status);await sleep(6000);
await dump('B3-replay',b.reservationId);await pay('B3',PAYID);
L('\n== TEST C SIN STOCK ==');
const c=await fn('/admin/reservations/sell',{sucursalId:'nordelta',m2:999,name:'NoStock',email:'ns@test.com',priceOverride:50000});
L('C sell HTTP',c.status,c.body.slice(0,300));
L('\n== FIN ==');
})().then(()=>process.exit(0)).catch(e=>{console.error('ERR',e&&e.stack);process.exit(0);});
