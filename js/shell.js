"use strict";

/* =====================================================================
   7. ROLE-AWARE NAVIGATION, SHELL, ROUTER, NOTIFICATIONS, DEMO GUIDE
   ===================================================================== */
const ACT = {}, CHG = {}, INP = {}, SUB = {}, SCREENS = {};
const NAV = {
  admin:       [['home','dashboard'],['programs','layers'],['people','users'],['reports','chart']],
  coordinator: [['home','dashboard'],['sessions','checkCircle']],
  trainer:     [['home','dashboard'],['mycourses','book'],['sessions','checkCircle']],
  ta:          [['home','book'],['sessions','checkCircle']],
  client:      [['home','dashboard'],['courses','layers']],
  participant: [['home','home'],['mycourse','book'],['checkin','checkCircle']],
};
/** Role-specific names for shared routes (one route, plain label per role). */
const NAV_LABEL = {participant:{home:'nav.myLearning'}, client:{home:'nav.programOverview'}, coordinator:{home:'nav.operations'}, ta:{home:'nav.assignedCourses'}};
const navLabel = (r, k) => t((NAV_LABEL[r] && NAV_LABEL[r][k]) || 'nav.'+k);
const EXTRA_ROUTES = {admin:['program','setup','course','attendance','config','clients','requests','schedule','audit','verify','profile','user'], coordinator:['course','attendance','verify','profile','user'], trainer:['course','attendance','verify','profile','user'], ta:['course','attendance','verify','profile','user'], client:['course','verify','profile','user'], participant:['activate','verify','profile','user']};
const DEFAULT_ROUTE = {admin:'home', coordinator:'home', trainer:'home', ta:'home', client:'home', participant:'home'};
const allowedRoutes = r => NAV[r].map(x=>x[0]).concat(EXTRA_ROUTES[r]);

/* In-memory router; mirrors the address-bar hash only where the browser allows it
   (sandboxed/srcdoc preview frames block history changes). */
