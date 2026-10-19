"use strict";

/* =====================================================================
   10b. LOCATION-BASED CHECK-IN (in-person sessions) — DEMO
   The device location is requested once, only when the participant taps
   "Check in with my location". It is compared with the session's venue
   (haversine distance) and then discarded: attendance keeps only the
   status, time, method and a rounded distance / accuracy. There is no
   watchPosition, no background tracking and no IP-based location.
   ===================================================================== */
const GEO_DEF = () => ({radius: S.settings.geofenceRadius ?? 100, maxAcc: S.settings.geoAccuracy ?? 50, before: S.settings.geoBefore ?? 30});
/** Effective venue + rules for a session, or null for online sessions. {missing:true} when no pin is set. */
function geoCfg(s){
  if (!s || s.mode==='virtual' || room(s.roomId)?.virtual) return null;
  const g = s.geo || {}, rm = room(s.roomId)?.geo || {}, D = GEO_DEF();
  const lat = g.lat ?? rm.lat, lng = g.lng ?? rm.lng;
  return {lat, lng, missing: !(isFinite(lat) && isFinite(lng) && lat!==null && lng!==null), label: g.label || L(rm.label) || L(room(s.roomId)?.name) || '',
    radius: g.radius ?? D.radius, maxAcc: g.maxAcc ?? D.maxAcc, before: g.before ?? D.before};
}
/** Great-circle distance in metres. */
function haversine(a, b){
  const R = 6371008.8, rad = x => x*Math.PI/180, dLat = rad(b.lat-a.lat), dLng = rad(b.lng-a.lng);
  const h = Math.sin(dLat/2)**2 + Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLng/2)**2;
  return 2*R*Math.asin(Math.min(1, Math.sqrt(h)));
}
const round10 = m => Math.round(m/10)*10;
/** Location check-in window: from `before` minutes before the scheduled start until the session ends. */
function geoWindow(s, cfg = geoCfg(s)){
  if (!cfg || s.status==='cancelled' || s.status==='ended') return 'closed';
  if (s.status==='live') return 'open';
  const now = Date.now(), st = ts(sOff(s), s.start), en = ts(sOff(s), s.end);
  return now < st - cfg.before*60000 ? 'not_yet' : now > en ? 'closed' : 'open';
}
const geoReady = s => { const c = geoCfg(s); return !!c && !c.missing; };
/** Decide from one reading. Never claims inside/outside when the reading is too uncertain. */
function geoDecide(reading, cfg){
  const acc = Number(reading.accuracy), d = haversine(reading, cfg), out = {dist: round10(d), acc: Math.max(1, Math.round(acc))};
  if (!(acc>0) || acc > cfg.maxAcc) return Object.assign(out, {res:'inaccurate'});
  if (d <= cfg.radius) return Object.assign(out, {res:'inside'});
  if (d - acc > cfg.radius) return Object.assign(out, {res:'outside'});
  return Object.assign(out, {res:'uncertain'});
}
/** Apply a decision for the signed-in participant. Stores no coordinates. */
function geoCommit(s, dec, simulated){
  const paid = myPid(s.courseId), cfg = geoCfg(s); if (!paid || !cfg) return {res:'closed'};
  if (geoWindow(s, cfg)!=='open') return {res: geoWindow(s, cfg)==='not_yet' ? 'not_yet' : 'closed'};
  const ex = rec(s.id, paid); if (ex) return {res:'already', rec:ex};
  if (dec.res==='inside'){
    const late = s.status==='live' ? minutesSinceStart(s) > S.settings.checkinWindow : (Date.now() - ts(sOff(s), s.start))/60000 > S.settings.checkinWindow;
    const r = (S.attendance[s.id] = S.attendance[s.id] || {})[paid] = {status: late ? 'late' : 'present', at: Date.now() + (s.clockOffset||0)*60000, method: simulated ? 'geo_sim' : 'geo', dist: dec.dist, acc: dec.acc};
    addLog('checkin', {course:s.courseId, sid:s.id, pid:paid, status:r.status}); save();
    return {res:r.status, rec:r, dist:dec.dist, acc:dec.acc};
  }
  if (dec.res==='outside'){ (S.rejected[s.id] = S.rejected[s.id] || []).push({id:uid('rj'), paid, reason:'geo_outside', dist:dec.dist, at:Date.now()}); addLog('checkin_rejected', {course:s.courseId, sid:s.id, pid:paid, reason:'geo_outside'}); save(); }
  return dec;
}
V.geo = null; // {sid, busy, result} — in memory only
function geoFinish(sid, result){ V.geo = {sid, busy:false, result}; render(); const h = $('#geo-result-'+sid); if (h){ h.focus(); }
  const k = result.res; toast(t('geo.t.'+(['present','late'].includes(k)?'ok':k)), ['present','late','already'].includes(k) ? 'ok' : ['denied','outside','closed','not_yet','insecure','unsupported'].includes(k) ? 'bad' : 'warn'); }
