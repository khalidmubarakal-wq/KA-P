"use strict";

/* =====================================================================
   8b. PEOPLE & ACCESS (Academy Admin)
   Role-specific invitations, assigned scope, edit assignments,
   resend (simulated) and deactivate without deleting history.
   Access rules are a front-end simulation, not production security.
   ===================================================================== */
const STAFF_ROLES = ['trainer','ta','coordinator','client','admin'];
V.people = {q:'', role:'all', status:'all', client:'all', program:'all'};
/** Plain description of where a person has access. */
function scopeOf(u){
  const parts = rolesOf(u).map(r=>scopeFor(u, r)), items = parts.flatMap(x=>x.items);
  return {txt: parts.map(x=>x.txt).filter(Boolean).join(' · '), items};
}
function scopeFor(u, r){
  if (r==='admin') return {txt:t('scope.admin'), items:[]};
  if (r==='client') return {txt: client(u.clientId) ? L(client(u.clientId).name) : t('scope.none'), items:[]};
  if (r==='coordinator'){ const ps = S.programs.filter(p=>!p.archived && (p.coordinatorIds||[]).includes(u.id)); return {txt: ps.length ? ps.map(p=>L(p.title)).join(' · ') : t('scope.noProgram'), items:ps.map(p=>({label:L(p.title), sub:L(client(p.clientId)?.name), href:href('program',p.id)}))}; }
  if (r==='trainer'){ const cs = S.courses.filter(c=>!c.archived && isCourseInstructor(c.id, u.id)); return {txt: cs.length ? cs.map(c=>L(c.title)).join(' · ') : t('scope.noCourse'), items:cs.map(c=>({label:L(c.title) + (leadOf(c.id)===u.id && courseInstructors(c.id).length>1 ? ' · '+t('leadShort',null,true) : ''), sub:`${L(program(c.programId).title)} · ${t('nSessionsAssigned',{n:S.sessions.filter(s=>s.courseId===c.id && s.status!=='cancelled' && sessionInstructors(s).includes(u.id)).length},true)}`, href:href('course',c.id)}))}; }
  if (r==='ta'){ const cs = S.courses.filter(c=>!c.archived && isCourseTA(c.id, u.id)); return {txt: cs.length ? cs.map(c=>L(c.title)).join(' · ') : t('scope.noCourse'), items:cs.map(c=>({label:L(c.title)+' · '+t('role.ta',null,true), sub:L(program(c.programId).title), href:href('course',c.id)}))}; }
  return {txt:'', items:[]};
}
const USTATUS = {active:'b-ok', invited:'b-sim', deactivated:'b-bad'};
const userStatusBadge = u => badge(USTATUS[u.status]||'', t('ust.'+u.status));
/** Everyone in one directory: staff and client accounts, plus participants (one person per work email). */
function directoryPeople(){
  const out = S.users.filter(u=>!hasRole(u,'participant')).map(u=>({u, pa:null, email:u.email})), seen = new Set();
  S.users.filter(u=>hasRole(u,'participant')).forEach(u=>{ const P = personOf(u.id); if (P && P.pa){ seen.add(P.email.toLowerCase()); out.push(P); } });
  S.participants.filter(x=>!x.withdrawn && cohort(x.cohortId) && courseOfPart(x.id)).forEach(x=>{ const k = String(x.email).toLowerCase(); if (!seen.has(k)){ seen.add(k); out.push({u:null, pa:x, email:x.email}); } });
  return out;
}
const personStatus = P => P.u ? P.u.status : (inviteStatus(P.pa)==='completed' ? 'active' : 'invited');
function personPrograms(P){ const ids = new Set(), u = P.u;
  if (u){ if (hasRole(u,'coordinator')) S.programs.filter(p=>(p.coordinatorIds||[]).includes(u.id)).forEach(p=>ids.add(p.id));
    if (hasRole(u,'trainer') || hasRole(u,'ta')) S.courses.filter(c=>isCourseInstructor(c.id,u.id) || isCourseTA(c.id,u.id)).forEach(c=>ids.add(c.programId));
    if (hasRole(u,'client')) S.programs.filter(p=>p.clientId===u.clientId).forEach(p=>ids.add(p.id)); }
  personEnrollments(P).forEach(pa=>ids.add(courseOfPart(pa.id).programId));
  return [...ids]; }
