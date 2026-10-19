"use strict";

/* =====================================================================
   12. SHARED ACTIONS, EVENT WIRING, TIMERS, INIT
   ===================================================================== */
ACT.toggleNav = () => { V.navOpen = !V.navOpen; render(); if (V.navOpen){ const a = $('.nav a'); a && a.focus(); } };
ACT.closeNav = () => { V.navOpen = false; render(); };
ACT.toggleLang = () => { LANG = LANG==='ar' ? 'en' : 'ar'; UIP.lang = LANG; saveUI(); closeAllModals(); V.ab = null; render(); toast(t('langChanged'), 'info'); };
ACT.toggleNotif = () => { V.notifOpen = !V.notifOpen; if (V.notifOpen){ UIP.seen[me().id] = notifications().map(n=>n.key); saveUI(); } render(); };
ACT.closeModal = () => closeModal();
ACT.confirmOk = () => { const cb = CONFIRM_CB; CONFIRM_CB = null; closeModal(); cb && cb(); };
ACT.resetDemo = () => confirmModal(t('resetDemo'), t('resetConfirm'), t('resetDemo'), ()=>{ closeAllModals(); resetDemo(); render(); toast(t('resetDone')); }, true);
ACT.skip = (el, e) => { e.preventDefault(); $('#main').focus(); };
CHG.switchUser = el => { setUser(el.value); go(DEFAULT_ROUTE[role()]); toast(t('switchedTo',{r:t('role.'+role(),null,true), n:L(me().name)}), 'info'); };
ACT.tab = el => { const g = el.dataset.group, k = el.dataset.tab, R = parseHash();
  if (g==='pw'){ V.pw.tab = k; V.pw.q=''; setHash(href('program', R.id, {tab:k}), true); }
  if (g==='cw'){ V.cw.tab = k; V.ab = null; setHash(href('course', R.id, {tab:k}), true); }
  if (g==='ps') V.ps.tab = k; if (g==='cfg') V.cfg.tab = k; if (g==='cert') V.cert.tab = k;
  render(); const b = $(`#tab-${g}-${k}`); b && b.focus(); };
/* Forms are handled directly (never via native submission): sandboxed preview frames without
   'allow-forms' block submit events entirely, which would silently break every form. */
function runSubmit(f){ const fn = f && SUB[f.dataset.submit]; if (fn) fn(f); }
ACT.submitForm = () => { const m = topModal(); runSubmit(m && m.querySelector('form[data-submit]')); };

