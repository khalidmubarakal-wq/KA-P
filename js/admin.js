"use strict";

/* =====================================================================
   8. ACADEMY ADMIN — home, programs, clients, 5-step setup, schedule,
      participants & invitations, change requests, Configuration
   Only the Academy Admin can create or change structure.
   ===================================================================== */

/** Short list of things that need the Admin's attention (with a direct fix link). */
function attentionItems(){
  const out = [], add = (key, text, link, owner='admin') => out.push({key, text, link, owner});
  S.programs.filter(p=>p.status==='draft' && !p.archived).forEach(p=>add('dr'+p.id, t('att.draft',{p:L(p.title)||t('untitled',null,true)}), href('setup',p.id,{step:p.setupStep||1})));
  S.courses.filter(c=>liveCourse(c.id) || (!c.archived && program(c.programId).status==='draft')).forEach(c=>{ const su = adminSetup(c.id), p = program(c.programId);
    if (!courseInstructors(c.id).length) add('tr'+c.id, t('att.noTrainer',{c:L(c.title)}), href('setup',p.id,{step:2}));
    else if (!su.items.find(i=>i.k==='schedule').ok) add('sc'+c.id, t('att.noSchedule',{c:L(c.title)}), href('setup',p.id,{step:3, course:c.id}));
    else if (!su.items.find(i=>i.k==='participants').ok) add('pa'+c.id, t('att.noParticipants',{c:L(c.title)}), href('course',c.id,{tab:'participants'}));
    const ps = courseParticipants(c.id), failed = ps.filter(x=>inviteStatus(x)==='failed').length, notSent = ps.filter(x=>inviteStatus(x)==='not_sent').length;
    if (failed) add('if'+c.id, t('att.failed',{n:failed, c:L(c.title)}), href('course',c.id,{tab:'participants'}));
    if (notSent) add('ns'+c.id, t('att.unsent',{n:notSent, c:L(c.title)}), href('course',c.id,{tab:'participants'})); });
  S.programs.filter(p=>p.status!=='draft' && !p.archived && !programCoordinators(p.id).length).forEach(p=>add('pc'+p.id, t('att.noCoord',{p:L(p.title)}), href('program',p.id)));
  const cf = allConflicts().length; if (cf) add('cf', t('att.conflicts',{n:cf}), href('schedule'));
  S.requests.filter(q=>q.status==='open').forEach(q=>add('rq'+q.id, t('att.request',{n:nameOf(q.from), c:L(course(q.courseId).title)}), href('requests')));
  return out;
}

/* ---------- Admin home ---------- */
function homeAdmin(){
  const progs = S.programs.filter(p=>!p.archived), items = attentionItems();
  const ready = S.courses.filter(c=>liveCourse(c.id) && ['ready','in_progress','completed'].includes(courseStatus(c.id))).length, setup = S.courses.filter(c=>!c.archived && ['draft','structure','awaiting'].includes(courseStatus(c.id))).length;
  let pres = 0, exp = 0; S.courses.filter(c=>liveCourse(c.id)).forEach(c=>{ const P = courseProgress(c.id); pres += P.present; exp += P.expected; });
  const kp = `<div class="grid g-kpi">${kpi(t('ka2.programs'), progs.filter(p=>p.status!=='draft').length, t('ka2.programsSub',{d:progs.filter(p=>p.status==='draft').length}), 'layers', true)}${kpi(t('ka2.ready'), ready, t('ka2.readySub'), 'checkCircle')}${kpi(t('ka2.setup'), setup, t('ka2.setupSub'), 'clock')}${kpi(t('cp.att'), pctTxt(exp?pres/exp*100:null), exp?t('cp.attSubShort',{a:pres,b:exp}):t('cp.attNone'), 'trend')}</div>`;
  const plist = progs.slice().sort((a,b)=>(a.status==='draft'?-1:0)-(b.status==='draft'?-1:0)).map(p=>{ const st = programStatus(p), cs = coursesOf(p.id);
    return `<li class="row between" style="flex-wrap:nowrap;gap:12px"><div style="min-width:0"><a class="cell-main" href="${p.status==='draft'?href('setup',p.id,{step:p.setupStep||1}):href('program',p.id)}">${LE(p.title)||t('untitled')}</a><div class="xs muted">${LE(client(p.clientId)?.name)} · ${t('nCourses',{n:cs.length})} · ${esc(programRange(p))}</div></div><div class="row" style="flex-wrap:nowrap">${stBadge(st)}${p.status==='draft'?`<a class="btn btn-sm btn-primary" href="${href('setup',p.id,{step:p.setupStep||1})}">${t('resumeSetup')}</a>`:`<a class="btn btn-sm" href="${href('program',p.id)}">${t('open')}</a>`}</div></li>`; }).join('');
  const att = items.length ? `<ul class="list">${items.slice(0,7).map(a=>`<li class="row between" style="flex-wrap:nowrap;gap:10px"><span class="small">${ownerTag(a.owner)} ${a.text}</span><a class="btn btn-sm" href="${a.link}">${t('fix')}</a></li>`).join('')}</ul>${items.length>7?`<p class="xs muted">${t('moreN',{n:items.length-7})}</p>`:''}` : empty(t('allClear'), t('allClearHint'), 'checkCircle');
  return {title:t('nav.home'), html: pageHead(t('home.admin'), t('home.adminSub2'), `<button class="btn btn-primary btn-lg" data-action="newProgram">${icon('plus',18)}${t('createProgram')}</button>`)
    + kp + `<div class="grid g-main" style="margin-top:16px">${card(t('yourPrograms'), plist ? `<ul class="list">${plist}</ul>` : empty(t('noProgramsYet'), t('noProgramsHint'), 'layers', `<button class="btn btn-primary" data-action="newProgram">${t('createProgram')}</button>`), {right:`<a class="small" href="#/programs">${t('viewAll')}</a>`})}
    <div class="stack">${card(t('needsAttention'), att, {right: items.length ? badge('b-warn', String(items.length), false) : ''})}</div></div>`};
}

/* ---------- Reports: one row per program; detail lives one level down (program → course → session) ---------- */
SCREENS.reports = () => {
  if (role()!=='admin') return denied(t('adminOnly'));
  const progs = S.programs.filter(p=>!p.archived && p.status!=='draft');
  const rows = progs.map(p=>{ const cs = coursesOf(p.id), P = cs.map(c=>({c, P:courseProgress(c.id)}));
    const pres = P.reduce((a,x)=>a+x.P.present,0), exp = P.reduce((a,x)=>a+x.P.expected,0), ps = P.reduce((a,x)=>a+x.P.ps.length,0);
    const done = type => cs.reduce((a,c)=>a+courseParticipants(c.id).filter(x=>getAttempt(x.id, c.id, type)).length,0);
    const sv = cs.reduce((a,c)=>a+surveysOf(c.id).reduce((b,s)=>b+svResponses(s.id).length,0),0), svOn = cs.some(c=>surveysOf(c.id).some(s=>s.status!=='draft'));
    const pc = (n, d) => d ? `${n}/${d}` : '—';
    return `<tr><td style="min-width:200px"><a class="cell-main small" href="${href('program',p.id)}">${LE(p.title)}</a><div class="cell-sub">${LE(client(p.clientId)?.name)} · ${t('nCourses',{n:cs.length})}</div></td><td>${stBadge(programStatus(p))}</td><td class="num">${ps}</td><td class="num">${pctTxt(exp?pres/exp*100:null)}</td><td class="num">${pc(done('pre'), ps)}</td><td class="num">${pc(done('post'), ps)}</td><td class="num">${svOn ? pc(sv, ps) : '—'}</td><td><a class="btn btn-sm" href="${href('program',p.id)}">${t('open')}</a></td></tr>`; }).join('');
  const html = pageHead(t('nav.reports'), t('rep.sub')) + card('', progs.length ? `<div class="table-wrap"><table class="tbl"><thead><tr><th>${t('program')}</th><th>${t('status')}</th><th class="num">${t('participantsN')}</th><th class="num">${t('attendance')}</th><th class="num">${t('preAssessment')}</th><th class="num">${t('postAssessment')}</th><th class="num">${t('sv.cardTitle')}</th><th><span class="sr-only">${t('actions')}</span></th></tr></thead><tbody>${rows}</tbody></table></div>` : empty(t('noProgramsYet'), t('noProgramsHint'), 'layers'), {flush:true})
    + `<p class="xs muted" style="margin-top:8px">${t('rep.drill')}</p>`;
  return {title:t('nav.reports'), html};
};

/* ---------- Programs list ---------- */
SCREENS.programs = () => {
  const html = pageHead(t('nav.programs'), t('pl.subAdmin2'), `<a class="btn" href="#/clients">${icon('users',16)}${t('nav.clients')}</a><button class="btn btn-primary" data-action="newProgram">${icon('plus',16)}${t('createProgram')}</button>`)
  + `<div class="toolbar" role="search"><div class="search">${icon('search',16)}<input class="input" id="plQ" type="search" data-input="plSearch" value="${esc(V.pl.q)}" placeholder="${esc(t('pl.search'))}" aria-label="${esc(t('pl.search'))}"></div>
    ${sel('plStatus','plFilter',[['all',t('allStatuses')]].concat(STATUS_ORDER.map(s=>[s,t('cst.'+s)])), V.pl.status, t('status'))}
    ${sel('plClient','plFilter',[['all',t('allClients')]].concat(S.clients.map(c=>[c.id, LE(c.name)])), V.pl.client, t('client'))}
    <button class="btn btn-ghost btn-sm" data-action="plClear">${t('clearFilters')}</button></div><div id="pl-results">${programsTable()}</div>`;
  return {title:t('nav.programs'), html};
};
function programsTable(){
  const q = V.pl.q.trim().toLowerCase();
  const list = visiblePrograms().filter(p=>{ const st = programStatus(p);
    if (V.pl.status==='all' ? st==='archived' : st!==V.pl.status) return false; if (V.pl.client!=='all' && p.clientId!==V.pl.client) return false;
    if (q && ![p.title.en, p.title.ar, p.code, client(p.clientId)?.name.en, client(p.clientId)?.name.ar].join(' ').toLowerCase().includes(q)) return false; return true; });
  if (!list.length) return card('', empty(t('noResults'), t('noResultsHint'), 'search', `<button class="btn" data-action="plClear">${t('clearFilters')}</button>`));
  return card('', `<div class="table-wrap"><table class="tbl"><thead><tr><th>${t('program')}</th><th>${t('client')}</th><th class="num">${t('courses')}</th><th>${t('dates')}</th><th>${t('status')}</th><th><span class="sr-only">${t('actions')}</span></th></tr></thead><tbody>
  ${list.map(p=>`<tr><td><a class="cell-main" href="${href('program',p.id)}">${LE(p.title)||t('untitled')}</a><div class="cell-sub ltr" style="text-align:start">${esc(p.code)}</div></td><td class="small">${LE(client(p.clientId)?.name)}</td><td class="num">${coursesOf(p.id).length}</td><td class="small nowrap">${esc(programRange(p))}</td><td>${stBadge(programStatus(p))}</td>
    <td class="nowrap">${p.status==='draft' ? `<a class="btn btn-sm btn-primary" href="${href('setup',p.id,{step:p.setupStep||1})}">${t('resumeSetup')}</a>` : `<a class="btn btn-sm" href="${href('program',p.id)}">${t('open')}</a>`}</td></tr>`).join('')}</tbody></table></div>`, {flush:true});
}
INP.plSearch = el => { V.pl.q = el.value; $('#pl-results').innerHTML = programsTable(); };
CHG.plFilter = () => { V.pl.status = $('#plStatus').value; V.pl.client = $('#plClient').value; $('#pl-results').innerHTML = programsTable(); };
ACT.plClear = () => { V.pl = {q:'', status:'all', client:'all', cat:'all'}; render(); };