ACT.geoCheckin = el => { const s = sess(el.dataset.sid), cfg = geoCfg(s); if (!s || !cfg || cfg.missing) return;
  const w = geoWindow(s, cfg); if (w!=='open') return geoFinish(s.id, {res: w});
  if (!window.isSecureContext) return geoFinish(s.id, {res:'insecure'});
  if (!navigator.geolocation) return geoFinish(s.id, {res:'unsupported'});
  V.geo = {sid:s.id, busy:true, result:null}; render();
  // One-shot request at the moment of the tap; the coordinates never leave this callback.
  navigator.geolocation.getCurrentPosition(p=>{ const dec = geoDecide({lat:p.coords.latitude, lng:p.coords.longitude, accuracy:p.coords.accuracy}, cfg); geoFinish(s.id, geoCommit(s, dec, false)); },
    e=>geoFinish(s.id, {res: e.code===1 ? 'denied' : e.code===3 ? 'timeout' : 'unavailable'}), {enableHighAccuracy:true, timeout:15000, maximumAge:0}); };
/** Clearly labelled demo readings (for laptops, desktops and test environments without GPS). */
ACT.geoSim = el => { const s = sess(el.dataset.sid), cfg = geoCfg(s), k = el.dataset.k; if (!s || !cfg || cfg.missing) return;
  if (k==='denied' || k==='timeout') return geoFinish(s.id, {res:k, simulated:true});
  const w = geoWindow(s, cfg); if (w!=='open') return geoFinish(s.id, {res:w});
  const north = m => ({lat: cfg.lat + m/111320, lng: cfg.lng});
  const reading = {inside:{...north(Math.min(30, cfg.radius*0.3)), accuracy:12}, outside:{...north(cfg.radius+600), accuracy:20}, edge:{...north(cfg.radius+15), accuracy:Math.min(40, cfg.maxAcc)}, inaccurate:{...north(10), accuracy:cfg.maxAcc*3}}[k];
  geoFinish(s.id, Object.assign(geoCommit(s, geoDecide(reading, cfg), true), {simulated:true})); };
ACT.geoRetry = el => { V.geo = null; render(); const b = $(`[data-action="geoCheckin"][data-sid="${el.dataset.sid}"]`); b && b.focus(); };

