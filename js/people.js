"use strict";

/* =====================================================================
   8b. PEOPLE & ACCESS (Academy Admin)
   Role-specific invitations, assigned scope, edit assignments,
   resend (simulated) and deactivate without deleting history.
   Access rules are a front-end simulation, not production security.
   ===================================================================== */
const STAFF_ROLES = ['trainer','coordinator','client','admin'];
V.people = {q:'', role:'all', status:'all'};
/** Plain description of where a person has access. */
function scopeOf(u){
  if (u.role==='admin') return {txt:t('scope.admin'), items:[]};
  if (u.role==='client') return {txt: client(u.clientId) ? L(client(u.clientId).name) : t('scope.none'), items:[]};
  if (u.role==='coordinator'){ const ps = S.programs.filter(p=>!p.archived && (p.coordinatorIds||[]).includes(u.id)); return {txt: ps.length ? ps.map(p=>L(p.title)).join(' · ') : t('scope.noProgram'), items:ps.map(p=>({label:L(p.title), sub:L(client(p.clientId)?.name), href:href('program',p.id)}))}; }
  if (u.role==='trainer'){ const cs = S.courses.filter(c=>!c.archived && isCourseInstructor(c.id, u.id)); return {txt: cs.length ? cs.map(c=>L(c.title)).join(' · ') : t('scope.noCourse'), items:cs.map(c=>({label:L(c.title) + (leadOf(c.id)===u.id && courseInstructors(c.id).length>1 ? ' · '+t('leadShort',null,true) : ''), sub:`${L(program(c.programId).title)} · ${t('nSessionsAssigned',{n:S.sessions.filter(s=>s.courseId===c.id && s.status!=='cancelled' && sessionInstructors(s).includes(u.id)).length},true)}`, href:href('course',c.id)}))}; }
  return {txt:'', items:[]};
}
const USTATUS = {active:'b-ok', invited:'b-sim', deactivated:'b-bad'};
const userStatusBadge = u => badge(USTATUS[u.status]||'', t('ust.'+u.status));
function peopleRows(){
  const q = V.people.q.trim().toLowerCase();
  const list = S.users.filter(u=>STAFF_ROLES.includes(u.role) && (V.people.role==='all' || u.role===V.people.role) && (V.people.status==='all' || u.status===V.people.status)
    && (!q || [u.name.en, u.name.ar, u.email, t('role.'+u.role,null,true), scopeOf(u).txt].join(' ').toLowerCase().includes(q))).sort((a,b)=>STAFF_ROLES.indexOf(a.role)-STAFF_ROLES.indexOf(b.role) || byName(a,b));
  if (!list.length) return card('', empty(t('noResults'), t('peopleNoMatch'), 'search'));
  return `<p class="small muted" style="margin-bottom:8px">${t('showingN',{n:list.length})}</p>` + card('', `<ul class="list people-list">${list.map(u=>`<li class="person"><div class="person-main"><div class="cell-main">${LE(u.name)} ${u.id===me().id?`<span class="xs muted">(${t('you')})</span>`:''}</div><div class="xs muted ltr" style="text-align:start">${esc(u.email)}</div>
      <div class="row" style="gap:6px;margin-top:6px">${badge(ROLE_BADGE[u.role], t('role.'+u.role), false)}${userStatusBadge(u)}</div></div>
    <div class="person-scope"><div class="xs muted">${t('accessScope')}</div><div class="small">${esc(scopeOf(u).txt)}</div></div>
    <div class="person-actions row"><button class="btn btn-sm" data-action="personAccess" data-k="${u.id}">${t('viewAccess')}</button>${u.status==='invited'?`<button class="btn btn-sm btn-ghost" data-action="resendStaffInvite" data-k="${u.id}">${t('resend')}</button>`:''}</div></li>`).join('')}</ul>`, {flush:true});
}
const ROLE_BADGE = {admin:'b-navy', coordinator:'b-teal', trainer:'b-info', client:'b-warn', participant:''};
SCREENS.people = () => {
  const actions = `<button class="btn btn-primary" data-action="openInvite" data-k="trainer">${icon('plus',16)}${t('invite.trainer')}</button><button class="btn" data-action="openInvite" data-k="coordinator">${icon('plus',16)}${t('invite.coordinator')}</button><button class="btn" data-action="openInvite" data-k="client">${icon('plus',16)}${t('invite.client')}</button>`;
  const html = pageHead(t('people.title'), t('people.sub'), actions, [[t('nav.config'),'#/config'],[t('people.title')]])
    + `<div class="toolbar" role="search"><div class="search">${icon('search',16)}<input class="input" id="peQ" type="search" data-input="peopleSearch" value="${esc(V.people.q)}" placeholder="${esc(t('peopleSearchPh'))}" aria-label="${esc(t('peopleSearchPh'))}"></div>
      ${sel('peRole','peopleFilter', [['all',t('allRoles')]].concat(STAFF_ROLES.map(r=>[r, t('role.'+r)])), V.people.role, t('roleWord'))}
      ${sel('peStatus','peopleFilter', [['all',t('allStatuses2')],['active',t('ust.active')],['invited',t('ust.invited')],['deactivated',t('ust.deactivated')]], V.people.status, t('status'))}</div>
    <div id="pe-results">${peopleRows()}</div>
    <div class="grid g-2" style="margin-top:16px"><div class="card card-b"><h2 style="font-size:15px">${t('people.participantsT')}</h2><p class="small muted" style="margin-top:6px">${t('people.participantsD')}</p></div>
      <div class="card card-b"><h2 style="font-size:15px">${t('people.adminT')}</h2><p class="small muted" style="margin:6px 0 10px">${t('people.adminD')}</p><button class="btn btn-sm btn-ghost" data-action="openInvite" data-k="admin">${icon('shield',14)}${t('invite.admin')}</button></div></div>
    <details class="explain card card-b" style="margin-top:16px"><summary>${t('whatEachRole')}</summary><div style="margin-top:10px">${roleMatrix()}</div></details>
    <div style="margin-top:12px">${note(t('accessSimNote'),'sim','shield')}</div>`;
  return {title:t('people.title'), html};
};
INP.peopleSearch = el => { V.people.q = el.value; $('#pe-results').innerHTML = peopleRows(); };
CHG.peopleFilter = () => { V.people.role = $('#peRole').value; V.people.status = $('#peStatus').value; $('#pe-results').innerHTML = peopleRows(); };

