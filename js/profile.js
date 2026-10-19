"use strict";

/* =====================================================================
   8c. USER PROFILES (one shared layout, role-specific sections)
   One account per person (S.users). Staff accounts may hold several
   roles; the acting role decides permissions. Participants are one
   account linked by work email to their course enrollments
   (S.participants). Client organisations are separate records
   (S.clients) — never part of a person's profile. Passwords are never
   stored or shown. What a viewer sees and may edit is decided by
   profileAccess() / profileEditable() and re-checked on save.
   ===================================================================== */
const PF_LANGS = ['ar','en','fr','ur','hi'];
const PF_MAX_PHOTO = 3e6;
/** Resolve any person id (account id or participant enrollment id) to {u, pa, email}. */
function personOf(id){
  const u0 = user(id); if (u0) return {u:u0, pa: u0.participantId ? part(u0.participantId) : null, email:u0.email};
  const pa = part(id); if (!pa) return null;
  const acc = S.users.find(u=>hasRole(u,'participant') && part(u.participantId) && part(u.participantId).email.toLowerCase()===pa.email.toLowerCase());
  return acc ? {u:acc, pa:part(acc.participantId), email:acc.email} : {u:null, pa, email:pa.email};
}
const personName = P => P.u ? P.u.name : P.pa.name;
const personEnrollments = P => !P || !P.email ? [] : S.participants.filter(x=>!x.withdrawn && String(x.email).toLowerCase()===String(P.email).toLowerCase() && cohort(x.cohortId) && courseOfPart(x.id));
const personRoles = P => P.u ? rolesOf(P.u) : ['participant'];
const personKey = P => P.u ? P.u.id : P.pa.id;

/* ---------- Avatars ---------- */
const AV_COLORS = ['#12305A','#0F7F7A','#4E3F92','#8A5300','#1D578F','#17734A','#B3261E','#3A4556'];
function initialsOf(nameObj){ const n = L(nameObj).replace(/^(Dr\.|Eng\.|د\.|م\.)\s*/,'').trim(); const parts = n.split(/\s+/).filter(Boolean); return ((parts[0]||'?')[0] + (parts.length>1 ? parts[parts.length-1].replace(/^(Al-|ال)/,'')[0] : '')).toUpperCase(); }
function avatarHtml(P, size=32){ const u = P && P.u, name = P ? personName(P) : {en:'?'}, bg = AV_COLORS[hash32(L(name)+'av') % AV_COLORS.length];
  if (u && u.photo) return `<img class="avatar" src="${esc(u.photo)}" alt="" width="${size}" height="${size}" style="width:${size}px;height:${size}px">`;
  return `<span class="avatar" aria-hidden="true" style="width:${size}px;height:${size}px;background:${bg};font-size:${Math.round(size*0.38)}px">${esc(initialsOf(name))}</span>`; }

/* ---------- Access: who may see what ---------- */
/** 'self' | 'admin' | 'ops' (operational contact + scoped assignments) | 'public' (professional profile) | null */
function profileAccess(P){
  if (!P) return null; const v = me(), r = role();
  if (P.u && P.u.id===v.id) return 'self';
  if (!P.u && hasRole(v,'participant') && part(v.participantId) && part(v.participantId).email.toLowerCase()===P.email.toLowerCase()) return 'self';
  if (r==='admin') return 'admin';
  const cs = new Set(visibleCourses().map(c=>c.id));
  const inMyCourses = personEnrollments(P).some(pa=>cs.has(courseOfPart(pa.id).id));
  if (['coordinator','trainer','ta'].includes(r)){
    if (inMyCourses) return 'ops';
    if (P.u){ const id = P.u.id, rs = rolesOf(P.u);
      if (rs.some(x=>['trainer','ta'].includes(x)) && [...cs].some(c=>isCourseInstructor(c, id) || isCourseTA(c, id))) return 'ops';
      if (r==='coordinator'){ const ps = visiblePrograms();
        if (rs.includes('coordinator') && ps.some(p=>(p.coordinatorIds||[]).includes(id))) return 'ops';
        if (rs.includes('client') && ps.some(p=>p.clientId===P.u.clientId)) return 'ops'; } } }
  // Instructors' professional profile is visible to anyone who can see one of their courses
  if (P.u && hasRole(P.u,'trainer') && [...cs].some(c=>isCourseInstructor(c, P.u.id))) return 'public';
  return null;
}
/** Fields the current viewer may change on this profile (enforced again in SUB.saveProfile). */
function profileEditable(P, lvl = profileAccess(P)){
  if (!P || !P.u || !lvl) return [];
  const isTrainer = hasRole(P.u,'trainer'), isPart = hasRole(P.u,'participant'), prof = ['bio','expertise','qualifications','languages'];
  if (lvl==='self') return ['photo','lang','phone'].concat(isPart ? [] : ['name','title']).concat(isTrainer ? prof : []);
  if (lvl==='admin') return ['photo','lang','phone','name','title'].concat(isPart ? [] : ['email']).concat(isTrainer ? prof : []);
  return [];
}
const canManageAccount = P => role()==='admin' && P && P.u && P.u.id!==me().id;