const personClients = P => [...new Set(personPrograms(P).map(pid=>program(pid)?.clientId).concat(P.u && hasRole(P.u,'client') ? [P.u.clientId] : []).filter(Boolean))];
function peopleRows(){
  const q = V.people.q.trim().toLowerCase(), F = V.people;
  const list = directoryPeople().filter(P=>(F.role==='all' || personRoles(P).includes(F.role)) && (F.status==='all' || personStatus(P)===F.status)
    && (F.client==='all' || personClients(P).includes(F.client)) && (F.program==='all' || personPrograms(P).includes(F.program))
    && (!q || [personName(P).en, personName(P).ar, P.email, personRoles(P).map(r=>t('role.'+r,null,true)).join(' '), P.u ? scopeOf(P.u).txt : ''].join(' ').toLowerCase().includes(q)))
    .sort((a,b)=>{ const o = ['admin','coordinator','trainer','ta','client','participant']; return o.indexOf(personRoles(a)[0])-o.indexOf(personRoles(b)[0]) || L(personName(a)).localeCompare(L(personName(b)), LANG); });
  if (!list.length) return card('', empty(t('noResults'), t('peopleNoMatch'), 'search'));
  const scopeTxt = P => P.u && !hasRole(P.u,'participant') ? scopeOf(P.u).txt : personEnrollments(P).map(pa=>L(courseOfPart(pa.id).title)).join(' · ');
  return `<p class="small muted" style="margin-bottom:8px">${t('showingN',{n:list.length})}</p>` + card('', `<ul class="list people-list">${list.map(P=>{ const k = personKey(P), self = P.u && P.u.id===me().id;
    return `<li class="person"><div class="person-main row" style="flex-wrap:nowrap;gap:12px;align-items:flex-start">${avatarHtml(P, 40)}<div style="min-width:0"><a class="cell-main" href="${self?'#/profile':href('user', k)}">${LE(personName(P))}</a> ${self?`<span class="xs muted">(${t('you')})</span>`:''}<div class="xs muted ltr" style="text-align:start">${esc(P.email)}</div>
      <div class="row" style="gap:6px;margin-top:6px">${personRoles(P).map(r=>badge(ROLE_BADGE[r]||'', t('role.'+r), false)).join('')}${badge(USTATUS[personStatus(P)]||'', t('ust.'+personStatus(P)))}</div></div></div>
    <div class="person-scope"><div class="xs muted">${t('accessScope')}</div><div class="small">${esc(scopeTxt(P)) || '—'}</div></div>
    <div class="person-actions row"><a class="btn btn-sm" href="${self?'#/profile':href('user', k)}">${t('pf.open')}</a>${P.u && !hasRole(P.u,'participant') ? `<button class="btn btn-sm btn-ghost" data-action="personAccess" data-k="${P.u.id}">${t('viewAccess')}</button>` : ''}${P.u && P.u.status==='invited'?`<button class="btn btn-sm btn-ghost" data-action="resendStaffInvite" data-k="${P.u.id}">${t('resend')}</button>`:''}</div></li>`; }).join('')}</ul>`, {flush:true});
}
const roleBadges = u => rolesOf(u).map(r=>badge(ROLE_BADGE[r]||'', t('role.'+r), false)).join('');
const ROLE_BADGE = {admin:'b-navy', coordinator:'b-teal', trainer:'b-info', ta:'b-sim', client:'b-warn', participant:''};
SCREENS.people = () => {
  if (role()!=='admin') return denied(t('adminOnly'));
  const actions = `<button class="btn btn-primary" data-action="openInvite" data-k="trainer">${icon('plus',16)}${t('invite.trainer')}</button><button class="btn" data-action="openInvite" data-k="ta">${icon('plus',16)}${t('invite.ta')}</button><button class="btn" data-action="openInvite" data-k="coordinator">${icon('plus',16)}${t('invite.coordinator')}</button><button class="btn" data-action="openInvite" data-k="client">${icon('plus',16)}${t('invite.client')}</button>`;
  const html = pageHead(t('people.title'), t('people.sub'), actions)
    + `<div class="toolbar" role="search"><div class="search">${icon('search',16)}<input class="input" id="peQ" type="search" data-input="peopleSearch" value="${esc(V.people.q)}" placeholder="${esc(t('peopleSearchPh'))}" aria-label="${esc(t('peopleSearchPh'))}"></div>
      ${sel('peRole','peopleFilter', [['all',t('allRoles')]].concat(STAFF_ROLES.concat('participant').map(r=>[r, t('role.'+r)])), V.people.role, t('roleWord'))}
      ${sel('peClient','peopleFilter', [['all',t('allClients')]].concat(S.clients.map(c=>[c.id, LE(c.name)])), V.people.client, t('client'))}
      ${sel('peProgram','peopleFilter', [['all',t('pf.allPrograms')]].concat(S.programs.filter(p=>!p.archived).map(p=>[p.id, LE(p.title)||t('untitled')])), V.people.program, t('program'))}
      ${sel('peStatus','peopleFilter', [['all',t('allStatuses2')],['active',t('ust.active')],['invited',t('ust.invited')],['deactivated',t('ust.deactivated')]], V.people.status, t('status'))}</div>
    <div id="pe-results">${peopleRows()}</div>
    <div class="grid g-2" style="margin-top:16px"><div class="card card-b"><h2 style="font-size:15px">${t('people.participantsT')}</h2><p class="small muted" style="margin-top:6px">${t('people.participantsD')}</p></div>
      <div class="card card-b"><h2 style="font-size:15px">${t('people.adminT')}</h2><p class="small muted" style="margin:6px 0 10px">${t('people.adminD')}</p><button class="btn btn-sm btn-ghost" data-action="openInvite" data-k="admin">${icon('shield',14)}${t('invite.admin')}</button></div></div>
    <details class="explain card card-b" style="margin-top:16px"><summary>${t('whatEachRole')}</summary><div style="margin-top:10px">${roleMatrix()}</div></details>
    <div style="margin-top:12px">${note(t('accessSimNote'),'sim','shield')}</div>`;
  return {title:t('people.title'), html};
};
INP.peopleSearch = el => { V.people.q = el.value; $('#pe-results').innerHTML = peopleRows(); };
CHG.peopleFilter = () => { V.people.role = $('#peRole').value; V.people.status = $('#peStatus').value; V.people.client = $('#peClient').value; V.people.program = $('#peProgram').value; $('#pe-results').innerHTML = peopleRows(); };