/* ---------- Role-specific invitation form (also used in context: course team, program coordinators, client) ---------- */
let INVITE_CTX = null;
ACT.openInvite = el => openInvite(el.dataset.k, {program: el.dataset.pid, course: el.dataset.cid, client: el.dataset.client});
function openInvite(r, ctx={}){
  INVITE_CTX = Object.assign({role:r}, ctx);
  const progs = S.programs.filter(p=>!p.archived).sort((a,b)=>L(a.title).localeCompare(L(b.title), LANG)), crs = S.courses.filter(c=>!c.archived && program(c.programId) && !program(c.programId).archived);
  let scope = '';
  if (r==='trainer' && ctx.form!=='course') scope = field('icourse', t('assignToCourseOpt'), selF('icourse', [['',t('noCourseYet')]].concat(crs.map(c=>[c.id, `${LE(c.title)} — ${LE(program(c.programId).title)}`])), ctx.course||''), t('assignToCourseHelp'));
  if (r==='trainer' && ctx.form==='course') scope = note(t('inviteAddsToForm'),'', 'info');
  if (r==='coordinator') scope = `<fieldset class="field"><legend class="lbl">${t('assignPrograms')} *</legend><div class="team-list">${progs.map(p=>`<label class="check"><input type="checkbox" name="iprog" value="${p.id}" ${ctx.program===p.id?'checked':''}><span>${LE(p.title)} <span class="xs muted">· ${LE(client(p.clientId)?.name)}${p.status==='draft'?' · '+t('draft'):''}</span></span></label>`).join('')}</div><span class="help">${t('assignProgramsHelp')}</span><span class="err" id="e-iprog" role="alert"></span></fieldset>`;
  if (r==='client') scope = field('iclient', t('clientOrganization')+' *', selF('iclient', [['',t('chooseClient')]].concat(S.clients.map(c=>[c.id, LE(c.name)])), ctx.client||''), t('clientCoordHelp2'));
  if (r==='admin') scope = `${note(t('adminWarn'),'warn','shield')}<label class="check" style="margin-top:10px"><input type="checkbox" name="iconfirm"><span>${t('adminConfirm')}</span></label><span class="err" id="e-iconfirm" role="alert"></span>`;
  openModal({title:t('invite.'+r), body:`<form data-submit="inviteStaff" novalidate><p class="small muted" style="margin-bottom:12px">${t('inviteRoleDesc.'+r)}</p>
    ${field('iname', t('name')+' *', inp('iname','','text','autocomplete="off"'))}${field('iemail', t('email')+' *', inp('iemail','','email','dir="ltr" autocomplete="off"'))}${scope}
    <div style="margin-top:6px">${note(t('inviteStaffSim'),'sim','info')}</div></form>`,
    footer:`<button class="btn" data-action="closeModal">${t('cancel')}</button><button class="btn btn-primary" data-action="submitForm">${r==='admin'?t('grantAdmin'):t('sendInviteDemo')}</button>`});
}
SUB.inviteStaff = form => {
  const C = INVITE_CTX || {}, r = C.role, fd = new FormData(form), n = String(fd.get('iname')||'').trim(), e = String(fd.get('iemail')||'').trim(), errs = {};
  if (n.length<3) errs.iname = t('errName'); if (!validEmail(e)) errs.iemail = t('errEmail'); else if (S.users.some(u=>u.email.toLowerCase()===e.toLowerCase())) errs.iemail = t('errDupEmail');
  const progs = fd.getAll('iprog'); if (r==='coordinator' && !progs.length) errs.iprog = t('errPickProgram');
  if (r==='client' && !fd.get('iclient')) errs.iclient = t('errClient');
  if (r==='admin' && !fd.get('iconfirm')) errs.iconfirm = t('errAdminConfirm');
  if (!formErrors(form, errs)) return;
  const id = uid('u'), u = {id, role:r, name:bi(n), title:bi(t('role.'+r,null,true)), email:e, status:'invited', invitedAt:Date.now()};
  if (r==='client') u.clientId = fd.get('iclient'); S.users.push(u); addLog('user_invite', {user:id, scope:t('role.'+r,null,true)});
  let where = '';
  if (r==='coordinator'){ progs.forEach(pid=>{ const p = program(pid); p.coordinatorIds = [...new Set((p.coordinatorIds||[]).concat(id))]; addLog('coord_assign', {prog:pid, user:id}); }); where = progs.map(pid=>L(program(pid).title)).join(', '); }
  if (r==='trainer' && fd.get('icourse')){ const c = course(fd.get('icourse')); setCourseTeam(c, courseInstructors(c.id).concat(id), leadOf(c.id)); where = L(c.title); }
  if (r==='client') where = L(client(u.clientId).name);
  save(); closeModal(); INVITE_CTX = null;
  // Return to the form that opened the invitation, with the new person ready to select
  const host = topModal();
  if (C.form==='course' && host && host.querySelector('#teamList')){ const list = host.querySelector('#teamList'); list.querySelector('p')?.remove(); list.insertAdjacentHTML('beforeend', teamRow(u, true, false)); const x = list.querySelector(`input[value="${id}"]`); x && x.focus(); }
  else if (C.form==='coordAssign' && host && host.querySelector('#coordList')){ host.querySelector('#coordList').insertAdjacentHTML('beforeend', coordRow(u, true)); }
  else render();
  toast(t('invitePreparedStaff',{n, r:t('role.'+r,null,true)}) + (where ? ' · '+t('accessTo',{w:where}) : ''));
};
ACT.resendStaffInvite = el => { const u = user(el.dataset.k); u.invitedAt = Date.now(); addLog('user_invite', {user:u.id, scope:'resend'}); save(); render(); toast(t('inviteResentDemo',{n:L(u.name)})); };