/* ---------- Screens ---------- */
SCREENS.profile = () => profileScreen({u:me(), pa: me().participantId ? part(me().participantId) : null, email:me().email});
SCREENS.user = R => { const P = personOf(R.id); if (!P) return denied(t('notFound')); if (!profileAccess(P)) return denied(t('pf.noAccess')); return profileScreen(P); };
V.prof = null; // {key, edit, dirty, photo}
function profileScreen(P){
  const lvl = profileAccess(P), key = personKey(P), editable = profileEditable(P, lvl), u = P.u;
  if (V.prof && V.prof.key!==key) V.prof = null;
  const editing = V.prof && V.prof.edit && editable.length;
  const roles = personRoles(P), shownRoles = lvl==='public' ? ['trainer'] : roles;
  const self = lvl==='self', title = self ? t('pf.my') : LE(personName(P));
  const acting = self && u && rolesOf(u).length>1 ? `<div class="pf-acting" role="group" aria-label="${esc(t('pf.actingAs'))}"><span class="xs muted">${t('pf.actingAs')}:</span>${rolesOf(u).map(x=>`<button class="btn btn-sm ${role()===x?'btn-primary':''}" data-action="pfActAs" data-k="${x}" aria-pressed="${role()===x}">${t('role.'+x)}</button>`).join('')}</div>` : '';
  const head = `<div class="card card-b pf-head"><div class="pf-id">${avatarHtml(P, 88)}<div style="min-width:0"><h2 class="pf-name">${LE(personName(P))}</h2>${u && L(u.title) && lvl!=='public' ? `<div class="small muted">${LE(u.title)}</div>` : lvl==='public' && u && L(u.title) ? `<div class="small muted">${LE(u.title)}</div>` : ''}
      <div class="row" style="gap:6px;margin-top:8px">${shownRoles.map(x=>badge(ROLE_BADGE[x]||'', t('role.'+x), false)).join('')}${u && lvl!=='public' ? userStatusBadge(u) : ''}${!u ? badge('', t('pf.noAccount'), false) : ''}</div></div></div>
    <div class="pf-actions">${editable.length && !editing ? `<button class="btn btn-primary" data-action="pfEdit" data-k="${key}">${icon('edit',15)}${t('pf.edit')}</button>` : ''}${canManageAccount(P) && rolesOf(u).some(x=>x!=='participant') ? `<button class="btn" data-action="personAccess" data-k="${u.id}">${icon('shield',15)}${t('pf.manageAccess')}</button>` : ''}</div>${acting}</div>`;
  const body = editing ? profileForm(P, editable) : `<div class="grid g-main" style="margin-top:16px"><div class="stack">${contactCard(P, lvl)}${professionalCard(P, lvl)}${learningCard(P, lvl)}</div><div class="stack">${assignmentsCard(P, lvl)}${organisationCard(P, lvl)}${accountCard(P, lvl)}</div></div>`;
  const crumbs = self ? null : role()==='admin' ? [[t('nav.people'),'#/people'],[LE(personName(P))]] : null;
  return {title: self ? t('pf.my') : L(personName(P)), html: pageHead(title, self ? t('pf.mySub') : t('pf.sub.'+lvl), '', crumbs) + head + body,
    after: ()=>{ if (editing){ const f = $('#pfForm input:not([type=hidden]):not([type=file]), #pfForm textarea'); f && !V.prof.focused && (f.focus(), V.prof.focused = true); } }};
}
const dlRow = (k, v) => `<dt>${k}</dt><dd>${v}</dd>`;
const emptyLine = (txt, P, lvl) => `<span class="muted">${txt}</span>${profileEditable(P, lvl).length ? ` <button class="btn btn-sm btn-ghost" data-action="pfEdit" data-k="${personKey(P)}">${t('pf.add')}</button>` : ''}`;
function contactCard(P, lvl){
  if (lvl==='public') return '';
  const u = P.u, email = P.email, phone = u ? u.phone : null;
  return card(t('pf.contact'), `<dl class="dl">${dlRow(t('pf.workEmail'), `<span class="ltr">${esc(email)}</span>`)}${dlRow(t('pf.workPhone'), phone ? `<span class="ltr">${esc(phone)}</span>` : emptyLine(t('pf.noPhone'), P, lvl))}${['self','admin'].includes(lvl) && u ? dlRow(t('preferredLang'), u.lang==='en' ? 'English' : 'العربية') : ''}</dl>`); }