/* ---------- Role-specific invitation form (also used in context: course team, program coordinators, client) ---------- */
let INVITE_CTX = null;
ACT.openInvite = el => openInvite(el.dataset.k, {program: el.dataset.pid, course: el.dataset.cid, client: el.dataset.client});
function openInvite(r, ctx={}){
  INVITE_CTX = Object.assign({role:r}, ctx);
  const progs = S.programs.filter(p=>!p.archived).sort((a,b)=>L(a.title).localeCompare(L(b.title), LANG)), crs = S.courses.filter(c=>!c.archived && program(c.programId) && !program(c.programId).archived);
  let scope = '';
  if (r==='trainer' && ctx.form!=='course') scope = field('icourse', t('assignToCourseOpt'), selF('icourse', [['',t('noCourseYet')]].concat(crs.map(c=>[c.id, `${LE(c.title)} — ${LE(program(c.programId).title)}`])), ctx.course||''), t('assignToCourseHelp'));
  if (r==='trainer' && ctx.form==='course') scope = note(t('inviteAddsToForm'),'', 'info');
  if (r==='ta' && ctx.form!=='course') scope = field('icourse', t('assignToCourseOpt'), selF('icourse', [['',t('noCourseYet')]].concat(crs.map(c=>[c.id, `${LE(c.title)} — ${LE(program(c.programId).title)}`])), ctx.course||''), t('assignToCourseHelpTa'));
  if (r==='ta' && ctx.form==='course') scope = note(t('inviteAddsToForm'),'', 'info');
  if (r==='coordinator') scope = `<fieldset class="field"><legend class="lbl">${t('assignPrograms')} *</legend><div class="team-list">${progs.map(p=>`<label class="check"><input type="checkbox" name="iprog" value="${p.id}" ${ctx.program===p.id?'checked':''}><span>${LE(p.title)} <span class="xs muted">· ${LE(client(p.clientId)?.name)}${p.status==='draft'?' · '+t('draft'):''}</span></span></label>`).join('')}</div><span class="help">${t('assignProgramsHelp')}</span><span class="err" id="e-iprog" role="alert"></span></fieldset>`;
  if (r==='client') scope = field('iclient', t('clientOrganization')+' *', selF('iclient', [['',t('chooseClient')]].concat(S.clients.map(c=>[c.id, LE(c.name)])), ctx.client||''), t('clientCoordHelp2'));
  if (r==='admin') scope = `${note(t('adminWarn'),'warn','shield')}<label class="check" style="margin-top:10px"><input type="checkbox" name="iconfirm"><span>${t('adminConfirm')}</span></label><span class="err" id="e-iconfirm" role="alert"></span>`;
  openModal({title:t('invite.'+r), body:`<form data-submit="inviteStaff" novalidate><p class="small muted" style="margin-bottom:12px">${t('inviteRoleDesc.'+r)}</p>
    ${field('iname', t('name')+' *', inp('iname','','text','autocomplete="off"'))}${field('iemail', t('email')+' *', inp('iemail','','email','dir="ltr" autocomplete="off"'))}<div id="inviteExisting" aria-live="polite"></div>${scope}
    <div style="margin-top:6px">${note(t('inviteStaffSim'),'sim','info')}</div></form>`,
    footer:`<button class="btn" data-action="closeModal">${t('cancel')}</button><button class="btn btn-primary" data-action="submitForm">${r==='admin'?t('grantAdmin'):t('sendInviteDemo')}</button>`});
}
SUB.inviteStaff = form => {
  if (!can('config')) return toast(t('adminOnly'),'bad');
  const C = INVITE_CTX || {}, r = C.role, fd = new FormData(form), n = String(fd.get('iname')||'').trim(), e = String(fd.get('iemail')||'').trim(), errs = {};
  if (n.length<3) errs.iname = t('errName'); if (!validEmail(e)) errs.iemail = t('errEmail');
  const progs = fd.getAll('iprog'); if (r==='coordinator' && !progs.length) errs.iprog = t('errPickProgram');
  if (r==='client' && !fd.get('iclient')) errs.iclient = t('errClient');
  if (r==='admin' && !fd.get('iconfirm')) errs.iconfirm = t('errAdminConfirm');
  // One account per person: an existing email is never duplicated
  const ex = validEmail(e) && S.users.find(u=>u.email.toLowerCase()===e.toLowerCase());
  if (ex){ const box = $('#inviteExisting', form);
    const combinable = STAFF_ROLE_SET.includes(r) && rolesOf(ex).every(x=>STAFF_ROLE_SET.includes(x));
    if (!combinable){ errs.iemail = t('pf.dupOther', {n:L(ex.name), r:rolesOf(ex).map(x=>t('role.'+x,null,true)).join(', ')}); if (box) box.innerHTML = ''; }
    else { formErrors(form, {}); box.innerHTML = note(`<b>${t(hasRole(ex, r) ? 'pf.dupSameRole' : 'pf.dupAddRole', {n:esc(L(ex.name)), r:t('role.'+r)})}</b><div class="row" style="margin-top:8px"><button type="button" class="btn btn-sm btn-primary" data-action="inviteUseExisting" data-k="${ex.id}">${t(hasRole(ex, r) ? 'pf.useExisting' : 'pf.addRoleBtn', {r:t('role.'+r)})}</button></div>`, 'warn', 'users'); box.querySelector('button').focus(); return; } }
  if (!formErrors(form, errs)) return;
  const id = uid('u'), u = {id, role:r, roles:[r], name:bi(n), title:bi(t('role.'+r,null,true)), email:e, status:'invited', invitedAt:Date.now(), lang:LANG};
  if (r==='client') u.clientId = fd.get('iclient'); S.users.push(u); addLog('user_invite', {user:id, scope:t('role.'+r,null,true)});
  inviteFinish(u, C, fd, true);
};
/** Use an existing account for the invite (adds the role if needed) — keeps one account per person. */
ACT.inviteUseExisting = el => { if (!can('config')) return toast(t('adminOnly'),'bad'); const C = INVITE_CTX || {}, r = C.role, u = user(el.dataset.k), form = el.closest('form');
  if (!u || !STAFF_ROLE_SET.includes(r) || !rolesOf(u).every(x=>STAFF_ROLE_SET.includes(x))) return;
  if (!hasRole(u, r)){ u.roles = [...new Set(rolesOf(u).concat(r))]; addLog('access_update', {user:u.id, scope:t('role.'+r,null,true)}); }
  inviteFinish(u, C, new FormData(form), false); };