/* ---------- Program page (simple) ---------- */
SCREENS.program = R => {
  const p = program(R.id); if (!p || !canSeeProgram(p.id)) return denied();
  if (p.status==='draft') return SCREENS.setup({id:p.id, q:{step:p.setupStep||1}});
  const cs = coursesOf(p.id);
  const rows = cs.map(c=>{ const ps = courseParticipants(c.id), done = ps.filter(x=>inviteStatus(x)==='completed').length, na = nextAction(c.id);
    return `<tr><td><a class="cell-main" href="${href('course',c.id)}">${LE(c.title)}</a></td><td class="small">${courseInstructors(c.id).length?esc(courseTeamText(c.id)):`<span class="conflict">${t('noTrainer')}</span>`}</td><td class="small nowrap">${esc(courseRangeTxt(c.id))}</td><td class="num small">${ps.length} <span class="cell-sub">(${t('activatedN',{n:done})})</span></td><td>${stBadge(courseStatus(c.id))}<div class="cell-sub">${na?t(na.key):''}</div></td><td class="nowrap"><button class="btn btn-sm" data-action="editCourse" data-cid="${c.id}">${icon('edit',13)}${t('editCourse')}</button> <a class="btn btn-sm btn-ghost" href="${href('course',c.id,{tab:'schedule'})}">${t('editSchedule')}</a></td></tr>`; }).join('');
  const n = p.needs || {};
  const details = `<details class="explain card card-b" style="margin-top:16px"><summary>${t('optionalDetails')}</summary><div><dl class="dl" style="margin-top:10px;grid-template-columns:minmax(120px,200px) 1fr">${[[t('code'),`<span class="ltr">${esc(p.code)}</span>`],[t('category'),esc(clsName('category',p.categoryId))],[t('audience'),esc(clsName('audience',p.audienceId))],[t('deliveryMode'),esc(clsName('deliveryMode',p.deliveryModeId))],[t('nd.business'),esc(n.business)||'—'],[t('nd.desired'),esc(n.desired)||'—'],[t('nd.measures'),esc(n.measures)||'—'],[t('internalNotes'),(esc(n.internal)||'—')+' '+badge('b-warn',t('internalOnly'),false)]].map(r=>`<dt>${r[0]}</dt><dd style="font-weight:400">${r[1]}</dd>`).join('')}</dl></div></details>`;
  return {title:L(p.title), html: pageHead(LE(p.title), `${LE(client(p.clientId)?.name)} · ${esc(programRange(p))}${p.desc&&L(p.desc)?' · '+LE(p.desc):''}`, `<a class="btn" href="${href('setup',p.id,{step:1})}">${icon('edit',16)}${t('editProgramDetails')}</a><button class="btn btn-primary" data-action="editCourse" data-pid="${p.id}">${icon('plus',16)}${t('addCourse')}</button>`, [[t('nav.programs'),'#/programs'],[LE(p.title)]])
    + (p.archived ? note(t('archivedNote'),'warn','alert') + '<div style="height:12px"></div>' : '')
    + card(t('programCoordinators'), coordChips(p.id) + `<p class="xs muted" style="margin-top:8px">${t('programCoordHelp')}</p>`, {right:`<button class="btn btn-sm" data-action="assignCoord" data-pid="${p.id}">${icon('user',14)}${t('assignCoordinator')}</button>`}) + '<div style="height:16px"></div>'
    + card(t('courses'), cs.length ? `<div class="table-wrap"><table class="tbl"><thead><tr><th>${t('course')}</th><th>${t('instructor')}</th><th>${t('dates')}</th><th class="num">${t('participantsN')}</th><th>${t('status')}</th><th><span class="sr-only">${t('actions')}</span></th></tr></thead><tbody>${rows}</tbody></table></div>` : empty(t('noCourses'), t('noCoursesAdmin'), 'layers', `<button class="btn btn-primary" data-action="editCourse" data-pid="${p.id}">${t('addCourse')}</button>`), {flush:true, right:stBadge(programStatus(p))})
    + details + `<div class="row" style="margin-top:16px">${p.archived?`<button class="btn" data-action="archiveProgram" data-k="0" data-pid="${p.id}">${icon('undo',16)}${t('restore')}</button>`:`<button class="btn btn-ghost btn-sm" data-action="archiveProgram" data-k="1" data-pid="${p.id}">${t('archiveProgram')}</button>`}</div>`};
};
const courseRangeTxt = cid => { const ds = courseDays(cid); return ds.length ? `${fmtDay(ds[0].dayOffset)} – ${fmtDay(ds[ds.length-1].dayOffset)}` : '—'; };
ACT.archiveProgram = el => { const p = program(el.dataset.pid), on = el.dataset.k==='1';
  confirmModal(on?t('archiveProgram'):t('restore'), on?t('archiveProgramConfirm'):t('restoreConfirm'), on?t('archive'):t('restore'), ()=>{ p.archived = on; addLog('program_archive', {prog:p.id, scope:on?'archived':'restored'}); save(); render(); toast(on?t('archivedToast'):t('restoredToast')); }, on); };

/* ---------- Clients ---------- */
SCREENS.clients = () => {
  const q = V.ccl.q.trim().toLowerCase(), list = S.clients.filter(c=>!q || normName(L(c.name)+c.name.en+c.name.ar+(c.contactName||'')).includes(normName(q)));
  const rows = list.map(c=>{ const coords = S.users.filter(u=>u.role==='client' && u.clientId===c.id), progs = S.programs.filter(p=>p.clientId===c.id && !p.archived);
    return `<tr><td><div class="cell-main">${LE(c.name)}</div><div class="cell-sub">${esc(c.contactName||'')}${c.contactEmail?` · <span class="ltr">${esc(c.contactEmail)}</span>`:''}</div></td>
    <td class="small">${coords.length ? coords.map(u=>`${LE(u.name)} ${u.status==='invited'?badge('b-sim',t('invitedSim'),false):badge('b-ok',t('active'),false)}`).join('<br>') : `<span class="muted">${t('noClientCoord')}</span>`}</td>
    <td class="num">${progs.length}</td><td class="nowrap"><button class="btn btn-sm" data-action="inviteClientCoord" data-k="${c.id}">${icon('user',14)}${t('inviteCoord')}</button> <button class="btn btn-sm btn-ghost" data-action="editClient" data-k="${c.id}">${t('edit')}</button></td></tr>`; }).join('');
  return {title:t('nav.clients'), html: pageHead(t('nav.clients'), t('clientsSub'), `<button class="btn btn-primary" data-action="addClient">${icon('plus',16)}${t('addClient')}</button>`)
    + `<div class="toolbar"><div class="search">${icon('search',16)}<input class="input" id="cclQ" type="search" data-input="cclSearch" value="${esc(V.ccl.q)}" placeholder="${esc(t('searchClients'))}" aria-label="${esc(t('searchClients'))}"></div></div>`
    + card('', list.length ? `<div class="table-wrap"><table class="tbl"><thead><tr><th>${t('client')}</th><th>${t('clientCoordinators')}</th><th class="num">${t('nav.programs')}</th><th><span class="sr-only">${t('actions')}</span></th></tr></thead><tbody>${rows}</tbody></table></div>` : empty(t('noResults'), '', 'users', `<button class="btn btn-primary" data-action="addClient">${t('addClient')}</button>`), {flush:true})};
};
INP.cclSearch = el => { V.ccl.q = el.value; render(); const i = $('#cclQ'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); };
/* Client modal — used inline from the program form (keeps the form intact) and from the Clients page. */
ACT.addClient = el => clientModal(null, el.dataset.ctx || '');
ACT.editClient = el => clientModal(client(el.dataset.k), '');
function clientModal(c, ctx){
  openModal({title: c ? t('editClient') : t('addNewClient'), body:`<form data-submit="saveClient" data-k="${c?c.id:''}" data-ctx="${ctx}" novalidate>
    ${field('cname', t('clientOrgName')+' *', inp('cname', c?L(c.name):'', 'text', 'autocomplete="organization"'))}
    <div id="dupBox"></div>
    <details class="explain" ${c?'open':''}><summary>${t('optionalContact')}</summary><div style="margin-top:10px">
    ${field('ccontact', t('contactName'), inp('ccontact', c?.contactName||''))}${field('cemail', t('email'), inp('cemail', c?.contactEmail||'', 'email','dir="ltr"'))}${field('cphone', t('phone'), inp('cphone', c?.contactPhone||'', 'tel','dir="ltr"'))}</div></details></form>`,
    footer:`<button class="btn" data-action="closeModal">${t('cancel')}</button><button class="btn btn-primary" data-action="submitForm">${c?t('save'):t('saveClient')}</button>`});
}
SUB.saveClient = form => {
  const f = Object.fromEntries(new FormData(form)), name = f.cname.trim(), errs = {}, c = form.dataset.k ? client(form.dataset.k) : null;
  if (name.length < 2) errs.cname = t('errClientName'); if (f.cemail && !validEmail(f.cemail.trim())) errs.cemail = t('errEmail'); if (!formErrors(form, errs)) return;
  const nn = normName(name), similar = v => { const m = normName(v); return m && nn && (m===nn || (Math.min(m.length, nn.length)>=5 && (m.includes(nn) || nn.includes(m)))); };
  const dup = S.clients.find(x=>x!==c && (similar(x.name.en) || similar(x.name.ar)));
  if (dup && form.dataset.force!=='1'){ $('#dupBox').innerHTML = note(`${t('dupClient',{n:L(dup.name)})}<div class="row" style="margin-top:8px"><button type="button" class="btn btn-sm btn-primary" data-action="useExistingClient" data-k="${dup.id}" data-ctx="${form.dataset.ctx}">${t('useExisting')}</button><button type="button" class="btn btn-sm" data-action="forceSave">${t('createAnyway')}</button></div>`, 'warn', 'alert'); return; }
  let rec = c; if (!rec){ rec = {id:'c'+uid('').slice(-6), createdAt:Date.now()}; S.clients.push(rec); }
  Object.assign(rec, {name: c ? Object.assign({}, c.name, {[LANG]:name}) : bi(name), contactName:(f.ccontact||'').trim(), contactEmail:(f.cemail||'').trim(), contactPhone:(f.cphone||'').trim()});
  addLog(c?'client_update':'client_create', {client:rec.id}); save();
  if (c){ closeModal(); render(); return toast(t('saved')); }
  pickClientInForm(rec.id, form.dataset.ctx);
  // Second step: invite a Client Coordinator now, or skip
  setModal(`<div class="result r-ok" style="padding-top:0"><div class="ring">${icon('checkCircle',32)}</div><h2>${t('clientCreated',{n:name})}</h2><p class="small muted">${form.dataset.ctx==='wz'?t('clientSelectedNote'):''}</p></div>
    <form data-submit="inviteCoordFromClient" data-k="${rec.id}" novalidate><h3 style="margin:8px 0">${t('inviteCoordNow')}</h3><p class="small muted" style="margin-bottom:10px">${t('inviteCoordHelp')}</p>
    ${field('uname', t('name'), inp('uname', rec.contactName||''))}${field('uemail', t('email'), inp('uemail', rec.contactEmail||'', 'email','dir="ltr"'))}${simTag('simInvite')}</form>`,
    `<button class="btn" data-action="closeModal">${t('skipLater')}</button><button class="btn btn-primary" data-action="submitForm">${t('sendInvite')}</button>`);
  toast(t('clientCreatedToast',{n:name}));
};
/** Put a client into the open program form's select without re-rendering (keeps typed input). */
function pickClientInForm(id, ctx){
  if (ctx!=='wz'){ if (parseHash().name==='clients') render(); return; }
  const sel = $('#f-client'); if (!sel) return;
  if (!sel.querySelector(`option[value="${id}"]`)) sel.insertAdjacentHTML('beforeend', opt(id, LE(client(id).name), id));
  sel.value = id; sel.dispatchEvent(new Event('change', {bubbles:true}));
}
ACT.useExistingClient = el => { pickClientInForm(el.dataset.k, el.dataset.ctx); closeModal(); toast(t('existingSelected')); };
SUB.inviteCoordFromClient = form => inviteClientCoord(form, form.dataset.k);
ACT.inviteClientCoord = el => openInvite('client', {client:el.dataset.k});
function inviteClientCoord(form, cid){ const n = form.uname.value.trim(), e = form.uemail.value.trim(), errs = {};
  if (n.length<3) errs.uname = t('errName'); if (!validEmail(e)) errs.uemail = t('errEmail'); else if (S.users.some(u=>u.email.toLowerCase()===e.toLowerCase())) errs.uemail = t('errDupEmail'); if (!formErrors(form, errs)) return;
  const id = uid('u'); S.users.push({id, role:'client', clientId:cid, name:bi(n), title:bi(t('role.client',null,true)), email:e, status:'invited'}); addLog('user_invite', {user:id});
  closeModal(); save(); if (parseHash().name==='clients') render(); toast(t('inviteSent',{e})); }

/* ---------- Setup flow (5 short steps) ---------- */
const WZ_STEPS = ['program','courses','schedule','participants','review'];
const progCode = () => { let n = 300 + S.programs.length; while (S.programs.some(p=>p.code==='KA-PP-'+n)) n++; return 'KA-PP-'+n; };
ACT.newProgram = () => { const id = 'PR'+uid('').slice(-5).toUpperCase();
  S.programs.push({id, code:progCode(), title:{en:'',ar:''}, clientId:'', ownerId:me().id, categoryId:clsList('category')[0]?.id, domainId:clsList('domain')[0]?.id, audienceId:clsList('audience')[0]?.id, deliveryModeId:clsList('deliveryMode')[0]?.id, priorityId:clsList('priority')[1]?.id, status:'draft', archived:false, setupStep:1, startOffset:null, endOffset:null, desc:{en:'',ar:''}, needs:{competencies:[]}});
  addLog('program_create', {prog:id}); save(); go('setup', id, {step:1}); };