function professionalCard(P, lvl){
  const u = P.u; if (!u) return '';
  if (hasRole(u,'trainer')){ const ex = u.expertise||[], lg = u.languages||[];
    return card(t('pf.professional'), `<dl class="dl">${dlRow(t('pf.bio'), L(u.bio) ? `<span class="pf-bio" dir="auto">${LE(u.bio)}</span>` : emptyLine(t('pf.noBio'), P, lvl))}
      ${dlRow(t('pf.expertise'), ex.length ? `<div class="row" style="gap:6px">${ex.map(x=>`<span class="badge b-teal nodot" dir="auto">${esc(x)}</span>`).join('')}</div>` : emptyLine(t('pf.noExpertise'), P, lvl))}
      ${dlRow(t('pf.qualifications'), u.qualifications ? `<span dir="auto">${esc(u.qualifications)}</span>` : emptyLine(t('pf.noQual'), P, lvl))}
      ${dlRow(t('pf.languages'), lg.length ? lg.map(x=>t('pfl.'+x)).join(' · ') : emptyLine(t('pf.noLangs'), P, lvl))}</dl>`); }
  if (lvl==='public') return '';
  if (hasRole(u,'participant')){ const ens = personEnrollments(P).filter(pa=>lvl==='self' || lvl==='admin' || canSeeCourse(courseOfPart(pa.id).id)), pa = ens[0];
    return card(t('pf.work'), `<dl class="dl">${dlRow(t('pf.employer'), pa ? LE(client(program(courseOfPart(pa.id).programId).clientId)?.name) : '—')}${dlRow(t('department'), pa && L(pa.dept) ? LE(pa.dept) : '—')}${dlRow(t('pf.jobTitle'), L(u.title) ? LE(u.title) : '—')}</dl><p class="xs muted" style="margin-top:8px">${t('pf.partManaged')}</p>`); }
  return card(t('pf.work'), `<dl class="dl">${dlRow(t('pf.jobTitle'), L(u.title) ? LE(u.title) : emptyLine(t('pf.noTitle'), P, lvl))}</dl>`);
}
function assignmentsCard(P, lvl){
  const u = P.u, full = ['self','admin'].includes(lvl), vis = c => full || canSeeCourse(c.id), items = [];
  const courseLi = (c, extra='') => `<li><a class="small cell-main" href="${href(role()==='participant' ? 'mycourse' : 'course', role()==='participant' ? (myEnrollments().find(x=>cohort(x.cohortId).courseId===c.id)?.id) : c.id)}">${LE(c.title)}</a><div class="xs muted">${LE(program(c.programId).title)} · ${esc(courseRangeTxt(c.id))}${extra}</div></li>`;
  if (u){ const rs = lvl==='public' ? ['trainer'] : rolesOf(u);
    if (rs.includes('admin')) items.push([t('role.admin'), `<p class="small">${t('pf.adminScope', {n:S.programs.filter(p=>!p.archived).length})}</p>`]);
    if (rs.includes('coordinator')){ const ps = S.programs.filter(p=>!p.archived && (p.coordinatorIds||[]).includes(u.id) && (full || canSeeProgram(p.id))); items.push([t('pf.asCoord'), ps.length ? `<ul class="list">${ps.map(p=>`<li><span class="small cell-main">${LE(p.title)}</span><div class="xs muted">${LE(client(p.clientId)?.name)} · ${t('nCourses',{n:coursesOf(p.id).length})}</div></li>`).join('')}</ul>` : `<p class="small muted">${t('pf.noAssign')}</p>`]); }
    if (rs.includes('trainer')){ const cs = S.courses.filter(c=>!c.archived && isCourseInstructor(c.id, u.id) && vis(c)); items.push([t('pf.asTrainer'), cs.length ? `<ul class="list">${cs.map(c=>courseLi(c, lvl==='public' ? '' : ` · ${t('nSessionsAssigned',{n:S.sessions.filter(s=>s.courseId===c.id && s.status!=='cancelled' && sessionInstructors(s).includes(u.id)).length})}`)).join('')}</ul>` : `<p class="small muted">${t('pf.noAssign')}</p>`]); }
    if (rs.includes('ta')){ const cs = S.courses.filter(c=>!c.archived && isCourseTA(c.id, u.id) && vis(c)); items.push([t('pf.asTa'), cs.length ? `<ul class="list">${cs.map(c=>courseLi(c, ` · ${t('nSessions',{n:courseSessions(c.id).length})}`)).join('')}</ul>` : `<p class="small muted">${t('pf.noAssign')}</p>`]); }
    if (rs.includes('client')){ const ps = S.programs.filter(p=>p.clientId===u.clientId && !p.archived && p.status!=='draft' && (full || canSeeProgram(p.id))); items.push([t('pf.clientPrograms'), ps.length ? `<ul class="list">${ps.map(p=>`<li><span class="small cell-main">${LE(p.title)}</span><div class="xs muted">${t('nCourses',{n:coursesOf(p.id).length})} · ${esc(programRange(p))}</div></li>`).join('')}</ul>` : `<p class="small muted">${t('pf.noAssign')}</p>`]); } }
  if (personRoles(P).includes('participant') && lvl!=='public'){ const ens = personEnrollments(P).filter(pa=>full || canSeeCourse(courseOfPart(pa.id).id));
    items.push([t('pf.enrolled'), ens.length ? `<ul class="list">${ens.map(pa=>courseLi(courseOfPart(pa.id))).join('')}</ul>` : `<p class="small muted">${t('pf.noEnroll')}</p>`]); }
  if (!items.length) return '';
  return card(t('pf.assignments'), items.map(([h, b])=>`<h3 class="pf-sub">${h}</h3>${b}`).join('') + (lvl==='self' && !hasRole(P.u,'admin') ? `<p class="xs muted" style="margin-top:10px">${t('pf.assignByAdmin')}</p>` : ''));
}
function learningCard(P, lvl){
  if (!personRoles(P).includes('participant') || !['self','admin','ops'].includes(lvl)) return '';
  const ens = personEnrollments(P).filter(pa=>['self','admin'].includes(lvl) || canSeeCourse(courseOfPart(pa.id).id)); if (!ens.length) return '';
  return card(t('pf.learning'), `<ul class="list">${ens.map(pa=>{ const c = courseOfPart(pa.id), pr = participantProgress(pa.id), pct = pr.reqTotal ? pr.reqDone/pr.reqTotal*100 : 0;
    return `<li><div class="row between"><span class="small cell-main">${LE(c.title)}</span><span class="xs muted">${t('attendance')}: ${pctTxt(pr.a.pct)}</span></div>${progress(pct, t('pf.required'))}<div class="xs muted">${t('pf.reqDone',{a:pr.reqDone, b:pr.reqTotal})}</div></li>`; }).join('')}</ul><p class="xs muted" style="margin-top:8px">${t('pf.learningNote')}</p>`); }