function inviteFinish(u, C, fd, isNew){
  const r = C.role, id = u.id; let where = '';
  if (r==='coordinator'){ const progs = fd.getAll('iprog'); progs.forEach(pid=>{ const p = program(pid); p.coordinatorIds = [...new Set((p.coordinatorIds||[]).concat(id))]; addLog('coord_assign', {prog:pid, user:id}); }); where = progs.map(pid=>L(program(pid).title)).join(', '); }
  if (r==='trainer' && fd.get('icourse')){ const c = course(fd.get('icourse')); setCourseTeam(c, courseInstructors(c.id).concat(id), leadOf(c.id)); where = L(c.title); }
  if (r==='ta' && fd.get('icourse')){ const c = course(fd.get('icourse')); c.taIds = [...new Set((c.taIds||[]).concat(id))]; addLog('trainer_assign', {course:c.id, user:id}); where = L(c.title); }
  if (r==='client') where = L(client(u.clientId).name);
  save(); closeModal(); INVITE_CTX = null;
  // Return to the form that opened the invitation, with the person ready to select
  const host = topModal(), addTo = (sel, html) => { const list = host.querySelector(sel); list.querySelector('p')?.remove(); const cur = list.querySelector(`input[value="${id}"]`); if (cur) cur.checked = true; else list.insertAdjacentHTML('beforeend', html); const x = list.querySelector(`input[value="${id}"]`); x && x.focus(); };
  if (C.form==='course' && r==='ta' && host && host.querySelector('#taList')) addTo('#taList', taRow(u, true));
  else if (C.form==='course' && host && host.querySelector('#teamList')) addTo('#teamList', teamRow(u, true, false));
  else if (C.form==='coordAssign' && host && host.querySelector('#coordList')) addTo('#coordList', coordRow(u, true));
  else render();
  toast((isNew ? t('invitePreparedStaff',{n:L(u.name), r:t('role.'+r,null,true)}) : t('pf.existingUsed',{n:L(u.name), r:t('role.'+r,null,true)})) + (where ? ' · '+t('accessTo',{w:where}) : ''));
}
ACT.resendStaffInvite = el => { const u = user(el.dataset.k); u.invitedAt = Date.now(); addLog('user_invite', {user:u.id, scope:'resend'}); save(); render(); toast(t('inviteResentDemo',{n:L(u.name)})); };