SCREENS.setup = R => {
  if (!can('structure')) return denied(t('adminOnly'));
  const p = program(R.id); if (!p) return denied(t('notFound'));
  const step = clamp(Number(R.q.step)||1, 1, 5), key = WZ_STEPS[step-1], cs = coursesOf(p.id);
  if (R.q.course && cs.some(c=>c.id===R.q.course)) V.wzCourse = R.q.course;
  if (!cs.some(c=>c.id===V.wzCourse)) V.wzCourse = cs[0]?.id || null;
  const stepper = `<ol class="stepper" aria-label="${esc(t('setupProgress'))}">${WZ_STEPS.map((k,i)=>{ const done = (p.setupStep||1)>i+1 || i+1<step; return `<li><button class="step ${done?'done':''}" ${i+1===step?'aria-current="step"':''} data-action="wzGo" data-k="${i+1}" data-pid="${p.id}" ${!p.clientId && i>0 ? 'disabled' : ''}><span class="n">${done?icon('check',12):i+1}</span><span class="lbl">${t('wz2.'+k)}</span></button></li>`; }).join('')}</ol>`;
  const nav = next => `<div class="row between" style="margin-top:16px"><div>${step>1?`<button class="btn" data-action="wzGo" data-k="${step-1}" data-pid="${p.id}">${t('back')}</button>`:''}</div><div class="row">${next}</div></div>`;
  const coursePicker = () => cs.length>1 ? `<div class="row" role="group" aria-label="${esc(t('course'))}" style="margin-bottom:14px">${cs.map(c=>`<button class="btn btn-sm ${c.id===V.wzCourse?'btn-primary':''}" data-action="wzCourse" data-k="${c.id}" aria-pressed="${c.id===V.wzCourse}">${LE(c.title)}</button>`).join('')}</div>` : '';
  let body = '', foot = '';
  if (key==='program'){
    const n = p.needs || {};
    body = card(t('wz2.program'), `<p class="small muted" style="margin-bottom:14px">${t('wzh2.program')}</p><form id="wzForm" data-submit="wzProgram" data-pid="${p.id}" novalidate>
      ${field('pname', t('programName')+' *', inp('pname', L(p.title), 'text','autocomplete="off"'))}
      <div class="field"><label for="f-client">${t('client')} *</label><div class="row" style="flex-wrap:nowrap"><select class="select" id="f-client" name="client" style="flex:1">${opt('', t('chooseClient'), p.clientId)}${S.clients.map(c=>opt(c.id, LE(c.name), p.clientId)).join('')}</select><button type="button" class="btn" data-action="addClient" data-ctx="wz">${icon('plus',15)}${t('addNewClient')}</button></div><span class="err" id="e-client" role="alert"></span></div>
      ${field('pdesc', t('shortDescription'), `<textarea class="textarea" id="f-pdesc" name="pdesc" rows="2" style="min-height:60px">${esc(L(p.desc))}</textarea>`, t('optional'))}
      <details class="explain"><summary>${t('optionalDetails')}</summary><div style="margin-top:12px"><div class="form-grid">
        ${field('pcode', t('programCode'), inp('pcode', p.code, 'text','dir="ltr"'), t('codeAuto'))}${field('palt', LANG==='ar'?t('nameInEnglish'):t('nameInArabic'), inp('palt', p.title[LANG==='ar'?'en':'ar']||'', 'text', LANG==='ar'?'dir="ltr"':'dir="rtl"'))}
        ${field('start', t('startDate'), inp('start', p.startOffset!=null?isoOf(p.startOffset):'', 'date'))}${field('end', t('endDate'), inp('end', p.endOffset!=null?isoOf(p.endOffset):'', 'date'))}
        ${field('cat', t('category'), selF('cat', clsOpts('category',p.categoryId), p.categoryId))}${field('aud', t('audience'), selF('aud', clsOpts('audience',p.audienceId), p.audienceId))}
        ${field('dm', t('deliveryMode'), selF('dm', clsOpts('deliveryMode',p.deliveryModeId), p.deliveryModeId))}${field('prio', t('priority'), selF('prio', clsOpts('priority',p.priorityId), p.priorityId))}
        ${field('n_business', t('nd.business'), `<textarea class="textarea" id="f-n_business" name="n_business" rows="2" style="min-height:56px">${esc(n.business||'')}</textarea>`, '', 'full')}
        ${field('n_measures', t('nd.measures'), `<textarea class="textarea" id="f-n_measures" name="n_measures" rows="2" style="min-height:56px">${esc(n.measures||'')}</textarea>`, '', 'full')}
        ${field('n_internal', t('internalNotes'), `<textarea class="textarea" id="f-n_internal" name="n_internal" rows="2" style="min-height:56px">${esc(n.internal||'')}</textarea>`, t('internalNotesHelp'), 'full')}</div></div></details></form>`, {right:ownerTag('admin')});
    foot = nav(`<button class="btn" data-action="wzSave" data-k="0">${t('saveDraft')}</button><button class="btn btn-primary" data-action="wzSave" data-k="1">${t('saveContinue')}</button>`);
  }
  if (key==='courses'){
    body = card(t('wz2.courses'), `<p class="small muted" style="margin-bottom:14px">${t('wzh2.courses')}</p>${cs.length ? `<div class="stack-sm">${cs.map((c,i)=>`<div class="task"><div class="row between" style="align-items:flex-start"><div style="min-width:0"><div class="xs muted">${t('courseN',{n:i+1})}</div><h3>${LE(c.title)}</h3>${L(c.desc)?`<p class="small muted">${LE(c.desc)}</p>`:''}</div><div class="row"><button class="btn btn-sm" data-action="editCourse" data-cid="${c.id}">${icon('edit',14)}${t('edit')}</button><button class="btn btn-sm btn-ghost" data-action="archiveCourse" data-cid="${c.id}">${t('remove')}</button></div></div>
        <div class="row" style="margin-top:10px;gap:6px"><span class="small muted">${t('instructorTeam')}:</span>${teamChips(courseInstructors(c.id), leadOf(c.id))}<button class="btn btn-sm btn-ghost" data-action="editCourse" data-cid="${c.id}" data-focus="team">${icon('users',13)}${t('editTeam')}</button><span class="xs muted">· ${t('lang.'+c.language)}</span></div></div>`).join('')}</div>` : empty(t('noCourses'), t('noCoursesAdmin'), 'layers')}
      <div style="margin-top:14px"><button class="btn btn-primary" data-action="editCourse" data-pid="${p.id}">${icon('plus',16)}${cs.length?t('addAnotherCourse'):t('addCourse')}</button></div>`, {right:ownerTag('admin')})
      + '<div style="height:16px"></div>' + `<div class="grid g-2">${card(t('programCoordinators'), coordChips(p.id) + `<p class="xs muted" style="margin-top:8px">${t('programCoordHelp')}</p>`, {right:`<button class="btn btn-sm" data-action="assignCoord" data-pid="${p.id}">${icon('user',14)}${t('assignCoordinator')}</button>`})}
      ${card(t('clientCoordinators'), (()=>{ const cc = S.users.filter(u=>u.role==='client' && u.clientId===p.clientId && u.status!=='deactivated'); return (cc.length ? `<div class="row" style="gap:6px">${cc.map(u=>`<span class="badge b-warn nodot">${LE(u.name)}${u.status==='invited'?' · '+t('invitedShort'):''}</span>`).join('')}</div>` : `<p class="small conflict">${t('noClientCoord')}</p>`) + `<p class="xs muted" style="margin-top:8px">${t('clientCoordHelpSetup',{c:L(client(p.clientId)?.name)})}</p>`; })(), {right:`<button class="btn btn-sm" data-action="openInvite" data-k="client" data-client="${p.clientId}">${icon('plus',14)}${t('invite.client')}</button>`})}</div>`;
    foot = nav(`<button class="btn btn-primary" data-action="wzGo" data-k="3" data-pid="${p.id}" ${cs.length?'':'disabled'}>${t('continue')}</button>`);
  }
  if (key==='schedule'){
    body = cs.length ? card(t('wz2.schedule'), `<p class="small muted" style="margin-bottom:14px">${t('wzh2.schedule')}</p>${coursePicker()}${scheduleEditor(V.wzCourse)}`, {right:ownerTag('admin')}) : card('', empty(t('noCourses'), t('addCoursesFirst'), 'layers', `<button class="btn btn-primary" data-action="wzGo" data-k="2" data-pid="${p.id}">${t('wz2.courses')}</button>`));
    foot = nav(`<button class="btn btn-primary" data-action="wzGo" data-k="4" data-pid="${p.id}">${t('continue')}</button>`);
  }
  if (key==='participants'){
    body = cs.length ? card(t('wz2.participants'), `<p class="small muted" style="margin-bottom:14px">${t('wzh2.participants')}</p>${coursePicker()}${participantsPanel(V.wzCourse)}`, {right:ownerTag('admin')}) : card('', empty(t('noCourses'), t('addCoursesFirst'), 'users'));
    foot = nav(`<button class="btn btn-primary" data-action="wzGo" data-k="5" data-pid="${p.id}">${t('continue')}</button>`);
  }
  if (key==='review'){
    const rows = cs.map(c=>{ const ps = courseParticipants(c.id), cnt = k => ps.filter(x=>inviteStatus(x)===k).length;
      return `<tr><td class="cell-main small">${LE(c.title)}</td><td class="small">${courseInstructors(c.id).length?esc(courseTeamText(c.id)):`<span class="conflict">${t('noTrainer')}</span>`}</td><td class="num small">${courseDays(c.id).length} / ${courseSessions(c.id).length}</td><td class="num small">${ps.length}</td><td class="small">${ps.length?`${t('inv.completed')}: ${cnt('completed')} · ${t('inv.sent')}: ${cnt('sent')} · ${t('inv.not_sent')}: ${cnt('not_sent')}${cnt('failed')?` · <span class="conflict">${t('inv.failed')}: ${cnt('failed')}</span>`:''}`:'—'}</td></tr>`; }).join('');
    const miss = []; cs.forEach(c=>adminSetup(c.id).items.filter(i=>!i.ok).forEach(i=>miss.push({c, i})));
    const fixStep = {trainer:2, coordinator:2, schedule:3, rooms:3, conflicts:3, sessionStaff:3, participants:4, invites:4};
    const check = miss.length ? `<ul class="checklist">${miss.map(m=>checkRow(m.i.soft?'warn':'no', `${LE(m.c.title)} — ${m.i.k==='conflicts'?t('rd.conflictsBad',{n:m.i.n}):m.i.k==='invites'?t('rd.invitesBad',{n:m.i.n}):m.i.k==='sessionStaff'?t('rd.sessionStaffBad',{n:m.i.n}):t('rd.'+m.i.k)}`, t('rdh.'+m.i.k), `${ownerTag('admin')} <button class="btn btn-sm" data-action="wzGo" data-k="${fixStep[m.i.k]}" data-pid="${p.id}" data-course="${m.c.id}">${t('fix')}</button>`)).join('')}</ul>` : note(t('setupComplete'),'ok','checkCircle');
    const content = cs.filter(c=>courseInstructors(c.id).length && !contentStatus(c.id).complete);
    body = `<div class="grid g-main"><div class="stack">${card(t('summary'), `<dl class="dl" style="margin-bottom:14px"><dt>${t('client')}</dt><dd>${LE(client(p.clientId)?.name)}</dd><dt>${t('program')}</dt><dd>${LE(p.title)}</dd></dl><div class="table-wrap"><table class="tbl"><thead><tr><th>${t('course')}</th><th>${t('instructor')}</th><th class="num">${t('daysSessions')}</th><th class="num">${t('participantsN')}</th><th>${t('invitations')}</th></tr></thead><tbody>${rows || `<tr><td colspan="5" class="muted small">${t('noCourses')}</td></tr>`}</tbody></table></div>`)}
      ${card(t('stillMissing'), check)}</div>${card(t('instructorContent'), content.length ? `<p class="small muted" style="margin-bottom:10px">${t('contentLater')}</p><ul class="list">${content.map(c=>`<li class="row between"><span class="small">${ownerTag('trainer')} ${LE(c.title)} — ${esc(courseTeamText(c.id))}</span><span class="xs muted">${contentStatus(c.id).done}/${contentStatus(c.id).of}</span></li>`).join('')}</ul>` : `<p class="small muted">${t('contentAllReady')}</p>`)}</div>`;
    foot = nav(p.status==='draft' ? `<button class="btn" data-action="wzGo" data-k="5" data-pid="${p.id}" data-save="1">${t('saveDraft')}</button><button class="btn btn-primary" data-action="activateProgram" data-pid="${p.id}" ${cs.length?'':'disabled'}>${icon('check',16)}${t('activateProgram')}</button>` : `<a class="btn btn-primary" href="${href('program',p.id)}">${t('done')}</a>`);
  }
  return {title:t('setupTitle'), html: pageHead(L(p.title) ? LE(p.title) : t('newProgramTitle'), t('setupSub2',{n:step}), stBadge(programStatus(p)), [[t('nav.programs'),'#/programs'],[LE(p.title)||t('newProgramTitle')]]) + stepper + body + foot};
};
ACT.wzCourse = el => { V.wzCourse = el.dataset.k; V.pw.q = ''; render(); };
ACT.wzGo = el => { const p = program(el.dataset.pid), k = Number(el.dataset.k); if (el.dataset.save) toast(t('draftSaved')); if (el.dataset.course) V.wzCourse = el.dataset.course;
  if (k>1 && !p.clientId) return toast(t('chooseClientFirst'),'warn'); p.setupStep = Math.max(p.setupStep||1, Math.min(k,5)); save(); go('setup', p.id, {step:k}); };
