"use strict";

/* =====================================================================
   6. UI KIT: icons, reusable components, modal, toast
   ===================================================================== */
const IC = {
  dashboard:'<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
  layers:'<path d="M12 2 2 7l10 5 10-5-10-5z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/>',
  checkCircle:'<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4 12 14.01l-3-3"/>',
  chart:'<path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/>',
  trend:'<path d="m23 6-9.5 9.5-5-5L1 18"/><path d="M17 6h6v6"/>',
  star:'<path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>',
  award:'<circle cx="12" cy="8" r="7"/><path d="M8.21 13.89 7 23l5-3 5 3-1.21-9.12"/>',
  file:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/>',
  sliders:'<path d="M4 21v-7"/><path d="M4 10V3"/><path d="M12 21v-9"/><path d="M12 8V3"/><path d="M20 21v-5"/><path d="M20 12V3"/><path d="M1 14h6"/><path d="M9 8h6"/><path d="M17 16h6"/>',
  list:'<path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/>',
  shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
  bell:'<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
  globe:'<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
  menu:'<path d="M3 12h18"/><path d="M3 6h18"/><path d="M3 18h18"/>',
  x:'<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  plus:'<path d="M12 5v14"/><path d="M5 12h14"/>',
  upload:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/>',
  download:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
  printer:'<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v8H6z"/>',
  copy:'<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  play:'<path d="m6 3 14 9-14 9V3z"/>',
  stop:'<rect x="5" y="5" width="14" height="14" rx="2"/>',
  qr:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3z"/><path d="M20 14v.01"/><path d="M14 20h.01"/><path d="M17 20h4v-3"/>',
  user:'<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  users:'<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  calendar:'<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>',
  clock:'<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  pin:'<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
  book:'<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
  edit:'<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>',
  search:'<circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>',
  info:'<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
  alert:'<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  check:'<path d="M20 6 9 17l-5-5"/>',
  video:'<path d="m23 7-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/>',
  link:'<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  lock:'<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  eye:'<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
  refresh:'<path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
  help:'<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
  chevron:'<path d="m9 18 6-6-6-6"/>',
  login:'<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="m10 17 5-5-5-5"/><path d="M15 12H3"/>',
  maximize:'<path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>',
  clipboard:'<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/>',
  ban:'<circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 14.14 14.14"/>',
  compass:'<circle cx="12" cy="12" r="10"/><path d="m16.24 7.76-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z"/>',
  home:'<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
  undo:'<path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>',
  wifi:'<path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><path d="M12 20h.01"/>',
  phone:'<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/>',
};
const icon = (n, s=18, cls='') => `<svg class="${cls}" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${IC[n]||''}</svg>`;