/* ---------- Person access: view scope, edit assignments, deactivate / reactivate ---------- */
ACT.personAccess = el => { const u = user(el.dataset.k), sc = scopeOf(u); let edit = '';
  if (!can('config')) return toast(t('adminOnly'),'bad');
  if (hasRole(u,'trainer')) edit += `<fieldset class="field"><legend class="lbl">${t('assignedCourses')} · ${t('role.trainer')}</legend><div class="team-list">${S.programs.filter(p=>!p.archived).map(p=>{ const cs = coursesOf(p.id); return cs.length ? `<div class="xs muted" style="margin-top:6px">${LE(p.title)}</div>${cs.map(c=>`<label class="check"><input type="checkbox" name="scopetrainer" value="${c.id}" ${isCourseInstructor(c.id,u.id)?'checked':''}><span>${LE(c.title)}</span></label>`).join('')}` : ''; }).join('')}</div><span class="help">${t('assignedCoursesHelp')}</span></fieldset>`;
  if (hasRole(u,'ta')) edit += `<fieldset class="field"><legend class="lbl">${t('assignedCourses')} · ${t('role.ta')}</legend><div class="team-list">${S.programs.filter(p=>!p.archived).map(p=>{ const cs = coursesOf(p.id); return cs.length ? `<div class="xs muted" style="margin-top:6px">${LE(p.title)}</div>${cs.map(c=>`<label class="check"><input type="checkbox" name="scopeta" value="${c.id}" ${isCourseTA(c.id,u.id)?'checked':''}><span>${LE(c.title)}</span></label>`).join('')}` : ''; }).join('')}</div></fieldset>`;
  if (hasRole(u,'coordinator')) edit += `<fieldset class="field"><legend class="lbl">${t('assignPrograms')}</legend><div class="team-list">${S.programs.filter(p=>!p.archived).map(p=>`<label class="check"><input type="checkbox" name="scopecoordinator" value="${p.id}" ${(p.coordinatorIds||[]).includes(u.id)?'checked':''}><span>${LE(p.title)} <span class="xs muted">· ${LE(client(p.clientId)?.name)}</span></span></label>`).join('')}</div></fieldset>`;
  if (hasRole(u,'client')) edit += field('scopeclient', t('clientOrganization'), selF('scopeclient', S.clients.map(c=>[c.id, LE(c.name)]), u.clientId), t('clientCoordHelp2'));
  if (hasRole(u,'admin')) edit += note(t('scope.adminLong'),'', 'shield');
  const staffOnly = rolesOf(u).every(x=>STAFF_ROLE_SET.includes(x)), self0 = u.id===me().id;
  const rolesBox = staffOnly ? `<fieldset class="field"><legend class="lbl">${t('pf.roles')}</legend><div class="row">${STAFF_ROLE_SET.map(x=>`<label class="check"><input type="checkbox" name="roles" value="${x}" ${hasRole(u,x)?'checked':''} ${self0?'disabled':''}>${t('role.'+x)}</label>`).join('')}</div><span class="help">${self0 ? t('pf.selfRoles') : t('pf.rolesHelp')}</span><span class="err" id="e-roles" role="alert"></span></fieldset>` : '';
  edit = rolesBox + edit;
  const list = sc.items.length ? `<ul class="list" style="margin-bottom:12px">${sc.items.map(i=>`<li><a class="small cell-main" href="${i.href}" data-action="closeAllThen">${esc(i.label)}</a><div class="xs muted">${esc(i.sub)}</div></li>`).join('')}</ul>` : `<p class="small" style="margin-bottom:12px">${esc(sc.txt)}</p>`;
  const self = u.id===me().id;
  openModal({title:LE(u.name), body:`<div class="row" style="gap:6px;margin-bottom:10px">${roleBadges(u)}${userStatusBadge(u)}<span class="xs muted ltr">${esc(u.email)}</span></div>
    <h3 style="margin:6px 0">${t('currentAccess')}</h3>${list}<form data-submit="saveScope" data-k="${u.id}" novalidate>${!rolesOf(u).every(r=>r==='admin')?`<h3 style="margin:6px 0">${t('editAssignments')}</h3>`:''}${edit}</form>`,
    footer:`${self ? '' : u.status==='deactivated' ? `<button class="btn" data-action="setAccess" data-k="${u.id}" data-on="1">${t('reactivate')}</button>` : `<button class="btn btn-danger" data-action="setAccess" data-k="${u.id}" data-on="0">${t('deactivateAccess')}</button>`}${u.status==='invited'?`<button class="btn" data-action="resendStaffInvite" data-k="${u.id}">${t('resendInvite')}</button>`:''}<span style="flex:1"></span><button class="btn" data-action="closeModal">${t('close')}</button>${!rolesOf(u).every(r=>r==='admin')?`<button class="btn btn-primary" data-action="submitForm">${t('saveAssignments')}</button>`:''}`}); };