ACT.wzSave = el => { const f = $('#wzForm'); if (!f) return; f.dataset.next = el.dataset.k; runSubmit(f); };
SUB.wzProgram = form => { const f = Object.fromEntries(new FormData(form)), p = program(form.dataset.pid), errs = {}, cont = form.dataset.next==='1';
  if (cont || f.pname){ if (String(f.pname).trim().length<3) errs.pname = t('errTitle'); }
  if (cont && !f.client) errs.client = t('errClient'); if (f.end && f.start && f.end < f.start) errs.end = t('errEndDate');
  if (!formErrors(form, errs)) return;
  const nm = f.pname.trim(), alt = (f.palt||'').trim();
  Object.assign(p, {title: LANG==='ar' ? {ar:nm, en:alt||nm} : {en:nm, ar:alt||nm}, clientId:f.client||p.clientId, code:(f.pcode||'').trim()||p.code, categoryId:f.cat, audienceId:f.aud, deliveryModeId:f.dm, priorityId:f.prio, startOffset: f.start?offOf(f.start):p.startOffset, endOffset: f.end?offOf(f.end):p.endOffset, desc:bi((f.pdesc||'').trim())});
  p.needs = Object.assign(p.needs||{}, {business:(f.n_business||'').trim(), measures:(f.n_measures||'').trim(), internal:(f.n_internal||'').trim()});
  addLog('program_update', {prog:p.id, scope:'program'});
  if (cont){ p.setupStep = Math.max(p.setupStep||1, 2); save(); go('setup', p.id, {step:2}); } else { save(); render(); } toast(cont?t('saved'):t('draftSaved')); };
ACT.activateProgram = el => { const p = program(el.dataset.pid), miss = coursesOf(p.id).filter(c=>!adminSetup(c.id).complete);
  const go2 = () => { p.status = 'active'; p.setupStep = 5; addLog('program_activate', {prog:p.id}); coursesOf(p.id).forEach(c=>courseInstructors(c.id).forEach(id=>addLog('notify_trainer', {course:c.id, user:id}))); save(); go('program', p.id); toast(t('programActivated')); };
  if (miss.length) confirmModal(t('activateProgram'), t('finishIncomplete',{n:miss.length}), t('activateAnyway'), go2); else go2(); };

/* ---------- Course form (Admin): details + instructor team ---------- */
const teamChips = (ids, lead) => ids.length ? ids.map(id=>`<span class="badge ${id===lead && ids.length>1 ? 'b-teal' : 'b-navy'} nodot">${esc(userLabel(id))}${id===lead && ids.length>1 ? ' · '+t('leadShort') : ''}</span>`).join(' ') : `<span class="conflict small">${t('noTrainer')}</span>`;
const coordChips = pid => { const ids = programCoordinators(pid); return ids.length ? `<div class="row" style="gap:6px">${ids.map(id=>`<span class="badge b-navy nodot">${esc(userLabel(id))}${user(id).status==='invited'?' · '+t('invitedShort'):''}</span>`).join('')}</div>` : `<p class="small conflict">${t('noCoordAssigned')}</p>`; };
const teamRow = (u, on, lead) => `<div class="team-row"><label class="check"><input type="checkbox" name="team" value="${u.id}" ${on?'checked':''}><span>${LE(u.name)}${u.status==='invited'?` <span class="xs muted">(${t('invitedShort')})</span>`:''}${u.status==='deactivated'?` <span class="xs conflict">(${t('accessOff')})</span>`:''}</span></label><label class="check xs"><input type="radio" name="lead" value="${u.id}" ${lead?'checked':''}>${t('leadInstructor')}</label></div>`;
const taRow = (u, on) => `<label class="check"><input type="checkbox" name="ta" value="${u.id}" ${on?'checked':''}><span>${LE(u.name)}${u.status==='invited'?` <span class="xs muted">(${t('invitedShort')})</span>`:''}</span></label>`;
ACT.editCourse = el => { const c = el.dataset.cid ? course(el.dataset.cid) : null, pid = c ? c.programId : el.dataset.pid, team = c ? courseInstructors(c.id) : [], lead = c ? leadOf(c.id) : null;
  const pool = S.users.filter(u=>u.role==='trainer' && (u.status!=='deactivated' || team.includes(u.id))).sort(byName);
  const started = c && courseSessions(c.id).some(s=>s.status!=='scheduled');
  openModal({title: c ? t('editCourse') : t('addCourse'), body:`<form data-submit="saveCourse" data-pid="${pid}" data-cid="${c?c.id:''}" novalidate>
    ${field('ctitle', t('courseTitle')+' *', inp('ctitle', c?L(c.title):''))}
    <fieldset class="field" id="teamField"><legend class="lbl">${t('instructorTeam')}</legend><p class="help" style="margin:0 0 6px">${t('teamHelp')}</p><div id="teamList" class="team-list">${pool.map(u=>teamRow(u, team.includes(u.id), u.id===lead)).join('') || `<p class="small muted">${t('noInstructorsYet')}</p>`}</div>
      <button type="button" class="btn btn-sm" style="margin-top:8px" data-action="inviteFromCourse">${icon('plus',14)}${t('addInstructor')}</button>${started?`<div style="margin-top:8px">${note(t('teamHistoryNote'),'', 'info')}</div>`:''}</fieldset>
    <fieldset class="field"><legend class="lbl">${t('role.ta')} <span class="xs muted">(${t('optional')})</span></legend><p class="help" style="margin:0 0 6px">${t('taHelp')}</p><div id="taList" class="team-list">${S.users.filter(u=>u.role==='ta' && (u.status!=='deactivated' || (c && isCourseTA(c.id,u.id)))).sort(byName).map(u=>taRow(u, !!c && isCourseTA(c.id, u.id))).join('') || `<p class="small muted">${t('noTasYet')}</p>`}</div>
      <button type="button" class="btn btn-sm" style="margin-top:8px" data-action="inviteTaFromCourse">${icon('plus',14)}${t('addTa')}</button></fieldset>
    ${field('desc', t('shortDescription'), `<textarea class="textarea" id="f-desc" name="desc" rows="2" style="min-height:56px">${esc(c?L(c.desc):'')}</textarea>`, t('optional'))}
    ${field('lang', t('language'), selF('lang', [['ar',t('lang.ar')],['en',t('lang.en')],['bi',t('lang.bi')]], c?c.language:'bi'))}
    <details class="explain"><summary>${t('optionalDetails')}</summary><div style="margin-top:10px">${field('objs', t('objectivesOnePerLine'), `<textarea class="textarea" id="f-objs" name="objs" rows="3">${esc(c?c.objectives.map(o=>L(o)).join('\n'):'')}</textarea>`, t('objectivesHelp2'))}
    <div class="form-grid">${field('hours', t('durationHours'), inp('hours', c?c.hours:12, 'number','min="1" max="200"'))}${field('type', t('courseType'), selF('type', clsOpts('courseType', c?.typeId), c?.typeId))}</div></div></details></form>`,
  footer:`<button class="btn" data-action="closeModal">${t('cancel')}</button>${c?'':`<button class="btn" data-action="saveCourseAnother">${t('saveAddAnother')}</button>`}<button class="btn btn-primary" data-action="submitForm">${c?t('save'):t('addCourse')}</button>`});
  if (el.dataset.focus==='team') setTimeout(()=>{ const x = topModal()?.querySelector('#teamList input'); x && x.focus(); }, 30); };
ACT.inviteFromCourse = () => openInvite('trainer', {form:'course'});
ACT.inviteTaFromCourse = () => openInvite('ta', {form:'course'});
ACT.saveCourseAnother = () => { const f = topModal().querySelector('form'); f.dataset.again = '1'; runSubmit(f); };
SUB.saveCourse = form => { const f = Object.fromEntries(new FormData(form)), errs = {}; let c = form.dataset.cid ? course(form.dataset.cid) : null;
  if (String(f.ctitle).trim().length<3) errs.ctitle = t('errTitle'); if (!formErrors(form, errs)) return;
  const team = new FormData(form).getAll('team'), lead = f.lead && team.includes(f.lead) ? f.lead : team[0] || null;
  const objs = String(f.objs||'').split('\n').map(s=>s.trim()).filter(Boolean), ttl = f.ctitle.trim(), isNew = !c;
  if (!c){ c = {id:'CR'+uid('').slice(-5).toUpperCase(), programId:form.dataset.pid, archived:false, code:'', instructorIds:[], leadId:null}; S.courses.push(c); ensureCohort(c.id); }
  const objectives = objs.length ? objs.map((txt,i)=>{ const old = c.objectives && c.objectives[i]; return old ? Object.assign({}, old, {[LANG]:txt}) : {id:'O'+(i+1)+uid('').slice(-3), en:txt, ar:txt}; }) : (c.objectives && c.objectives.length ? c.objectives : [{id:'O1', ...T('Apply the course skills at work','تطبيق مهارات الدورة في العمل')}]);
  Object.assign(c, {title: c.title ? Object.assign({}, c.title, {[LANG]:ttl}) : bi(ttl), desc: c.desc ? Object.assign({}, c.desc, {[LANG]:(f.desc||'').trim()}) : bi((f.desc||'').trim()), language:f.lang, hours:Number(f.hours)||c.hours||12, typeId:f.type||c.typeId, objectives});
  const o = LANG==='ar'?'en':'ar'; if (!c.title[o]) c.title[o] = ttl;
  const ch = setCourseTeam(c, team, lead), tas = new FormData(form).getAll('ta'), prevTa = c.taIds || [];
  tas.filter(id=>!prevTa.includes(id)).forEach(id=>addLog('trainer_assign', {course:c.id, user:id})); prevTa.filter(id=>!tas.includes(id)).forEach(id=>addLog('trainer_unassign', {course:c.id, user:id})); c.taIds = tas;
  addLog('course_save', {prog:c.programId, course:c.id}); save(); render();
  toast(t('courseSaved') + (ch.added.length||ch.removed.length ? ' · '+t('teamUpdatedN',{n:courseInstructors(c.id).length}) : ''));
  if (form.dataset.again==='1'){ closeModal(); ACT.editCourse({dataset:{pid:c.programId}}); } else closeModal(); };
ACT.archiveCourse = el => { const c = course(el.dataset.cid); confirmModal(t('remove'), t('archiveCourseConfirm',{c:L(c.title)}), t('remove'), ()=>{ c.archived = true; addLog('course_archive', {prog:c.programId, course:c.id}); save(); render(); toast(t('archivedToast')); }, true); };

/* ---------- Schedule editor (Admin edits; others read-only) ---------- */
function scheduleEditor(cid){
  const c = course(cid), admin = can('structure'), ch = admin ? ensureCohort(cid) : courseCohort(cid);
  if (!ch) return empty(t('noDays'), t('noDaysOther'), 'calendar');
  const days = daysOfCohort(ch.id);
  const dayCards = days.map((d,i)=>{ const ss = sessionsOfCohort(ch.id).filter(s=>s.dayId===d.id);
    const rows = ss.map((s,j)=>{ const cf = conflictsFor(s); return `<li class="item-row" ${s.status==='cancelled'?'style="opacity:.55"':''}><div class="ltr num small nowrap" style="width:96px;text-align:start">${s.start}–${s.end}</div><div class="grow"><div class="cell-main small">${LE(s.title)}</div>${s.agenda&&L(s.agenda)?`<div class="xs muted">${LE(s.agenda)}</div>`:''}<div class="xs muted" style="margin-top:2px">${icon(s.mode==='virtual'?'video':'pin',12)} ${LE(room(s.roomId)?.name) || `<span class="conflict">${t('noRoom')}</span>`} · ${icon('user',12)} ${sessionInstructors(s).length ? esc(sessionTeamText(s)) : `<span class="conflict">${t('noSessionInstructor')}</span>`}</div>${cf.length?`<div class="xs conflict">${icon('alert',12)} ${esc(cf.map(conflictText).join(' · '))}</div>`:''}</div>
      <div class="row" style="flex-wrap:nowrap">${sessBadge(s)}${admin && s.status==='scheduled' ? `<button class="btn btn-sm" data-action="editSession" data-sid="${s.id}">${t('edit')}</button><button class="btn btn-sm btn-ghost" data-action="cancelSession" data-sid="${s.id}" aria-label="${esc(t('cancelSession'))}">${icon('x',14)}</button>` : admin && s.status==='cancelled' ? `<button class="btn btn-sm" data-action="restoreSession" data-sid="${s.id}">${t('restore')}</button>` : ''}</div></li>`; }).join('');
    return card(`<span class="day-h"><span class="chip">${t('dayN',{n:i+1})}</span>${esc(fmtDay(d.dayOffset, true))}${d.dayOffset===0?` <span class="badge b-teal">${t('today')}</span>`:''}</span>`, `${ss.length ? `<ul class="list" style="padding:0 18px">${rows}</ul>` : `<div class="card-b small muted">${t('noSessionsDay')}</div>`}${admin?`<div class="card-b" style="padding-top:0"><button class="btn btn-sm btn-primary" data-action="editSession" data-did="${d.id}">${icon('plus',13)}${t('addSession')}</button></div>`:''}`,
      {flush:true, cls: d.dayOffset===0 ? 'day-card is-today' : '', right: admin ? `<div class="row"><button class="btn btn-sm btn-ghost" data-action="editDay" data-did="${d.id}">${icon('calendar',13)}${t('changeDate')}</button>${!ss.length?`<button class="btn btn-sm btn-ghost" data-action="removeDay" data-did="${d.id}">${t('remove')}</button>`:''}</div>` : ''}); }).join('');
  return `<div class="stack">${days.length ? dayCards : card('', empty(t('noDays'), admin?t('noDaysAdmin2'):t('noDaysOther'), 'calendar'))}</div>${admin?`<div style="margin-top:14px"><button class="btn ${days.length?'':'btn-primary'}" data-action="addDay" data-cid="${ch.id}">${icon('plus',16)}${t('addDay')}</button></div>`:''}`;
}
ACT.addDay = el => { const ds = daysOfCohort(el.dataset.cid), next = ds.length ? ds[ds.length-1].dayOffset+1 : 14;
  openModal({title:t('addDay'), body:`<form data-submit="saveDay" data-cid="${el.dataset.cid}" novalidate>${field('ddate', t('date'), inp('ddate', isoOf(next), 'date'))}<label class="check"><input type="checkbox" name="twoSessions" checked>${t('addDefaultSessions')}</label></form>`, footer:`<button class="btn" data-action="closeModal">${t('cancel')}</button><button class="btn btn-primary" data-action="submitForm">${t('addDay')}</button>`}); };