/* ---------- Person access: view scope, edit assignments, deactivate / reactivate ---------- */
ACT.personAccess = el => { const u = user(el.dataset.k), sc = scopeOf(u); let edit = '';
  if (u.role==='trainer') edit = `<fieldset class="field"><legend class="lbl">${t('assignedCourses')}</legend><div class="team-list">${S.programs.filter(p=>!p.archived).map(p=>{ const cs = coursesOf(p.id); return cs.length ? `<div class="xs muted" style="margin-top:6px">${LE(p.title)}</div>${cs.map(c=>`<label class="check"><input type="checkbox" name="scope" value="${c.id}" ${isCourseInstructor(c.id,u.id)?'checked':''}><span>${LE(c.title)}</span></label>`).join('')}` : ''; }).join('')}</div><span class="help">${t('assignedCoursesHelp')}</span></fieldset>`;
  if (u.role==='coordinator') edit = `<fieldset class="field"><legend class="lbl">${t('assignPrograms')}</legend><div class="team-list">${S.programs.filter(p=>!p.archived).map(p=>`<label class="check"><input type="checkbox" name="scope" value="${p.id}" ${(p.coordinatorIds||[]).includes(u.id)?'checked':''}><span>${LE(p.title)} <span class="xs muted">· ${LE(client(p.clientId)?.name)}</span></span></label>`).join('')}</div></fieldset>`;
  if (u.role==='client') edit = field('scope', t('clientOrganization'), selF('scope', S.clients.map(c=>[c.id, LE(c.name)]), u.clientId), t('clientCoordHelp2'));
  if (u.role==='admin') edit = note(t('scope.adminLong'),'', 'shield');
  const list = sc.items.length ? `<ul class="list" style="margin-bottom:12px">${sc.items.map(i=>`<li><a class="small cell-main" href="${i.href}" data-action="closeAllThen">${esc(i.label)}</a><div class="xs muted">${esc(i.sub)}</div></li>`).join('')}</ul>` : `<p class="small" style="margin-bottom:12px">${esc(sc.txt)}</p>`;
  const self = u.id===me().id;
  openModal({title:LE(u.name), body:`<div class="row" style="gap:6px;margin-bottom:10px">${badge(ROLE_BADGE[u.role], t('role.'+u.role), false)}${userStatusBadge(u)}<span class="xs muted ltr">${esc(u.email)}</span></div>
    <h3 style="margin:6px 0">${t('currentAccess')}</h3>${list}<form data-submit="saveScope" data-k="${u.id}" novalidate>${u.role!=='admin'?`<h3 style="margin:6px 0">${t('editAssignments')}</h3>`:''}${edit}</form>`,
    footer:`${self ? '' : u.status==='deactivated' ? `<button class="btn" data-action="setAccess" data-k="${u.id}" data-on="1">${t('reactivate')}</button>` : `<button class="btn btn-danger" data-action="setAccess" data-k="${u.id}" data-on="0">${t('deactivateAccess')}</button>`}${u.status==='invited'?`<button class="btn" data-action="resendStaffInvite" data-k="${u.id}">${t('resendInvite')}</button>`:''}<span style="flex:1"></span><button class="btn" data-action="closeModal">${t('close')}</button>${u.role!=='admin'?`<button class="btn btn-primary" data-action="submitForm">${t('saveAssignments')}</button>`:''}`}); };