SUB.saveScope = form => { if (!can('config')) return toast(t('adminOnly'),'bad'); const u = user(form.dataset.k), fd = new FormData(form); let changed = 0;
  if (form.querySelector('input[name="roles"]') && u.id!==me().id){ const want = STAFF_ROLE_SET.filter(x=>fd.getAll('roles').includes(x));
    if (!want.length) return formErrors(form, {roles:t('pf.e.oneRole')});
    rolesOf(u).filter(x=>!want.includes(x)).forEach(x=>{ changed++; // removing a role removes its assignments
      if (x==='coordinator') S.programs.forEach(p=>{ if ((p.coordinatorIds||[]).includes(u.id)){ p.coordinatorIds = p.coordinatorIds.filter(i=>i!==u.id); addLog('coord_unassign', {prog:p.id, user:u.id}); } });
      if (x==='trainer') S.courses.filter(c=>isCourseInstructor(c.id, u.id)).forEach(c=>setCourseTeam(c, courseInstructors(c.id).filter(i=>i!==u.id), leadOf(c.id)===u.id ? null : leadOf(c.id)));
      if (x==='ta') S.courses.forEach(c=>{ if ((c.taIds||[]).includes(u.id)){ c.taIds = c.taIds.filter(i=>i!==u.id); addLog('trainer_unassign', {course:c.id, user:u.id}); } }); });
    if (want.some(x=>!hasRole(u,x))) changed++;
    if (changed){ u.roles = want; if (!want.includes(u.role)) u.role = want[0]; addLog('access_update', {user:u.id, scope:want.map(x=>t('role.'+x,null,true)).join(', ')}); } }
  if (hasRole(u,'trainer')){ const want = fd.getAll('scopetrainer'); S.courses.filter(c=>!c.archived).forEach(c=>{ const has = isCourseInstructor(c.id, u.id), w = want.includes(c.id); if (has!==w){ changed++; setCourseTeam(c, w ? courseInstructors(c.id).concat(u.id) : courseInstructors(c.id).filter(x=>x!==u.id), leadOf(c.id)); } }); }
  if (hasRole(u,'coordinator')){ const want = fd.getAll('scopecoordinator'); S.programs.forEach(p=>{ const has = (p.coordinatorIds||[]).includes(u.id), w = want.includes(p.id); if (has!==w){ changed++; p.coordinatorIds = w ? (p.coordinatorIds||[]).concat(u.id) : p.coordinatorIds.filter(x=>x!==u.id); addLog(w?'coord_assign':'coord_unassign', {prog:p.id, user:u.id}); } }); }
  if (hasRole(u,'ta')){ const want = fd.getAll('scopeta'); S.courses.filter(c=>!c.archived).forEach(c=>{ const has = isCourseTA(c.id, u.id), w = want.includes(c.id); if (has!==w){ changed++; c.taIds = w ? (c.taIds||[]).concat(u.id) : c.taIds.filter(x=>x!==u.id); addLog(w?'trainer_assign':'trainer_unassign', {course:c.id, user:u.id}); } }); }
  if (hasRole(u,'client') && fd.get('scopeclient') && fd.get('scopeclient')!==u.clientId){ u.clientId = fd.get('scopeclient'); changed++; addLog('access_update', {user:u.id, client:u.clientId}); }
  save(); closeModal(); render(); toast(changed ? t('accessUpdated',{n:L(u.name)}) : t('noChanges'), changed?'ok':'info'); };