ACT.editDay = el => { const d = dayRec(el.dataset.did); if (sessionsOfCohort(d.cohortId).some(s=>s.dayId===d.id && ['live','ended'].includes(s.status))) return toast(t('dayHasHistory'),'warn');
  openModal({title:t('changeDate'), body:`<form data-submit="saveDay" data-did="${d.id}" data-cid="${d.cohortId}" novalidate>${field('ddate', t('date'), inp('ddate', isoOf(d.dayOffset), 'date'), t('changeDateHelp'))}</form>`, footer:`<button class="btn" data-action="closeModal">${t('cancel')}</button><button class="btn btn-primary" data-action="submitForm">${t('save')}</button>`}); };
SUB.saveDay = form => { const iso = form.ddate.value, chid = form.dataset.cid, d = form.dataset.did ? dayRec(form.dataset.did) : null; if (!iso) return formErrors(form, {ddate:t('errDate')});
  const off = offOf(iso); if (daysOfCohort(chid).some(x=>x.dayOffset===off && (!d || x.id!==d.id))) return formErrors(form, {ddate:t('errDayExists')});
  const c = course(cohort(chid).courseId);
  if (d){ d.dayOffset = off; addLog('day_update', {course:c.id}); }
  else { const nd = {id:chid+'-D'+uid('').slice(-5), cohortId:chid, dayOffset:off}; S.days.push(nd); const prevRoom = activeSessions(chid)[0]?.roomId || 'r1';
    if (form.twoSessions && form.twoSessions.checked) [['09:00','12:00'],['13:00','16:00']].forEach((tm,i)=>S.sessions.push({id:nd.id+'-S'+(i+1), dayId:nd.id, cohortId:chid, courseId:c.id, order:i+1, title:bi(i?t('afternoonSession',null,true):t('morningSession',null,true)), agenda:bi(''), start:tm[0], end:tm[1], roomId:prevRoom, mode:'in_person', meetingUrl:'', status:'scheduled', startedAt:null, endedAt:null, clockOffset:0, codeVer:0, instructorIds: leadOf(c.id) ? [leadOf(c.id)] : [], leadId: leadOf(c.id)}));
    addLog('day_add', {course:c.id}); }
  closeModal(); save(); render(); const n = courseSessions(c.id).filter(s=>s.status==='scheduled' && conflictsFor(s).length).length; toast(t('daySaved') + (n ? ' · '+t('conflictsNow',{n}) : ''), n?'warn':'ok'); };
ACT.removeDay = el => { const d = dayRec(el.dataset.did); S.days = S.days.filter(x=>x.id!==d.id); addLog('day_remove', {course:cohort(d.cohortId).courseId}); save(); render(); toast(t('dayRemoved')); };
ACT.editSession = el => {
  const s = el.dataset.sid ? sess(el.dataset.sid) : null, did = s ? s.dayId : el.dataset.did, d = dayRec(did), chid = d.cohortId, ds = daysOfCohort(chid);
  const last = sessionsOfCohort(chid).filter(x=>x.dayId===did && x.status!=='cancelled').pop();
  const v = s || {title:{en:'',ar:''}, agenda:{en:'',ar:''}, start: last ? last.end : '09:00', end: last ? String(Math.min(23,Number(last.end.slice(0,2))+2)).padStart(2,'0')+last.end.slice(2) : '12:00', mode:'in_person', roomId: last?.roomId || '', meetingUrl:''};
  const cid = cohort(chid).courseId, team = courseInstructors(cid), cur = s ? sessionInstructors(s) : (leadOf(cid) ? [leadOf(cid)] : []), curLead = s ? sessionLead(s) : leadOf(cid);
  const staff = team.length ? `<fieldset class="field"><legend class="lbl">${t('sessionInstructors')}</legend><p class="help" style="margin:0 0 6px">${t('sessionInstructorsHelp')}</p><div class="team-list">${team.map(id=>`<div class="team-row"><label class="check"><input type="checkbox" name="sinst" value="${id}" ${cur.includes(id)?'checked':''}><span>${esc(userLabel(id))}</span></label>${team.length>1?`<label class="check xs"><input type="radio" name="slead" value="${id}" ${id===curLead?'checked':''}>${t('leadFacilitator')}</label>`:''}</div>`).join('')}</div><span class="err" id="e-sinst" role="alert"></span></fieldset>`
    : note(`${t('noTeamForSession')} <button type="button" class="btn btn-sm" data-action="editCourse" data-cid="${cid}" data-focus="team">${t('editTeam')}</button>`, 'warn', 'users');
  openModal({title: s ? t('editSession') : t('addSession'), body:`<form data-submit="saveSession" data-sid="${s?s.id:''}" data-cid="${chid}" novalidate>
    <p class="small muted" style="margin-bottom:12px">${LE(course(cohort(chid).courseId).title)}</p>
    ${field('stitle', t('sessionTitle')+' *', inp('stitle', L(v.title)))}
    ${field('sagenda', t('agenda'), `<textarea class="textarea" id="f-sagenda" name="sagenda" rows="2" style="min-height:56px" placeholder="${esc(t('agendaPh'))}">${esc(L(v.agenda))}</textarea>`, t('optional'))}
    <div class="form-grid">${field('sday', t('courseDay'), selF('sday', ds.map((x,i)=>[x.id, `${t('dayN',{n:i+1},true)} — ${esc(fmtDay(x.dayOffset))}`]), did))}${field('smode', t('mode'), selF('smode', [['in_person',t('mode.in_person')],['virtual',t('mode.virtual')]], v.mode))}
    ${field('sstart', t('startTime'), inp('sstart', v.start, 'time'))}${field('send', t('endTime'), inp('send', v.end, 'time'))}</div>
    ${field('sroom', t('location'), selF('sroom', [['',t('chooseRoom')]].concat(S.rooms.filter(r=>!r.virtual).map(r=>[r.id, LE(r.name)])), room(v.roomId)?.virtual?'':v.roomId), t('locationHelp'))}
    ${geoFields(s)}
    ${field('slink', t('virtualLink'), inp('slink', v.meetingUrl, 'url','dir="ltr" placeholder="https://"'), t('virtualLinkHelp'))}${staff}<div id="conflictBox"></div></form>`,
  footer:`<button class="btn" data-action="closeModal">${t('cancel')}</button><button class="btn btn-primary" data-action="submitForm">${t('saveSession')}</button>`}); };