const badge = (cls, text, dot=true) => `<span class="badge ${cls}${dot?'':' nodot'}">${text}</span>`;
const simTag = (k='simTag') => `<span class="sim-tag" title="${esc(t('simTitle'))}">${icon('info',12)}${t(k)}</span>`;
const yesNo = (v, title) => v ? `<span class="badge b-ok nodot" title="${esc(title||'')}">${icon('check',13)}<span class="sr-only">${t('yes')}</span></span>` : `<span class="badge nodot muted" title="${esc(title||'')}">—<span class="sr-only">${t('no')}</span></span>`;
const kpi = (label, val, sub, ic, accent) => `<div class="card kpi${accent?' accent':''}"><div class="k-label">${ic?icon(ic,16):''}${label}</div><div class="k-val">${val}</div>${sub?`<div class="k-sub">${sub}</div>`:''}</div>`;
const card = (title, body, o={}) => `<section class="card${o.cls?' '+o.cls:''}"${o.id?` id="${o.id}"`:''}>${title?`<div class="card-h"><h2 ${o.hid?`id="${o.hid}"`:''}>${title}</h2>${o.right||''}</div>`:''}<div class="card-b ${o.flush?'flush':''}">${body}</div></section>`;
const empty = (title, msg, ic='info', action='') => `<div class="empty">${icon(ic,40)}<h3>${title}</h3>${msg?`<p>${msg}</p>`:''}${action?`<div style="margin-top:12px">${action}</div>`:''}</div>`;
const progress = (pct, label) => `<div class="meter"><div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pct||0)}" aria-label="${esc(label||'')}"><span style="width:${clamp(pct||0,0,100)}%"></span></div><span class="small num nowrap">${pctTxt(pct)}</span></div>`;
const note = (html, kind='', ic='info') => `<div class="note ${kind}">${icon(ic,16)}<div>${html}</div></div>`;
function tabs(group, list, active){
  return `<div class="tabs" role="tablist" aria-label="${esc(t('tabsLabel'))}">${list.map(([k,label])=>`<button class="tab" role="tab" id="tab-${group}-${k}" aria-selected="${k===active}" tabindex="${k===active?0:-1}" data-action="tab" data-group="${group}" data-tab="${k}">${label}</button>`).join('')}</div>`;
}
const opt = (v, label, sel) => `<option value="${esc(v)}"${String(v)===String(sel)?' selected':''}>${label}</option>`;
const sel = (id, change, options, value, label, cls='select') => `<select class="${cls}" id="${id}" data-change="${change}" aria-label="${esc(label)}">${options.map(o=>opt(o[0],o[1],value)).join('')}</select>`;
function field(name, label, control, help='', cls=''){ return `<div class="field ${cls}"><label for="f-${name}">${label}</label>${control}${help?`<span class="help" id="h-${name}">${help}</span>`:''}<span class="err" id="e-${name}" role="alert"></span></div>`; }
const inp = (name, val='', type='text', extra='') => `<input class="input" id="f-${name}" name="${name}" type="${type}" value="${esc(val)}" ${extra}>`;
const selF = (name, options, val, extra='') => `<select class="select" id="f-${name}" name="${name}" ${extra}>${options.map(o=>opt(o[0],o[1],val)).join('')}</select>`;
function hbar(label, segs, valTxt, title){
  return `<div class="hbar-row"><span class="lbl" title="${esc(title||'')}">${label}</span><div class="hbar" role="img" aria-label="${esc((title||'')+': '+segs.map(s=>s.label+' '+Math.round(s.v)+'%').join(', '))}">${segs.map(s=>`<span style="width:${clamp(s.v,0,100)}%;background:${s.c}"></span>`).join('')}</div><span class="val">${valTxt}</span></div>`;
}
const legend = items => `<div class="legend">${items.map(([c,l])=>`<span><i style="background:${c}"></i>${l}</span>`).join('')}</div>`;

/* ---------- Toasts ---------- */
function toast(html, kind='ok'){
  const el = document.createElement('div'); el.className = 'toast '+kind;
  el.innerHTML = icon(kind==='ok'?'checkCircle':kind==='bad'?'ban':kind==='warn'?'alert':'info', 18) + `<div>${html}</div>`;
  const box = $('#toasts'); box.appendChild(el); while (box.children.length > 3) box.firstChild.remove(); setTimeout(()=>el.remove(), 4000);
}

/* ---------- Modal (focus-trapped, Esc to close) ---------- */
const modals = [];
function openModal({title, body, footer='', size='', onClose, side=false}){
  const id = uid('m'), back = document.createElement('div');
  back.className = 'modal-back' + (side?' side':'');
  back.innerHTML = `<div class="modal ${size}${side?' drawer':''}" role="dialog" aria-modal="true" aria-labelledby="${id}" tabindex="-1"><div class="modal-h"><h2 id="${id}">${title}</h2><button type="button" class="btn btn-ghost icon-btn" data-action="closeModal" aria-label="${esc(t('close'))}">${icon('x')}</button></div><div class="modal-b">${body}</div>${footer?`<div class="modal-f">${footer}</div>`:''}</div>`;
  back.addEventListener('mousedown', e=>{ if (e.target===back) closeModal(); });
  $('#modal-root').appendChild(back);
  modals.push({el:back, opener:document.activeElement, onClose});
  const f = back.querySelector('[data-autofocus]') || back.querySelector('.modal-b input:not([type=hidden]),.modal-b select,.modal-b textarea,.modal-b button') || back.querySelector('.modal');
  setTimeout(()=>f && f.focus(), 10);
  return back;
}
function closeModal(){
  const m = modals.pop(); if (!m) return; m.el.remove(); if (m.onClose) m.onClose();
  if (m.opener && document.contains(m.opener)) m.opener.focus(); else { const mn = $('#main'); mn && mn.focus({preventScroll:true}); }
}
function closeAllModals(){ while (modals.length) closeModal(); }
const topModal = () => modals.length ? modals[modals.length-1].el : null;
function setModal(body, footer){ const m = topModal(); if (!m) return; if (body!=null) m.querySelector('.modal-b').innerHTML = body; const f = m.querySelector('.modal-f'); if (footer!=null){ if (f) f.innerHTML = footer; else m.querySelector('.modal').insertAdjacentHTML('beforeend', `<div class="modal-f">${footer}</div>`); } }
function confirmModal(title, msg, okLabel, onOk, danger){
  openModal({title, body:`<p>${msg}</p>`, footer:`<button class="btn" data-action="closeModal">${t('cancel')}</button><button class="btn ${danger?'btn-danger':'btn-primary'}" data-action="confirmOk" data-autofocus>${okLabel}</button>`});
  CONFIRM_CB = onOk;
}
let CONFIRM_CB = null;