const HASH_OK = (()=>{ try { const u = String(location.href); if (u==='about:srcdoc' || location.protocol==='about:' || location.protocol==='data:') return false; history.replaceState(history.state, '', location.href); return true; } catch(e){ return false; } })();
let ROUTE_H = (()=>{ try { return HASH_OK ? (location.hash || '') : ''; } catch(e){ return ''; } })();
function setHash(h, replace){ ROUTE_H = h; if (!HASH_OK) return; try { if (replace) history.replaceState(null, '', h); else if (location.hash !== h) history.pushState(null, '', h); } catch(e){} }
function onRouteChange(){ V.navOpen = false; V.notifOpen = false; render(); const mn = $('#main'); mn && mn.focus({preventScroll:true}); try { window.scrollTo(0,0); } catch(e){} }
/* In-app history for the Back button (works even where the browser blocks history, e.g. sandboxed previews). */
let NAV_STACK = [];
const routeKey = h => { const x = String(h||'').replace(/^#\/?/, '').split('?')[0]; return x || ''; };
function goHref(h){ if (h === ROUTE_H){ render(); return; }
  if (V.prof && V.prof.dirty) return confirmModal(t('pf.leaveT'), t('pf.leaveQ'), t('pf.leave'), ()=>{ V.prof = null; goHref(h); }, true);
  V.prof = null;
  if (routeKey(h) !== routeKey(ROUTE_H)){ NAV_STACK.push(ROUTE_H || '#/'+DEFAULT_ROUTE[role()]); if (NAV_STACK.length > 50) NAV_STACK.shift(); } // tab/filter changes on the same page don't add a step
  setHash(h); onRouteChange(); }
/** Logical parent page, used when there is no earlier page to return to. */
function parentHref(R){
  const r = role(), n = R.name, id = R.id;
  if (n==='course'){ const c = course(id); if (r==='admin' && c) return href('program', c.programId); return r==='trainer' ? '#/mycourses' : r==='client' ? '#/courses' : r==='coordinator' ? '#/sessions' : '#/home'; }
  if (n==='attendance'){ const s = sess(id); return r==='admin' && s ? href('course', s.courseId, {tab:'schedule'}) : '#/sessions'; }
  if (n==='program' || n==='setup') return '#/programs';
  if (n==='mycourse' && id) return '#/mycourse';
  if (n==='config' && id) return '#/config';
  if (['people','requests','schedule','audit'].includes(n)) return '#/config';
  return '#/'+DEFAULT_ROUTE[r];
}
ACT.navBack = () => { let h = NAV_STACK.pop(); while (h && routeKey(h)===routeKey(ROUTE_H)) h = NAV_STACK.pop(); if (!h) h = parentHref(parseHash()); setHash(h); onRouteChange(); };
ACT.navHome = () => goHref('#/'+DEFAULT_ROUTE[role()]);
function backBar(route){
  const R = parseHash(), isHome = (route===DEFAULT_ROUTE[role()] && !R.id) || (role()==='participant' && inviteStatus(part(me().participantId))!=='completed');
  if (isHome) return '';
  return `<div class="back-bar no-print"><button class="btn btn-ghost btn-sm back-btn" data-action="navBack">${icon('chevron',16,'back-ico')}<span>${t('back')}</span></button><button class="btn btn-ghost btn-sm" data-action="navHome">${icon('home',15)}<span>${t('nav.home')}</span></button></div>`;
}
function parseHash(){ const h = ROUTE_H.replace(/^#\/?/, ''); const [path, qs] = h.split('?'); const parts = (path||'').split('/').filter(Boolean); return {name: parts[0]||'', id: parts[1] ? decodeURIComponent(parts[1]) : null, q: Object.fromEntries(new URLSearchParams(qs||''))}; }
const href = (name, id, q) => '#/'+name + (id ? '/'+encodeURIComponent(id) : '') + (q ? '?'+new URLSearchParams(q) : '');
const go = (name, id, q) => goHref(href(name, id, q));

function setUser(id, actAs){
  NAV_STACK = [];
  UIP.userId = id; UIP.acting = UIP.acting || {}; const uu = user(id); if (uu) UIP.acting[id] = actAs && hasRole(uu, actAs) ? actAs : (UIP.acting[id] && hasRole(uu, UIP.acting[id]) ? UIP.acting[id] : uu.role); V.prof = null; V.navOpen = false; V.notifOpen = false; V.ci = {mode:'code', result:null, openedAt:null}; V.ab = null;
  V.pw = {tab:'overview', course:'all', cohort:null, q:''}; V.cw = {tab:'overview', cohort:null, q:''}; V.rep = {program:null, course:null, cohort:null, q:'', f:'all'};
  saveUI();
}

/* ---------- Small shared renderers ---------- */
const OWN = {admin:'own-admin', trainer:'own-trainer', participant:'own-participant', coord:'own-coord', client:'own-client'};
const ownerTag = k => `<span class="owner ${OWN[k]}">${t('own.'+k)}</span>`;
const STC = {draft:'', structure:'b-warn', awaiting:'b-info', ready:'b-teal', in_progress:'b-live', completed:'b-navy', archived:''};
const stBadge = st => badge(STC[st]||'', t('cst.'+st));
const CTS = {not_started:'', draft:'b-info', in_progress:'b-info', ready:'b-teal', published:'b-ok'};
const ctBadge = st => badge(CTS[st], t('ct.'+st));
const sessBadge = s => s.status==='live' ? badge('b-live', t('st.live')) : s.status==='ended' ? badge('', t('st.ended')) : s.status==='cancelled' ? badge('b-bad', t('st.cancelled'), false) : badge('b-info', t('st.scheduled'));
const modeBadge = m => badge(m==='virtual'?'b-sim':'b-teal', t('mode.'+m), false);
const CSTAT = {approved:'b-ok', pending:'b-info', returned:'b-warn', ineligible:'b-bad', in_progress:''};
const certBadge = st => badge(CSTAT[st], t('cs.'+st));
const MST = {draft:'', scheduled:'b-info', available:'b-ok', expired:'b-warn', archived:''};
const matBadge = (m) => { const st = matState(m); return badge(MST[st], t('ms.'+st) + (st==='scheduled' && m.releaseOffset!=null ? ' · '+esc(dayLabel(m.releaseOffset))+' '+esc(m.releaseTime||'') : '')); };
const SUBST = {pending:'', progress:'b-info', submitted:'b-teal', completed:'b-ok', overdue:'b-bad'};
const subBadge = st => badge(SUBST[st], t('as.'+st));
function attBadge(r, s){
  if (r) return r.method==='manual' ? badge('b-info', t('st.'+r.status)+' · '+t('manual')) : badge(r.status==='late'?'b-warn':'b-ok', t('st.'+r.status));
  if (!s || s.status==='scheduled' || s.status==='cancelled') return badge('', '—', false);
  return s.status==='live' ? badge('', t('st.notYet')) : badge('b-bad', t('st.absent'));
}
const crumbsFor = (o) => { const out = []; if (o.client) out.push([LE(client(o.client).name)]); if (o.program){ const p = program(o.program); out.push([LE(p.title), role()==='participant'?null:href('program',p.id)]); } if (o.course){ const c = course(o.course); out.push([LE(c.title), ['admin','coordinator','trainer'].includes(role())?href('course',c.id):null]); } if (o.cohort) out.push([LE(cohort(o.cohort).name), null]); if (o.session) out.push([LE(sess(o.session).title), null]); return out; };
function breadcrumb(list){ return `<nav class="crumbs" aria-label="${esc(t('breadcrumb'))}">${list.map((c,i)=> (c[1] && i<list.length-1) ? `<a href="${c[1]}">${c[0]}</a>${icon('chevron',12,'flip-rtl')}` : `<span${i===list.length-1?' aria-current="page"':''}>${c[0]}</span>${i<list.length-1?icon('chevron',12,'flip-rtl'):''}`).join('')}</nav>`; }
function pageHead(title, sub, actions='', crumbs){ return `<div class="page-head"><div style="min-width:0">${crumbs?breadcrumb(crumbs):''}<h1>${title}</h1>${sub?`<p class="page-sub">${sub}</p>`:''}</div>${actions?`<div class="actions no-print">${actions}</div>`:''}</div>`; }
function checkRow(state, title, sub, right=''){ const ic = state==='ok'?'check':state==='warn'?'alert':state==='prog'?'clock':'x'; return `<li><span class="ck ${state}" aria-hidden="true">${icon(ic,13)}</span><div class="grow"><div class="small cell-main">${title}</div>${sub?`<div class="xs muted">${sub}</div>`:''}</div>${right}</li>`; }

/* ---------- Notifications (derived per role) ---------- */
function notifications(){
  const u = me(), r = role(), list = [];
  const add = (key, txt, link, ts0) => list.push({key, txt, link, ts:ts0||Date.now()});
  if (r==='admin') attentionItems().slice(0,8).forEach(a=>add(a.key, a.text, a.link));
  if (r==='trainer'){
    visibleCourses().filter(c=>!contentStatus(c.id).complete).forEach(c=>add('as'+c.id, t('nt.assigned',{c:L(c.title)}), href('course',c.id)));
    S.sessions.filter(s=>sessionInstructors(s).includes(u.id) && liveCourse(s.courseId) && sOff(s)===0 && s.status!=='cancelled').forEach(s=>add('ss'+s.id, t('nt.sessionToday',{s:L(s.title), t:s.start}), href('attendance',s.id)));
  }
  if (r==='coordinator'){
    S.sessions.filter(s=>sOff(s)===0 && s.status!=='cancelled' && liveCourse(s.courseId) && canSeeCourse(s.courseId)).forEach(s=>add('ss'+s.id, t('nt.sessionToday',{s:L(s.title), t:s.start}), href('attendance',s.id)));
    needsHelp().slice(0,4).forEach(h=>add('hp'+h.x.id+h.k, `${esc(L(h.x.name))} — ${t('help.'+h.k)}`, href('home')));
  }
  if (r==='participant') myEnrollments().forEach(pa=>{ const ch = cohort(pa.cohortId);
    activeSessions(ch.id).filter(s=>s.status==='live' && !rec(s.id, pa.id)).forEach(s=>add('lv'+s.id, t('nt.liveNow',{s:L(s.title)}), href('checkin')));
    activeSessions(ch.id).filter(s=>s.status==='scheduled' && sOff(s)>=0 && sOff(s)<=1).forEach(s=>add('up'+s.id, t('nt.upcoming',{s:L(s.title), d:dayLabel(sOff(s)), t:s.start}), href('mycourse', pa.id, {tab:'schedule'})));
    materialsFor(ch.id).filter(m=>matState(m)==='available' && (m.updatedAt||0) > Date.now()-3*86400000).forEach(m=>add('mt'+m.id, t('nt.material',{m:L(m.title)}), href('mycourse', pa.id, {tab:'materials'}), m.updatedAt));
    activitiesFor(ch.id, true).filter(a=>['pending','progress'].includes(subState(a,pa.id)) && a.dueOffset<=1).forEach(a=>add('ad'+a.id, t('nt.due',{a:L(a.title), d:dayLabel(a.dueOffset)}), href('mycourse', pa.id, {tab:'todo'}), ts(a.dueOffset,'08:00'))); });

  if (r==='client') S.sessions.filter(s=>sOff(s)>=0 && sOff(s)<=7 && s.status==='scheduled' && visibleCourses().some(c=>c.id===s.courseId)).slice(0,4).forEach(s=>add('cu'+s.id, t('nt.upcoming',{s:L(s.title), d:dayLabel(sOff(s)), t:s.start}), href('course',s.courseId)));
  return list.sort((a,b)=>b.ts-a.ts);
}
const liveCourse = cid => { const c = course(cid); return c && !c.archived && program(c.programId).status!=='draft' && !program(c.programId).archived; };

/* ---------- Shell ---------- */
function roleOptions(){
  // A multi-role account appears once per role it holds (same account, different acting role)
  return ['admin','coordinator','trainer','ta','client','participant'].map(r=>`<optgroup label="${esc(t('role.'+r))}">${S.users.filter(u=>u.demo && hasRole(u, r)).map(u=>{
    const extra = r==='client' ? ' — '+L(client(u.clientId).name) : r==='participant' ? ' — '+L(courseOfPart(u.participantId).title) + (inviteStatus(part(u.participantId))!=='completed' ? ' ('+t('notActivated',null,true)+')' : '') : '';
    return `<option value="${u.id}|${r}"${u.id===UIP.userId && role()===r?' selected':''}>${esc(t('role.'+r))}: ${esc(L(u.name)+extra)}</option>`; }).join('')}</optgroup>`).join('');
}
function shell(screen, route){
  const r = role(), u = me(), nts = notifications(), seen = new Set(UIP.seen[u.id]||[]), unread = nts.filter(n=>!seen.has(n.key)).length;
  const active = k => route===k || (k==='programs' && ['program','setup','course','clients'].includes(route) && role()==='admin') || (k==='mycourses' && route==='course') || (k==='courses' && route==='course') || (k==='sessions' && route==='attendance') || (k==='mycourse' && route==='activate');
  const navItems = NAV[r].map(([k,ic])=>`<a href="#/${k}" ${active(k)?'aria-current="page"':''}>${icon(ic,18)}<span>${navLabel(r, k)}</span></a>`).join('');
  const bottom = r==='participant' ? `<nav class="bottom-nav no-print" aria-label="${esc(t('mobileNav'))}">${NAV[r].slice(0,5).map(([k,ic])=>`<a href="#/${k}" ${active(k)?'aria-current="page"':''}>${icon(ic,20)}<span>${t('navShort.'+k)}</span></a>`).join('')}</nav>` : '';
  return `<div class="app ${V.navOpen?'nav-open':''} ${r==='participant'?'has-bottom':''}">
  <aside class="sidebar no-print" id="sidebar" aria-label="${esc(t('mainNav'))}">
    <div class="brand"><div class="wm">KAUST <b>Academy</b></div><div class="sub">${t('appName')}</div><span class="tag">${t('demoBranding')}</span></div>
    <nav class="nav"><div class="nav-label">${t('role.'+r)}</div>${navItems}<a href="#/profile" class="nav-profile" ${route==='profile'?'aria-current="page"':''}>${avatarHtml({u, pa:null, email:u.email}, 20)}<span>${t('pf.my')}</span></a></nav>
    <div class="side-foot"><button class="btn btn-sm" data-action="guide">${icon('compass',15)}${t('demoGuide')}</button>
      <button class="btn btn-sm" style="margin-top:8px" data-action="resetDemo">${icon('refresh',15)}${t('resetDemo')}</button>
      <p>${t('sideDisclaimer')}</p>${!STORAGE_OK?`<p style="color:#F5C36A">${t('storageOff')}</p>`:''}</div>
  </aside>
  <div class="scrim" data-action="closeNav"></div>
  <div class="main-col">
    <header class="topbar no-print">
      <button class="btn btn-ghost icon-btn menu-btn" data-action="toggleNav" aria-label="${esc(t('openMenu'))}" aria-expanded="${V.navOpen}" aria-controls="sidebar">${icon('menu',20)}</button>
      <span class="wm-mobile ltr hide-sm">KAUST Academy</span>
      <span class="pill-demo" title="${esc(t('demoPillTitle'))}">${t('demoPillShort')}<span class="long"> · ${t('demoPillLong')}</span></span>
      <span class="spacer"></span>
      <button class="btn btn-ghost btn-sm hide-md" data-action="guide">${icon('compass',16)}${t('demoGuide')}</button>
      <button class="btn btn-ghost btn-sm" data-action="toggleLang" lang="${LANG==='ar'?'en':'ar'}" aria-label="${esc(t('switchLangLabel'))}">${icon('globe',16)}<span class="hide-sm">${LANG==='ar'?'English':'العربية'}</span></button>
      ${r==='admin' ? `<a class="btn btn-ghost icon-btn" href="#/config" aria-label="${esc(t('nav.config'))}" title="${esc(t('nav.config'))}" ${route==='config'?'aria-current="page"':''}>${icon('sliders',19)}</a>` : ''}
      <div class="bell"><button class="btn btn-ghost icon-btn" data-action="toggleNotif" aria-label="${esc(t('notifications')+(unread?` (${unread})`:''))}" aria-expanded="${V.notifOpen}">${icon('bell',19)}${unread?`<span class="dot" aria-hidden="true">${unread>9?'9+':unread}</span>`:''}</button></div>
      <a class="btn btn-ghost profile-btn" href="#/profile" title="${esc(t('pf.my'))}" ${route==='profile'?'aria-current="page"':''}>${avatarHtml({u, pa:null, email:u.email}, 28)}<span class="hide-md">${t('pf.my')}</span></a>
      <div class="role-wrap"><label for="roleSel">${t('demoRole')}</label><select id="roleSel" data-change="switchUser" title="${esc(t('roleSwitchTitle'))}">${roleOptions()}</select></div>
      ${V.notifOpen ? notifPanel(nts) : ''}
    </header>
    <main id="main" class="page" tabindex="-1">${backBar(route)}${screen.html}</main>
    <footer class="app-foot no-print">${t('footer')}</footer>
  </div>${bottom}</div>`;
}
function notifPanel(list){
  return `<div class="notif-panel" role="dialog" aria-label="${esc(t('notifications'))}"><div class="card-h"><h2>${t('notifications')}</h2><span class="hint">${simTag('simNotif')}</span></div>
  <ul class="list">${list.length ? list.slice(0,8).map(n=>`<li><a href="${n.link}" class="small" style="text-decoration:none;color:var(--g-800)">${n.txt}</a><div class="xs muted">${fmtRel(n.ts)}</div></li>`).join('') : `<li class="muted small">${t('noNotif')}</li>`}</ul></div>`;
}

/* ---------- Render loop ---------- */
function captureFocus(){
  const a = document.activeElement; if (!a || a===document.body) return null;
  if (a.id) return '#'+CSS.escape(a.id);
  if (a.dataset && a.dataset.action){ let s = `[data-action="${a.dataset.action}"]`; ['id','tab','sid','pid','mid','aid','k','cid','qid'].forEach(k=>{ if (a.dataset[k]) s += `[data-${k}="${CSS.escape(a.dataset[k])}"]`; }); return s; }
  return null;
}
function render(){
  const R = parseHash(), r = role(), allowed = allowedRoutes(r);
  let name = R.name; if (!name){ name = DEFAULT_ROUTE[r]; setHash('#/'+name, true); R.name = name; }
  if (me().status==='deactivated'){ document.documentElement.lang = LANG; document.documentElement.dir = LANG==='ar' ? 'rtl' : 'ltr'; $('#app').innerHTML = shell({html: pageHead(t('accessOffTitle')) + card('', empty(t('accessOffTitle'), t('accessOffMsg'), 'lock'))}, name); return; }
  if (r==='participant' && inviteStatus(part(me().participantId))!=='completed' && !['activate','verify'].includes(name)){ name = 'activate'; setHash('#/activate', true); }
  document.documentElement.lang = LANG; document.documentElement.dir = LANG==='ar' ? 'rtl' : 'ltr';
  const fk = captureFocus(); let screen;
  try { screen = allowed.includes(name) && SCREENS[name] ? SCREENS[name](R) : notAllowed(name); }
  catch(err){ console.error(err); screen = {title:t('error'), html: card('', empty(t('error'), esc(err.message), 'alert'))}; }
  document.title = `${screen.title} · KAUST Academy — ${t('appName')} (${t('demoPillShort')})`;
  $('#app').innerHTML = shell(screen, name);
  if (fk){ const el = $(fk); if (el) el.focus({preventScroll:true}); }
  const tb = $('.topbar'); if (tb) document.documentElement.style.setProperty('--tbh', tb.offsetHeight+'px');
  if (screen.after) screen.after();
}
function notAllowed(name){
  const known = !!SCREENS[name];
  return {title:t('notAvailable'), html: pageHead(t('notAvailable')) + card('', empty(t('notAvailable'), known ? t('notAvailableRole') : t('notFound'), 'lock', `<a class="btn btn-primary" href="#/${DEFAULT_ROUTE[role()]}">${t('goHome')}</a>`))};
}
const denied = (msg) => ({title:t('notAvailable'), html: pageHead(t('notAvailable')) + card('', empty(t('notAvailable'), msg || t('notAvailableRole'), 'lock', `<a class="btn btn-primary" href="#/${DEFAULT_ROUTE[role()]}">${t('goHome')}</a>`))});

/* ---------- Demo guide ---------- */
const GUIDE = [
  ['g1','u_admin', ()=>go('home')],
  ['g2','u_admin', ()=>go('course','CR4',{tab:'participants'})],
  ['g9','u_admin', ()=>go('people')],
  ['g10','u_admin', ()=>go('course','CR3',{tab:'schedule'})],
  ['g3','u_pa19', ()=>go('activate')],
  ['g4','t3', ()=>go('course','CR2',{tab:'materials'})],
  ['g11','t1', ()=>go('attendance','CH3-D3-S2')],
  ['g5','t2', ()=>go('attendance','CH3-D3-S2')],
  ['g6','u_pa9', ()=>go('home')],
  ['g7','u_coord', ()=>go('home')],
  ['g8','cr1', ()=>go('home')],
];
function openGuide(){
  const body = `<p class="small muted" style="margin-bottom:14px">${t('guideIntro')}</p><ol class="list">${GUIDE.map(([k],i)=>`<li><div class="row" style="align-items:flex-start;flex-wrap:nowrap"><span class="badge b-navy nodot" style="min-width:26px;justify-content:center">${i+1}</span><div style="flex:1"><div class="cell-main">${t(k+'.t')}</div><div class="small muted" style="margin:3px 0 8px">${t(k+'.d')}</div><button class="btn btn-sm btn-teal" data-action="guideStep" data-k="${i}">${t(k+'.b')}</button></div></div></li>`).join('')}</ol>
  <div class="divider"></div>${note(t('guideNote'),'sim')}<div class="divider"></div><button class="btn btn-danger btn-sm" data-action="resetDemo">${icon('refresh',15)}${t('resetDemo')}</button>`;
  openModal({title:t('demoGuide'), body, side:true});
}
ACT.guide = () => { V.navOpen = false; openGuide(); };
ACT.guideStep = el => { const g = GUIDE[Number(el.dataset.k)]; closeAllModals(); setUser(g[1]); g[2](); toast(t(g[0]+'.toast'), 'info'); };