SUB.saveScope = form => { const u = user(form.dataset.k), fd = new FormData(form); let changed = 0;
  if (u.role==='trainer'){ const want = fd.getAll('scope'); S.courses.filter(c=>!c.archived).forEach(c=>{ const has = isCourseInstructor(c.id, u.id), w = want.includes(c.id); if (has!==w){ changed++; setCourseTeam(c, w ? courseInstructors(c.id).concat(u.id) : courseInstructors(c.id).filter(x=>x!==u.id), leadOf(c.id)); } }); }
  if (u.role==='coordinator'){ const want = fd.getAll('scope'); S.programs.forEach(p=>{ const has = (p.coordinatorIds||[]).includes(u.id), w = want.includes(p.id); if (has!==w){ changed++; p.coordinatorIds = w ? (p.coordinatorIds||[]).concat(u.id) : p.coordinatorIds.filter(x=>x!==u.id); addLog(w?'coord_assign':'coord_unassign', {prog:p.id, user:u.id}); } }); }
  if (u.role==='client' && fd.get('scope')!==u.clientId){ u.clientId = fd.get('scope'); changed++; addLog('access_update', {user:u.id, client:u.clientId}); }
  save(); closeModal(); render(); toast(changed ? t('accessUpdated',{n:L(u.name)}) : t('noChanges'), changed?'ok':'info'); };