function organisationCard(P, lvl){
  const u = P.u; if (!u || !hasRole(u,'client') || lvl==='public') return '';
  const c = client(u.clientId); if (!c) return '';
  return card(t('pf.organisation'), `<p class="small cell-main">${LE(c.name)}</p><p class="xs muted" style="margin-top:4px">${t('pf.orgSeparate')}</p>${role()==='admin' ? `<a class="btn btn-sm" style="margin-top:10px" href="#/clients">${t('pf.openOrg')}</a>` : ''}`); }
function accountCard(P, lvl){
  const u = P.u; if (!['self','admin'].includes(lvl)) return '';
  if (!u) return card(t('pf.account'), `<p class="small">${t('pf.noAccountLong')}</p>`);
  return card(t('pf.account'), `<dl class="dl">${dlRow(t('status'), userStatusBadge(u))}${dlRow(t('pf.roles'), rolesOf(u).map(x=>t('role.'+x)).join(' · '))}${u.invitedAt ? dlRow(t('pf.invited'), esc(fmtDT(u.invitedAt))) : ''}${dlRow(t('pf.signIn'), t('pf.signInNote'))}</dl>${canManageAccount(P) ? `<p class="xs muted" style="margin-top:8px">${t('pf.adminManages')}</p>` : lvl==='self' ? `<p class="xs muted" style="margin-top:8px">${t('pf.selfRoles')}</p>` : ''}`); }