SUB.saveSession = form => {
  const f = Object.fromEntries(new FormData(form)), chid = form.dataset.cid, s = form.dataset.sid ? sess(form.dataset.sid) : null, errs = {};
  if (String(f.stitle).trim().length<3) errs.stitle = t('errTitle'); if (!f.sstart) errs.sstart = t('errRequired'); if (!f.send || f.send <= f.sstart) errs.send = t('errEndTime');
  const d = dayRec(f.sday); if (!d || d.cohortId!==chid) errs.sday = t('errDayCohort');
  const virt = f.smode==='virtual', roomId = virt ? 'r4' : f.sroom; if (!virt && !roomId) errs.sroom = t('errRoom'); if (f.slink && !/^https?:\/\//.test(f.slink)) errs.slink = t('errUrl');
  const insts = new FormData(form).getAll('sinst'), sl = f.slead && insts.includes(f.slead) ? f.slead : insts[0] || null;
  if (courseInstructors(cohort(chid).courseId).length && !insts.length) errs.sinst = t('errSessionInstructor');
  const G = virt ? {geo:null} : geoFromForm(f); if (G.errs) Object.assign(errs, G.errs);
  if (!formErrors(form, errs)) return;
  const c = course(cohort(chid).courseId), draft = {id: s?s.id:'__draft', dayId:f.sday, cohortId:chid, courseId:c.id, start:f.sstart, end:f.send, roomId, status:'scheduled', instructorIds:insts};
  const cf = s ? (()=>{ const old = Object.assign({}, s); Object.assign(s, draft); const r = conflictsFor(s); Object.assign(s, old); return r; })() : conflictsDraft(draft);
  if (cf.length && form.dataset.force!=='1'){ $('#conflictBox').innerHTML = `<div style="margin-top:6px">${note(`<b>${t('conflictWarnTitle')}</b><ul style="margin:6px 0 0;padding-inline-start:18px">${cf.map(x=>`<li>${esc(conflictText(x))} — <span class="ltr">${x.o.start}–${x.o.end}</span></li>`).join('')}</ul><div class="row" style="margin-top:8px"><button type="button" class="btn btn-sm" data-action="forceSave">${t('saveAnyway')}</button><span class="xs">${t('orAdjust')}</span></div>`, 'warn', 'alert')}</div>`; return; }
  const ttl = f.stitle.trim(), ag = (f.sagenda||'').trim(), title = s ? Object.assign({}, s.title, {[LANG]:ttl}) : bi(ttl), agenda = s && s.agenda ? Object.assign({}, s.agenda, {[LANG]:ag}) : bi(ag);
  if (s){ const before = sessionInstructors(s).join(','); Object.assign(s, {title, agenda, dayId:f.sday, start:f.sstart, end:f.send, mode:f.smode, roomId, meetingUrl:f.slink||'', instructorIds:insts, leadId:sl, geo:G.geo}); if (before!==insts.join(',')) addLog('session_staff', {course:c.id, sid:s.id}); }
  else S.sessions.push({id:f.sday+'-S'+uid('').slice(-5), dayId:f.sday, cohortId:chid, courseId:c.id, order: sessionsOfCohort(chid).filter(x=>x.dayId===f.sday).length+1, title, agenda, start:f.sstart, end:f.send, roomId, mode:f.smode, meetingUrl:f.slink||'', status:'scheduled', startedAt:null, endedAt:null, clockOffset:0, codeVer:0, instructorIds:insts, leadId:sl, geo:G.geo});
  addLog('session_save', {course:c.id}); closeModal(); save(); render(); toast(cf.length ? t('savedWithConflict') : t('sessionSaved'), cf.length?'warn':'ok');
};
ACT.forceSave = () => { const f = topModal().querySelector('form'); f.dataset.force = '1'; runSubmit(f); };
ACT.cancelSession = el => { const s = sess(el.dataset.sid); confirmModal(t('cancelSession'), t('cancelSessionConfirm',{s:L(s.title)}), t('cancelSession'), ()=>{ s.status = 'cancelled'; addLog('session_cancel', {course:s.courseId, sid:s.id}); save(); render(); toast(t('sessionCancelled')); }, true); };
ACT.restoreSession = el => { const s = sess(el.dataset.sid); s.status = 'scheduled'; addLog('session_save', {course:s.courseId, sid:s.id}); save(); render(); toast(t('restoredToast')); };

/* ---------- Participants & invitations (target course always visible) ---------- */
const INV_BADGE = {not_sent:'', sent:'b-sim', completed:'b-ok', failed:'b-bad'};
const invBadge = x => badge(INV_BADGE[inviteStatus(x)], t('inv.'+inviteStatus(x)), inviteStatus(x)!=='not_sent');
function participantsPanel(cid, mode){
  const c = course(cid), admin = can('participants'), help = can('resendInvite'), q = (V.pw.q||'').toLowerCase();
  const all = courseParticipants(cid), list = all.filter(x=>!q || (x.name.en+' '+x.name.ar+' '+x.email+' '+(x.empId||'')).toLowerCase().includes(q));
  const pend = all.filter(x=>['not_sent','failed'].includes(inviteStatus(x))).length;
  const target = `<div class="note" style="margin-bottom:12px">${icon('users',16)}<div>${t('targetCourse')}: <b>${LE(c.title)}</b> · ${LE(program(c.programId).title)} · ${LE(client(program(c.programId).clientId)?.name)}</div></div>`;
  const tools = `<div class="toolbar"><div class="search">${icon('search',16)}<input class="input" id="pwQ" type="search" data-input="pwSearch" data-cid="${cid}" value="${esc(V.pw.q||'')}" placeholder="${esc(t('searchParticipants'))}" aria-label="${esc(t('searchParticipants'))}"></div><span class="grow"></span>
    ${admin ? `<button class="btn btn-primary" data-action="importParticipants" data-cid="${cid}">${icon('upload',16)}${t('importCsvXlsx')}</button><button class="btn" data-action="addParticipant" data-cid="${cid}">${icon('plus',16)}${t('addOne')}</button>` : ''}
    ${(admin||help) && pend ? `<button class="btn btn-teal" data-action="previewInvites" data-cid="${cid}">${icon('bell',16)}${t('sendInvitesN',{n:pend})}</button>` : ''}</div>`;
  const rows = list.map(x=>`<tr><td><div class="cell-main small">${LE(x.name)}</div><div class="cell-sub ltr" style="text-align:start">${esc(x.email)}</div></td><td class="small">${LE(x.dept)||'—'}</td><td class="small ltr" style="text-align:start">${esc(x.empId||'—')}</td><td>${invBadge(x)}${x.invite?.at && inviteStatus(x)!=='not_sent'?`<div class="cell-sub">${esc(fmtDT(x.invite.at))}</div>`:''}</td>
    <td class="nowrap">${(admin||help) && ['failed','sent','not_sent'].includes(inviteStatus(x)) ? `<button class="btn btn-sm" data-action="resendInvite" data-pid="${x.id}">${inviteStatus(x)==='not_sent'?t('send'):t('resend')}</button>` : ''}${admin?` <button class="btn btn-sm btn-ghost" data-action="editParticipant" data-pid="${x.id}" aria-label="${esc(t('edit')+' '+L(x.name))}">${icon('edit',14)}</button>`:''}</td></tr>`).join('');
  const table = all.length ? `<div class="table-wrap"><table class="tbl"><thead><tr><th>${t('participant')}</th><th>${t('department')}</th><th>${t('employeeId')}</th><th>${t('invitation')}</th><th><span class="sr-only">${t('actions')}</span></th></tr></thead><tbody>${rows || `<tr><td colspan="5">${empty(t('noResults'),'','search')}</td></tr>`}</tbody></table></div>`
    : empty(t('noParticipants'), admin ? t('noParticipantsImport') : t('noParticipantsAsk'), 'users', admin ? `<button class="btn btn-primary" data-action="importParticipants" data-cid="${cid}">${icon('upload',16)}${t('importCsvXlsx')}</button>` : '');
  return `${target}${all.length||admin?tools:''}<div id="pw-results">${card('', table, {flush:true})}</div>${all.length?`<p class="xs muted" style="margin-top:8px">${simTag('simInvite')} ${t('inviteLegend')}</p>`:''}`;
}
INP.pwSearch = el => { V.pw.q = el.value; const tmp = document.createElement('div'); tmp.innerHTML = participantsPanel(el.dataset.cid); $('#pw-results').replaceWith($('#pw-results', tmp)); };
ACT.addParticipant = el => { const c = course(el.dataset.cid);
  openModal({title:t('addParticipant'), body:`<form data-submit="addParticipant" data-cid="${c.id}" novalidate><p class="small" style="margin-bottom:12px">${t('targetCourse')}: <b>${LE(c.title)}</b></p>
    ${field('pname', t('participantName')+' *', inp('pname','','text','autocomplete="off"'))}${field('pemail', t('email')+' *', inp('pemail','','email','dir="ltr" autocomplete="off"'))}
    <div class="form-grid">${field('pdept', t('department'), inp('pdept'))}${field('pemp', t('employeeId'), inp('pemp','','text','dir="ltr"'))}</div></form>`, footer:`<button class="btn" data-action="closeModal">${t('cancel')}</button><button class="btn btn-primary" data-action="submitForm">${t('addParticipant')}</button>`}); };
SUB.addParticipant = form => { const f = Object.fromEntries(new FormData(form)), c = course(form.dataset.cid), ch = ensureCohort(c.id), errs = {};
  if (String(f.pname).trim().length<2) errs.pname = t('errName'); if (!validEmail(String(f.pemail).trim())) errs.pemail = t('errEmail'); else if (partsOf(ch.id).some(x=>x.email.toLowerCase()===f.pemail.trim().toLowerCase())) errs.pemail = t('errAlreadyEnrolled');
  if (!formErrors(form, errs)) return;
  S.participants.push({id:uid('pa'), cohortId:ch.id, name:bi(f.pname.trim()), title:bi('—'), email:f.pemail.trim(), dept:bi((f.pdept||'').trim()), empId:(f.pemp||'').trim(), invite:{status:'not_sent', at:null}});
  addLog('participant_add', {course:c.id, n:1}); closeModal(); save(); render(); toast(t('participantAddedInv',{n:f.pname.trim()})); };
ACT.editParticipant = el => { const x = part(el.dataset.pid);
  openModal({title:t('editParticipant'), body:`<form data-submit="editParticipant" data-pid="${x.id}" novalidate>${field('pname', t('participantName'), inp('pname', L(x.name)))}${field('pemail', t('email'), inp('pemail', x.email, 'email','dir="ltr"'))}<div class="form-grid">${field('pdept', t('department'), inp('pdept', L(x.dept)))}${field('pemp', t('employeeId'), inp('pemp', x.empId||'', 'text','dir="ltr"'))}</div></form>`, footer:`<button class="btn" data-action="closeModal">${t('cancel')}</button><button class="btn btn-primary" data-action="submitForm">${t('save')}</button>`}); };
SUB.editParticipant = form => { const f = Object.fromEntries(new FormData(form)), x = part(form.dataset.pid), errs = {};
  if (String(f.pname).trim().length<2) errs.pname = t('errName'); if (!validEmail(String(f.pemail).trim())) errs.pemail = t('errEmail'); if (!formErrors(form, errs)) return;
  x.name = Object.assign({}, x.name, {[LANG]:f.pname.trim()}); x.email = f.pemail.trim(); x.dept = bi((f.pdept||'').trim()); x.empId = (f.pemp||'').trim(); addLog('participant_update', {course:cohortOf(x.id).courseId, pid:x.id}); closeModal(); save(); render(); toast(t('saved')); };

/* Import CSV / Excel — the target course is fixed and always shown */
let IMPORT = null;
const HDR = {name:['name','participant name','full name','participant','الاسم','اسم المشارك'], email:['email','email address','e-mail','البريد','البريد الإلكتروني'], dept:['department','dept','القسم','الإدارة'], emp:['employee id','employee_id','employee no','emp id','id','الرقم الوظيفي']};
const TEMPLATE_CSV = 'Participant name,Email,Department,Employee ID\nOmar Al-Fayez,omar.f@sahil-energy.example,Maintenance,E1021\n';
const SAMPLE_IMPORT = `Participant name,Email,Department,Employee ID
Omar Al-Fayez,omar.f@marsa-logistics.example,Warehouse,E2101
Layla Hamdan,layla.h@marsa-logistics.example,Safety,E2102
Saad Al-Mutairi,saad.m@marsa-logistics,Operations,E2103
,no.name@marsa-logistics.example,Operations,E2104
Rawan Al-Shehri,rawan.s@marsa-logistics.example,Planning,E2105
Layla Hamdan,layla.h@marsa-logistics.example,Safety,E2102`;
ACT.importParticipants = el => { const c = course(el.dataset.cid); IMPORT = {cid:c.id, rows:null};
  openModal({title:t('importTitle2'), size:'lg', body:`<div class="note" style="margin-bottom:12px">${icon('users',16)}<div>${t('importingInto')}: <b>${LE(c.title)}</b> · ${LE(program(c.programId).title)}<div class="xs">${t('importNeverOther')}</div></div></div>
    <form data-submit="importValidate" data-cid="${c.id}" novalidate>
    <div class="file-drop"><div class="row" style="justify-content:center"><label class="btn btn-primary" for="f-ifile">${icon('upload',15)}${t('chooseCsvXlsx')}</label><input id="f-ifile" type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" class="sr-only" data-change="importFile"><button type="button" class="btn btn-sm btn-ghost" data-action="downloadTemplate">${icon('download',14)}${t('downloadTemplate')}</button></div>
      <p class="xs muted" style="margin-top:8px">${t('importColumns')}</p><p class="small" id="ifileName" style="margin-top:4px"></p></div>
    <details class="explain" style="margin-top:12px"><summary>${t('orPaste')}</summary><div><textarea class="textarea ltr" id="f-icsv" name="icsv" rows="6" spellcheck="false" style="font-family:var(--mono);font-size:12.5px;margin-top:8px">${esc(SAMPLE_IMPORT)}</textarea><button type="button" class="btn btn-sm" style="margin-top:8px" data-action="submitForm">${t('checkRows')}</button></div></details>
    <span class="err small" id="e-icsv" style="color:var(--bad);font-weight:600"></span><div id="import-preview" style="margin-top:14px"></div></form>`,
  footer:`<button class="btn" data-action="closeModal">${t('cancel')}</button><button class="btn btn-primary" data-action="importCommit" id="importGo" disabled>${t('importValid')}</button>`}); };
ACT.downloadTemplate = () => { if (downloadText('participants-template.csv', TEMPLATE_CSV)) toast(t('templateDownloaded'),'info'); };
CHG.importFile = async el => { const f = el.files && el.files[0]; if (!f) return; $('#ifileName').textContent = `${f.name} · ${fmtSize(f.size)}`;
  try { let rows;
    if (/\.xlsx$/i.test(f.name)) rows = await readXlsx(f);
    else if (/\.xls$/i.test(f.name)) { $('#e-icsv').textContent = t('xlsNotSupported'); return; }
    else rows = parseCsv(await f.text());
    $('#e-icsv').textContent = ''; validateImport(rows); }
  catch(e){ $('#e-icsv').textContent = e.message==='nodecomp' ? t('xlsxBrowser') : t('fileUnreadable'); } };
SUB.importValidate = form => { const text = String(form.icsv.value||'').trim(); if (!text) return formErrors(form, {icsv:t('errRequired')}); validateImport(parseCsv(text)); };
function parseCsv(text){ const rows = []; let row = [], cur = '', q = false;
  for (let i=0;i<text.length;i++){ const ch = text[i];
    if (q){ if (ch==='"' && text[i+1]==='"'){ cur += '"'; i++; } else if (ch==='"') q = false; else cur += ch; }
    else if (ch==='"') q = true; else if (ch===',' || ch===';' || ch==='\t'){ row.push(cur.trim()); cur = ''; } else if (ch==='\n' || ch==='\r'){ if (ch==='\r' && text[i+1]==='\n') i++; row.push(cur.trim()); if (row.some(x=>x)) rows.push(row); row = []; cur = ''; } else cur += ch; }
  row.push(cur.trim()); if (row.some(x=>x)) rows.push(row); return rows; }
function validateImport(rows){
  const c = course(IMPORT.cid); if (!rows.length) return $('#e-icsv').textContent = t('fileEmpty');
  const hdr = rows[0].map(h=>String(h).toLowerCase().trim()), find = k => hdr.findIndex(h=>HDR[k].includes(h));
  const ix = {name:find('name'), email:find('email'), dept:find('dept'), emp:find('emp')};
  if (ix.name<0 || ix.email<0) return $('#e-icsv').textContent = t('errHeader2');
  const enrolled = new Set(courseParticipants(c.id).map(x=>x.email.toLowerCase())), seen = new Set();
  const out = rows.slice(1).map((r,i)=>{ const o = {n:i+2, name:(r[ix.name]||'').trim(), email:(r[ix.email]||'').trim(), dept: ix.dept>=0?(r[ix.dept]||'').trim():'', emp: ix.emp>=0?String(r[ix.emp]||'').trim():''}, e = [], k = o.email.toLowerCase();
    if (!o.name) e.push('noName'); if (!validEmail(o.email)) e.push('badEmail'); else if (seen.has(k)) e.push('dupFile'); else if (enrolled.has(k)) e.push('exists'); seen.add(k); o.errors = e; return o; });
  IMPORT.rows = out; const ok = out.filter(r=>!r.errors.length).length, cnt = k => out.filter(r=>r.errors.includes(k)).length;
  $('#import-preview').innerHTML = `<div class="row" style="margin-bottom:8px">${badge('b-ok', t('imp.valid',{n:ok}))}${badge(out.length-ok?'b-bad':'', t('imp.invalid',{n:out.length-ok}))}<span class="xs muted">${['noName','badEmail','dupFile','exists'].filter(k=>cnt(k)).map(k=>`${t('imp2.'+k)}: ${cnt(k)}`).join(' · ')}</span></div>
    <div class="table-wrap" style="border:1px solid var(--g-200);border-radius:8px;max-height:280px"><table class="tbl"><thead><tr><th>${t('imp.row')}</th><th>${t('participantName')}</th><th>${t('email')}</th><th>${t('department')}</th><th>${t('employeeId')}</th><th>${t('imp.result')}</th></tr></thead><tbody>${out.map(r=>`<tr><td class="num">${r.n}</td><td>${esc(r.name)||'<span class="muted">—</span>'}</td><td class="small ltr" style="text-align:start">${esc(r.email)}</td><td class="small">${esc(r.dept)}</td><td class="small ltr" style="text-align:start">${esc(r.emp)}</td><td>${r.errors.length?badge('b-bad', r.errors.map(k=>t('imp2.'+k)).join('; '), false):badge('b-ok', t('imp.ok'))}</td></tr>`).join('')}</tbody></table></div>`;
  const b = $('#importGo'); if (b){ b.disabled = !ok; b.textContent = t('importNInto',{n:ok, c:L(c.title)}); }
}
ACT.importCommit = () => { if (!IMPORT || !IMPORT.rows) return; const c = course(IMPORT.cid), ch = ensureCohort(c.id), ok = IMPORT.rows.filter(r=>!r.errors.length);
  ok.forEach(r=>S.participants.push({id:uid('pa'), cohortId:ch.id, name:bi(r.name), title:bi('—'), email:r.email, dept:bi(r.dept), empId:r.emp, invite:{status:'not_sent', at:null}}));
  addLog('import', {course:c.id, n:ok.length}); IMPORT = null; closeModal(); save(); render(); toast(t('imported2',{n:ok.length, c:L(c.title)}));
  ACT.previewInvites({dataset:{cid:c.id}}); };

/* Welcome invitations — preview, simulated send, resend */
const inviteLink = x => `https://academy.example.invalid/activate/${hash32('inv|'+x.id).toString(36).toUpperCase()}`;
function welcomeMessage(x){ const c = courseOfPart(x.id), ds = courseDays(c.id), start = ds.length ? fmtDay(ds[0].dayOffset, true) : t('tbc',null,true);
  return {subject: t('wm.subject',{c:L(c.title)}, true), body: t('wm.body',{n:L(x.name), c:L(c.title), d:start, i:courseTeamText(c.id), l:inviteLink(x)}, true)}; }
ACT.previewInvites = el => { const c = course(el.dataset.cid), list = courseParticipants(c.id).filter(x=>['not_sent','failed'].includes(inviteStatus(x)));
  if (!list.length) return toast(t('noPendingInvites'),'info');
  const m = welcomeMessage(list[0]);
  openModal({title:t('welcomePreview'), size:'lg', body:`<p class="small muted" style="margin-bottom:10px">${t('welcomeIntro',{n:list.length, c:L(c.title)})}</p>
    ${field('invWho', t('previewFor'), `<select class="select" id="f-invWho" data-change="invWho">${list.map(x=>opt(x.id, `${LE(x.name)} — ${esc(x.email)}`, list[0].id)).join('')}</select>`)}
    <div id="invMsg" class="readonly">${welcomeHtml(m)}</div><div style="margin-top:10px">${note(t('inviteSimNote'),'sim','info')}</div>`,
    footer:`<button class="btn" data-action="closeModal">${t('notNow')}</button><button class="btn btn-primary" data-action="sendInvites" data-cid="${c.id}">${icon('bell',15)}${t('sendInvitesDemo',{n:list.length})}</button>`}); };
const welcomeHtml = m => `<div class="small"><b>${t('subject')}:</b> ${esc(m.subject)}</div><div class="divider" style="margin:8px 0"></div><div class="small" style="white-space:pre-wrap;line-height:1.7">${esc(m.body).replace(/(https:\/\/\S+)/, '<span class="ltr" style="color:var(--teal-700);text-decoration:underline">$1</span>')}</div>`;
CHG.invWho = el => { $('#invMsg').innerHTML = welcomeHtml(welcomeMessage(part(el.value))); };
ACT.sendInvites = el => { const list = courseParticipants(el.dataset.cid).filter(x=>['not_sent','failed'].includes(inviteStatus(x)));
  list.forEach(x=>{ x.invite = {status:'sent', at:Date.now()}; }); addLog('invite_send', {course:el.dataset.cid, n:list.length}); closeModal(); save(); render(); toast(t('invitesPrepared',{n:list.length})); };
ACT.resendInvite = el => { const x = part(el.dataset.pid), m = welcomeMessage(x);
  openModal({title: inviteStatus(x)==='not_sent' ? t('sendInvite') : t('resendInvite'), body:`<div class="readonly">${welcomeHtml(m)}</div><div style="margin-top:10px">${note(t('inviteSimNote'),'sim','info')}</div>`,
    footer:`<button class="btn" data-action="closeModal">${t('cancel')}</button><button class="btn btn-primary" data-action="confirmResend" data-pid="${x.id}">${t('sendDemo')}</button>`}); };
ACT.confirmResend = el => { const x = part(el.dataset.pid); x.invite = {status:'sent', at:Date.now()}; addLog('invite_resend', {course:cohortOf(x.id).courseId, pid:x.id}); closeModal(); save(); render(); toast(t('invitePrepared',{n:L(x.name)})); };

/* ---------- Change requests (Instructor / Program Coordinator → Admin) ---------- */
ACT.requestChange = el => { const c = el.dataset.cid ? course(el.dataset.cid) : null, cs = c ? [c] : visibleCourses().filter(x=>liveCourse(x.id));
  openModal({title:t('requestChange'), body:`<form data-submit="requestChange" novalidate>${note(t('requestChangeIntro2'),'', 'info')}<div style="height:12px"></div>
    ${c ? `<input type="hidden" name="rcourse" value="${c.id}"><p class="small" style="margin-bottom:12px">${t('course')}: <b>${LE(c.title)}</b></p>` : field('rcourse', t('course'), selF('rcourse', cs.map(x=>[x.id, LE(x.title)]), cs[0]?.id))}
    ${field('target', t('whatToChange'), selF('target', ['schedule','room','title','participants','other'].map(k=>[k, t('rqt.'+k)]), el.dataset.k || 'schedule'))}
    ${field('detail', t('requestDetail'), `<textarea class="textarea" id="f-detail" name="detail" rows="4" placeholder="${esc(t('requestPlaceholder'))}"></textarea>`)}</form>`,
  footer:`<button class="btn" data-action="closeModal">${t('cancel')}</button><button class="btn btn-primary" data-action="submitForm">${t('sendRequest')}</button>`}); };
SUB.requestChange = form => { const f = Object.fromEntries(new FormData(form)); if (String(f.detail).trim().length<10) return formErrors(form, {detail:t('errDetail')});
  S.requests.push({id:uid('rq'), courseId:f.rcourse, from:me().id, target:f.target, sessionId:null, detail:f.detail.trim(), status:'open', at:Date.now()}); addLog('request_create', {course:f.rcourse}); closeModal(); save(); render(); toast(t('requestSent')); };
SCREENS.requests = () => {
  const list = S.requests.filter(q=>V.req.f==='all' || q.status===V.req.f).sort((a,b)=>b.at-a.at);
  return {title:t('cfgSec.requests'), html: pageHead(t('cfgSec.requests'), t('reqSub'), '', [[t('nav.config'),'#/config'],[t('cfgSec.requests')]]) + `<div class="toolbar">${sel('reqF','reqF', [['open',t('rq.open')],['resolved',t('rq.resolved')],['all',t('all')]], V.req.f, t('status'))}</div>`
  + (list.length ? `<div class="stack">${list.map(q=>{ const c = course(q.courseId);
    return `<div class="card card-b"><div class="row between"><div><div class="cell-main">${t('rqt.'+q.target)} — ${LE(c.title)}</div><div class="xs muted">${t('fromOn',{n:nameOf(q.from), d:fmtDT(q.at)})} · ${esc(t('role.'+(user(q.from)?.role||'trainer'),null,true))}</div></div>${badge(q.status==='open'?'b-warn':'b-ok', t('rq.'+q.status))}</div>
    <p class="small" style="margin-top:10px">“${esc(q.detail)}”</p>${q.response?`<p class="small muted" style="margin-top:8px">${icon('check',13)} ${esc(q.response)}</p>`:''}
    <div class="row" style="margin-top:12px"><a class="btn btn-sm" href="${href('course',c.id,{tab:'schedule'})}">${t('openCourse')}</a>${q.status==='open'?`<button class="btn btn-sm btn-primary" data-action="resolveRequest" data-k="${q.id}">${t('markResolved')}</button>`:''}</div></div>`; }).join('')}</div>` : card('', empty(t('noRequests'), t('noRequestsHint'), 'checkCircle')))};
};
CHG.reqF = el => { V.req.f = el.value; render(); };
ACT.resolveRequest = el => { const q = S.requests.find(x=>x.id===el.dataset.k);
  openModal({title:t('markResolved'), body:`<form data-submit="resolveRequest" data-k="${q.id}" novalidate>${field('resp', t('responseToRequester'), `<textarea class="textarea" id="f-resp" name="resp" rows="3"></textarea>`)}</form>`, footer:`<button class="btn" data-action="closeModal">${t('cancel')}</button><button class="btn btn-primary" data-action="submitForm">${t('markResolved')}</button>`}); };
SUB.resolveRequest = form => { const q = S.requests.find(x=>x.id===form.dataset.k), r = form.resp.value.trim(); if (r.length<3) return formErrors(form, {resp:t('errRequired')});
  Object.assign(q, {status:'resolved', response:r, resolvedAt:Date.now()}); addLog('request_resolve', {course:q.courseId}); closeModal(); save(); render(); toast(t('requestResolved')); };

/* ---------- Schedule conflicts overview ---------- */
SCREENS.schedule = () => {
  const cf = allConflicts();
  return {title:t('cfgSec.conflicts'), html: pageHead(t('cfgSec.conflicts'), t('schSub2'), '', [[t('nav.config'),'#/config'],[t('cfgSec.conflicts')]]) + (cf.length ? card('', `<ul class="list" style="padding:0 18px">${cf.map(x=>`<li class="row between" style="flex-wrap:nowrap;gap:12px"><div><div class="small cell-main">${icon('alert',13)} ${esc(conflictText(x))}</div><div class="xs muted">${LE(course(x.a.courseId).title)} — ${LE(x.a.title)} · ${esc(fmtDay(sOff(x.a)))} <span class="ltr">${x.a.start}–${x.a.end}</span> · ${LE(room(x.a.roomId)?.name)}</div></div><button class="btn btn-sm btn-primary" data-action="editSession" data-sid="${x.a.id}">${t('fix')}</button></li>`).join('')}</ul>`, {flush:true}) : card('', empty(t('noConflicts'), '', 'checkCircle')))};
};

/* ---------- Configuration (searchable) ---------- */
const CFG = [
  ['people','user'],['clients','users'],['rooms','pin'],['attendance','checkCircle'],['materials','book'],['classifications','list'],['certificates','award'],['integrations','link'],['privacy','shield'],['language','globe'],['requests','edit'],['conflicts','alert'],['audit','list'],
];
const CFG_ROUTE = {people:'#/people', clients:'#/clients', requests:'#/requests', conflicts:'#/schedule', audit:'#/audit'};
SCREENS.config = R => {
  const sec = R.id;
  if (sec && CFG.some(x=>x[0]===sec)) return configSection(sec);
  const q = V.cfgQ.trim().toLowerCase(), list = CFG.filter(([k])=>!q || (t('cfgSec.'+k)+' '+t('cfgDesc.'+k)+' '+t('cfgKw.'+k)+' '+STR['cfgSec.'+k].join(' ')+' '+STR['cfgKw.'+k].join(' ')).toLowerCase().includes(q));
  const html = pageHead(t('nav.config'), t('cfgSub2')) + `<div class="toolbar"><div class="search" style="flex:1;max-width:520px">${icon('search',16)}<input class="input" id="cfgQ" type="search" style="width:100%" data-input="cfgSearch" value="${esc(V.cfgQ)}" placeholder="${esc(t('cfgSearchPh'))}" aria-label="${esc(t('cfgSearchPh'))}"></div></div>
  <div id="cfg-results">${cfgCards(list)}</div>`;
  return {title:t('nav.config'), html};
};
function cfgCards(list){ return list.length ? `<div class="grid g-3">${list.map(([k,ic])=>`<a class="card card-b" style="text-decoration:none;color:inherit;display:block" href="${CFG_ROUTE[k]||'#/config/'+k}"><div class="row">${icon(ic,18)}<h2 style="font-size:15px">${t('cfgSec.'+k)}</h2></div><p class="small muted" style="margin-top:6px">${t('cfgDesc.'+k)}</p></a>`).join('')}</div>` : card('', empty(t('noResults'), t('cfgNoMatch'), 'search')); }
INP.cfgSearch = el => { V.cfgQ = el.value; const q = el.value.trim().toLowerCase(); $('#cfg-results').innerHTML = cfgCards(CFG.filter(([k])=>!q || (STR['cfgSec.'+k].join(' ')+' '+STR['cfgDesc.'+k].join(' ')+' '+STR['cfgKw.'+k].join(' ')).toLowerCase().includes(q))); };
function configSection(sec){
  const st = S.settings; let body = '';
  if (sec==='classifications'){ const ty = V.cfg.cls, items = S.cls[ty];
    const usage = id => S.programs.filter(p=>[p.categoryId,p.domainId,p.audienceId,p.deliveryModeId,p.priorityId].includes(id)).length + S.courses.filter(c=>c.typeId===id).length;
    body = `<div class="toolbar">${sel('clsType','clsTypeSel', CLS_TYPES.map(k=>[k, t('cls.'+k)]), ty, t('cfgSec.classifications'))}</div>` + card(t('cls.'+ty), `<p class="small muted" style="margin-bottom:10px">${t('clsHelp')}</p>${items.map((x,i)=>`<form class="cls-row ${x.active?'':'off'}" data-submit="clsRename" data-k="${x.id}" novalidate><div class="form-grid" style="gap:0 8px"><input class="input" name="en" value="${esc(x.en)}" dir="ltr" aria-label="${esc(t('nameEn'))}"><input class="input" name="ar" value="${esc(x.ar)}" dir="rtl" aria-label="${esc(t('nameAr'))}"></div>
      <div class="row" style="flex-wrap:nowrap"><span class="xs muted nowrap">${t('usedN',{n:usage(x.id)})}</span><button class="btn btn-sm" type="submit">${t('rename')}</button><button type="button" class="btn btn-sm btn-ghost" data-action="clsMove" data-k="${x.id}" data-dir="-1" ${i===0?'disabled':''} aria-label="${esc(t('moveUp'))}">↑</button><button type="button" class="btn btn-sm btn-ghost" data-action="clsMove" data-k="${x.id}" data-dir="1" ${i===items.length-1?'disabled':''} aria-label="${esc(t('moveDown'))}">↓</button><button type="button" class="btn btn-sm ${x.active?'btn-ghost':''}" data-action="clsToggle" data-k="${x.id}">${x.active?t('deactivate'):t('activate')}</button></div></form>`).join('')}
      <form class="row" style="margin-top:14px" data-submit="clsAdd" novalidate><input class="input" name="en" placeholder="${esc(t('nameEn'))}" dir="ltr" aria-label="${esc(t('nameEn'))}"><input class="input" name="ar" placeholder="${esc(t('nameAr'))}" dir="rtl" aria-label="${esc(t('nameAr'))}"><button class="btn btn-primary" type="submit">${icon('plus',15)}${t('add')}</button><span class="err small" id="e-clsAdd" style="color:var(--bad)"></span></form>`); }
  if (sec==='rooms') body = `<div class="grid g-main">${card('', `<div class="table-wrap"><table class="tbl"><thead><tr><th>${t('room')}</th><th>${t('building')}</th><th class="num">${t('capacity')}</th><th class="num">${t('upcomingSessions')}</th></tr></thead><tbody>${S.rooms.map(rm=>`<tr><td class="cell-main">${LE(rm.name)}</td><td class="small">${LE(rm.building)}</td><td class="num">${rm.capacity}</td><td class="num">${S.sessions.filter(s=>s.roomId===rm.id && s.status==='scheduled' && sOff(s)>=0).length}</td></tr>`).join('')}</tbody></table></div>`, {flush:true})}
    ${card(t('addRoom'), `<form data-submit="addRoom" novalidate>${field('rname', t('roomName'), inp('rname'))}${field('rbuilding', t('building'), inp('rbuilding'))}${field('rcap', t('capacity'), inp('rcap', 20, 'number', 'min="1" max="500"'))}<label class="check" style="margin-bottom:14px"><input type="checkbox" name="rvirtual">${t('virtualRoom')}</label><button class="btn btn-primary" type="submit">${icon('plus',16)}${t('addRoom')}</button></form>`)}</div>`;
  if (sec==='attendance') body = card('', `<form data-submit="saveAttendanceCfg" novalidate><div class="form-grid">${field('checkinWindow', t('checkinWindowMin'), inp('checkinWindow', st.checkinWindow, 'number','min="1" max="120"'), t('checkinWindowHelp'))}${field('geofenceRadius', t('geofenceRadius'), inp('geofenceRadius', st.geofenceRadius, 'number','min="20" max="2000"'), t('geofenceHelp'))}${field('geoAccuracy', t('geo.acc'), inp('geoAccuracy', st.geoAccuracy ?? 50, 'number','min="10" max="500"'), t('geo.accHelpCfg'))}${field('geoBefore', t('geo.before'), inp('geoBefore', st.geoBefore ?? 30, 'number','min="0" max="180"'), t('geo.beforeHelp'))}</div>${note(t('geo.privacyAdmin'),'', 'shield')}<div style="height:10px"></div>${note(t('codeRuleAdmin2'),'', 'info')}<div style="height:10px"></div>${note(t('checkinSimNote'),'sim')}<div class="row" style="margin-top:14px"><button class="btn btn-primary" type="submit">${t('save')}</button></div></form>`);
  if (sec==='materials') body = card('', `<form data-submit="saveMaterialCfg" novalidate><div class="form-grid">${field('materialDays', t('materialDays'), inp('materialDays', st.materialDays, 'number','min="0" max="730"'), t('materialDaysHelp'))}${field('downloadsDefault', t('downloadsDefault'), selF('downloadsDefault', [['0',t('acc.view')],['1',t('acc.both')]], st.downloadsDefault?'1':'0'))}</div><input type="hidden" name="contentReview" value="">${note(t('fileStorageNote'),'sim')}<div class="row" style="margin-top:14px"><button class="btn btn-primary" type="submit">${t('save')}</button></div></form>`);
  if (sec==='certificates') body = `<div class="stack">${card(t('certRules'), `<form data-submit="saveRule" novalidate><div class="form-grid">${field('minAttendance', t('minAttendance')+' (%)', inp('minAttendance', st.minAttendance, 'number','min="0" max="100" step="5"'))}<div class="field"><span class="lbl">${t('requirements')}</span><label class="check"><input type="checkbox" name="requirePost" ${st.requirePost?'checked':''}>${t('critPost')}</label><label class="check"><input type="checkbox" name="requireFinal" ${st.requireFinal?'checked':''}>${t('critFinal')}</label></div></div><button class="btn btn-primary" type="submit">${t('save')}</button></form>`)}${templateEditor()}</div>`;
  if (sec==='privacy') body = card('', `<form data-submit="savePrivacy" novalidate><label class="check"><input type="checkbox" name="clientIndividual" ${st.clientIndividual?'checked':''}>${t('clientIndividualOpt')}</label><p class="xs muted" style="margin:4px 0 12px">${t('clientIndividualHelp',{m:MIN_GROUP})}</p><input type="hidden" name="coordEditParticipants" value="">${note(t('privacySimNote'),'sim')}<div class="row" style="margin-top:14px"><button class="btn btn-primary" type="submit">${t('save')}</button></div></form>`);
  if (sec==='language') body = card('', `<form data-submit="saveLanguage" novalidate>${field('defaultLang', t('defaultLang'), selF('defaultLang', [['ar','العربية'],['en','English']], st.defaultLang), t('defaultLangHelp'))}<button class="btn btn-primary" type="submit">${t('save')}</button></form>`);
  if (sec==='integrations') body = card('', `<ul class="list">${['sso','otp','email','whatsapp','teams','zoom','sharepoint','verify','hosting'].map(k=>`<li class="row between" style="align-items:flex-start;flex-wrap:nowrap"><div><div class="cell-main">${t('int.'+k)}</div><div class="small muted">${t('int.'+k+'.d')}</div></div>${badge('b-sim', t('notConnected'), false)}</li>`).join('')}</ul>`, {right:badge('b-sim', t('demoOnly'), false)});
  return {title:t('cfgSec.'+sec), html: pageHead(t('cfgSec.'+sec), t('cfgDesc.'+sec), '', [[t('nav.config'),'#/config'],[t('cfgSec.'+sec)]]) + body, after: sec==='certificates' ? loadTplBg : null};
}
const CLS_TYPES = ['category','domain','audience','courseType','deliveryMode','priority','competency'];
CHG.clsTypeSel = el => { V.cfg.cls = el.value; render(); };
function roleMatrix(){
  const rows = [['structure',1,0,0,0,0,0],['participants',1,0,0,0,0,0],['content',0,0,1,0,0,0],['attendance',0,1,1,1,0,0],['certApprove',1,1,0,0,0,0],['reports',1,1,1,0,4,0],['ownData',0,0,0,0,0,1]];
  const mark = v => v===1?`<span style="color:var(--ok)">${icon('check',14)}</span><span class="sr-only">${t('yes')}</span>`:v===4?`<span class="xs">${t('ownClient')}</span>`:'<span class="muted">—</span>';
  return `<h3 style="margin-bottom:8px">${t('permMatrix')}</h3><div class="table-wrap"><table class="tbl"><thead><tr><th></th>${['admin','coordinator','trainer','ta','client','participant'].map(r=>`<th class="center">${t('role.'+r)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr><td class="small">${t('perm.'+r[0])}</td>${r.slice(1).map(v=>`<td class="center">${mark(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div><p class="xs muted" style="margin-top:6px">${t('permSim')}</p>`;
}
SUB.clsRename = form => { const x = S.cls[V.cfg.cls].find(c=>c.id===form.dataset.k), en = form.en.value.trim(), ar = form.ar.value.trim(); if (!en && !ar) return toast(t('errRequired'),'warn'); x.en = en||ar; x.ar = ar||en; addLog('cls_update', {scope:V.cfg.cls}); save(); render(); toast(t('saved')); };
SUB.clsAdd = form => { const en = form.en.value.trim(), ar = form.ar.value.trim(); if (!en && !ar){ $('#e-clsAdd').textContent = t('errRequired'); return; } S.cls[V.cfg.cls].push({id:V.cfg.cls.slice(0,3)+'_'+uid('').slice(-5), en:en||ar, ar:ar||en, active:true}); addLog('cls_update', {scope:V.cfg.cls}); save(); render(); toast(t('added')); };
ACT.clsToggle = el => { const x = S.cls[V.cfg.cls].find(c=>c.id===el.dataset.k); x.active = !x.active; addLog('cls_update', {scope:V.cfg.cls}); save(); render(); toast(x.active?t('activated'):t('deactivatedNote')); };
ACT.clsMove = el => { const arr = S.cls[V.cfg.cls], i = arr.findIndex(c=>c.id===el.dataset.k), j = i + Number(el.dataset.dir); if (j<0||j>=arr.length) return; [arr[i],arr[j]] = [arr[j],arr[i]]; save(); render(); };
SUB.addRoom = form => { const n = form.rname.value.trim(), b = form.rbuilding.value.trim(), c = Number(form.rcap.value), errs = {}; if (n.length<3) errs.rname = t('errRequired'); if (!(c>=1&&c<=500)) errs.rcap = t('errRange',{a:1,b:500}); if (!formErrors(form, errs)) return;
  const id = uid('r'); S.rooms.push({id, name:bi(n), building:bi(b||'—'), capacity:c, virtual:form.rvirtual.checked}); addLog('room_add', {room:id}); save(); render(); toast(t('roomAdded')); };
SUB.saveAttendanceCfg = form => { const w = Number(form.checkinWindow.value), g = Number(form.geofenceRadius.value), a = Number(form.geoAccuracy.value), b = Number(form.geoBefore.value), errs = {}; if (!(w>=1&&w<=120)) errs.checkinWindow = t('errRange',{a:1,b:120}); if (!(g>=20&&g<=2000)) errs.geofenceRadius = t('errRange',{a:20,b:2000}); if (!(a>=10&&a<=500)) errs.geoAccuracy = t('errRange',{a:10,b:500}); if (!(b>=0&&b<=180)) errs.geoBefore = t('errRange',{a:0,b:180}); if (!formErrors(form, errs)) return; Object.assign(S.settings, {checkinWindow:w, geofenceRadius:g, geoAccuracy:a, geoBefore:b}); addLog('settings', {area:'attendance'}); save(); render(); toast(t('settingsSaved')); };
SUB.saveMaterialCfg = form => { const d = Number(form.materialDays.value); if (!(d>=0&&d<=730)) return formErrors(form, {materialDays:t('errRange',{a:0,b:730})}); Object.assign(S.settings, {materialDays:d, downloadsDefault:form.downloadsDefault.value==='1'}); addLog('settings', {area:'materials'}); save(); render(); toast(t('settingsSaved')); };
SUB.saveRule = form => { const m = Number(form.minAttendance.value); if (!(m>=0&&m<=100)) return formErrors(form, {minAttendance:t('errRange',{a:0,b:100})}); Object.assign(S.settings, {minAttendance:m, requirePost:form.requirePost.checked, requireFinal:form.requireFinal.checked}); addLog('settings', {area:'certificates'}); save(); render(); toast(t('ruleSaved')); };
SUB.savePrivacy = form => { S.settings.clientIndividual = form.clientIndividual.checked; addLog('settings', {area:'privacy'}); save(); render(); toast(t('settingsSaved')); };
SUB.saveLanguage = form => { S.settings.defaultLang = form.defaultLang.value; addLog('settings', {area:'language'}); save(); render(); toast(t('settingsSaved')); };

