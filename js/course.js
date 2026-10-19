"use strict";

/* =====================================================================
   9. COURSE PAGE (one page, role-based tabs)
   Admin: structure · Instructor: content · Program Coordinator: on-site
   support · Client Coordinator: progress of their own organization only.
   ===================================================================== */
SCREENS.mycourses = () => {
  const cs = visibleCourses();
  const html = pageHead(t('nav.mycourses'), t('mcSub2')) + (cs.length ? `<div class="stack">${cs.map(c=>contentTask(c.id, true)).join('')}</div>` : card('', empty(t('noAssigned'), t('noAssignedHint'), 'book')));
  return {title:t('nav.mycourses'), html};
};
/** Course card with the instructor checklist: Pre-assessment, Post-assessment, Activities, Materials. */
function contentTask(cid, withOpen){
  const c = course(cid), ct = contentStatus(cid), p = program(c.programId), mine = can('content', cid);
  const item = k => { const st = ct.items[k], lbl = `${t('ctl.'+k)}${k==='survey'?` <span class="xs muted">(${t('optional')})</span>`:''}`;
    return mine ? `<button type="button" class="ti ti-btn" data-action="ctOpen" data-cid="${cid}" data-k="${k}" aria-label="${esc(t('ctl.'+k)+' — '+t('ct.'+st)+' — '+(contentDone(st)?t('view'):st==='not_started'?t('start'):t('continue')))}"><span class="l">${lbl}</span><span class="row between" style="margin-top:4px">${ctBadge(st)}<span class="xs ti-go">${contentDone(st)?t('view'):st==='not_started'?t('start'):t('continue')} ›</span></span></button>`
      : `<div class="ti"><div class="l">${lbl}</div><div class="row between" style="margin-top:4px">${ctBadge(st)}</div></div>`; };
  return `<div class="task"><div class="row between"><div style="min-width:0"><div class="xs muted">${LE(client(p.clientId)?.name)} › ${LE(p.title)}</div><h3 style="margin-top:2px">${LE(c.title)}</h3></div><div class="row">${ct.complete?badge('b-ok', t('contentReady')):badge('b-info', t('contentDoneN2',{n:ct.done, m:ct.of}))}${withOpen?`<a class="btn btn-sm btn-primary" href="${href('course',cid)}">${t('openCourse')}</a>`:''}</div></div>
  <div class="meta" style="margin-top:6px"><span>${icon('calendar',13)}${esc(courseRangeTxt(cid))}</span><span>${icon('users',13)}${t('nParticipants',{n:courseParticipants(cid).length})}</span><span>${icon('list',13)}${t('nSessions',{n:courseSessions(cid).length})}</span></div>
  <div class="task-grid">${CONTENT_KEYS.map(item).join('')}</div>
  ${mine ? materialStrip(cid) : ''}</div>`;
}
/** Checklist item → straight into the right editor or upload flow (nothing is saved until the instructor saves). */
ACT.ctOpen = el => { const cid = el.dataset.cid, k = el.dataset.k, c = course(cid); if (!c) return;
  if (!can('content', cid)) return go('course', cid);
  const tab = {materials:'materials', pre:'assessments', post:'assessments', survey:'surveys'}[k];
  go('course', cid, {tab});
  if (k==='materials'){ if (!materialCounts(cid).all) ACT.addMaterial({dataset:{cid}}); return; }
  if (k==='pre' || k==='post'){ const a = curAssessment(cid, k);
    if (a && isLocked(a)) return toast(t('lockedToast'),'info');
    if (a) openBuilder(a); else { const n = newAssessment(c, k); V.ab = {courseId:cid, aid:null, kind:'assessment', pending:n, draft:JSON.parse(JSON.stringify(n)), q:blankQ('mcq', c.objectives[0]?.id)}; render(); }
    $('#f-qtext')?.focus(); return; }
  if (k==='survey'){ const ss = surveysOf(cid), d = ss.find(s=>s.status==='draft' && !svResponses(s.id).length);
    if (!ss.length) ACT.svNew({dataset:{cid, k:'starter'}}); else if (d && ss.length===1) svOpenEditor(d); } };
/** Compact, prominent materials summary with the main action. */
function materialCounts(cid){ const ch = courseCohort(cid), ms = ch ? materialsFor(ch.id).filter(m=>m.state!=='archived') : []; const n = k => ms.filter(m=>matState(m)===k).length; return {all:ms.length, pub:n('available'), draft:n('draft'), sched:n('scheduled')}; }
function materialStrip(cid){ const m = materialCounts(cid);
  return `<div class="mat-strip"><span class="mat-ico" aria-hidden="true">${icon('book',18)}</span><div class="grow"><div class="cell-main small">${t('cw.materials')}</div><div class="xs muted">${t('matCounts',{p:m.pub, d:m.draft, s:m.sched})}</div></div><a class="btn btn-sm" href="${href('course',cid,{tab:'materials'})}">${t('openMaterials')}</a><button class="btn btn-sm btn-primary" data-action="addMaterial" data-cid="${cid}">${icon('upload',14)}${t('uploadMaterial')}</button></div>`; }

const COURSE_TABS = {
  admin:['overview','schedule','participants','progress'],
  coordinator:['overview','participants','sessions','progress'],
  trainer:['overview','materials','assessments','surveys','activities','sessions'],
  ta:['overview','participants','sessions'],
  client:['overview','materials','progress'],
};
SCREENS.course = R => {
  const c = course(R.id), r = role();
  if (!c || !COURSE_TABS[r] || !canSeeCourse(c.id) || (r!=='admin' && !liveCourse(c.id))) return denied();
  const list = COURSE_TABS[r]; let tab = R.q.tab || (V.cw.cid===c.id ? V.cw.tab : 'overview'); if (!list.includes(tab)) tab = 'overview';
  if (V.cw.cid !== c.id){ V.cw = {tab, cid:c.id}; V.ab = null; V.sv = null; V.pw.q = ''; }
  V.cw.tab = tab; V.cw.cohort = courseCohort(c.id)?.id || null;
  const p = program(c.programId);
  const actions = r==='admin' ? `<button class="btn" data-action="editCourse" data-cid="${c.id}">${icon('edit',16)}${t('editCourse')}</button><button class="btn" data-action="editCourse" data-cid="${c.id}" data-focus="team">${icon('users',16)}${t('editTeam')}</button>`
    : r==='trainer' ? `<button class="btn btn-primary" data-action="addMaterial" data-cid="${c.id}">${icon('upload',16)}${t('uploadMaterial')}</button><button class="btn" data-action="requestChange" data-cid="${c.id}">${icon('edit',16)}${t('requestChange')}</button>`
    : can('requestChange', c.id) ? `<button class="btn" data-action="requestChange" data-cid="${c.id}">${icon('edit',16)}${t('requestChange')}</button>` : '';
  const crumbs = r==='admin' ? [[t('nav.programs'),'#/programs'],[LE(p.title), href('program',p.id)],[LE(c.title)]]
    : r==='trainer' ? [[t('nav.mycourses'),'#/mycourses'],[LE(c.title)]] : r==='client' ? [[t('nav.courses'),'#/courses'],[LE(c.title)]] : [[t('nav.sessions'),'#/sessions'],[LE(c.title)]];
  let body = '';
  if (tab==='overview') body = courseOverview(c);
  if (tab==='schedule') body = `<p class="small muted" style="margin-bottom:12px">${t('scheduleAdminHelp')}</p>` + scheduleEditor(c.id);
  if (tab==='participants') body = participantsPanel(c.id);
  if (tab==='materials') body = materialsTab(c);
  if (tab==='assessments') body = assessmentsTab(c);
  if (tab==='surveys') body = surveysTab(c);
  if (tab==='activities') body = activitiesTab(c);
  if (tab==='sessions') body = courseAttendance(c);
  if (tab==='progress') body = completionPanel(c.id) + (()=>{ const sv = surveySummary(c.id); return sv ? `<div style="margin-top:16px">${sv}</div>` : ''; })();
  const sub = `${LE(client(p.clientId)?.name)} › ${LE(p.title)} · ${t('instructorTeam')}: ${courseInstructors(c.id).length?esc(courseTeamText(c.id)):`<span class="conflict">${t('noTrainer')}</span>`} · ${esc(courseRangeTxt(c.id))} ${stBadge(courseStatus(c.id))}`;
  return {title:L(c.title), html: pageHead(LE(c.title), sub, actions, crumbs) + tabs('cw', list.map(k=>[k, t('cwt.'+k)]), tab) + `<div role="tabpanel">${body}</div>`};
};