/* Print is silently blocked in some embedded previews — tell the presenter what to do. */
function safePrint(){ const t0 = Date.now(); try { window.print(); } catch(e){ toast(t('printBlocked'),'warn'); return; } if (Date.now()-t0 < 60 && inFrame()) toast(t('printBlocked'),'warn'); }
function copyText(text, okMsg){
  const fallback = () => { try { const ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly',''); ta.style.position='fixed'; ta.style.opacity='0'; (topModal()||document.body).appendChild(ta); ta.select(); const ok = document.execCommand('copy'); ta.remove(); toast(ok?okMsg:t('copyFailed'), ok?'ok':'warn'); } catch(e){ toast(t('copyFailed'),'warn'); } };
  try { if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(()=>toast(okMsg), fallback); else fallback(); } catch(e){ fallback(); }
}

/* ---------- Event delegation ---------- */
const SELF_NAV = new Set(['openSession']);
document.addEventListener('click', e => {
  const sb = e.target.closest('button[type=submit], input[type=submit], form[data-submit] button:not([type])');
  if (sb && sb.form && sb.form.dataset.submit){ e.preventDefault(); if (!sb.dataset.action){ if (!sb.disabled) runSubmit(sb.form); return; } }
  const el = e.target.closest('[data-action]');
  if (V.notifOpen && !e.target.closest('.notif-panel') && !e.target.closest('[data-action="toggleNotif"]')){ V.notifOpen = false; if (!el && !e.target.closest('a[href^="#/"]')){ render(); return; } }
  const link = e.target.closest('a[href^="#/"]'); if (link) e.preventDefault();
  if (el && !el.disabled && ACT[el.dataset.action]) ACT[el.dataset.action](el, e);
  if (link && !(el && el===link && SELF_NAV.has(el.dataset.action))) goHref(link.getAttribute('href'));
});
document.addEventListener('change', e => { const el = e.target.closest('[data-change]'); if (el && CHG[el.dataset.change]) CHG[el.dataset.change](el, e); });
document.addEventListener('input', e => { const el = e.target.closest('[data-input]'); if (el && INP[el.dataset.input]) INP[el.dataset.input](el, e); });
document.addEventListener('submit', e => { const f = e.target.closest('form[data-submit]'); if (!f) return; e.preventDefault(); runSubmit(f); });
document.addEventListener('keydown', e => {
  if (e.altKey && (e.key==='ArrowLeft' || e.key==='ArrowRight') && !topModal() && !(e.target.matches && e.target.matches('input,textarea,select'))){ const back = (e.key==='ArrowLeft') !== (document.documentElement.dir==='rtl'); if (back && $('.back-btn')){ e.preventDefault(); ACT.navBack(); return; } }
  const m = topModal();
  if (e.key==='Enter' && !e.isComposing && e.target.matches && e.target.matches('input:not([type=checkbox]):not([type=radio]):not([type=file]):not([type=range]):not([type=color])') && e.target.form && e.target.form.dataset.submit){ e.preventDefault(); runSubmit(e.target.form); return; }
  if (e.key==='Escape'){ if (m){ e.preventDefault(); closeModal(); return; } if (V.notifOpen){ V.notifOpen = false; render(); return; } if (V.navOpen){ V.navOpen = false; render(); return; } }
  if (e.key==='Tab' && m){ const f = $$('a[href],button:not([disabled]),input:not([disabled]):not(.sr-only),select:not([disabled]),textarea,iframe,video,[tabindex]:not([tabindex="-1"])', m).filter(x=>x.offsetParent!==null);
    if (!f.length) return; const first = f[0], last = f[f.length-1];
    if (e.shiftKey && (document.activeElement===first || !m.contains(document.activeElement))){ e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && (document.activeElement===last || !m.contains(document.activeElement))){ e.preventDefault(); first.focus(); } }
  if ((e.key==='ArrowLeft'||e.key==='ArrowRight') && e.target.getAttribute && e.target.getAttribute('role')==='tab'){
    const list = $$('[role=tab]', e.target.parentElement), i = list.indexOf(e.target), fwd = (e.key==='ArrowRight') !== (document.documentElement.dir==='rtl');
    const nx = list[(i + (fwd?1:-1) + list.length) % list.length]; nx.focus(); nx.click(); }
});
function syncFromLocation(){ if (!HASH_OK) return; try { const h = location.hash || ''; if (h !== ROUTE_H){ if (NAV_STACK.length && NAV_STACK[NAV_STACK.length-1]===h) NAV_STACK.pop(); else if (routeKey(h)!==routeKey(ROUTE_H)) NAV_STACK.push(ROUTE_H); ROUTE_H = h; onRouteChange(); } } catch(e){} }
window.addEventListener('hashchange', syncFromLocation);
window.addEventListener('popstate', syncFromLocation);
// Keep two open windows in sync (e.g., trainer on a projector, participant in another window of the same browser)
window.addEventListener('storage', e => { if (e.key===STORE_KEY && e.newValue){ try { const d = JSON.parse(e.newValue); if (d && d.version===DATA_VERSION){ S = d; if (!topModal() && !V.ab) render(); } } catch(_){} } });

/* ---------- Assessment timer (counts down; auto-submits at zero) ---------- */
setInterval(()=>{ const A = V.attempt; if (!A || A.done) return; const left = Math.max(0, A.limit*60 - Math.floor((Date.now()-A.started)/1000)); const el = $('.js-timer'); if (el){ el.textContent = fmtSecs(left); el.classList.toggle('low', left<60); } if (left<=0) finishRunner(true); }, 1000);

load();
render();