/* ---------- Form helpers ---------- */
function formErrors(form, errs){
  $$('.err', form).forEach(e=>e.textContent=''); $$('[aria-invalid]', form).forEach(e=>e.removeAttribute('aria-invalid'));
  const keys = Object.keys(errs);
  keys.forEach(k=>{ const e = $('#e-'+k, form); if (e) e.textContent = errs[k]; const c = $('#f-'+k, form) || form.querySelector(`[name="${k}"]`); if (c){ c.setAttribute('aria-invalid','true'); c.setAttribute('aria-describedby','e-'+k); } });
  if (keys.length){ const c = $('#f-'+keys[0], form) || form.querySelector(`[name="${keys[0]}"]`); c && c.focus(); }
  return !keys.length;
}
const validEmail = s => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

/* ---------- Downloads ---------- */
function downloadText(name, text, mime='text/csv;charset=utf-8'){ return downloadBlob(name, new Blob(['\ufeff'+text], {type:mime})); }
function downloadBlob(name, blob){
  try {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name; a.rel = 'noopener'; document.body.appendChild(a); a.click();
    setTimeout(()=>{ try { URL.revokeObjectURL(a.href); } catch(e){} a.remove(); }, 1500);
    if (inFrame()) toast(t('downloadMaybeBlocked'), 'info');
    return true;
  } catch(e){ toast(t('downloadBlocked'), 'warn'); return false; }
}
const csvCell = v => { const s = String(v ?? ''); return /[",\n]/.test(s) ? '"'+s.replace(/"/g,'""')+'"' : s; };
const toCSV = rows => rows.map(r=>r.map(csvCell).join(',')).join('\r\n');

/* =====================================================================
   6. LOCAL FILE STORE — uploaded files stay in THIS browser only.
   IndexedDB is used when available (survives reload on this device);
   otherwise files are kept in memory for the current session only.
   Nothing is uploaded to any server.
   ===================================================================== */
const FILES = (()=>{
  const mem = new Map();              // key -> {blob, url}
  let dbp = null, ok = null;
  function db(){
    if (dbp) return dbp;
    dbp = new Promise((res, rej)=>{
      try { const r = indexedDB.open('kaPPDemo2Files', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('files');
        r.onsuccess = () => { ok = true; res(r.result); };
        r.onerror = () => { ok = false; rej(r.error); };
        r.onblocked = () => { ok = false; rej(new Error('blocked')); };
      } catch(e){ ok = false; rej(e); }
    });
    dbp.catch(()=>{ ok = false; });
    return dbp;
  }
  async function put(key, blob){
    mem.set(key, {blob, url:null});
    try { const d = await db(); await new Promise((res, rej)=>{ const tx = d.transaction('files','readwrite'); tx.objectStore('files').put(blob, key); tx.oncomplete = res; tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error); }); return true; }
    catch(e){ return false; }
  }
  async function get(key){
    if (!key) return null; if (mem.has(key)) return mem.get(key).blob;
    try { const d = await db(); const b = await new Promise((res, rej)=>{ const r = d.transaction('files').objectStore('files').get(key); r.onsuccess = () => res(r.result || null); r.onerror = () => rej(r.error); }); if (b) mem.set(key, {blob:b, url:null}); return b; }
    catch(e){ return null; }
  }
  async function url(key){ const b = await get(key); if (!b) return null; const m = mem.get(key); if (!m.url) m.url = URL.createObjectURL(b); return m.url; }
  function clearAll(){ mem.forEach(m=>{ try { m.url && URL.revokeObjectURL(m.url); } catch(e){} }); mem.clear(); db().then(d=>{ try { d.transaction('files','readwrite').objectStore('files').clear(); } catch(e){} }).catch(()=>{}); }
  return {put, get, url, clearAll, probe: () => db().then(()=>true, ()=>false), get available(){ return ok; }};
})();
FILES.probe();