/* ---------- Edit state ---------- */
function profileForm(P, ed){
  const u = P.u, has = k => ed.includes(k), F = V.prof, isTrainer = hasRole(u,'trainer');
  const txt = (k, label, val, attrs='', help='') => has(k) ? field('pf'+k, label, inp('pf'+k, val||'', 'text', attrs), help) : '';
  const photo = has('photo') ? `<div class="field"><span class="lbl">${t('pf.photo')}</span><div class="row" style="align-items:center;gap:14px"><span id="pfPhotoPrev">${avatarHtml({u:Object.assign({}, u, {photo: F.photo===undefined ? u.photo : F.photo}), pa:P.pa, email:P.email}, 72)}</span>
      <input id="f-pfphoto" type="file" accept="image/png,image/jpeg,image/webp" class="sr-only" data-change="pfPhoto" aria-describedby="h-pfphoto"><label class="btn btn-sm" for="f-pfphoto">${icon('upload',14)}${t('pf.choosePhoto')}</label>
      ${(F.photo===undefined ? u.photo : F.photo) ? `<button type="button" class="btn btn-sm btn-ghost" data-action="pfPhotoRemove">${t('pf.removePhoto')}</button>` : ''}</div><span class="help" id="h-pfphoto">${t('pf.photoHelp')}</span><span class="err" id="e-pfphoto" role="alert"></span></div>` : '';
  const lang = has('lang') ? field('pflang', t('preferredLang'), selF('pflang', [['ar','العربية'],['en','English']], u.lang||'ar'), t('pf.langHelp')) : '';
  const prof = isTrainer && has('bio') ? `<fieldset class="field pf-fs"><legend class="lbl">${t('pf.professional')}</legend>
      ${field('pfbio', t('pf.bio'), `<textarea class="textarea" id="f-pfbio" name="pfbio" rows="4" maxlength="1200" dir="auto">${esc(L(u.bio))}</textarea>`, t('pf.bioHelp'))}
      ${field('pfexpertise', t('pf.expertise'), inp('pfexpertise', (u.expertise||[]).join(', '), 'text', 'dir="auto"'), t('pf.expertiseHelp'))}
      ${field('pfqualifications', t('pf.qualifications'), `<textarea class="textarea" id="f-pfqualifications" name="pfqualifications" rows="2" maxlength="400" dir="auto">${esc(u.qualifications||'')}</textarea>`, t('optional'))}
      <div class="field"><span class="lbl">${t('pf.languages')}</span><div class="row">${PF_LANGS.map(x=>`<label class="check"><input type="checkbox" name="pflanguages" value="${x}" ${(u.languages||[]).includes(x)?'checked':''}>${t('pfl.'+x)}</label>`).join('')}</div></div></fieldset>` : '';
  const locked = [!has('email') ? [t('pf.workEmail'), `<span class="ltr">${esc(P.email)}</span>`] : null, !has('name') ? [t('name'), LE(personName(P))] : null].filter(Boolean);
  return `<form id="pfForm" class="card card-b" style="margin-top:16px" data-submit="saveProfile" data-k="${personKey(P)}" novalidate>
    <div class="row between" style="margin-bottom:12px"><h2>${t('pf.editTitle')}</h2><span id="pfDirty" class="badge b-warn" ${F.dirty?'':'hidden'}>${t('pf.unsaved')}</span></div>
    <div class="grid g-2"><div>${photo}${txt('name', t('name')+' *', L(u.name), 'autocomplete="name"')}${has('email') ? field('pfemail', t('pf.workEmail')+' *', inp('pfemail', u.email, 'email', 'dir="ltr" autocomplete="email"')) : ''}
      ${has('phone') ? field('pfphone', t('pf.workPhone'), inp('pfphone', u.phone||'', 'tel', 'dir="ltr" autocomplete="tel" placeholder="+966 5x xxx xxxx"'), t('optional')) : ''}${txt('title', t('pf.jobTitle'), L(u.title), 'dir="auto"', t('optional'))}${lang}
      ${locked.length ? `<div class="field"><span class="lbl">${t('pf.managedBy')}</span><dl class="dl">${locked.map(([a,b])=>dlRow(a,b)).join('')}</dl><span class="help">${t(hasRole(u,'participant')?'pf.partManaged':'pf.adminManagesShort')}</span></div>` : ''}</div>
    <div>${prof}${note(t('pf.noPasswords'),'', 'lock')}</div></div>
    <div id="pf-err" role="alert"></div><div class="divider"></div>
    <div class="row between"><button type="button" class="btn" data-action="pfCancel">${t('cancel')}</button><button type="submit" class="btn btn-primary">${icon('check',15)}${t('pf.save')}</button></div></form>`;
}
ACT.pfEdit = el => { const P = personOf(el.dataset.k) || (el.dataset.k===me().id ? personOf(me().id) : null); if (!profileEditable(P).length) return toast(t('pf.noAccess'),'bad'); V.prof = {key:personKey(P), edit:true, dirty:false}; render(); };
ACT.pfCancel = () => { if (V.prof && V.prof.dirty) return confirmModal(t('pf.discardT'), t('pf.discardQ'), t('pf.discard'), ()=>{ V.prof = null; render(); }, true); V.prof = null; render(); };
const pfDirty = () => { if (!V.prof) return; V.prof.dirty = true; const b = $('#pfDirty'); if (b) b.hidden = false; };
document.addEventListener('input', e => { if (e.target.closest('#pfForm')) pfDirty(); });
document.addEventListener('change', e => { if (e.target.closest('#pfForm') && e.target.id!=='f-pfphoto') pfDirty(); });
window.addEventListener('beforeunload', e => { if (V.prof && V.prof.dirty){ e.preventDefault(); e.returnValue = ''; } });
CHG.pfPhoto = el => { const f = el.files && el.files[0], err = $('#e-pfphoto'); if (!f) return; err.textContent = '';
  if (!/^image\/(png|jpeg|webp)$/.test(f.type)) { err.textContent = t('pf.e.photoType'); return; }
  if (f.size > PF_MAX_PHOTO) { err.textContent = t('pf.e.photoSize', {n:fmtSize(PF_MAX_PHOTO)}); return; }
  const img = new Image(), url = URL.createObjectURL(f);
  img.onload = () => { const s = 192, c = document.createElement('canvas'); c.width = c.height = s; const k = Math.max(s/img.width, s/img.height), w = img.width*k, h = img.height*k;
    c.getContext('2d').drawImage(img, (s-w)/2, (s-h)/2, w, h); URL.revokeObjectURL(url); V.prof.photo = c.toDataURL('image/jpeg', 0.85); pfDirty();
    $('#pfPhotoPrev').innerHTML = `<img class="avatar" src="${V.prof.photo}" alt="${esc(t('pf.photoPreview'))}" width="72" height="72" style="width:72px;height:72px">`; toast(t('pf.photoReady'),'info'); };
  img.onerror = () => { URL.revokeObjectURL(url); err.textContent = t('pf.e.photoRead'); }; img.src = url; };