/* ---------- Overview & schedule ---------- */
function courseOverview(c){
  const r = role(), p = program(c.programId), ps = courseParticipants(c.id), rooms = [...new Set(courseSessions(c.id).map(s=>s.roomId))].map(id=>L(room(id)?.name)).filter(Boolean);
  const rows = [[t('program'), LE(p.title)], [t('client'), LE(client(p.clientId)?.name)], [t('instructorTeam'), teamChips(courseInstructors(c.id), leadOf(c.id))], [t('programCoordinators'), programCoordinators(p.id).length ? esc(programCoordinators(p.id).map(userLabel).join(LANG==='ar'?'، ':', ')) : '—'], [t('language'), t('lang.'+c.language)], [t('dates'), esc(courseRangeTxt(c.id))], [t('location'), esc(rooms.join(' · ')||'—')], [t('participantsN'), ps.length]];
  const info = card(t('aboutCourse'), `${L(c.desc)?`<p class="small" style="margin-bottom:12px">${LE(c.desc)}</p>`:''}<dl class="dl">${rows.map(x=>`<dt>${x[0]}</dt><dd>${x[1]}</dd>`).join('')}</dl>
    ${c.objectives && c.objectives.length ? `<h3 style="margin:14px 0 6px">${t('objectives')}</h3><ol style="margin:0;padding-inline-start:20px" class="small">${c.objectives.map(o=>`<li style="margin:3px 0">${esc(L(o))}</li>`).join('')}</ol>` : ''}`, {right: r==='admin' ? ownerTag('admin') : ''});
  if (r==='admin') return `<div class="grid g-main"><div class="stack">${info}</div>${setupChecklist(c.id)}</div>`;
  const ro = `<div class="row small" style="margin-bottom:12px">${icon('lock',14)}<span class="muted">${t('scheduleReadOnly2')}</span>${can('requestChange',c.id)?`<button class="btn btn-sm btn-ghost" data-action="requestChange" data-cid="${c.id}" data-k="schedule">${t('requestChange')}</button>`:''}</div>`;
  const side = r==='trainer' ? card(t('participantsN')+` (${ps.length})`, ps.length ? `<ul class="list">${ps.map(x=>`<li class="row between"><span class="small">${LE(x.name)}</span><span class="xs muted">${LE(x.dept)||''}</span></li>`).join('')}</ul>` : `<p class="small muted">${t('noParticipantsYet')}</p>`) : '';
  const mats = r==='trainer' ? card(t('cw.materials'), materialStrip(c.id).replace('mat-strip','mat-strip flat'), {cls:'mat-card'}) : '';
  return `<div class="grid g-main"><div class="stack">${mats}<div><h2 style="margin-bottom:8px">${t('daysAgenda')}</h2>${ro}${scheduleView(c.id)}</div></div><div class="stack">${info}${side}</div></div>`;
}
/** Admin readiness checklist: missing items, who owns them, and a Fix link. */
function setupChecklist(cid){
  const su = adminSetup(cid), ct = contentStatus(cid), tabFor = {trainer:'overview', schedule:'schedule', rooms:'schedule', conflicts:'schedule', participants:'participants', invites:'participants'};
  const adminRows = su.items.map(i=>checkRow(i.ok?'ok':i.soft?'warn':'no', i.k==='conflicts'? (i.ok?t('rd.conflicts'):t('rd.conflictsBad',{n:i.n})) : i.k==='invites' ? (i.ok?t('rd.invites'):t('rd.invitesBad',{n:i.n})) : t('rd.'+i.k), i.ok?'':t('rdh.'+i.k),
    i.ok ? '' : i.k==='trainer' ? `<button class="btn btn-sm" data-action="editCourse" data-cid="${cid}">${t('fix')}</button>` : `<a class="btn btn-sm" href="${href('course',cid,{tab:tabFor[i.k]})}">${t('fix')}</a>`)).join('');
  const trRows = CONTENT_KEYS.map(k=>checkRow(contentDone(ct.items[k])?'ok':ct.items[k]==='draft'?'prog':'warn', t('ctl.'+k) + (k==='survey'?` (${t('optional')})`:''), '', ctBadge(ct.items[k]))).join('');
  return `<div class="stack">${card(t('setupChecklist'), `<ul class="checklist">${adminRows}</ul>`, {right:ownerTag('admin')})}${card(t('instructorContent'), `<ul class="checklist">${trRows}</ul><p class="xs muted" style="margin-top:8px">${t('contentOwnedByTrainer')}</p>`, {right:ownerTag('trainer')})}</div>`;
}
/** Read-only days → sessions with time, location and agenda. */
function scheduleView(cid){
  const ch = courseCohort(cid), ds = courseDays(cid), r = role(), mine = can('content', cid);
  if (!ch || !ds.length) return card('', empty(t('noDays'), t('noDaysOther'), 'calendar'));
  return `<div class="stack">${ds.map((d,i)=>{ const ss = sessionsOfCohort(ch.id).filter(s=>s.dayId===d.id);
    return card(`<span class="day-h"><span class="chip">${t('dayN',{n:i+1})}</span>${esc(fmtDay(d.dayOffset, true))}${d.dayOffset===0?` <span class="badge b-teal">${t('today')}</span>`:''}</span>`, ss.length ? `<ul class="list" style="padding:0 18px">${ss.map(s=>`<li class="item-row" ${s.status==='cancelled'?'style="opacity:.55"':''}><div class="ltr num small nowrap" style="width:96px;text-align:start">${s.start}–${s.end}</div>
      <div class="grow"><div class="cell-main small">${LE(s.title)}</div>${s.agenda&&L(s.agenda)?`<div class="xs muted">${LE(s.agenda)}</div>`:''}<div class="xs muted" style="margin-top:2px">${locationHtml(s)} · ${icon('user',12)} ${esc(sessionTeamText(s))}</div></div>
      <div class="row" style="flex-wrap:nowrap">${r==='trainer' && sessionInstructors(s).includes(me().id) ? badge('b-teal', t('assignedToYou'), false) : ''}${sessBadge(s)}${s.status!=='cancelled' && (r==='coordinator' || r==='admin' || mine) ? `<a class="btn btn-sm" href="${href('attendance',s.id)}">${t('openSession')}</a>` : ''}${mine && s.status!=='cancelled' ? `<button class="btn btn-sm btn-ghost" data-action="addMaterial" data-cid="${cid}" data-sid="${s.id}" aria-label="${esc(t('addMaterialTo',{s:L(s.title)}))}">${icon('upload',14)}</button>` : ''}</div></li>`).join('')}</ul>` : `<div class="card-b small muted">${t('noSessionsDay')}</div>`, {flush:true, cls: d.dayOffset===0 ? 'day-card is-today' : ''}); }).join('')}</div>`;
}
const locationHtml = s => s.mode==='virtual' ? `${icon('video',12)} ${t('mode.virtual')}${s.meetingUrl?` · <span class="ltr">${esc(s.meetingUrl.replace(/^https?:\/\//,''))}</span>`:''}` : `${icon('pin',12)} ${LE(room(s.roomId)?.name) || t('tbc')}`;

/* ---------- Sessions & attendance list for one course ---------- */
function courseAttendance(c){
  const ss = courseSessions(c.id);
  return card('', ss.length ? `<div class="table-wrap"><table class="tbl"><thead><tr><th>${t('date')}</th><th>${t('session')}</th><th>${t('location')}</th><th>${t('instructor')}</th><th>${t('status')}</th><th class="num">${t('attendance')}</th><th></th></tr></thead><tbody>${ss.map(s=>{ const k = sessCounts(s.id);
    return `<tr><td class="small nowrap">${esc(dayLabel(sOff(s)))} <span class="ltr">${s.start}</span></td><td class="cell-main small">${LE(s.title)}</td><td class="small">${locationHtml(s)}</td><td class="small">${esc(sessionTeamText(s))}</td><td>${sessBadge(s)}</td><td class="num">${s.status==='scheduled'?'—':`${k.present+k.late} / ${k.total}${k.manual?` <span class="cell-sub">(${t('manualN',{n:k.manual})})</span>`:''}`}</td><td><a class="btn btn-sm ${s.status==='live'||sOff(s)===0?'btn-primary':''}" href="${href('attendance',s.id)}">${t('open')}</a></td></tr>`; }).join('')}</tbody></table></div>` : empty(t('noSessions'),'','calendar'), {flush:true});
}

/* ---------- Completion (shared: Admin, Program Coordinator, Client Coordinator, Participant) ---------- */
function participantProgress(paid){
  const p = part(paid), ch = cohort(p.cohortId), c = course(ch.courseId), a = attStats(paid), acts = activitiesFor(ch.id, true), st = S.settings;
  const actsDone = acts.filter(x=>subDone(subState(x, paid))).length, overdue = acts.filter(x=>subState(x, paid)==='overdue').length;
  const pre = !!getAttempt(paid, c.id, 'pre'), post = !!getAttempt(paid, c.id, 'post'), fin = evalsOf(ch.id, paid).some(e=>e.kind==='final');
  const req = [pre, post].concat(st.requireFinal ? [fin] : []), ci = certInfo(paid), run = cohortRun(ch.id);
  const group = ci.status==='approved' || (run==='completed' && ci.eligible) ? 'completed' : run==='not_started' || run==='none' ? 'not_started' : (run==='completed' || overdue || (a.pct!=null && a.pct < st.minAttendance)) ? 'attention' : 'on_track';
  return {p, a, acts:acts.length, actsDone, overdue, pre, post, fin, reqDone:req.filter(Boolean).length, reqTotal:req.length, ci, group};
}
function courseProgress(cid){
  const ch = courseCohort(cid), ds = courseDays(cid), ss = courseSessions(cid), es = ss.filter(s=>s.status==='ended'), ps = courseParticipants(cid);
  const daysDone = ds.filter(d=>{ const x = ss.filter(s=>s.dayId===d.id); return x.length && x.every(s=>s.status==='ended'); }).length;
  let present = 0; es.forEach(s=>{ const k = sessCounts(s.id); present += k.present + k.late; });
  const expected = es.length * ps.length, per = ps.map(x=>participantProgress(x.id)), groups = {completed:0, on_track:0, attention:0, not_started:0}; per.forEach(x=>groups[x.group]++);
  return {ch, ds, ss, es, ps, daysDone, present, expected, attPct: expected ? present/expected*100 : null, per, groups,
    reqDone: per.reduce((a,x)=>a+x.reqDone,0), reqTotal: per.reduce((a,x)=>a+x.reqTotal,0), actDone: per.reduce((a,x)=>a+x.actsDone,0), actTotal: per.reduce((a,x)=>a+x.acts,0), certs: per.filter(x=>x.ci.status==='approved').length};
}
const GROUP_BADGE = {completed:'b-ok', on_track:'b-teal', attention:'b-warn', not_started:''};
function completionPanel(cid){
  const r = role(), c = course(cid), P = courseProgress(cid), st = S.settings, canA = can('certApprove'), showNames = r!=='client' || st.clientIndividual;
  const kp = `<div class="grid g-kpi">${kpi(t('cp.days'), `${P.daysDone}<small> / ${P.ds.length}</small>`, t('cp.daysSub',{n:Math.max(0,P.ds.length-P.daysDone)}), 'calendar', true)}
    ${kpi(t('cp.att'), pctTxt(P.attPct), P.expected ? t('cp.attSub',{a:P.present, b:P.expected, s:P.es.length, p:P.ps.length}) : t('cp.attNone'), 'checkCircle')}
    ${kpi(t('cp.req'), `${P.reqDone}<small> / ${P.reqTotal}</small>`, t('cp.reqSub'), 'clipboard')}
    ${kpi(t('cp.acts'), `${P.actDone}<small> / ${P.actTotal}</small>`, t('cp.actsSub'), 'list')}
    ${kpi(t('cp.certs'), `${P.certs}<small> / ${P.ps.length}</small>`, t('cp.certsSub',{m:st.minAttendance}), 'award')}</div>`;
  const summary = card(t('cp.summary'), `<div class="row" style="gap:8px">${Object.keys(P.groups).map(k=>badge(GROUP_BADGE[k], `${t('grp2.'+k)}: ${P.groups[k]}`, false)).join('')}</div><p class="xs muted" style="margin-top:8px">${t('cp.summaryHelp',{m:st.minAttendance})}</p>`);
  const pending = P.per.filter(x=>x.ci.status==='pending').length;
  const table = !P.ps.length ? empty(t('noParticipants'),'','users') : !showNames ? `<div class="card-b">${note(t('cp.groupOnly',{m:MIN_GROUP}),'', 'shield')}</div>` : `<div class="table-wrap"><table class="tbl"><thead><tr><th>${t('participant')}</th><th class="num">${t('attendance')}</th><th class="center">${t('pre')}</th><th class="center">${t('post')}</th>${st.requireFinal?`<th class="center">${t('finalEval')}</th>`:''}<th class="num">${t('cw.activities')}</th><th>${t('certificate')}</th>${canA?'<th><span class="sr-only">'+t('actions')+'</span></th>':''}</tr></thead><tbody>${P.per.map(x=>`<tr><td><div class="cell-main small">${LE(x.p.name)}</div><div class="cell-sub">${badge(GROUP_BADGE[x.group], t('grp2.'+x.group), false)}</div></td>
    <td class="num"><span ${x.a.pct!=null&&x.a.pct<st.minAttendance?'style="color:var(--bad);font-weight:600"':''}>${pctTxt(x.a.pct)}</span> <span class="cell-sub">(${x.a.att}/${x.a.total})</span></td><td class="center">${yesNo(x.pre)}</td><td class="center">${yesNo(x.post)}</td>${st.requireFinal?`<td class="center">${yesNo(x.fin)}</td>`:''}<td class="num small">${x.actsDone} / ${x.acts}</td>
    <td>${certBadge(x.ci.status)}${x.ci.reasons.length && !['approved','in_progress'].includes(x.ci.status)?`<div class="cell-sub">${x.ci.reasons.map(k=>t('why.'+k)).join(' · ')}</div>`:''}${x.ci.rec && x.ci.rec.state==='returned'?`<div class="cell-sub" style="max-width:220px">${LE(x.ci.rec.note)}</div>`:''}</td>
    ${canA?`<td class="nowrap">${x.ci.status==='approved' ? `<button class="btn btn-sm" data-action="previewCert" data-pid="${x.p.id}">${icon('eye',14)}${t('preview')}</button>` : ['pending','returned'].includes(x.ci.status) ? `<button class="btn btn-sm btn-teal" data-action="approveCert" data-pid="${x.p.id}">${t('approve')}</button>${x.ci.status==='pending'?` <button class="btn btn-sm" data-action="returnCert" data-pid="${x.p.id}">${t('returnReview')}</button>`:''}` : ''}</td>`:''}</tr>`).join('')}</tbody></table></div>`;
  const right = `<div class="row">${canA && pending ? `<button class="btn btn-sm btn-teal" data-action="approveAll" data-cid="${cid}">${icon('check',14)}${t('approveAll',{n:pending})}</button>` : ''}${r!=='trainer'?`<button class="btn btn-sm" data-action="exportCourse" data-cid="${cid}">${icon('download',14)}${t('exportCsv')}</button><button class="btn btn-sm" data-action="printReport">${icon('printer',14)}${t('printPdf')}</button>`:''}</div>`;
  const certNote = `<p class="xs muted" style="margin-top:8px">${t('certRuleLine',{m:st.minAttendance})}${can('config')?` · <a href="#/config/certificates">${t('certTemplateLink')}</a>`:''}</p>`;
  const chid = P.ch?.id;
  return `<div class="print-only" style="margin-bottom:12px"><div style="font-size:18px;font-weight:700">KAUST Academy — ${t('appName')}</div><div>${LE(c.title)} · ${fmtDateLong(Date.now())}</div></div><div class="stack">${kp}${summary}${card(t('cp.byParticipant'), table, {flush:true, right})}${certNote}${chid && (r!=='client' || P.ps.length) ? `<details class="explain card card-b"><summary>${t('learningGain')}</summary><div style="margin-top:12px">${impactPanel(c, chid)}</div></details>` : ''}</div>`;
}
/** Participant's own completion card. */
function completionCard(paid){
  const x = participantProgress(paid), ch = cohortOf(paid), P = courseProgress(ch.courseId), st = S.settings;
  const tile = (l, v, s) => `<div class="ct"><div class="l">${l}</div><div class="n">${v}</div>${s?`<div class="xs muted" style="margin-top:2px">${s}</div>`:''}</div>`;
  return `<div class="count-tiles c5">${tile(t('cp.days'), `${P.daysDone}/${P.ds.length}`)}${tile(t('cp.att'), pctTxt(x.a.pct), t('attendedOfSessions',{a:x.a.att, b:x.a.total}))}${tile(t('cp.reqMine'), `${x.reqDone}/${x.reqTotal}`)}${tile(t('cp.acts'), `${x.actsDone}/${x.acts}`)}<div class="ct"><div class="l">${t('certificate')}</div><div style="margin-top:8px">${certBadge(x.ci.status)}</div></div></div>
    <p class="xs muted" style="margin-top:8px">${t('cm.'+x.ci.status)} ${t('certRuleLine',{m:st.minAttendance})}</p>`;
}
ACT.exportCourse = el => { const c = course(el.dataset.cid), p = program(c.programId), P = courseProgress(c.id), showNames = role()!=='client' || S.settings.clientIndividual;
  const rows = [[t('csvBanner',null,true)], [t('client',null,true), L(client(p.clientId)?.name)], [t('program',null,true), L(p.title)], [t('course',null,true), L(c.title)], [t('generated',null,true), new Date().toISOString()], [],
    [t('cp.days',null,true), `${P.daysDone}/${P.ds.length}`], [t('cp.att',null,true), P.attPct==null?'':Math.round(P.attPct)+'%', `${P.present}/${P.expected}`], [t('cp.req',null,true), `${P.reqDone}/${P.reqTotal}`], [t('cp.acts',null,true), `${P.actDone}/${P.actTotal}`], [t('cp.certs',null,true), `${P.certs}/${P.ps.length}`], []];
  Object.keys(P.groups).forEach(k=>rows.push([t('grp2.'+k,null,true), P.groups[k]]));
  if (showNames){ rows.push([], [t('participant',null,true), t('attendance',null,true)+' %', t('pre',null,true), t('post',null,true), t('finalEval',null,true), t('cw.activities',null,true), t('certificate',null,true)]);
    P.per.forEach(x=>rows.push([L(x.p.name), x.a.pct==null?'':Math.round(x.a.pct), x.pre?t('yes',null,true):t('no',null,true), x.post?t('yes',null,true):t('no',null,true), x.fin?t('yes',null,true):t('no',null,true), `${x.actsDone}/${x.acts}`, t('cs.'+x.ci.status,null,true)])); }
  addLog('export', {course:c.id, scope:'csv'}); save(); exportDialog(`ka-demo-progress-${p.code}-${isoOf(0)}.csv`, toCSV(rows)); };
ACT.printReport = () => { addLog('export', {scope:'print'}); save(); safePrint(); };

/* ---------- Assessments (instructor): simple pre/post builder ---------- */
const OPENS = ['courseStart','lastDay','manual'];
function assessmentsTab(c){
  if (V.ab && V.ab.courseId===c.id && V.ab.kind==='assessment') return assessmentEditor(c);
  const mine = can('content', c.id);
  const cardFor = type => { const a = curAssessment(c.id, type), qs = questionsOf(a), locked = isLocked(a), started = a ? attemptsOf(a.id).length : 0;
    const status = !a ? badge('', t('ct.not_started')) : a.status==='ready' ? badge('b-ok', t('published')) : badge('b-info', t('draft'));
    const nm = t(type==='pre'?'preAssessment':'postAssessment');
    return `<div class="card card-b"><div class="row between"><h2>${nm}</h2>${status}</div>
    <p class="small muted" style="margin:6px 0 10px">${t(type==='pre'?'preExplain':'postExplain')}</p>
    ${a ? `<div class="meta" style="margin-bottom:10px"><span>${icon('list',13)}${t('nQuestions',{n:qs.length})}${a.sameAsPre?' · '+t('sameAsPreShort'):''}</span><span>${icon('clock',13)}${t('timeLimitN',{n:a.timeLimit})}</span><span>${t('attemptsN',{n:started})}</span></div>` : ''}
    ${locked ? note(t('lockedNote',{n:started}), 'warn', 'lock') : ''}
    <div class="row" style="margin-top:10px">${mine ? (a ? (locked ? `<button class="btn btn-sm" data-action="abNewVersion" data-aid="${a.id}">${t('newVersion')}</button>` : `<button class="btn btn-sm btn-primary" data-action="abEdit" data-aid="${a.id}">${icon('edit',14)}${a.status==='ready'?t('edit'):t('continueEditing')}</button>`) : `<button class="btn btn-primary" data-action="abCreate" data-cid="${c.id}" data-k="${type}">${icon('plus',15)}${t(type==='pre'?'createPre':'createPost')}</button>`) : ''}
      ${mine && !locked ? `<button class="btn btn-sm" data-action="aiOpen" data-cid="${c.id}" data-k="${type}">${icon('upload',14)}${t('ai.action')}</button>` : ''}
      ${a && qs.length ? `<button class="btn btn-sm" data-action="abPreview" data-aid="${a.id}">${icon('eye',14)}${t('previewAsParticipant')}</button>`:''}${a && a.opens==='manual' && mine && a.status==='ready' ? `<button class="btn btn-sm" data-action="abOpenNow" data-aid="${a.id}">${a.openNow?t('closeNow'):t('openNow')}</button>`:''}</div></div>`; };
  const anyAttempts = S.attempts.some(x=>x.courseId===c.id && x.completed);
  return `${note(t('impactNotTest'), '', 'info')}<div class="grid g-2" style="margin-top:14px">${cardFor('pre')}${cardFor('post')}</div>${anyAttempts && V.cw.cohort ? `<div style="margin-top:16px">${impactPanel(c, V.cw.cohort)}</div>` : ''}`;
}
const blankQ = (kind='mcq', obj) => ({id:null, kind, obj, text:'', options: kind==='tf' ? [t('true',null,true), t('false',null,true)] : ['','','',''], correct:0});
const newAssessment = (c, type) => ({id:uid('as'), courseId:c.id, type, version:1, status:'draft', timeLimit:10, opens: type==='pre'?'courseStart':'lastDay', closes:'afterEnd7', shuffle:true, sameAsPre: type==='post' && !!curAssessment(c.id,'pre'), openNow:false, questions:[], updatedAt:Date.now(), superseded:false});
ACT.abCreate = el => { const c = course(el.dataset.cid), type = el.dataset.k; if (!can('content', c.id)) return toast(t('ai.denied'),'bad');
  const a = newAssessment(c, type);
  S.assessments.push(a); addLog('assessment_save', {course:c.id, kind:type}); save(); openBuilder(a); toast(t('assessmentCreated')); };
function openBuilder(a, noRender){ V.ab = {courseId:a.courseId, aid:a.id, kind:'assessment', draft: JSON.parse(JSON.stringify(a)), q: blankQ('mcq', course(a.courseId).objectives[0]?.id)}; if (!noRender) render(); }
ACT.abEdit = el => { const a = byId(S.assessments, el.dataset.aid); if (!can('content', a.courseId)) return toast(t('ai.denied'),'bad'); if (isLocked(a)) return toast(t('lockedToast'),'warn'); openBuilder(a); };
ACT.abNewVersion = el => { const a = byId(S.assessments, el.dataset.aid); if (!can('content', a.courseId)) return toast(t('ai.denied'),'bad');
  confirmModal(t('newVersion'), t('newVersionConfirm',{v:a.version+1}), t('newVersion'), ()=>{ const n = JSON.parse(JSON.stringify(a)); n.id = uid('as'); n.version = a.version+1; n.status = 'draft'; n.updatedAt = Date.now(); if (n.type==='post' && n.sameAsPre){ n.sameAsPre = false; n.questions = JSON.parse(JSON.stringify(questionsOf(a))); }
    a.superseded = true; S.assessments.push(n); addLog('assessment_version', {course:a.courseId, kind:a.type, v:n.version}); save(); openBuilder(n); toast(t('versionCreated',{v:n.version})); }); };
ACT.abOpenNow = el => { const a = byId(S.assessments, el.dataset.aid); a.openNow = !a.openNow; addLog('assessment_save', {course:a.courseId, kind:a.type}); save(); render(); toast(a.openNow?t('openedNow'):t('closedNow')); };
ACT.editQuiz = el => { const a = byId(S.activities, el.dataset.aid); V.ab = {courseId:a.courseId, aid:a.id, kind:'quiz', draft:{questions: JSON.parse(JSON.stringify(a.questions||[])), type:'quiz'}, q: blankQ('mcq', course(a.courseId).objectives[0]?.id)}; go('course', a.courseId, {tab:'activities'}); };

function assessmentEditor(c){
  const A = V.ab, d = A.draft, quiz = A.kind==='quiz', post = !quiz && d.type==='post', same = post && d.sameAsPre, qs = d.questions || [], Q = A.q;
  const objName = id => esc(L(c.objectives.find(o=>o.id===id)) || '—');
  const list = qs.map((q,i)=>`<li class="item-row"><span class="badge b-navy nodot">${i+1}</span><div class="grow"><div class="small cell-main" dir="auto">${LE(q.text)||'<span class="muted">—</span>'}</div><div class="xs muted">${t('qk.'+q.kind)} · ${q.kind==='short' ? t('ai.notGraded') : `${t('correctAnswer')}: ${LE(q.options[q.correct])||'—'}`}${c.objectives.length?` · ${t('objectiveTag')}: ${objName(q.obj)}`:''}</div></div>
    <div class="row" style="flex-wrap:nowrap"><button class="btn btn-sm" data-action="abQEdit" data-qid="${q.id}">${t('edit')}</button><button class="btn btn-sm btn-ghost" data-action="abMove" data-qid="${q.id}" data-k="-1" ${i===0?'disabled':''} aria-label="${esc(t('moveUp'))}">↑</button><button class="btn btn-sm btn-ghost" data-action="abMove" data-qid="${q.id}" data-k="1" ${i===qs.length-1?'disabled':''} aria-label="${esc(t('moveDown'))}">↓</button><button class="btn btn-sm btn-ghost" data-action="abDel" data-qid="${q.id}" aria-label="${esc(t('deleteQuestion'))}">${icon('x',14)}</button></div></li>`).join('');
  const editing = Q.id && qs.some(x=>x.id===Q.id), n = editing ? qs.findIndex(x=>x.id===Q.id)+1 : qs.length+1;
  const panel = `<form id="abQForm" class="qe" data-submit="abQSave" novalidate><div class="qe-h"><h3>${editing?t('editQuestionN',{n}):t('addQuestionN',{n})}</h3>
      <div class="row" role="radiogroup" aria-label="${esc(t('questionType'))}">${(quiz?['mcq','tf']:['mcq','tf','short']).map(k=>`<label class="check small"><input type="radio" name="qkind" value="${k}" data-change="abQKind" ${Q.kind===k?'checked':''}>${t('qk.'+k)}</label>`).join('')}</div></div>
    <label class="small cell-main" for="f-qtext">${t('questionText')}</label><textarea class="textarea" id="f-qtext" name="qtext" rows="2" style="min-height:56px;margin:4px 0 10px">${esc(Q.text)}</textarea>
    ${Q.kind==='mcq' ? `<div class="small muted" style="margin-bottom:6px">${t('optionsHelp')}</div>${Q.options.map((o,j)=>`<div class="opt-row"><input type="radio" name="qcorrect" value="${j}" ${Q.correct===j?'checked':''} aria-label="${esc(t('markCorrect')+' '+(j+1))}"><input class="input q-opt" data-i="${j}" value="${esc(o)}" aria-label="${esc(t('optionN',{n:j+1},true))}" style="flex:1"></div>`).join('')}${Q.options.length<6?`<button type="button" class="btn btn-sm btn-ghost" data-action="abQAddOpt">${icon('plus',13)}${t('addOption')}</button>`:''}`
      : Q.kind==='short' ? `<p class="xs muted">${t('shortNote')}</p>`
      : `<div class="row"><span class="small">${t('correctAnswer')}:</span><label class="check"><input type="radio" name="qcorrect" value="0" ${Q.correct===0?'checked':''}>${t('true')}</label><label class="check"><input type="radio" name="qcorrect" value="1" ${Q.correct===1?'checked':''}>${t('false')}</label></div>`}
    ${c.objectives.length ? `<div class="field" style="margin-top:10px"><label for="f-qobj">${t('linkObjective')}</label><select class="select" id="f-qobj" name="qobj">${c.objectives.map(o=>opt(o.id, esc(L(o)), Q.obj)).join('')}</select></div>` : ''}
    <div id="abq-err"></div><div class="row"><button type="submit" class="btn btn-primary">${icon(editing?'check':'plus',14)}${editing?t('saveQuestion'):t('addQuestion')}</button>${editing?`<button type="button" class="btn" data-action="abQCancel">${t('cancel')}</button>`:''}</div></form>`;
  const settings = quiz ? '' : `<details class="explain" style="margin-top:14px"><summary>${t('settingsOptional')}</summary><div class="form-grid" style="margin-top:10px">${field('ab-time', t('timeLimitMin'), `<input class="input" id="f-ab-time" type="number" min="1" max="120" value="${d.timeLimit}">`)}
    ${field('ab-opens', t('opens'), `<select class="select" id="f-ab-opens">${OPENS.map(k=>opt(k, t('op.'+k), d.opens)).join('')}</select>`)}
    <div class="field"><span class="lbl">${t('order')}</span><label class="check"><input type="checkbox" id="f-ab-shuffle" ${d.shuffle?'checked':''}>${t('shuffleOpt')}</label></div></div></details>`;
  const title = quiz ? t('editQuizTitle',{a:L(byId(S.activities,A.aid).title)}) : t(d.type==='pre'?'preAssessment':'postAssessment') + (d.version>1?` · v${d.version}`:'');
  const shown = same ? questionsOf(curAssessment(c.id,'pre')) : qs, pts = shown.filter(gradable).length;
  const imp = !quiz && A.imported ? `<div class="note ok" id="ab-import-note" tabindex="-1" style="margin-bottom:12px">${icon('upload',16)}<div><b>${t('ai.inEditor', {n:A.imported.n, f:A.imported.file})}</b><div class="xs">${t('ai.inEditorHelp')}</div></div></div>` : '';
  const tools = quiz ? '' : `<div class="row between" style="margin-bottom:12px"><span class="small muted">${t('nQuestions',{n:shown.length})} · ${t('ai.nPoints',{n:pts})}</span>${can('content', c.id) ? `<button class="btn btn-sm" data-action="aiOpen" data-cid="${c.id}" data-k="${d.type}" data-fixed="1">${icon('upload',14)}${t('ai.action')}</button>` : ''}</div>`;
  const body = same ? note(t('usingPreBank',{n:questionsOf(curAssessment(c.id,'pre')).length}), 'ok', 'checkCircle')
    : `${qs.length ? `<ul class="list" style="margin-bottom:14px">${list}</ul>` : `<p class="small muted" style="margin-bottom:12px">${t('noQuestionsYet')}</p>`}${panel}`;
  return `<div class="card card-b"><div class="section-label"><h2>${title}</h2>${badge(d.status==='ready'?'b-ok':'b-info', d.status==='ready'?t('published'):t('draft'))}</div>
    <p class="small muted" style="margin-bottom:14px">${quiz ? t('quizBuilderIntro') : t(d.type==='pre'?'preExplain':'postExplain')}</p>
    ${post ? `<label class="check" style="margin-bottom:12px"><input type="checkbox" id="f-ab-same" data-change="abSame" ${same?'checked':''}>${t('sameAsPreOpt')}</label>` : ''}
    ${imp}${tools}<div id="ab-err"></div>${body}${settings}<div class="divider"></div>
    <div class="row between"><button class="btn" data-action="abCancel">${t('backToList')}</button><div class="row"><button class="btn" data-action="abPreview" data-k="draft">${icon('eye',14)}${t('preview')}</button>${quiz?'':`<button class="btn" data-action="abSave" data-k="draft">${t('saveDraft')}</button>`}<button class="btn btn-primary" data-action="abSave" data-k="ready">${icon('check',14)}${quiz?t('saveQuestions'):t('publish')}</button></div></div></div>`;
}
/** Read the question panel + settings back into state (so re-renders keep typed text). */
function abCollect(){
  const A = V.ab; if (!A) return; const d = A.draft, g = id => $('#f-'+id);
  if (g('ab-time')){ d.timeLimit = clamp(Number(g('ab-time').value)||10,1,120); d.opens = g('ab-opens').value; d.shuffle = g('ab-shuffle').checked; }
  if (g('ab-same')) d.sameAsPre = g('ab-same').checked;
  const f = $('#abQForm'); if (!f) return; const Q = A.q;
  Q.text = f.qtext.value; if (f.qobj) Q.obj = f.qobj.value;
  if (Q.kind==='mcq') $$('.q-opt', f).forEach(o=>{ Q.options[Number(o.dataset.i)] = o.value; });
  const c = f.querySelector('input[name="qcorrect"]:checked'); Q.correct = c ? Number(c.value) : null;
}
CHG.abQKind = el => { abCollect(); const Q = V.ab.q; Q.kind = el.value; if (Q.kind==='short'){ Q.options = []; Q.correct = null; } else if (Q.kind==='tf'){ Q.options = [t('true',null,true), t('false',null,true)]; Q.correct = 0; } else if (Q.options.length<3 || Q.options[0]===t('true',null,true)){ Q.options = ['','','','']; Q.correct = 0; } render(); $('#f-qtext')?.focus(); };
ACT.abQAddOpt = () => { abCollect(); V.ab.q.options.push(''); render(); const o = $$('.q-opt').pop(); o && o.focus(); };
ACT.abQEdit = el => { abCollect(); const q = V.ab.draft.questions.find(x=>x.id===el.dataset.qid); V.ab.q = {id:q.id, kind:['tf','short'].includes(q.kind)?q.kind:'mcq', obj:q.obj, text:L(q.text), options:q.options.map(o=>L(o)), correct:q.correct}; render(); const f = $('#f-qtext'); if (f){ f.focus(); f.scrollIntoView({block:'center'}); } };
ACT.abQCancel = () => { V.ab.q = blankQ('mcq', course(V.ab.courseId).objectives[0]?.id); render(); };
SUB.abQSave = () => { abCollect(); const A = V.ab, Q = A.q, errs = [];
  const opts = Q.kind==='mcq' ? Q.options.map((o,j)=>({o:o.trim(), j})).filter(x=>x.o) : Q.options.map((o,j)=>({o, j}));
  if (!Q.text.trim()) errs.push(t('vErrTextOne')); if (Q.kind==='mcq' && opts.length<2) errs.push(t('vErrOptionsOne'));
  if (Q.kind!=='short' && (Q.correct==null || !opts.some(x=>x.j===Q.correct))) errs.push(t('vErrCorrectOne'));
  if (errs.length){ $('#abq-err').innerHTML = note(errs.join('<br>'), 'bad', 'alert') + '<div style="height:10px"></div>'; return; }
  const other = LANG==='ar' ? 'en' : 'ar', ex = Q.id && A.draft.questions.find(x=>x.id===Q.id);
  const mkT = (txt, old) => Object.assign({}, old||{}, {[LANG]:txt}, (old && old[other]) ? {} : {[other]:txt});
  const q = {id: ex ? ex.id : 'q'+uid('').slice(-6), kind:Q.kind, obj:Q.obj || course(A.courseId).objectives[0]?.id || 'O1', required:true, text: mkT(Q.text.trim(), ex && ex.text),
    options: Q.kind==='tf' ? [T('True','صحيح'), T('False','خطأ')] : Q.kind==='short' ? [] : opts.map((x,i)=>mkT(x.o, ex && ex.options[x.j])), correct: Q.kind==='tf' ? Q.correct : Q.kind==='short' ? null : opts.findIndex(x=>x.j===Q.correct)};
  if (ex) Object.assign(ex, q); else A.draft.questions.push(q);
  A.q = blankQ(Q.kind, Q.obj); render(); toast(ex ? t('questionSaved') : t('questionAdded',{n:A.draft.questions.length})); $('#f-qtext')?.focus(); };
CHG.abSame = () => { abCollect(); render(); };
ACT.abMove = el => { abCollect(); const qs = V.ab.draft.questions, i = qs.findIndex(q=>q.id===el.dataset.qid), j = i+Number(el.dataset.k); if (j<0||j>=qs.length) return; [qs[i],qs[j]] = [qs[j],qs[i]]; render(); };
ACT.abDel = el => { abCollect(); V.ab.draft.questions = V.ab.draft.questions.filter(q=>q.id!==el.dataset.qid); if (V.ab.q.id===el.dataset.qid) V.ab.q = blankQ('mcq', course(V.ab.courseId).objectives[0]?.id); render(); toast(t('questionRemoved'),'info'); };
ACT.abCancel = () => { if (V.ab && V.ab.imported) return confirmModal(t('ai.discardT'), t('ai.discardQ', {n:V.ab.imported.n}), t('ai.discard'), ()=>{ V.ab = null; render(); }, true); V.ab = null; render(); };
function abValidate(d){
  const errs = [];
  if (d.type==='post' && d.sameAsPre){ const pre = curAssessment(V.ab.courseId,'pre'); if (!pre || !pre.questions.length) errs.push(t('vErrNoPre')); return errs; }
  if (!d.questions.length) errs.push(t('vErrNoQuestions'));
  return errs;
}
ACT.abSave = el => { abCollect(); const A = V.ab, d = A.draft, ready = el.dataset.k==='ready';
  if (A.q && A.q.text.trim() && !(d.type==='post' && d.sameAsPre)){ $('#ab-err').innerHTML = note(t('unsavedQuestion'), 'warn', 'alert') + '<div style="height:12px"></div>'; $('#ab-err').scrollIntoView({block:'center'}); return; }
  if (ready){ const errs = abValidate(d); if (errs.length){ $('#ab-err').innerHTML = note(`<b>${t('fixBeforeReady')}</b><ul style="margin:6px 0 0;padding-inline-start:18px">${errs.map(e=>`<li>${e}</li>`).join('')}</ul>`, 'bad', 'alert') + '<div style="height:12px"></div>'; $('#ab-err').scrollIntoView({block:'center'}); return; } }
  if (A.kind==='quiz'){ const a = byId(S.activities, A.aid); a.questions = d.questions; addLog('activity_save', {course:a.courseId, aid:a.id}); V.ab = null; save(); render(); return toast(t('quizSaved')); }
  if (!can('content', A.courseId)) return toast(t('ai.denied'),'bad');
  if (!A.aid){ const cur = curAssessment(A.courseId, A.pending.type); if (cur){ $('#ab-err').innerHTML = note(t('ai.createdMeanwhile'), 'bad', 'alert'); return; } S.assessments.push(A.pending); A.aid = A.pending.id; }
  const a = byId(S.assessments, A.aid); if (isLocked(a)){ V.ab = null; render(); return toast(t('lockedToast'),'warn'); }
  if (A.imported && !d.sameAsPre){ (a.imports = a.imports || []).push(A.imported); addLog('assessment_import', {course:a.courseId, kind:a.type, n:A.imported.n}); }
  Object.assign(a, {timeLimit:d.timeLimit, opens:d.opens, shuffle:d.shuffle, sameAsPre:!!d.sameAsPre, questions: d.sameAsPre ? [] : d.questions, status: ready ? 'ready' : 'draft', updatedAt:Date.now()});
  addLog(ready?'assessment_ready':'assessment_save', {course:a.courseId, kind:a.type}); V.ab = null; save(); render(); toast(ready ? t('assessmentPublished') : t('draftSaved')); };

/* ---------- Assessment runner (participant) and preview (instructor) ---------- */
function shuffleArr(a){ const x = a.slice(); for (let i=x.length-1;i>0;i--){ const j = Math.floor(Math.random()*(i+1)); [x[i],x[j]] = [x[j],x[i]]; } return x; }
ACT.abPreview = el => { let qs, limit, shuffle, title;
  if (el.dataset.k==='draft'){ abCollect(); const d = V.ab.draft; qs = (d.type==='post'&&d.sameAsPre) ? questionsOf(curAssessment(V.ab.courseId,'pre')) : d.questions; limit = d.timeLimit||10; shuffle = d.shuffle; title = V.ab.kind==='quiz' ? t('quiz') : t(d.type==='pre'?'preAssessment':'postAssessment'); }
  else { const a = byId(S.assessments, el.dataset.aid); qs = questionsOf(a); limit = a.timeLimit; shuffle = a.shuffle; title = t(a.type==='pre'?'preAssessment':'postAssessment'); }
  if (!qs.length) return toast(t('noQuestions'),'warn');
  startRunner({preview:true, qs, limit, shuffle, title, kind:'assessment', type:'preview'}); };
ACT.startAssessment = el => { const a = byId(S.assessments, el.dataset.aid), paid = myPid(a.courseId), ch = cohortOf(paid);
  if (getAttempt(paid, a.courseId, a.type)) return toast(t('alreadySubmitted'),'warn');
  let at = S.attempts.find(x=>x.assessmentId===a.id && x.participantId===paid && !x.completed);
  if (!at){ at = {id:uid('at'), assessmentId:a.id, courseId:a.courseId, cohortId:ch.id, participantId:paid, type:a.type, items:{}, score:0, max:0, started:Date.now(), completed:null}; S.attempts.push(at); save(); }
  startRunner({qs:questionsOf(a), limit:a.timeLimit, shuffle:a.shuffle, title:t(a.type==='pre'?'preAssessment':'postAssessment'), kind:'assessment', type:a.type, attemptId:at.id, aid:a.id, paid}); };
ACT.startQuiz = el => { const a = byId(S.activities, el.dataset.aid), paid = myPid(a.courseId); if (S.submissions[a.id+':'+paid]) return toast(t('alreadySubmitted'),'warn');
  startRunner({qs:a.questions, limit:10, shuffle:false, title:L(a.title), kind:'quiz', aid:a.id, noConfidence:true, paid}); };
function startRunner(o){
  const order = o.shuffle ? shuffleArr(o.qs.map(q=>q.id)) : o.qs.map(q=>q.id);
  V.attempt = Object.assign({order, opts:Object.fromEntries(o.qs.map(q=>[q.id, q.kind==='mcq' && o.shuffle ? shuffleArr(q.options.map((_,i)=>i)) : q.options.map((_,i)=>i)])), idx:0, ans:{}, started:Date.now()}, o);
  openModal({title: o.preview ? `${o.title} — ${t('previewMode')}` : o.title, size:'lg', body:runnerBody(), footer:runnerFooter(), onClose:()=>{ if (V.attempt && !V.attempt.done && !V.attempt.preview) toast(t('attemptPaused'),'info'); V.attempt = null; }});
}
const fmtSecs = s => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
function runnerBody(){
  const A = V.attempt, q = A.qs.find(x=>x.id===A.order[A.idx]), a = A.ans[q.id] || {}, left = Math.max(0, A.limit*60 - Math.floor((Date.now()-A.started)/1000));
  const intro = A.idx===0 ? `<div style="margin-bottom:12px">${note(A.preview ? t('previewIntro') : A.kind==='quiz' ? t('quizIntro') : A.type==='pre' ? t('preIntro') : t('postIntro'), A.preview?'sim':'', 'info')}</div>` : '';
  const opts = q.kind==='short' ? `<textarea class="textarea" data-change="ansText" data-k="${q.id}" rows="4" aria-label="${esc(t('yourAnswer'))}">${esc(a.text||'')}</textarea><p class="xs muted">${t('shortNotGraded')}</p>`
    : A.opts[q.id].map(i=>`<label class="opt"><input type="radio" name="ans" value="${i}" ${a.choice===i?'checked':''} data-change="ansPick" data-k="${q.id}"><span dir="auto">${LE(q.options[i])}</span></label>`).join('');
  return `${intro}<div class="q-head"><span class="small muted">${t('questionNofM',{n:A.idx+1, m:A.order.length})}${q.required===false?' · '+t('optional'):''}</span><span class="timer js-timer ${left<60?'low':''}" role="timer" aria-label="${esc(t('timeLeft'))}">${fmtSecs(left)}</span></div>
  <div class="qprog" aria-hidden="true"><span style="width:${A.idx/A.order.length*100}%"></span></div>
  <fieldset><legend class="q-text" dir="auto">${LE(q.text)}</legend>${opts}</fieldset>
  ${gradable(q) && !A.noConfidence ? `<fieldset><legend>${t('confidenceQ')}</legend><div class="conf">${['sure','unsure','guess'].map(c=>`<label><input type="radio" name="conf" value="${c}" ${a.conf===c?'checked':''} data-change="confPick" data-k="${q.id}">${t('conf.'+c)}</label>`).join('')}</div></fieldset>` : ''}
  <p class="err small" id="e-attempt" role="alert" style="color:var(--bad);font-weight:600"></p>${A.kind==='assessment'?`<p class="xs muted">${t('noAnswerKey')}</p>`:''}`;
}
function runnerFooter(){ const A = V.attempt, last = A.idx===A.order.length-1; return `<button class="btn" data-action="runNav" data-k="-1" ${A.idx===0?'disabled':''}>${t('back')}</button><button class="btn btn-primary" data-action="runNav" data-k="1">${last ? (A.preview?t('finishPreview'):t('submit')) : t('next')}</button>`; }
CHG.ansPick = el => { (V.attempt.ans[el.dataset.k] = V.attempt.ans[el.dataset.k] || {}).choice = Number(el.value); };
CHG.confPick = el => { (V.attempt.ans[el.dataset.k] = V.attempt.ans[el.dataset.k] || {}).conf = el.value; };
CHG.ansText = el => { (V.attempt.ans[el.dataset.k] = V.attempt.ans[el.dataset.k] || {}).text = el.value; };
INP.ansText = CHG.ansText;
ACT.runNav = el => { const A = V.attempt; if (!A) return; const dir = Number(el.dataset.k), q = A.qs.find(x=>x.id===A.order[A.idx]), a = A.ans[q.id] || {};
  if (dir>0 && q.required!==false){ if (q.kind==='short' ? !(a.text||'').trim() : a.choice==null) return $('#e-attempt').textContent = t('errAnswer'); if (gradable(q) && !A.noConfidence && !a.conf) return $('#e-attempt').textContent = t('errConfidence'); }
  if (dir>0 && A.idx===A.order.length-1) return finishRunner(false);
  A.idx = clamp(A.idx+dir, 0, A.order.length-1); setModal(runnerBody(), runnerFooter()); const f = topModal().querySelector('.modal-b input, .modal-b textarea'); f && f.focus(); };
function finishRunner(timeout){
  const A = V.attempt; if (!A || A.done) return; A.done = true;
  if (A.preview){ setModal(`<div class="result r-dup"><div class="ring">${icon('eye',34)}</div><h2>${t('previewDone')}</h2><p class="small muted">${t('previewDoneMsg')}</p></div>`, `<button class="btn btn-primary" data-action="closeModal">${t('close')}</button>`); V.attempt = null; return; }
  const items = {}; A.qs.forEach(q=>{ const a = A.ans[q.id] || {}; items[q.id] = {answer: q.kind==='short' ? (a.text||'') : (a.choice ?? null), correct: gradable(q) && a.choice===q.correct, gradable: gradable(q), obj:q.obj, conf:a.conf||null}; });
  const max = A.qs.filter(gradable).length, score = Object.values(items).filter(x=>x.correct).length, paid = A.paid || me().participantId;
  if (A.kind==='quiz'){ const act = byId(S.activities, A.aid); S.submissions[act.id+':'+paid] = {at:Date.now(), score, max, reviewed:true}; delete S.drafts[act.id+':'+paid]; addLog('submission', {course:act.courseId, pid:paid, aid:act.id}); save();
    setModal(`<div class="result r-ok"><div class="ring">${icon('checkCircle',36)}</div><h2>${t('quizScore',{a:score,b:max})}</h2><p class="small muted">${t('quizDone')}</p></div>`, `<button class="btn btn-primary" data-action="closeModal">${t('close')}</button>`); V.attempt = null; render(); return; }
  const at = S.attempts.find(x=>x.id===A.attemptId); Object.assign(at, {items, score, max, completed:Date.now(), timedOut:timeout, order:A.order});
  addLog('assessment', {course:at.courseId, pid:paid, kind:at.type}); save();
  const c = course(at.courseId), pre = getAttempt(paid, c.id, 'pre'), post = getAttempt(paid, c.id, 'post');
  const body = at.type==='pre' ? `<div class="result r-ok"><div class="ring">${icon('checkCircle',36)}</div><h2>${t('preDone')}</h2><p class="small muted" style="max-width:52ch;margin:6px auto 0">${t('preDoneMsg')}</p></div>${timeout?note(t('timedOut'),'warn','clock'):''}`
    : `<div class="result r-ok"><div class="ring">${icon('trend',36)}</div><h2>${t('postDone')}</h2></div>${timeout?note(t('timedOut'),'warn','clock'):''}${pre ? comparisonHtml(c, pre, post) : note(t('noPreForCompare'),'warn')}`;
  setModal(body, `<button class="btn btn-primary" data-action="closeModal">${t('close')}</button>`); V.attempt = null; render(); toast(t('assessmentSaved'));
}
function comparisonHtml(c, pre, post){
  const a = pctOf(pre), b = pctOf(post), gain = b-a, g = a<100 ? gain/(100-a) : null;
  const objs = c.objectives.map(o=>{ const f = at => { const v = Object.values(at.items).filter(x=>x.obj===o.id && x.gradable); return v.length ? v.filter(x=>x.correct).length/v.length*100 : null; }; const x = f(pre), y = f(post); if (x==null||y==null) return '';
    return `<div style="margin:10px 0"><div class="small" style="font-weight:600;margin-bottom:4px">${esc(L(o))}</div>${hbar(t('pre'),[{v:x,c:'var(--c-pre)',label:t('pre')}],pctTxt(x),t('pre'))}${hbar(t('post'),[{v:y,c:'var(--c-post)',label:t('post')}],pctTxt(y),t('post'))}</div>`; }).join('');
  return `<div class="grid g-kpi" style="gap:10px">${kpi(t('pre'), pctTxt(a))}${kpi(t('post'), pctTxt(b))}${kpi(t('rawGain'), `${gain>=0?'+':''}${Math.round(gain)} <small>${t('pts')}</small>`)}${kpi(t('normGain'), g==null?`<span class="tip" title="${esc(t('gUndefined'))}">—</span>`:n2(g))}</div>${objs?`<h3 style="margin-top:16px">${t('byObjective')}</h3>${objs}`:''}<p class="xs muted">${t('ownResultsNote')}</p>`;
}
function impactPanel(c, chid){
  const st = impactStats([chid]), objs = objectiveStats(c.id, st), client_ = role()==='client', n = partsOf(chid).length;
  const explain = `<details class="explain"><summary>${t('whatIsMatched')}</summary><div>${t('matchedExplain')}</div></details>`;
  if (client_ && suppressGroup(st)) return card(t('groupImpact'), empty(t('suppressedTitle'), t('suppressedMsg',{n:st.n, m:MIN_GROUP}), 'shield') + explain);
  if (!st.n) return card(t('groupImpact'), empty(t('noPairsTitle'), t('noPairsMsg',{a:partsOf(chid).filter(x=>getAttempt(x.id,c.id,'pre')).length, b:n}), 'trend') + explain);
  const kp = `<div class="grid g-kpi">${kpi(t('matchedPairs'), `${st.n}<small> / ${n}</small>`, t('matchedSub',{u:st.unmatched.length}), 'users', true)}${kpi(t('meanPre'), pctTxt(st.meanPre), t('groupMean'), 'chart')}${kpi(t('meanPost'), pctTxt(st.meanPost), t('groupMean'), 'chart')}${kpi(t('normGain'), st.gClass==null?`<span class="tip" title="${esc(t('gUndefined'))}">—</span>`:n2(st.gClass), `${t('rawGain')}: ${st.raw>=0?'+':''}${Math.round(st.raw)} ${t('pts')}`, 'trend')}</div>`;
  const objHtml = objs.map(o=>`<div style="margin:10px 0 14px"><div class="row between"><span class="small" style="font-weight:600">${esc(L(o.o))}</span><span class="badge b-teal nodot">${o.post-o.pre>=0?'+':''}${Math.round(o.post-o.pre)} ${t('pts')}</span></div>${hbar(t('pre'),[{v:o.pre,c:'var(--c-pre)',label:t('pre')}],pctTxt(o.pre),t('pre'))}${hbar(t('post'),[{v:o.post,c:'var(--c-post)',label:t('post')}],pctTxt(o.post),t('post'))}</div>`).join('') + legend([['var(--c-pre)',t('pre')],['var(--c-post)',t('post')]]);
  const showInd = !client_ || S.settings.clientIndividual;
  const ind = showInd ? card(t('participantResults'), `<div class="table-wrap"><table class="tbl"><thead><tr><th>${t('participant')}</th><th class="num">${t('pre')}</th><th class="num">${t('post')}</th><th class="num">${t('gainPts')}</th></tr></thead><tbody>${st.pairs.slice().sort((a,b)=>b.gain-a.gain).map(x=>`<tr><td class="cell-main small">${LE(x.p.name)}</td><td class="num">${pctTxt(x.preP)}</td><td class="num">${pctTxt(x.postP)}</td><td class="num">${x.gain>=0?'+':''}${Math.round(x.gain)}</td></tr>`).join('')}</tbody></table></div>`, {flush:true, right: client_ ? badge('b-warn', t('clientIndividualOn'), false) : `<span class="hint">${t('staffOnly')}</span>`}) : '';
  return `<div class="stack">${kp}${explain}${card(t('objectiveGrowth'), objHtml + `<p class="chart-foot">${t('matchedOnlyNote')}</p>`)}${ind}</div>`;
}

/* ---------- Activities (instructor content) ---------- */
const SUBST2 = ['pending','progress','submitted','overdue'];
function activitiesTab(c){
  if (V.ab && V.ab.courseId===c.id && V.ab.kind==='quiz') return assessmentEditor(c);
  const mine = can('content', c.id), acts = S.activities.filter(a=>a.courseId===c.id && a.status!=='archived').sort((a,b)=>a.dueOffset-b.dueOffset), ps = courseParticipants(c.id);
  const rows = acts.map(a=>{ const cnt = {pending:0, progress:0, submitted:0, overdue:0}; ps.forEach(x=>{ const st = subState(a, x.id); cnt[st==='completed'?'submitted':st]++; });
    const toReview = ps.filter(x=>subState(a,x.id)==='submitted').length, s = a.sessionId && sess(a.sessionId);
    return `<tr><td><div class="cell-main small">${LE(a.title)}</div><div class="cell-sub">${t('at.'+a.type)}${s?` · ${t('dayN',{n:dayIndex(s)})} — ${LE(s.title)}`:''}</div></td><td class="small nowrap">${esc(dayLabel(a.dueOffset))} <span class="ltr">${a.dueTime}</span></td><td>${a.status==='published'?badge('b-ok',t('published')):badge('',t('draft'))}</td>
    <td style="min-width:150px">${a.status==='published' && ps.length ? `${progress(cnt.submitted/ps.length*100, t('submitted'))}<div class="cell-sub">${SUBST2.filter(k=>cnt[k]).map(k=>`${t('as.'+k)}: ${cnt[k]}`).join(' · ')}${toReview?` · <span class="conflict">${t('toReviewN',{n:toReview})}</span>`:''}</div>` : '—'}</td>
    <td class="nowrap">${mine?`<button class="btn btn-sm" data-action="editActivity" data-aid="${a.id}">${t('edit')}</button>${a.type==='quiz'?` <button class="btn btn-sm" data-action="editQuiz" data-aid="${a.id}">${t('questions')} (${(a.questions||[]).length})</button>`:''}`:''} ${a.status==='published'?`<button class="btn btn-sm btn-ghost" data-action="viewSubmissions" data-aid="${a.id}">${t('submissions')}</button>`:''}</td></tr>`; }).join('');
  return `<div class="section-label"><p class="small muted">${t('activitiesIntro2')}</p>${mine?`<button class="btn btn-primary" data-action="editActivity" data-cid="${c.id}">${icon('plus',16)}${t('addActivity')}</button>`:ownerTag('trainer')}</div>`
    + card('', acts.length ? `<div class="table-wrap"><table class="tbl"><thead><tr><th>${t('activity')}</th><th>${t('due')}</th><th>${t('status')}</th><th>${t('participantProgress')}</th><th><span class="sr-only">${t('actions')}</span></th></tr></thead><tbody>${rows}</tbody></table></div>` : empty(t('noActivities'), mine ? t('noActivitiesTrainer') : t('noActivitiesOther',{n:courseTeamText(c.id)}), 'clipboard', mine?`<button class="btn btn-primary" data-action="editActivity" data-cid="${c.id}">${t('addActivity')}</button>`:''), {flush:true});
}
ACT.editActivity = el => { const a = el.dataset.aid ? byId(S.activities, el.dataset.aid) : null, c = course(a ? a.courseId : el.dataset.cid), ss = courseSessions(c.id);
  const v = a || {title:bi(''), instructions:bi(''), type:'text', dueOffset: ss.length ? sOff(ss[ss.length-1]) : 7, dueTime:'23:59', sessionId:''};
  openModal({title: a ? t('editActivity') : t('addActivity'), size:'lg', body:`<form data-submit="saveActivity" data-cid="${c.id}" data-aid="${a?a.id:''}" novalidate>
    <p class="small muted" style="margin-bottom:12px">${t('course')}: <b>${LE(c.title)}</b></p>
    ${field('atitle', t('title')+' *', inp('atitle', L(v.title)))}
    ${field('ainstr', t('instructions')+' *', `<textarea class="textarea" id="f-ainstr" name="ainstr" rows="3">${esc(L(v.instructions))}</textarea>`)}
    <div class="form-grid">${field('atype', t('activityType'), selF('atype', ['text','file','quiz','reflection'].map(k=>[k, t('at.'+k)]), v.type), t('activityTypeHelp2'))}
    ${field('asess', t('relatedSession'), selF('asess', [['',t('noneOptional')]].concat(ss.map(s=>[s.id, `${t('dayN',{n:dayIndex(s)},true)} · ${LE(s.title)}`])), v.sessionId||''), t('optional'))}
    ${field('adate', t('dueDate'), inp('adate', isoOf(v.dueOffset), 'date'))}${field('atime', t('dueTime'), inp('atime', v.dueTime, 'time'))}</div></form>`,
  footer:`<button class="btn" data-action="closeModal">${t('cancel')}</button>${a?`<button class="btn btn-ghost" data-action="archiveActivity" data-aid="${a.id}">${t('archive')}</button>`:''}<button class="btn" data-action="submitActivityForm" data-k="draft">${t('saveDraft')}</button><button class="btn btn-primary" data-action="submitActivityForm" data-k="published">${t('publish')}</button>`}); };
ACT.submitActivityForm = el => { const f = topModal().querySelector('form'); f.dataset.status = el.dataset.k; runSubmit(f); };
SUB.saveActivity = form => { const f = Object.fromEntries(new FormData(form)), c = course(form.dataset.cid), errs = {}; let a = form.dataset.aid ? byId(S.activities, form.dataset.aid) : null;
  if (String(f.atitle).trim().length<3) errs.atitle = t('errTitle'); if (String(f.ainstr).trim().length<5) errs.ainstr = t('errInstructions'); if (!f.adate) errs.adate = t('errDate'); if (!formErrors(form, errs)) return;
  const status = form.dataset.status || 'draft';
  if (!a){ a = {id:uid('a'), courseId:c.id, cohortId:null, grouping:'individual', objectiveId:c.objectives[0]?.id, questions:[]}; S.activities.push(a); }
  Object.assign(a, {title: Object.assign({}, a.title||{}, {[LANG]:f.atitle.trim()}), instructions: Object.assign({}, a.instructions||{}, {[LANG]:f.ainstr.trim()}), type:f.atype, sessionId:f.asess||null, dueOffset:offOf(f.adate), dueTime:f.atime||'23:59', status});
  ['title','instructions'].forEach(k=>{ const o = LANG==='ar'?'en':'ar'; if (!a[k][o]) a[k][o] = a[k][LANG]; });
  if (a.type==='quiz' && status==='published' && !(a.questions||[]).length){ a.status = 'draft'; addLog('activity_save', {course:c.id, aid:a.id}); closeModal(); save(); toast(t('quizNeedsQuestions'),'warn'); V.ab = {courseId:c.id, aid:a.id, kind:'quiz', draft:{questions:[], type:'quiz'}, q: blankQ('mcq', c.objectives[0]?.id)}; render(); return; }
  addLog('activity_save', {course:c.id, aid:a.id}); closeModal(); save(); render(); toast(status==='published'?t('activityPublished'):t('draftSaved')); };
ACT.archiveActivity = el => { const a = byId(S.activities, el.dataset.aid); a.status = 'archived'; addLog('activity_save', {course:a.courseId, aid:a.id}); closeModal(); save(); render(); toast(t('archivedToast')); };
ACT.viewSubmissions = el => { const a = byId(S.activities, el.dataset.aid), mine = can('content', a.courseId);
  openModal({title:LE(a.title), size:'lg', body:`<div class="table-wrap"><table class="tbl"><thead><tr><th>${t('participant')}</th><th>${t('status')}</th><th>${t('submittedAtLbl')}</th><th>${t('response')}</th>${mine?'<th></th>':''}</tr></thead><tbody>${courseParticipants(a.courseId).map(x=>{ const s = S.submissions[a.id+':'+x.id], st = subState(a, x.id);
    return `<tr><td class="cell-main small">${LE(x.name)}</td><td>${subBadge(st)}</td><td class="small">${s?esc(fmtDT(s.at)):'—'}</td><td class="small">${s ? (a.type==='quiz' ? t('quizScore',{a:s.score,b:s.max}) : `${esc((s.text||'').slice(0,80))}${s.fileName?` <span class="ltr">📎 ${esc(s.fileName)}</span>`:''}`) : '—'}</td>${mine?`<td>${st==='submitted'?`<button class="btn btn-sm btn-teal" data-action="reviewSub" data-aid="${a.id}" data-pid="${x.id}">${t('markCompleted')}</button>`:''}</td>`:''}</tr>`; }).join('')}</tbody></table></div><p class="xs muted" style="margin-top:10px">${t('sampleSubmissions')}</p>`}); };
ACT.reviewSub = el => { const k = el.dataset.aid+':'+el.dataset.pid; S.submissions[k].reviewed = true; addLog('submission_review', {course:byId(S.activities,el.dataset.aid).courseId, aid:el.dataset.aid, pid:el.dataset.pid}); save(); closeModal(); ACT.viewSubmissions({dataset:{aid:el.dataset.aid}}); render(); toast(t('markedCompleted')); };

/* ---------- Materials (instructor uploads real files; preview/download the actual file) ---------- */
const matAccess = m => m.access || (m.allowDownload ? 'both' : 'view');
const matViewable = m => matAccess(m)!=='download';
const matDownloadable = m => matAccess(m)!=='view';
/** Who may open a material at all: staff of the course; enrolled participants once published; the client only when published and shared. */
function matReadable(m){ if (!m) return false; const r = role();
  if (r==='participant') return matState(m)==='available' && !!myEnrollments().find(x=>x.cohortId===m.cohortId);
  if (r==='client') return matState(m)==='available' && !!m.clientVisible && canSeeCourse(m.courseId);
  return canSeeCourse(m.courseId); }
function materialsTab(c){
  const mine = can('content', c.id), chid = V.cw.cohort; if (!chid) return card('', empty(t('noDays'), '', 'book'));
  if (role()==='client'){ const vis = materialsFor(chid).filter(m=>m.clientVisible && matState(m)==='available'); return `<p class="small muted" style="margin-bottom:10px">${t('clientMatIntro')}</p>` + (vis.length ? materialsByDay(chid, vis, 'client') : card('', empty(t('clientMatEmpty'), t('clientMatEmptyD'), 'book'))); }
  const ms = materialsFor(chid).filter(m=>m.state!=='archived'), arch = materialsFor(chid).filter(m=>m.state==='archived');
  const mc = materialCounts(c.id);
  const head = `<div class="row" style="gap:6px;margin-bottom:10px">${badge('b-ok', t('ms.available')+': '+mc.pub, false)}${badge('', t('ms.draft')+': '+mc.draft, false)}${mc.sched?badge('b-info', t('ms.scheduled')+': '+mc.sched, false):''}</div><div class="section-label"><p class="small muted">${t('materialsIntro2')}</p>${mine?`<button class="btn btn-primary" data-action="addMaterial" data-cid="${c.id}">${icon('upload',16)}${t('uploadMaterial')}</button>`:ownerTag('trainer')}</div>`;
  return head + materialsByDay(chid, ms, mine ? 'trainer' : 'staff') + (arch.length ? `<p class="small muted" style="margin-top:10px">${t('archivedMaterials',{n:arch.length})}</p>` : '') + `<div style="margin-top:12px">${note(t('fileStorageNote2'),'sim')}</div>`;
}
function materialsByDay(chid, ms, mode){
  if (!ms.length) return card('', empty(t('noMaterials'), mode==='trainer' ? t('noMaterialsTrainer') : mode==='participant' ? t('noMaterialsParticipant') : t('noMaterialsOther'), 'book', mode==='trainer'?`<button class="btn btn-primary" data-action="addMaterial" data-cid="${cohort(chid).courseId}">${icon('upload',15)}${t('uploadMaterial')}</button>`:''));
  const days = daysOfCohort(chid), sids = new Set(sessionsOfCohort(chid).map(s=>s.id)), general = ms.filter(m=>!m.sessionId || !sids.has(m.sessionId));
  const gen = general.length ? card(`<span class="day-h"><span class="chip">${icon('book',12)}</span>${t('generalMaterials')}</span>`, general.map(m=>materialRow(m, mode)).join('')) : '';
  return `<div class="stack">${gen}${days.map((d,i)=>{ const ss = sessionsOfCohort(chid).filter(s=>s.dayId===d.id), rows = ss.map(s=>({s, ms: ms.filter(m=>m.sessionId===s.id)})).filter(x=>x.ms.length || mode==='trainer'); if (!rows.length) return '';
    return card(`<span class="day-h"><span class="chip">${t('dayN',{n:i+1})}</span>${esc(fmtDay(d.dayOffset))}</span>`, rows.map(x=>`<div class="row between" style="margin:8px 0 2px"><h3 class="small muted">${LE(x.s.title)} · <span class="ltr">${x.s.start}</span></h3>${mode==='trainer'?`<button class="btn btn-sm btn-ghost" data-action="addMaterial" data-cid="${x.s.courseId}" data-sid="${x.s.id}">${icon('plus',13)}${t('addHere')}</button>`:''}</div>${x.ms.map(m=>materialRow(m, mode)).join('') || `<p class="xs muted">${t('noMaterialsSession')}</p>`}`).join('')); }).join('')}</div>`;
}
function materialRow(m, mode){
  const st = matState(m), staff = !['participant','client'].includes(mode), hasFile = !m.sample && m.type!=='link';
  const canOpen = staff || (st==='available' && (matViewable(m) || m.type==='link')), canDl = hasFile && (staff || (st==='available' && matDownloadable(m)));
  return `<div class="item-row"><span class="type-ico t-${m.type==='image'||m.type==='text'?'docx':m.type}" aria-hidden="true">${m.type==='video'?icon('play',16):m.type==='link'?icon('link',16):(m.type==='image'?'IMG':m.type==='text'?'TXT':m.type.toUpperCase())}</span>
  <div class="grow"><div class="cell-main">${LE(m.title)}</div><div class="row xs muted" style="margin-top:3px"><span>${t('type.'+m.type)}</span><span>·</span><span class="ltr">${esc(m.size||'—')}</span>${m.fileName?`<span>·</span><span class="ltr">${esc(m.fileName)}</span>`:''}${m.sample?`<span>·</span><span>${t('sampleRecordShort')}</span>`:''}${!m.sample && m.fileKey && !m.persisted?`<span>·</span><span class="conflict">${t('sessionOnly')}</span>`:''}</div></div>
  <div class="row" style="justify-content:flex-end">${staff ? matBadge(m) : ''}${m.type!=='link'?badge('b-navy', t('acc.'+matAccess(m)), false):''}
  ${canOpen && (staff || matViewable(m) || m.type==='link')?`<button class="btn btn-sm" data-action="previewMaterial" data-mid="${m.id}">${icon('eye',14)}${m.type==='link'?t('openLink'):t('viewOnline')}</button>`:(!staff && st!=='available')?`<span class="xs muted">${st==='scheduled'?t('scheduledHint'):st==='expired'?t('expiredHint'):''}</span>`:''}
  ${canDl?`<button class="btn btn-sm" data-action="downloadMaterial" data-mid="${m.id}">${icon('download',14)}${t('download')}</button>`:''}
  ${mode==='trainer' ? `${st==='draft'||st==='scheduled'?`<button class="btn btn-sm btn-teal" data-action="releaseMaterial" data-mid="${m.id}">${t('publishNow')}</button>`:''}<button class="btn btn-sm btn-ghost" data-action="editMaterial" data-mid="${m.id}">${t('edit')}</button>` : ''}</div></div>`;
}
const ACCEPT = '.pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.csv,.mp4,.webm,.mov,.png,.jpg,.jpeg,.txt';
let MAT_FILE = null;
ACT.addMaterial = el => { MAT_FILE = null; materialForm(null, course(el.dataset.cid), el.dataset.sid); };
ACT.editMaterial = el => { MAT_FILE = null; const m = byId(S.materials, el.dataset.mid); materialForm(m, course(m.courseId)); };
function materialForm(m, c, sid){
  const ch = ensureCohort(c.id), ss = activeSessions(ch.id), rel = m ? (m.state==='scheduled'?'schedule':m.state==='available'?'now':'draft') : 'draft';
  const cur = m ? (m.sessionId||'') : (sid || '');
  openModal({title: m ? t('editMaterial') : t('uploadMaterial'), size:'lg', body:`<form data-submit="saveMaterial" data-cid="${c.id}" data-mid="${m?m.id:''}" novalidate>
    <div class="file-drop" style="margin-bottom:14px"><div class="row" style="justify-content:center"><label class="btn btn-primary" for="f-mfile">${icon('upload',15)}${m&&m.fileName?t('replaceFile'):t('chooseFile')}</label><input id="f-mfile" name="mfile" type="file" accept="${ACCEPT}" class="sr-only" data-change="matFile"></div>
      <div id="mfileInfo" class="small" style="margin-top:8px">${m && m.fileName ? `${t('currentFile')}: <span class="ltr">${esc(m.fileName)}</span> (${esc(m.size)})` : t('supportedFormats2')}</div><span class="err small" id="e-mfile" style="color:var(--bad);font-weight:600"></span>
      <details class="explain" style="margin-top:8px;text-align:start" ${m&&m.type==='link'?'open':''}><summary>${t('orWebLink')}</summary><div style="margin-top:8px">${inp('murl', m?m.url:'', 'url','dir="ltr" placeholder="https://" aria-label="'+esc(t('externalUrl'))+'"')}<span class="err" id="e-murl"></span></div></details></div>
    ${field('mtitle', t('displayName')+' *', inp('mtitle', m?L(m.title):''))}
    ${field('msess', t('daySessionOpt'), selF('msess', [['',t('generalNoSession')]].concat(ss.map(s=>[s.id, `${t('dayN',{n:dayIndex(s)},true)} · ${esc(fmtDay(sOff(s)))} ${s.start} — ${LE(s.title)}`])), cur), t('daySessionHelp'))}
    <div class="form-grid">${field('maccess', t('participantsCan'), selF('maccess', [['view',t('acc.view')],['download',t('acc.download')],['both',t('acc.both')]], m ? matAccess(m) : (S.settings.downloadsDefault?'both':'view')), t('accessHelp'))}
<div class="field"><span class="lbl">${t('clientVisLbl')}</span><label class="check"><input type="checkbox" name="mclient" ${m && m.clientVisible?'checked':''}>${t('clientVisOpt')}</label><span class="help">${t('clientVisHelp')}</span></div>
<input type="hidden" name="mrel" value="${rel}">${m?`<div class="field"><span class="lbl">${t('visibility')}</span>${matBadge(m)}</div>`:''}</div>
    <details class="explain" ${rel==='schedule'?'open':''}><summary>${t('scheduleForLater')}</summary><label class="check" style="margin-top:8px"><input type="checkbox" name="msched" ${rel==='schedule'?'checked':''}>${t('scheduleInstead')}</label><div class="form-grid" style="margin-top:8px">${field('mdate', t('releaseDate'), inp('mdate', isoOf(m && m.releaseOffset!=null ? m.releaseOffset : (cur ? sOff(sess(cur)) : 0)), 'date'))}${field('mtime', t('releaseTime'), inp('mtime', m?.releaseTime||'08:00', 'time'))}</div></details></form>`,
  footer:`<button class="btn" data-action="closeModal">${t('cancel')}</button>${m?`<button class="btn btn-ghost" data-action="archiveMaterial" data-mid="${m.id}">${t('archive')}</button>`:''}<button class="btn" data-action="previewPending" data-mid="${m?m.id:''}">${icon('eye',14)}${t('preview')}</button><button class="btn" data-action="submitMaterial" data-k="draft">${t('saveAsDraft')}</button><button class="btn btn-primary" data-action="submitMaterial" data-k="now">${icon('check',14)}${t('publish')}</button>`});
}
ACT.submitMaterial = el => { const f = topModal().querySelector('form'); f.mrel.value = el.dataset.k; runSubmit(f); };
CHG.matFile = el => { const f = el.files && el.files[0]; MAT_FILE = f || null; if (!f) return; const ty = typeFromName(f.name, f.type), live = ['pdf','image','video','text'].includes(ty) || /\.csv$/i.test(f.name);
  $('#mfileInfo').innerHTML = `${icon('file',14)} <b class="ltr">${esc(f.name)}</b> · ${fmtSize(f.size)}<div class="xs muted" style="margin-top:4px">${live?t('previewableYes'):t('previewableNo')}</div>`; const ti = $('#f-mtitle'); if (!ti.value) ti.value = f.name.replace(/\.[^.]+$/,''); $('#e-mfile').textContent = ''; };
ACT.previewPending = el => { if (MAT_FILE) return openFilePreview(MAT_FILE, MAT_FILE.name, true, t('previewBeforeSave'));
  const m = el.dataset.mid && byId(S.materials, el.dataset.mid); if (m) return ACT.previewMaterial({dataset:{mid:m.id}}); toast(t('chooseFileFirst'),'warn'); };
SUB.saveMaterial = async form => {
  const f = Object.fromEntries(new FormData(form)), c = course(form.dataset.cid), errs = {}; let m = form.dataset.mid ? byId(S.materials, form.dataset.mid) : null;
  const url = (f.murl||'').trim(), isLink = !MAT_FILE && url && !(m && m.fileKey);
  if (String(f.mtitle).trim().length<3) errs.mtitle = t('errTitle');
  if (url && !/^https?:\/\//.test(url)) errs.murl = t('errUrl');
  if (!MAT_FILE && !url && !(m && (m.fileKey || m.sample || m.url))) errs.mfile = t('errFile');
  if (f.mrel==='now' && f.msched) f.mrel = 'schedule';
  if (f.mrel==='schedule' && !f.mdate) errs.mdate = t('errDate');
  if (!formErrors(form, errs)) return;
  const isNew = !m;
  if (!m){ m = {id:uid('m'), courseId:c.id, cohortId:ensureCohort(c.id).id, sample:false, fileKey:null}; S.materials.push(m); }
  if (MAT_FILE){ const key = 'f_'+m.id+'_'+Date.now(); const ok = await FILES.put(key, MAT_FILE); Object.assign(m, {fileKey:key, fileName:MAT_FILE.name, mime:MAT_FILE.type, size:fmtSize(MAT_FILE.size), persisted:ok, sample:false, type:typeFromName(MAT_FILE.name, MAT_FILE.type)}); }
  else if (isLink) Object.assign(m, {type:'link', size:'—', sample:false});
  const state = f.mrel==='now' ? 'available' : f.mrel==='schedule' ? 'scheduled' : 'draft';
  Object.assign(m, {sessionId:f.msess||null, title: Object.assign({}, m.title||{}, {[LANG]:f.mtitle.trim()}), url, access:f.maccess, allowDownload: f.maccess!=='view', clientVisible: !!f.mclient, state, releaseOffset: state==='scheduled'?offOf(f.mdate):null, releaseTime: state==='scheduled'?f.mtime:null, updatedAt:Date.now()});
  const o = LANG==='ar'?'en':'ar'; if (!m.title[o]) m.title[o] = m.title[LANG];
  addLog(state==='available'?'material_release':'material_save', {course:c.id, mid:m.id}); const persisted = m.persisted; MAT_FILE = null;
  closeModal(); save(); render(); toast((isNew?t('materialAdded'):t('saved')) + ' · ' + t('ms.'+state) + (m.fileKey ? ' · ' + (persisted ? t('fileSavedLocal') : t('fileSessionOnly')) : ''), m.fileKey && !persisted ? 'warn' : 'ok');
};
ACT.releaseMaterial = el => { const m = byId(S.materials, el.dataset.mid); m.state = 'available'; m.releaseOffset = null; m.updatedAt = Date.now(); addLog('material_release', {course:m.courseId, mid:m.id}); save(); render(); toast(t('materialReleased',{n:L(m.title)})); };
ACT.archiveMaterial = el => { const m = byId(S.materials, el.dataset.mid); m.state = 'archived'; addLog('material_archive', {course:m.courseId, mid:m.id}); closeModal(); save(); render(); toast(t('archivedToast')); };
ACT.previewMaterial = async el => {
  const m = byId(S.materials, el.dataset.mid), staff = !['participant','client'].includes(role()), canDl = staff || matDownloadable(m);
  if (!matReadable(m)) return toast(t('matNotAvailable'),'warn');
  if (m.type==='link') return openModal({title:LE(m.title), body: m.url ? `${note(t('linkOpensNew'),'', 'link')}<p class="small ltr" style="margin-top:10px;word-break:break-all">${esc(m.url)}</p>` : note(t('sampleLink'),'sim','link'), footer: m.url ? `<a class="btn btn-primary" href="${esc(m.url)}" target="_blank" rel="noopener noreferrer">${icon('link',15)}${t('openLink')}</a>` : `<button class="btn btn-primary" data-action="closeModal">${t('close')}</button>`});
  if (!staff && !matViewable(m)) return toast(t('downloadOnlyNote'),'info');
  if (m.sample) return openModal({title:LE(m.title), size:'lg', body:`${note(t('sampleRecordNote'),'sim','info')}<div style="margin-top:12px;background:#fff;border:1px solid var(--g-200);border-radius:8px;padding:28px;min-height:220px"><div class="xs muted">${t('type.'+m.type)} · ${t('placeholderPreview')}</div><h2 style="margin:10px 0">${LE(m.title)}</h2>${[92,100,84,70,96].map(w=>`<div style="height:9px;background:var(--g-100);border-radius:4px;margin:9px 0;width:${w}%"></div>`).join('')}</div>`, footer:`<span class="xs muted" style="margin-inline-end:auto">${t('noFileToDownload')}</span><button class="btn btn-primary" data-action="closeModal">${t('close')}</button>`});
  const blob = await FILES.get(m.fileKey);
  if (!blob) return openModal({title:LE(m.title), body: note(t('fileMissing'),'warn','alert') + `<dl class="dl" style="margin-top:12px"><dt>${t('file')}</dt><dd class="ltr">${esc(m.fileName)}</dd><dt>${t('size')}</dt><dd>${esc(m.size)}</dd></dl>`});
  openFilePreview(blob, m.fileName, canDl, '', m);
};
async function openFilePreview(blob, name, canDl, banner, m){
  const url = URL.createObjectURL(blob), ty = typeFromName(name, blob.type); let inner;
  if (ty==='pdf') inner = `<iframe class="preview-frame" src="${url}" title="${esc(name)}"></iframe><p class="xs muted" style="margin-top:6px">${t('pdfViewerNote')}</p>`;
  else if (ty==='image') inner = `<img src="${url}" alt="${esc(name)}" style="max-width:100%;max-height:70vh;display:block;margin:0 auto;border:1px solid var(--g-200);border-radius:8px">`;
  else if (ty==='video') inner = `<video src="${url}" controls style="width:100%;max-height:70vh;background:#000;border-radius:8px"></video>`;
  else if (ty==='text' || /\.csv$/i.test(name)){ const txt = await blob.text(); inner = `<pre class="ltr" style="max-height:60vh;overflow:auto;background:var(--g-25);border:1px solid var(--g-200);border-radius:8px;padding:12px;font-size:12px;white-space:pre-wrap">${esc(txt.slice(0,20000))}${txt.length>20000?'\n…':''}</pre>`; }
  else inner = `${note(t('noBrowserPreview'),'', 'info')}<dl class="dl" style="margin-top:12px"><dt>${t('file')}</dt><dd class="ltr">${esc(name)}</dd><dt>${t('type')}</dt><dd>${esc(blob.type||t('type.'+ty))}</dd><dt>${t('size')}</dt><dd>${fmtSize(blob.size)}</dd></dl>`;
  openModal({title:esc(m ? L(m.title) : name), size:'xl', onClose:()=>setTimeout(()=>URL.revokeObjectURL(url), 1000), body:`${banner?note(banner,'sim','eye')+'<div style="height:10px"></div>':''}<div class="row" style="margin-bottom:10px"><span class="small ltr">${esc(name)}</span><span class="xs muted">${fmtSize(blob.size)}</span>${badge('b-ok', t('actualFile'), false)}</div>${inner}`,
    footer:`${canDl?`<a class="btn btn-primary" href="${url}" download="${esc(name)}">${icon('download',15)}${t('downloadFile')}</a>`:`<span class="xs muted" style="margin-inline-end:auto">${t('viewOnlyNote')}</span>`}<button class="btn" data-action="closeModal">${t('close')}</button>`});
}
ACT.downloadMaterial = async el => { const m = byId(S.materials, el.dataset.mid); if (!matReadable(m)) return toast(t('matNotAvailable'),'warn'); if (['participant','client'].includes(role()) && !matDownloadable(m)) return toast(t('viewOnlyNote'),'warn');
  const blob = await FILES.get(m.fileKey); if (!blob) return toast(t('fileMissingShort'),'warn');
  const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = m.fileName || 'file'; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); }, 1500);
  toast(t('downloadStarted',{n:m.fileName}) + (inFrame()?' · '+t('downloadMaybeBlocked'):''), 'info'); };