ACT.setAccess = el => { if (!can('config')) return toast(t('adminOnly'),'bad'); const u = user(el.dataset.k), on = el.dataset.on==='1'; if (u.id===me().id) return toast(t('pf.noSelfStatus'),'warn');
  const n = hasRole(u,'trainer') ? S.sessions.filter(s=>s.status==='scheduled' && sessionInstructors(s).includes(u.id)).length : 0;
  confirmModal(on ? t('reactivate') : t('deactivateTitle',{n:L(u.name)}), on ? t('reactivateMsg') : t('deactivateMsg') + (n ? ' ' + t('deactivateSessions',{n}) : ''), on ? t('reactivate') : t('deactivateAccess'), ()=>{
    if (on) u.status = u.prevStatus && u.prevStatus!=='deactivated' ? u.prevStatus : 'active'; else { u.prevStatus = u.status; u.status = 'deactivated'; }
    addLog(on?'access_reactivate':'access_deactivate', {user:u.id}); save(); closeAllModals(); render(); toast(on ? t('accessRestored',{n:L(u.name)}) : t('accessRemoved',{n:L(u.name)})); }, !on); };

/* ---------- Assign KAUST Program Coordinators to a program ---------- */
const coordRow = (u, on) => `<label class="check"><input type="checkbox" name="coord" value="${u.id}" ${on?'checked':''}><span>${LE(u.name)}${u.status==='invited'?` <span class="xs muted">(${t('invitedShort')})</span>`:''}</span></label>`;
ACT.assignCoord = el => { const p = program(el.dataset.pid), pool = S.users.filter(u=>hasRole(u,'coordinator') && (u.status!=='deactivated' || (p.coordinatorIds||[]).includes(u.id))).sort(byName);
  openModal({title:t('assignCoordinator'), body:`<form data-submit="saveCoords" data-pid="${p.id}" novalidate><p class="small muted" style="margin-bottom:10px">${LE(p.title)} · ${LE(client(p.clientId)?.name)}</p><p class="small" style="margin-bottom:10px">${t('programCoordHelp')}</p>
    <div id="coordList" class="team-list">${pool.map(u=>coordRow(u, (p.coordinatorIds||[]).includes(u.id))).join('')}</div>
    <button type="button" class="btn btn-sm" style="margin-top:10px" data-action="inviteCoordHere" data-pid="${p.id}">${icon('plus',14)}${t('invite.coordinator')}</button></form>`,
    footer:`<button class="btn" data-action="closeModal">${t('cancel')}</button><button class="btn btn-primary" data-action="submitForm">${t('saveAssignments')}</button>`}); };
ACT.inviteCoordHere = el => openInvite('coordinator', {program:el.dataset.pid, form:'coordAssign'});
SUB.saveCoords = form => { const p = program(form.dataset.pid), want = new FormData(form).getAll('coord'), prev = p.coordinatorIds || [];
  want.filter(id=>!prev.includes(id)).forEach(id=>addLog('coord_assign', {prog:p.id, user:id})); prev.filter(id=>!want.includes(id)).forEach(id=>addLog('coord_unassign', {prog:p.id, user:id}));
  p.coordinatorIds = want; save(); closeModal(); render(); toast(t('coordsSaved',{n:want.length})); };