ACT.pfPhotoRemove = () => { V.prof.photo = null; pfDirty(); const f = $('#pfForm'); const keep = Object.fromEntries(new FormData(f)); render(); Object.entries(keep).forEach(([k,v])=>{ const x = $('#pfForm [name="'+k+'"]'); if (x && x.type!=='file' && x.type!=='checkbox') x.value = v; }); $('#pfDirty') && ($('#pfDirty').hidden = false); };
/** Save: only fields this viewer may edit are read; everything else is ignored even if posted. */
SUB.saveProfile = form => {
  const P = personOf(form.dataset.k), ed = profileEditable(P); if (!ed.length) return toast(t('pf.noAccess'),'bad');
  const u = P.u, fd = new FormData(form), g = k => String(fd.get('pf'+k) ?? '').trim(), errs = {}, has = k => ed.includes(k);
  if (has('name') && (g('name').length<3 || g('name').length>80)) errs.pfname = t('errName');
  if (has('email')){ const e = g('email'); if (!validEmail(e)) errs.pfemail = t('errEmail'); else if (S.users.some(x=>x.id!==u.id && x.email.toLowerCase()===e.toLowerCase())) errs.pfemail = t('pf.e.emailTaken'); }
  if (has('phone') && g('phone') && !/^\+?[\d][\d\s-]{6,18}$/.test(g('phone'))) errs.pfphone = t('pf.e.phone');
  if (has('title') && g('title').length>80) errs.pftitle = t('pf.e.tooLong', {n:80});
  if (has('bio') && g('bio').length>1200) errs.pfbio = t('pf.e.tooLong', {n:1200});
  const exp = has('expertise') ? g('expertise').split(/[,،]/).map(x=>x.trim()).filter(Boolean) : [];
  if (has('expertise') && (exp.length>10 || exp.some(x=>x.length>40))) errs.pfexpertise = t('pf.e.expertise');
  if (has('qualifications') && g('qualifications').length>400) errs.pfqualifications = t('pf.e.tooLong', {n:400});
  if (!formErrors(form, errs)){ $('#pf-err').innerHTML = note(t('pf.e.fix'), 'bad', 'alert'); return; }
  const mk = (txt, old) => Object.assign({}, old && typeof old==='object' ? old : {}, {[LANG]:txt}, (old && old[LANG==='ar'?'en':'ar']) ? {} : {[LANG==='ar'?'en':'ar']:txt});
  if (has('name')) u.name = mk(g('name'), u.name);
  if (has('email')) u.email = g('email');
  if (has('phone')) u.phone = g('phone') || null;
  if (has('title')) u.title = mk(g('title'), u.title);
  const langChanged = has('lang') && (g('lang')==='en' ? 'en' : 'ar') !== (u.lang||'ar'); if (has('lang')) u.lang = g('lang')==='en' ? 'en' : 'ar';
  if (has('photo') && V.prof && V.prof.photo!==undefined) u.photo = V.prof.photo;
  if (has('bio')) u.bio = mk(g('bio'), u.bio);
  if (has('expertise')) u.expertise = exp;
  if (has('qualifications')) u.qualifications = g('qualifications');
  if (has('languages')) u.languages = fd.getAll('pflanguages').filter(x=>PF_LANGS.includes(x));
  addLog('profile_update', {user:u.id}); V.prof = null;
  if (u.id===me().id && langChanged && u.lang!==LANG){ LANG = u.lang; UIP.lang = LANG; } // only when the person actually changed it
  save(); render(); toast(t('pf.saved'),'ok'); const h = $('.pf-name'); h && (h.setAttribute('tabindex','-1'), h.focus());
};
/** Switch which of your own roles you are acting in (one account, separate permissions). */
ACT.pfActAs = el => { const u = me(), r = el.dataset.k; if (!hasRole(u, r)) return; UIP.acting = UIP.acting || {}; UIP.acting[u.id] = r; NAV_STACK = []; V.ab = null; V.sv = null; saveUI(); render(); toast(t('pf.nowActing', {r:t('role.'+r,null,true)}),'info'); };
/** Profile link for a person (only when the viewer may open it). */
const profileLink = (id, label) => { const P = personOf(id); return P && profileAccess(P) ? `<a href="${href(P.u && P.u.id===me().id ? 'profile' : 'user', P.u && P.u.id===me().id ? null : personKey(P))}">${label}</a>` : label; };