ACT.setAccess = el => { const u = user(el.dataset.k), on = el.dataset.on==='1';
  const n = u.role==='trainer' ? S.sessions.filter(s=>s.status==='scheduled' && sessionInstructors(s).includes(u.id)).length : 0;
  confirmModal(on ? t('reactivate') : t('deactivateTitle',{n:L(u.name)}), on ? t('reactivateMsg') : t('deactivateMsg') + (n ? ' ' + t('deactivateSessions',{n}) : ''), on ? t('reactivate') : t('deactivateAccess'), ()=>{
    if (on) u.status = u.prevStatus && u.prevStatus!=='deactivated' ? u.prevStatus : 'active'; else { u.prevStatus = u.status; u.status = 'deactivated'; }
    addLog(on?'access_reactivate':'access_deactivate', {user:u.id}); save(); closeAllModals(); render(); toast(on ? t('accessRestored',{n:L(u.name)}) : t('accessRemoved',{n:L(u.name)})); }, !on); };

/* ---------- Assign KAUST Program Coordinators to a program ---------- */
const coordRow = (u, on) => `<label class="check"><input type="checkbox" name="coord" value="${u.id}" ${on?'checked':''}><span>${LE(u.name)}${u.status==='invited'?` <span class="xs muted">(${t('invitedShort')})</span>`:''}</span></label>`;
ACT.assignCoord = el => { const p = program(el.dataset.pid), pool = S.users.filter(u=>u.role==='coordinator' && (u.status!=='deactivated' || (p.coordinatorIds||[]).includes(u.id))).sort(byName);
  openModal({title:t('assignCoordinator'), body:`<form data-submit="saveCoords" data-pid="${p.id}" novalidate><p class="small muted" style="margin-bottom:10px">${LE(p.title)} · ${LE(client(p.clientId)?.name)}</p><p class="small" style="margin-bottom:10px">${t('programCoordHelp')}</p>
    <div id="coordList" class="team-list">${pool.map(u=>coordRow(u, (p.coordinatorIds||[]).includes(u.id))).join('')}</div>
    <button type="button" class="btn btn-sm" style="margin-top:10px" data-action="inviteCoordHere" data-pid="${p.id}">${icon('plus',14)}${t('invite.coordinator')}</button></form>`,
    footer:`<button class="btn" data-action="closeModal">${t('cancel')}</button><button class="btn btn-primary" data-action="submitForm">${t('saveAssignments')}</button>`}); };
ACT.inviteCoordHere = el => openInvite('coordinator', {program:el.dataset.pid, form:'coordAssign'});
SUB.saveCoords = form => { const p = program(form.dataset.pid), want = new FormData(form).getAll('coord'), prev = p.coordinatorIds || [];
  want.filter(id=>!prev.includes(id)).forEach(id=>addLog('coord_assign', {prog:p.id, user:id})); prev.filter(id=>!want.includes(id)).forEach(id=>addLog('coord_unassign', {prog:p.id, user:id}));
  p.coordinatorIds = want; save(); closeModal(); render(); toast(t('coordsSaved',{n:want.length})); };