/** Participant check-in block for one in-person session. */
function geoBlock(s, pa){
  const cfg = geoCfg(s); if (!cfg) return '';
  if (cfg.missing) return `<div class="geo-box">${note(t('geo.noPin'), '', 'pin')}</div>`;
  const G = V.geo && V.geo.sid===s.id ? V.geo : null, w = geoWindow(s, cfg);
  const winTxt = t('geo.window', {a: fmtHM(ts(sOff(s), s.start) - cfg.before*60000), b: s.end});
  if (G && G.busy) return `<div class="geo-box" role="status" aria-live="polite"><p class="small"><span class="spinner" aria-hidden="true"></span> ${t('geo.locating')}</p></div>`;
  if (G && G.result) return `<div class="geo-box">${geoResultHtml(s, G.result, cfg)}</div>`;
  return `<div class="geo-box"><h3 style="font-size:14px">${icon('pin',15)} ${t('geo.title')}</h3>
    <p class="small" style="margin:6px 0 4px">${t('geo.purpose')}</p><p class="xs muted">${t('geo.privacy')}</p>
    <p class="xs muted" style="margin-top:4px">${t('geo.rule', {r:cfg.radius, v:esc(cfg.label)})} · ${winTxt}</p>
    <button class="btn btn-teal btn-checkin" style="margin-top:10px" data-action="geoCheckin" data-sid="${s.id}" ${w!=='open'?'disabled':''}>${icon('pin',18)}${t('geo.btn')}</button>
    ${w!=='open' ? `<p class="xs" style="margin-top:6px">${t('geo.w.'+w)}</p>` : ''}
    <details class="explain" style="margin-top:10px"><summary>${t('geo.demo')}</summary><div><p class="xs muted">${t('geo.demoHelp')}</p><div class="row" style="margin-top:8px">${['inside','outside','edge','inaccurate','denied','timeout'].map(k=>`<button class="btn btn-sm" data-action="geoSim" data-k="${k}" data-sid="${s.id}">${t('geo.sim.'+k)}</button>`).join('')}</div></div></details></div>`;
}
const fmtHM = ms => { const d = new Date(ms); return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0'); };
function geoResultHtml(s, R, cfg){
  const k = R.res, ok = ['present','late','already'].includes(k), sim = R.simulated ? `<div style="margin-top:8px">${simTag('geo.simTag')}</div>` : '';
  const head = ok ? ['r-ok','checkCircle', t(k==='late'?'ci.lateTitle':k==='already'?'ci.alreadyTitle':'ci.okTitle')] : ['outside'].includes(k) ? ['r-bad','ban', t('geo.r.outsideT')] : ['r-late','alert', t('geo.r.'+k+'T')];
  const msg = ok ? (R.dist!=null ? t('geo.r.okMsg', {d:R.dist, a:R.acc}) : t('ci.alreadyMsg'))
    : t('geo.r.'+k, {d:R.dist, a:R.acc, r:cfg.radius, m:cfg.maxAcc});
  const retry = !ok && !['closed','not_yet'].includes(k);
  return `<div class="result ${head[0]}" role="status"><div class="ring">${icon(head[1],34)}</div><h2 id="geo-result-${s.id}" tabindex="-1">${head[2]}</h2><p class="small muted" style="margin-top:4px;max-width:52ch;margin-inline:auto">${msg}</p></div>
    ${ok && R.rec ? `<div style="margin-top:12px"><div class="kv"><span>${t('status')}</span><span>${attBadge(R.rec, s)}</span></div><div class="kv"><span>${t('checkinTime')}</span><span class="ltr">${fmtTime(R.rec.at)}</span></div><div class="kv"><span>${t('method')}</span><span>${methodText(R.rec)}</span></div></div>` : ''}
    ${retry ? `<div class="stack-sm" style="margin-top:12px"><button class="btn btn-teal btn-checkin" data-action="geoRetry" data-sid="${s.id}">${icon('refresh',16)}${t('ci.tryAgain')}</button><p class="xs muted" style="text-align:center">${t('geo.askStaff')}</p></div>` : ''}${sim}`;
}
/** Attendance method label (no coordinates, only a rounded distance for location check-ins). */
function methodText(r){ if (!r) return '—'; if (r.method==='manual') return `${t('method.manual')}: ${t('mr.'+r.reason)}`; return t('method.'+r.method) + (r.dist!=null ? ` · ${t('geo.approx', {d:r.dist})}` : ''); }

/* ---------- Session form (Academy Admin): venue pin, radius, accuracy, window ---------- */
function geoFields(s){
  const g = (s && s.geo) || {}, rm = s ? room(s.roomId)?.geo : null, D = GEO_DEF(), v = k => g[k] ?? (rm && ['lat','lng'].includes(k) ? rm[k] : null);
  const num = (n, val, attrs) => `<input class="input" id="f-${n}" name="${n}" type="number" ${attrs} value="${val ?? ''}" dir="ltr">`;
  return `<fieldset class="field geo-fs"><legend class="lbl">${icon('pin',14)} ${t('geo.cfgTitle')}</legend><p class="help" style="margin:0 0 8px">${t('geo.cfgHelp')}</p>
    ${field('gaddr', t('geo.venue'), inp('gaddr', g.label || (rm && L(rm.label)) || '', 'text', 'autocomplete="off"'), t('geo.venueHelp'))}
    <div class="form-grid">${field('glat', t('geo.lat'), num('glat', v('lat'), 'step="any" min="-90" max="90"'))}${field('glng', t('geo.lng'), num('glng', v('lng'), 'step="any" min="-180" max="180"'))}</div>
    ${field('gmap', t('geo.mapLink'), `<input class="input" id="f-gmap" name="gmap" type="url" dir="ltr" placeholder="https://www.openstreetmap.org/?mlat=…&mlon=…" data-change="geoMapLink">`, t('geo.mapLinkHelp'))}
    <div class="row" style="margin:-4px 0 12px"><button type="button" class="btn btn-sm" data-action="geoHere">${icon('pin',14)}${t('geo.useHere')}</button><button type="button" class="btn btn-sm btn-ghost" data-action="geoOpenMap">${icon('link',14)}${t('geo.checkMap')}</button></div>
    <div class="form-grid">${field('grad', t('geo.radius'), num('grad', g.radius ?? D.radius, 'min="20" max="2000"'), t('geo.radiusHelp', {n:D.radius}))}${field('gacc', t('geo.acc'), num('gacc', g.maxAcc ?? D.maxAcc, 'min="10" max="500"'), t('geo.accHelp', {n:D.maxAcc}))}
    ${field('gbefore', t('geo.before'), num('gbefore', g.before ?? D.before, 'min="0" max="180"'), t('geo.beforeHelp'))}</div></fieldset>`;
}
/** Read and validate the venue fields. Returns {geo} or {errs}. */
function geoFromForm(f){
  const errs = {}, n = x => x===undefined || String(x).trim()==='' ? null : Number(x);
  const lat = n(f.glat), lng = n(f.glng), radius = n(f.grad), maxAcc = n(f.gacc), before = n(f.gbefore);
  if ((lat==null) !== (lng==null)) errs[lat==null?'glat':'glng'] = t('geo.e.both');
  if (lat!=null && !(lat>=-90 && lat<=90)) errs.glat = t('errRange',{a:-90,b:90});
  if (lng!=null && !(lng>=-180 && lng<=180)) errs.glng = t('errRange',{a:-180,b:180});
  if (!(radius>=20 && radius<=2000)) errs.grad = t('errRange',{a:20,b:2000});
  if (!(maxAcc>=10 && maxAcc<=500)) errs.gacc = t('errRange',{a:10,b:500});
  if (!(before>=0 && before<=180)) errs.gbefore = t('errRange',{a:0,b:180});
  return Object.keys(errs).length ? {errs} : {geo:{label:String(f.gaddr||'').trim(), lat, lng, radius, maxAcc, before}};
}
/** Accepts common map links: ?mlat=..&mlon=.., #map=z/lat/lng, @lat,lng, q=lat,lng or a plain "lat, lng". */
function parseMapLink(s){
  const x = String(s||'').trim(); let m;
  if ((m = /[?&]mlat=(-?\d+(?:\.\d+)?)&mlon=(-?\d+(?:\.\d+)?)/.exec(x))) return [m[1], m[2]];
  if ((m = /#map=\d+\/(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)/.exec(x))) return [m[1], m[2]];
  if ((m = /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/.exec(x))) return [m[1], m[2]];
  if ((m = /[?&](?:q|query|ll)=(-?\d+(?:\.\d+)?)(?:,|%2C)\s*(-?\d+(?:\.\d+)?)/i.exec(x))) return [m[1], m[2]];
  if ((m = /^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/.exec(x))) return [m[1], m[2]];
  return null;
}
CHG.geoMapLink = el => { const p = parseMapLink(el.value), f = el.form; if (!el.value.trim()) return;
  if (!p) { $('#e-gmap', f).textContent = t('geo.e.link'); return; } $('#e-gmap', f).textContent = '';
  f.glat.value = Number(p[0]).toFixed(6); f.glng.value = Number(p[1]).toFixed(6); toast(t('geo.pinSet'),'ok'); };
ACT.geoOpenMap = () => { const f = topModal()?.querySelector('form'); if (!f) return; const lat = Number(f.glat.value), lng = Number(f.glng.value);
  if (!f.glat.value || !f.glng.value || !isFinite(lat) || !isFinite(lng)) return toast(t('geo.e.noPinYet'),'warn');
  window.open(`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=18/${lat}/${lng}`, '_blank', 'noopener'); };
/** Admin standing at the venue can drop the pin from their own device (one reading, admin's own choice). */
ACT.geoHere = () => { const f = topModal()?.querySelector('form'); if (!f) return;
  if (!window.isSecureContext || !navigator.geolocation) return toast(t('geo.r.insecure',null),'warn');
  toast(t('geo.locating'),'info');
  navigator.geolocation.getCurrentPosition(p=>{ f.glat.value = p.coords.latitude.toFixed(6); f.glng.value = p.coords.longitude.toFixed(6); toast(t('geo.pinSetAcc',{a:Math.round(p.coords.accuracy)}),'ok'); },
    e=>toast(e.code===1 ? t('geo.r.denied') : t('geo.r.unavailable'),'warn'), {enableHighAccuracy:true, timeout:15000, maximumAge:0}); };
