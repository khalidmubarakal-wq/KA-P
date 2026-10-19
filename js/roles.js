"use strict";

/* =====================================================================
   11. ROLE HOMES (Program Coordinator, Instructor, Client Coordinator,
       Participant), participant pages & account activation,
       certificates, exports, activity log, verification
   ===================================================================== */
SCREENS.home = () => {
  const r = role();
  if (r==='admin') return homeAdmin(); if (r==='coordinator') return homeCoord(); if (r==='trainer') return homeTrainer(); if (r==='ta') return homeTA(); if (r==='client') return homeClient();
  return homeParticipant();
};

/* ---------- KAUST Program Coordinator (on-site): today, exceptions, people who need help ---------- */
function needsHelp(){
  const out = [];
  S.courses.filter(c=>liveCourse(c.id) && canSeeCourse(c.id)).forEach(c=>{ const ch = courseCohort(c.id); if (!ch) return; const ds = courseDays(c.id), start = ds.length ? ds[0].dayOffset : null, run = cohortRun(ch.id), acts = activitiesFor(ch.id, true);
    courseParticipants(c.id).forEach(x=>{ const inv = inviteStatus(x);
      if (inv==='failed') out.push({x, c, k:'invite_failed'});
      else if (inv==='not_sent') out.push({x, c, k:'not_invited'});
      else if (inv==='sent' && run!=='completed' && start!=null && start<=21) out.push({x, c, k:'not_activated'});
      if (run==='in_progress'){ const a = attStats(x.id); if (a.pct!=null && a.pct < S.settings.minAttendance) out.push({x, c, k:'low_attendance'});
        const od = acts.filter(ac=>subState(ac, x.id)==='overdue').length; if (od) out.push({x, c, k:'overdue', n:od}); } }); });
  const prio = {invite_failed:0, low_attendance:1, not_activated:2, overdue:3, not_invited:4};
  return out.sort((a,b)=>prio[a.k]-prio[b.k]);
}
const helpAction = h => ['invite_failed','not_activated','not_invited'].includes(h.k) ? `<button class="btn btn-sm" data-action="resendInvite" data-pid="${h.x.id}">${h.k==='not_invited'?t('send'):t('resend')}</button>` : `<a class="btn btn-sm" href="${href('course',h.c.id,{tab:'progress'})}">${t('open')}</a>`;
function sessionCard(s){
  const c = course(s.courseId), k = sessCounts(s.id);
  return `<div class="task"><div class="row between" style="align-items:flex-start"><div style="min-width:0"><div class="xs muted">${LE(c.title)} · ${LE(client(program(c.programId).clientId)?.name)}</div><h3 style="margin-top:2px">${LE(s.title)}</h3>
    <div class="meta" style="margin-top:4px"><span>${icon('clock',13)}<span class="ltr">${s.start}–${s.end}</span></span><span>${locationHtml(s)}</span><span>${icon('user',13)}${esc(sessionTeamText(s))}</span></div></div>${sessBadge(s)}</div>
    <div class="row between" style="margin-top:10px"><span class="small">${s.status==='scheduled' ? t('nExpected',{n:k.total}) : `${t('checkedIn')}: <b>${k.present+k.late}</b> / ${k.total}${k.rejected?` · <span class="conflict">${t('rejectedN',{n:k.rejected})}</span>`:''}`}</span><a class="btn btn-sm ${s.status==='live'?'btn-primary':''}" href="${href('attendance',s.id)}">${t('openSession')}</a></div></div>`;
}
function homeCoord(){
  const u = me(), progs = visiblePrograms(), live = S.sessions.filter(s=>liveCourse(s.courseId) && canSeeCourse(s.courseId) && s.status!=='cancelled');
  const today = live.filter(s=>sOff(s)===0).sort(sessSort), next = live.filter(s=>sOff(s)>0 && sOff(s)<=7 && s.status==='scheduled').sort(sessSort).slice(0,5);
  const recent = live.filter(s=>sOff(s)>=-7 && sOff(s)<=0);
  const exc = recent.flatMap(s=>Object.entries(S.attendance[s.id]||{}).filter(([,r])=>r.method==='manual').map(([paid,r])=>({s, paid, at:r.at, txt:t('mr.'+r.reason)}))).concat(recent.flatMap(s=>(S.rejected[s.id]||[]).map(x=>({s, paid:x.paid, at:x.at, txt:t('rj.'+x.reason)})))).sort((a,b)=>b.at-a.at);
  const help = needsHelp();
  const find = card(t('findParticipant'), `<div class="search" style="width:100%">${icon('search',16)}<input class="input" id="findQ" type="search" style="width:100%" data-input="findSearch" value="${esc(V.find.q)}" placeholder="${esc(t('findPh'))}" aria-label="${esc(t('findParticipant'))}"></div><div id="find-results" style="margin-top:10px">${findResults()}</div>`);
  const scopeLine = `<div class="note" style="margin-bottom:16px">${icon('layers',16)}<div><b>${t('yourAssignedPrograms')}:</b> ${progs.length ? progs.map(p=>`${LE(p.title)} <span class="muted">(${LE(client(p.clientId)?.name)})</span>`).join(' · ') : t('noAssignedPrograms')}</div></div>`;
  const html = pageHead(t('home.coord2',{n:L(u.name).split(' ')[0]}), t('home.coordSub2'), `<button class="btn" data-action="requestChange">${icon('edit',16)}${t('requestChange')}</button>`) + scopeLine
    + `<div class="grid g-main"><div class="stack">${card(t('sg.today'), today.length ? `<div class="stack-sm">${today.map(sessionCard).join('')}</div>` : `<p class="small muted">${t('sgEmpty.today')}</p>`, {right: badge(today.some(s=>s.status==='live')?'b-live':'', t('nSessions',{n:today.length}), false)})}
      ${card(t('nextSessions'), next.length ? `<ul class="list">${next.map(s=>`<li class="row between" style="flex-wrap:nowrap;gap:10px"><div style="min-width:0"><div class="small cell-main">${LE(s.title)}</div><div class="xs muted">${esc(dayLabel(sOff(s)))} · <span class="ltr">${s.start}</span> · ${LE(course(s.courseId).title)} · ${locationHtml(s)}</div></div><a class="btn btn-sm" href="${href('attendance',s.id)}">${t('open')}</a></li>`).join('')}</ul>` : `<p class="small muted">${t('sgEmpty.upcoming')}</p>`)}
      ${find}</div>
    <div class="stack">${card(t('needsHelp'), help.length ? `<ul class="list">${help.slice(0,8).map(h=>`<li class="row between" style="flex-wrap:nowrap;gap:10px"><div style="min-width:0"><div class="small cell-main">${LE(h.x.name)}</div><div class="xs muted">${t('help.'+h.k,{n:h.n||''})} · ${LE(h.c.title)}</div></div>${helpAction(h)}</li>`).join('')}</ul>${help.length>8?`<p class="xs muted">${t('moreN',{n:help.length-8})}</p>`:''}` : `<p class="small muted">${t('noOneNeedsHelp')}</p>`, {right: help.length ? badge('b-warn', String(help.length), false) : ''})}
      ${card(t('attExceptions'), exc.length ? `<ul class="list">${exc.slice(0,6).map(e=>`<li><div class="small"><b>${LE(part(e.paid)?.name)}</b> — ${e.txt}</div><div class="xs muted">${LE(e.s.title)} · ${esc(dayLabel(sOff(e.s)))} <span class="ltr">${fmtTime(e.at)}</span> · <a href="${href('attendance',e.s.id)}">${t('open')}</a></div></li>`).join('')}</ul>` : `<p class="small muted">${t('noExceptions')}</p>`)}
      ${note(t('coordStructureNote2'),'', 'lock')}</div></div>`;
  return {title:t('nav.home'), html};
}
function findResults(){
  const q = V.find.q.trim().toLowerCase(); if (q.length<2) return `<p class="xs muted">${t('findHint')}</p>`;
  const list = S.participants.filter(x=>!x.withdrawn && liveCourse(cohortOf(x.id).courseId) && canSeeCourse(cohortOf(x.id).courseId) && (x.name.en+' '+x.name.ar+' '+x.email+' '+(x.empId||'')).toLowerCase().includes(q)).slice(0,6);
  if (!list.length) return `<p class="small muted">${t('noResults')}</p>`;
  return `<ul class="list">${list.map(x=>{ const c = courseOfPart(x.id), ss = courseSessions(c.id), liveS = ss.find(s=>s.status==='live'), nx = liveS || ss.find(s=>s.status==='scheduled' && sOff(s)>=0), a = attStats(x.id), inv = inviteStatus(x);
    return `<li><div class="row between" style="align-items:flex-start"><div style="min-width:0"><div class="cell-main small">${LE(x.name)} <span class="xs muted ltr">${esc(x.email)}</span></div><div class="xs muted">${LE(c.title)} · ${LE(client(program(c.programId).clientId)?.name)}</div>
      <div class="xs" style="margin-top:3px">${nx ? `${icon('calendar',12)} ${esc(dayLabel(sOff(nx)))} <span class="ltr">${nx.start}</span> · ${LE(nx.title)} · ${locationHtml(nx)}` : t('noUpcomingSession')}</div>
      <div class="xs muted" style="margin-top:3px">${t('attendance')}: ${pctTxt(a.pct)} (${a.att}/${a.total}) · ${t('invitation')}: ${t('inv.'+inv)}${liveS?` · ${t('nowLive')}: ${attBadge(rec(liveS.id,x.id), liveS)}`:''}</div></div>
      <div class="row" style="justify-content:flex-end">${inv!=='completed'?`<button class="btn btn-sm" data-action="resendInvite" data-pid="${x.id}">${inv==='not_sent'?t('send'):t('resend')}</button>`:''}${liveS && !rec(liveS.id,x.id)?`<button class="btn btn-sm btn-teal" data-action="manualCheckin" data-sid="${liveS.id}" data-pid="${x.id}">${t('recordException')}</button>`:''}<a class="btn btn-sm btn-ghost" href="${href('course',c.id,{tab:'participants'})}">${t('openCourse')}</a></div></div></li>`; }).join('')}</ul>`;
}
INP.findSearch = el => { V.find.q = el.value; $('#find-results').innerHTML = findResults(); };

/* ---------- Instructor: my courses, today's sessions, next steps ---------- */
function homeTrainer(){
  const u = me(), cs = visibleCourses(), today = S.sessions.filter(s=>cs.some(c=>c.id===s.courseId) && sessionInstructors(s).includes(u.id) && sOff(s)===0 && s.status!=='cancelled').sort(sessSort);
  const upcoming = S.sessions.filter(s=>cs.some(c=>c.id===s.courseId) && sessionInstructors(s).includes(u.id) && sOff(s)>0 && sOff(s)<=14 && s.status==='scheduled').sort(sessSort).slice(0,4);
  const next = [];
  today.filter(s=>s.status!=='ended').forEach(s=>next.push(`<li class="row between" style="flex-wrap:nowrap;gap:10px"><span class="small">${s.status==='live'?t('na2.manage'):t('na2.start')}: <b>${LE(s.title)}</b> <span class="ltr">${s.start}</span></span><a class="btn btn-sm btn-primary" href="${href('attendance',s.id)}">${t('open')}</a></li>`));
  S.activities.filter(a=>cs.some(c=>c.id===a.courseId) && a.status==='published' && a.type!=='quiz').forEach(a=>{ const n = courseParticipants(a.courseId).filter(x=>subState(a,x.id)==='submitted').length; if (n) next.push(`<li class="row between" style="flex-wrap:nowrap;gap:10px"><span class="small">${t('na2.review',{n})}: <b>${LE(a.title)}</b></span><a class="btn btn-sm" href="${href('course',a.courseId,{tab:'activities'})}">${t('open')}</a></li>`); });
  const html = pageHead(t('home.trainer',{n:L(u.name)}), t('home.trainerSub2'))
    + `<div class="grid g-main"><div class="stack"><h2>${t('nav.mycourses')}</h2>${cs.length ? cs.map(c=>contentTask(c.id, true)).join('') : card('', empty(t('noAssigned'), t('noAssignedHint'), 'book'))}</div>
    <div class="stack">${card(t('sg.today'), today.length ? `<ul class="list">${today.map(s=>`<li class="row between" style="flex-wrap:nowrap;gap:10px"><div style="min-width:0"><div class="small cell-main">${LE(s.title)}</div><div class="xs muted"><span class="ltr">${s.start}–${s.end}</span> · ${locationHtml(s)}</div></div><div class="row" style="flex-wrap:nowrap">${sessBadge(s)}<a class="btn btn-sm" href="${href('attendance',s.id)}">${t('open')}</a></div></li>`).join('')}</ul>` : `<p class="small muted">${t('sgEmpty.today')}</p>`)}
      ${card(t('sg.upcoming'), upcoming.length ? `<ul class="list">${upcoming.map(s=>`<li class="row between" style="flex-wrap:nowrap;gap:10px"><div style="min-width:0"><div class="small cell-main">${LE(s.title)}</div><div class="xs muted">${esc(dayLabel(sOff(s)))} · <span class="ltr">${s.start}</span> · ${LE(course(s.courseId).title)}</div></div><a class="btn btn-sm btn-ghost" href="${href('attendance',s.id)}">${t('open')}</a></li>`).join('')}</ul>` : `<p class="small muted">${t('sgEmpty.upcoming')}</p>`)}
      ${card(t('nextSteps'), next.length ? `<ul class="list">${next.slice(0,8).join('')}</ul>` : `<p class="small muted">${t('allCaughtUp')}</p>`)}
      ${note(t('trainerStructureNote'),'', 'lock')}</div></div>`;
  return {title:t('nav.home'), html};
}

/* ---------- Teaching Assistant: assigned courses, today's sessions, attendance support ---------- */
function homeTA(){
  const u = me(), cs = visibleCourses(), ss = S.sessions.filter(s=>cs.some(c=>c.id===s.courseId) && s.status!=='cancelled');
  const today = ss.filter(s=>sOff(s)===0).sort(sessSort), next = ss.filter(s=>sOff(s)>0 && sOff(s)<=14 && s.status==='scheduled').sort(sessSort).slice(0,4);
  const courseCard = c => { const P = courseProgress(c.id); return `<div class="task"><div class="row between"><div style="min-width:0"><div class="xs muted">${LE(client(program(c.programId).clientId)?.name)} › ${LE(program(c.programId).title)}</div><h3 style="margin-top:2px">${LE(c.title)}</h3></div><a class="btn btn-sm btn-primary" href="${href('course',c.id)}">${t('openCourse')}</a></div>
    <div class="meta" style="margin-top:6px"><span>${icon('calendar',13)}${esc(courseRangeTxt(c.id))}</span><span>${icon('user',13)}${esc(courseTeamText(c.id))}</span><span>${icon('users',13)}${t('nParticipants',{n:P.ps.length})}</span><span>${icon('checkCircle',13)}${t('attendance')}: ${pctTxt(P.attPct)}</span></div>
    <div class="row" style="margin-top:10px"><a class="btn btn-sm" href="${href('course',c.id,{tab:'participants'})}">${icon('users',14)}${t('cwt.participants')}</a><a class="btn btn-sm" href="${href('course',c.id,{tab:'sessions'})}">${icon('checkCircle',14)}${t('cwt.sessions')}</a></div></div>`; };
  const sessList = list => `<ul class="list">${list.map(s=>`<li class="row between" style="flex-wrap:nowrap;gap:10px"><div style="min-width:0"><div class="small cell-main">${LE(s.title)}</div><div class="xs muted">${esc(dayLabel(sOff(s)))} · <span class="ltr">${s.start}–${s.end}</span> · ${locationHtml(s)}</div></div><div class="row" style="flex-wrap:nowrap">${sessBadge(s)}<a class="btn btn-sm" href="${href('attendance',s.id)}">${t('open')}</a></div></li>`).join('')}</ul>`;
  const html = pageHead(t('home.ta',{n:L(u.name).split(' ')[0]}), t('home.taSub'))
    + `<div class="grid g-main"><div class="stack"><h2>${t('nav.assignedCourses')}</h2>${cs.length ? cs.map(courseCard).join('') : card('', empty(t('ta.noCourses'), t('ta.noCoursesHint'), 'book'))}</div>
    <div class="stack">${card(t('sg.today'), today.length ? sessList(today) : `<p class="small muted">${t('sgEmpty.today')}</p>`)}${card(t('sg.upcoming'), next.length ? sessList(next) : `<p class="small muted">${t('sgEmpty.upcoming')}</p>`)}${note(t('ta.scopeNote'),'', 'lock')}</div></div>`;
  return {title:navLabel('ta','home'), html};
}

/* ---------- Client Coordinator: own organization only, group results by default ---------- */
function clientCourses(){ return visibleCourses().filter(c=>liveCourse(c.id)); }
function homeClient(){
  const u = me(), cl = client(u.clientId), cs = clientCourses(), P = cs.map(c=>({c, P:courseProgress(c.id), st:courseStatus(c.id)}));
  const pres = P.reduce((a,x)=>a+x.P.present,0), exp = P.reduce((a,x)=>a+x.P.expected,0), dDone = P.reduce((a,x)=>a+x.P.daysDone,0), dAll = P.reduce((a,x)=>a+x.P.ds.length,0);
  const cDone = P.filter(x=>x.st==='completed').length, cProg = P.filter(x=>x.st==='in_progress').length, cUp = P.length - cDone - cProg;
  const groups = {completed:0, on_track:0, attention:0, not_started:0}; P.forEach(x=>Object.keys(groups).forEach(k=>groups[k]+=x.P.groups[k])); const nP = P.reduce((a,x)=>a+x.P.ps.length,0);
  const kp = `<div class="grid g-kpi">${kpi(t('cp.att'), pctTxt(exp?pres/exp*100:null), exp ? t('cp.attSubShort',{a:pres, b:exp}) : t('cp.attNone'), 'checkCircle', true)}${kpi(t('cl.days'), `${dDone}<small> / ${dAll}</small>`, t('cl.daysSub',{n:dAll-dDone}), 'calendar')}${kpi(t('cl.courses'), `${cDone}<small> / ${P.length}</small>`, t('cl.coursesSub',{a:cProg, b:cUp}), 'layers')}${kpi(t('cl.participants'), nP, t('cl.participantsSub',{n:groups.completed}), 'users')}</div>`;
  const ups = []; P.forEach(x=>x.P.ds.forEach((d,i)=>{ if (d.dayOffset>=0 && d.dayOffset<=45) ups.push({c:x.c, d, i}); })); ups.sort((a,b)=>a.d.dayOffset-b.d.dayOffset);
  const upcoming = card(t('upcomingDays'), ups.length ? `<ul class="list">${ups.slice(0,5).map(x=>{ const ss = sessionsOfCohort(x.d.cohortId).filter(s=>s.dayId===x.d.id && s.status!=='cancelled'); return `<li><div class="small cell-main">${esc(fmtDay(x.d.dayOffset, true))} · ${t('dayN',{n:x.i+1})}</div><div class="xs muted">${LE(x.c.title)} · <span class="ltr">${ss[0]?.start||''}–${ss[ss.length-1]?.end||''}</span> · ${ss[0]?locationHtml(ss[0]):''}</div></li>`; }).join('')}</ul>` : `<p class="small muted">${t('noUpcomingDays')}</p>`);
  const summary = card(t('cp.summary'), `<div class="row" style="gap:8px">${Object.keys(groups).map(k=>badge(GROUP_BADGE[k], `${t('grp2.'+k)}: ${groups[k]}`, false)).join('')}</div>${nP?`<div class="stackbar" style="display:flex;height:12px;border-radius:6px;overflow:hidden;margin-top:12px" aria-hidden="true">${[['completed','var(--ok)'],['on_track','var(--teal-600)'],['attention','var(--warn)'],['not_started','var(--g-200)']].map(([k,col])=>groups[k]?`<span style="width:${groups[k]/nP*100}%;background:${col}"></span>`:'').join('')}</div>`:''}<p class="xs muted" style="margin-top:8px">${t('cp.summaryHelp',{m:S.settings.minAttendance})}</p>`);
  const table = card(t('courseByCourse'), P.length ? `<div class="table-wrap"><table class="tbl"><thead><tr><th>${t('course')}</th><th class="num">${t('participantsN')}</th><th class="num">${t('cl.daysShort')}</th><th class="num">${t('attendance')}</th><th>${t('cp.req')}</th><th>${t('status')}</th></tr></thead><tbody>${P.map(x=>`<tr><td style="min-width:190px"><a class="cell-main small" href="${href('course',x.c.id,{tab:'progress'})}">${LE(x.c.title)}</a><div class="cell-sub">${esc(courseRangeTxt(x.c.id))}</div></td><td class="num">${x.P.ps.length}</td><td class="num small">${x.P.daysDone}/${x.P.ds.length}</td><td class="num small">${pctTxt(x.P.attPct)}</td><td style="min-width:120px">${x.P.ps.length?progress(x.P.reqTotal?x.P.reqDone/x.P.reqTotal*100:0, t('cp.req')):'—'}</td><td>${stBadge(x.st)}</td></tr>`).join('')}</tbody></table></div>` : empty(t('noCoursesClient'),'','layers'), {flush:true});
  const html = pageHead(t('home.client',{c:L(cl.name)}), t('home.clientSub2')) + kp + `<div class="grid g-main" style="margin-top:16px"><div class="stack">${table}${summary}</div><div class="stack">${upcoming}${note(t('clientScopeNote2',{c:L(cl.name), m:MIN_GROUP}),'', 'shield')}</div></div>`;
  return {title:t('nav.home'), html};
}
SCREENS.courses = () => {
  const cs = clientCourses();
  const html = pageHead(t('nav.courses'), t('coursesSubClient')) + (cs.length ? `<div class="grid g-2">${cs.map(c=>{ const P = courseProgress(c.id);
    return `<a class="card card-b" style="text-decoration:none;color:inherit;display:block" href="${href('course',c.id,{tab:'progress'})}"><div class="row between"><div style="min-width:0"><div class="xs muted">${LE(program(c.programId).title)}</div><h2 style="font-size:16px;margin-top:2px">${LE(c.title)}</h2></div>${stBadge(courseStatus(c.id))}</div>
      <div class="meta" style="margin:8px 0"><span>${icon('calendar',13)}${esc(courseRangeTxt(c.id))}</span><span>${icon('user',13)}${esc(courseTeamText(c.id))}</span><span>${icon('users',13)}${t('nParticipants',{n:P.ps.length})}</span></div>
      <div class="small row between"><span>${t('cp.days')}</span><b class="num">${P.daysDone}/${P.ds.length}</b></div>${progress(P.ds.length?P.daysDone/P.ds.length*100:0, t('cp.days'))}
      <div class="small row between" style="margin-top:6px"><span>${t('cp.att')}</span><b class="num">${pctTxt(P.attPct)}</b></div></a>`; }).join('')}</div>` : card('', empty(t('noCoursesClient'),'','layers')));
  return {title:t('nav.courses'), html};
};

/* ---------- Participant: Home, My courses (tiles → course hub), Check in, activation ----------
   One account can hold several course enrollments. Each course opens as a hub with a sticky
   tab bar (Materials · To do · Schedule · Progress · About). Today's session and check-in
   are always surfaced first. */
const myPart = () => part(me().participantId);
/** Everything the participant needs to complete for one course, in priority order. */
function participantTodo(pa){
  const ch = cohort(pa.cohortId), c = course(ch.courseId), run = cohortRun(ch.id), items = [];
  ['pre','post'].forEach(type=>{ const a = curAssessment(c.id, type), done = getAttempt(pa.id, c.id, type), o = assessmentOpen(a, ch.id), resume = a && S.attempts.some(x=>x.assessmentId===a.id && x.participantId===pa.id && !x.completed);
    items.push({k:type, req:true, title:t(type==='pre'?'preAssessment':'postAssessment'), sub: done ? t('completedOn',{d:fmtDT(done.completed)}) + (type==='pre'?' · '+t('preNoScore'):'') : o.open ? t(type==='pre'?'preTodoHelp':'postTodoHelp') : t('why2.'+(o.why||'notReady')),
      state: done ? 'completed' : o.open ? 'open' : 'locked', due: type==='pre' ? cohortStart(ch.id) : cohortEnd(ch.id),
      btn: !done && o.open ? `<button class="btn btn-sm btn-primary" data-action="startAssessment" data-aid="${a.id}">${resume?t('resume'):t('start')}</button>` : ''}); });
  activitiesFor(ch.id, true).forEach(a=>{ const st = subState(a, pa.id), s = S.submissions[a.id+':'+pa.id];
    items.push({k:'act', req:true, title:L(a.title), sub:`${t('at.'+a.type)} · ${t('due')}: ${dayLabel(a.dueOffset)} ${a.dueTime}${s && s.score!=null?' · '+t('quizScore',{a:s.score,b:s.max},true):''}`, state: subDone(st) ? 'completed' : st, due:a.dueOffset, act:a,
      btn: subDone(st) ? '' : a.type==='quiz' ? `<button class="btn btn-sm btn-primary" data-action="startQuiz" data-aid="${a.id}">${t('startQuiz')}</button>` : `<button class="btn btn-sm btn-primary" data-action="submitActivity" data-aid="${a.id}">${st==='progress'?t('continue'):t('open')}</button>`}); });
  if (S.settings.requireFinal){ const fin = evalsOf(ch.id, pa.id).find(e=>e.kind==='final'), open = run!=='not_started' && run!=='none';
    items.push({k:'final', req:true, title:t('finalEvalTitle'), sub: fin ? t('submittedAt',{t:fmtDT(fin.at)}) : open ? t('finalTodoHelp') : t('finalNotYet'), state: fin ? 'completed' : open ? 'open' : 'locked', due: cohortEnd(ch.id), btn: !fin && open ? `<button class="btn btn-sm btn-primary" data-action="openEval" data-k="final" data-pid="${pa.id}">${t('evaluate')}</button>` : ''}); }
  return items.concat(surveyTodos(pa));
}
const TODO_BADGE = {completed:['b-ok','as.completed'], open:['b-info','as.open'], locked:['','as.notOpen'], pending:['','as.pending'], progress:['b-info','as.progress'], submitted:['b-teal','as.submitted'], overdue:['b-bad','as.overdue']};
const todoBadge = st => badge(TODO_BADGE[st][0], t(TODO_BADGE[st][1]), st!=='locked');
const todoList = items => `<ul class="list">${items.map(i=>`<li class="todo-row"><div style="min-width:0"><div class="small cell-main">${esc(i.title)}${i.req?` <span class="xs muted">· ${t('required')}</span>`:''}</div><div class="xs muted">${esc(i.sub)}</div></div><div class="row" style="flex-wrap:nowrap">${todoBadge(i.state)}${i.btn}</div></li>`).join('')}</ul>`;
const openTodos = pa => participantTodo(pa).filter(i=>i.btn).length;
const courseOfPa = pa => course(cohort(pa.cohortId).courseId);
/** Sessions today for a participant enrollment (not cancelled). */
const todayOf = pa => activeSessions(pa.cohortId).filter(s=>sOff(s)===0);
const liveOf = pa => activeSessions(pa.cohortId).find(s=>s.status==='live');
/** An in-person session whose location check-in window is open even though the instructor hasn't started it yet. */
const geoOpenOf = pa => !liveOf(pa) && activeSessions(pa.cohortId).find(s=>sOff(s)===0 && s.status==='scheduled' && geoReady(s) && geoWindow(s)==='open');
/** The single most useful next step for one enrollment. */
function nextRequired(pa){
  const live = liveOf(pa) || geoOpenOf(pa);
  if (live && !rec(live.id, pa.id)) return {rank:0, title:t('nra.checkin',{s:L(live.title)}), sub:t('nra.checkinSub'), btn:`<a class="btn btn-teal" href="#/checkin">${icon('login',16)}${t('checkInNow')}</a>`};
  const items = participantTodo(pa).filter(i=>i.btn), rank = {overdue:1, open:2, progress:2, pending:3};
  items.sort((a,b)=>(rank[a.state]??4)-(rank[b.state]??4) || (a.due??99)-(b.due??99));
  if (items.length){ const i = items[0]; return {rank:rank[i.state]??4, due:i.due, title:i.title, sub:i.state==='overdue' ? t('nra.overdue') : i.sub, btn:i.btn.replace('btn-sm ','')}; }
  const nx = activeSessions(pa.cohortId).find(s=>s.status==='scheduled' && sOff(s)>=0);
  return nx ? {rank:9, title:t('nra.allSet'), sub:t('nra.nextSession',{d:dayLabel(sOff(nx)), t:nx.start, s:L(nx.title)}), btn:`<a class="btn" href="${href('mycourse',pa.id,{tab:'schedule'})}">${t('viewSchedule')}</a>`}
    : {rank:10, title:t('nra.done'), sub:t('cm.'+certInfo(pa.id).status), btn:`<a class="btn" href="${href('mycourse',pa.id,{tab:'progress'})}">${t('viewProgress')}</a>`};
}
const pubMaterials = pa => materialsFor(pa.cohortId).filter(m=>matState(m)==='available');
/** One row per session today: time, place, status and the check-in action. */
function todayRow(pa, s, inline){
  const r = rec(s.id, pa.id), c = courseOfPa(pa);
  const geoNow = s.status==='scheduled' && !r && geoReady(s) && geoWindow(s)==='open';
  const act = r && s.status!=='live' ? attBadge(r, s) : geoNow ? (inline ? `<span class="xs" style="color:var(--teal-700);font-weight:600">${t('geo.checkInBelow')}</span>` : `<a class="btn btn-sm btn-teal" href="#/checkin">${icon('pin',14)}${t('checkInNow')}</a>`) : s.status==='live' ? (r ? attBadge(r, s) : inline ? `<span class="xs" style="color:var(--teal-700);font-weight:600">${t('enterCodeBelow')}</span>` : `<a class="btn btn-sm btn-teal" href="#/checkin">${icon('login',14)}${t('checkInNow')}</a>`)
    : s.status==='scheduled' ? `<span class="xs muted">${t('checkinOpensAt',{t:s.start})}</span>` : attBadge(r, s);
  return `<li class="today-row ${s.status==='live'?'is-live':''}"><div class="today-time ltr">${s.start}<span>${s.end}</span></div><div class="grow" style="min-width:0"><div class="small cell-main">${LE(s.title)} ${s.status==='live'?badge('b-live', t('st.live')):''}</div><div class="xs muted">${LE(c.title)} · ${locationHtml(s)}</div></div><div class="row" style="flex-wrap:nowrap">${act}</div></li>`;
}
function todayCard(ens){
  const rows = ens.flatMap(pa=>todayOf(pa).map(s=>({pa, s}))).sort((a,b)=>a.s.start.localeCompare(b.s.start));
  const nextUp = ens.flatMap(pa=>activeSessions(pa.cohortId).filter(s=>s.status==='scheduled' && sOff(s)>0).map(s=>({pa, s}))).sort((a,b)=>sessSort(a.s,b.s))[0];
  const body = rows.length ? `<ul class="list today-list">${rows.map(x=>todayRow(x.pa, x.s)).join('')}</ul>`
    : `<p class="small muted">${t('noSessionToday')}${nextUp ? ' ' + t('nextSessionIs',{s:L(nextUp.s.title), d:dayLabel(sOff(nextUp.s)), t:nextUp.s.start}) : ''}</p>`;
  return `<section class="card today-card" aria-labelledby="today-h"><div class="card-h"><h2 id="today-h"><span class="today-dot" aria-hidden="true"></span>${t('todayTitle')} <span class="xs muted" style="font-weight:500">${esc(fmtDay(0, true))}</span></h2><a class="btn btn-sm btn-teal" href="#/checkin">${icon('login',14)}${t('nav.checkin')}</a></div><div class="card-b">${body}</div></section>`;
}
/** Course tile: the entry point to a course (supports several courses). */
function courseTile(pa){
  const c = courseOfPa(pa), p = program(c.programId), x = participantProgress(pa.id), ms = pubMaterials(pa).length, open = openTodos(pa), today = todayOf(pa), live = liveOf(pa);
  const done = x.reqDone + x.actsDone, total = x.reqTotal + x.acts, run = cohortRun(pa.cohortId);
  return `<a class="course-tile ${today.length?'has-today':''}" href="${href('mycourse', pa.id)}" aria-label="${esc(t('openCourseNamed',{c:L(c.title)}))}">
    <div class="tile-top"><span class="tile-ico" aria-hidden="true">${icon('book',20)}</span><div style="min-width:0"><div class="xs muted">${LE(p.title)}</div><h3>${LE(c.title)}</h3></div></div>
    <div class="tile-tags">${live && !rec(live.id, pa.id) ? badge('b-live', t('checkInOpen')) : today.length ? badge('b-teal', t('sessionToday'), true) : run==='completed' ? badge('b-navy', t('cst.completed'), false) : run==='not_started' ? badge('', t('startsOn',{d:fmtDay(cohortStart(pa.cohortId))}), false) : ''}</div>
    <div class="xs muted tile-meta">${icon('user',12)} ${esc(courseTeamText(c.id))}<br>${icon('calendar',12)} ${esc(courseRangeTxt(c.id))}</div>
    <div class="tile-progress"><div class="row between xs"><span>${t('courseProgress')}</span><b class="num">${done}/${total}</b></div><div class="progress" aria-hidden="true"><span style="width:${total?done/total*100:0}%"></span></div></div>
    <div class="tile-stats"><span>${icon('book',13)} ${t('nMaterials',{n:ms})}</span><span>${icon('clipboard',13)} ${t('nToDo',{n:open})}</span><span>${icon('checkCircle',13)} ${pctTxt(x.a.pct)}</span></div>
    <span class="tile-go">${t('openCourse')} ${icon('chevron',14,'flip-rtl')}</span></a>`;
}
function homeParticipant(){
  const ens = myEnrollments(), first = myPart();
  const best = ens.map(pa=>({pa, n:nextRequired(pa)})).sort((a,b)=>a.n.rank-b.n.rank || (a.n.due??99)-(b.n.due??99))[0];
  const nr = best ? `<div class="card card-b next-card"><div class="eyebrow">${t('nextRequired')}</div><div class="row between" style="margin-top:6px;gap:12px"><div style="min-width:0"><h2>${esc(best.n.title)}</h2><p class="small muted" style="margin-top:2px">${esc(L(courseOfPa(best.pa).title))} · ${esc(best.n.sub)}</p></div>${best.n.btn}</div></div>` : '';
  const html = `<div>${pageHead(t('hello',{n:L(first.name).split(' ')[0]}), t('pHomeSub',{n:ens.length}))}
    <div class="grid g-main">${todayCard(ens)}${nr}</div>
    <div class="section-label" style="margin-top:22px"><h2>${t('nav.mycourse')}</h2><a class="small" href="#/mycourse">${t('viewAll')}</a></div>
    <div class="tile-grid">${ens.map(courseTile).join('')}</div>
    <details class="explain card card-b" style="margin-top:16px"><summary>${t('howCheckIn')}</summary><ol class="small" style="margin:8px 0 0;padding-inline-start:18px;line-height:1.8"><li>${t('how1')}</li><li>${t('how2')}</li><li>${t('how3b')}</li></ol><p class="xs muted" style="margin-top:6px">${t('how4')}</p></details></div>`;
  return {title:t('nav.home'), html};
}
/* My courses: tiles; a tile opens the course hub */
const HUB_TABS = ['materials','todo','schedule','progress','about'];
SCREENS.mycourse = R => {
  const ens = myEnrollments();
  if (!R || !R.id){
    return {title:t('nav.mycourse'), html:`<div>${pageHead(t('nav.mycourse'), t('myCoursesSub'))}<div class="tile-grid">${ens.map(courseTile).join('')}</div></div>`};
  }
  const pa = ens.find(x=>x.id===R.id); if (!pa) return denied(t('notFound'));
  const ch = cohort(pa.cohortId), c = course(ch.courseId), p = program(c.programId), held = heldDays(ch.id), mine = evalsOf(ch.id, pa.id), ci = certInfo(pa.id);
  let tab = R.q.tab || (R.q.s==='materials'?'materials':R.q.s) || 'materials'; if (!HUB_TABS.includes(tab)) tab = 'materials';
  const ms = pubMaterials(pa), open = openTodos(pa), today = todayOf(pa), live = liveOf(pa);
  const counts = {materials: ms.length, todo: open};
  const tabsHtml = `<nav class="hub-tabs" aria-label="${esc(t('courseSections'))}"><div class="hub-tabs-in" role="tablist">${HUB_TABS.map(k=>`<a role="tab" class="hub-tab" href="${href('mycourse', pa.id, {tab:k})}" aria-selected="${k===tab}" ${k===tab?'aria-current="page"':''}>${icon(HUB_ICON[k],16)}<span>${t('hub.'+k)}</span>${counts[k]!=null?`<span class="hub-count ${k==='todo'&&counts[k]?'warn':''}">${counts[k]}</span>`:''}</a>`).join('')}</div></nav>`;
  // Today banner (always above the tabs content when the course meets today)
  const banner = today.length ? `<section class="today-banner ${live?'is-live':''}" aria-label="${esc(t('todayTitle'))}"><div class="today-banner-h"><span class="today-dot" aria-hidden="true"></span><b>${t('todayInCourse')}</b><span class="xs">${esc(fmtDay(0,true))}</span></div>
    <ul class="list today-list">${today.map(s=>todayRow(pa, s, (live && !rec(live.id, pa.id)) || (geoOpenOf(pa) && !rec(geoOpenOf(pa).id, pa.id)))).join('')}</ul>${(live && !rec(live.id, pa.id)) || (geoOpenOf(pa) && !rec(geoOpenOf(pa).id, pa.id)) || (V.geo && today.some(s=>s.id===V.geo.sid)) ? `<div class="today-ci">${checkinCard(pa)}</div>` : ''}</section>` : '';
  let body = '';
  if (tab==='materials') body = `<div class="row between" style="margin-bottom:10px"><p class="small muted">${t('matAccessNote2',{d:S.settings.materialDays})}</p></div>${ms.length ? materialsByDay(ch.id, ms, 'participant') : card('', `<div class="empty">${icon('book',36)}<h3>${t('noMaterialsYetT')}</h3><p>${t('noMaterialsYetD')}</p></div>`)}`;
  if (tab==='todo') body = card(t('ms2.todo'), todoList(participantTodo(pa)), {right: open ? badge('b-info', t('nOpen',{n:open}), false) : badge('b-ok', t('allDone'), false)});
  if (tab==='schedule') body = `<div class="stack">${daysOfCohort(ch.id).map((d,i)=>{ const n = i+1, ss = activeSessions(ch.id).filter(s=>s.dayId===d.id), ev = mine.find(x=>x.kind==='daily'&&x.day===n), isToday = d.dayOffset===0;
    return `<section class="card day-card ${isToday?'is-today':''} ${d.dayOffset<0?'is-past':''}"><div class="card-h"><h2><span class="day-h"><span class="chip">${t('dayN',{n})}</span>${esc(fmtDay(d.dayOffset,true))}${isToday?` <span class="badge b-teal">${t('today')}</span>`:''}</span></h2>${ev ? badge('b-ok', t('dayRated'), false) : held.includes(n) ? `<button class="btn btn-sm btn-ghost" data-action="openEval" data-k="daily" data-day="${n}" data-pid="${pa.id}">${t('rateDay')}</button>` : ''}</div>
      <div class="card-b flush"><ul class="list" style="padding:0 18px">${ss.map(s=>`<li class="sched-row ${s.status==='live'?'is-live':''}"><div class="ltr num small nowrap sched-time">${s.start}–${s.end}</div><div class="grow" style="min-width:0"><div class="cell-main small">${LE(s.title)} ${s.status==='live'?badge('b-live', t('st.live')):''}</div>${s.agenda&&L(s.agenda)?`<div class="xs muted">${LE(s.agenda)}</div>`:''}<div class="xs muted">${locationHtml(s)} · ${icon('user',11)} ${esc(sessionTeamText(s))}</div></div>
        <div class="row" style="flex-wrap:nowrap">${s.status==='live' && !rec(s.id,pa.id) ? `<a class="btn btn-sm btn-teal" href="#/checkin">${t('checkInNow')}</a>` : s.status==='scheduled' ? sessBadge(s) : attBadge(rec(s.id,pa.id), s)}</div></li>`).join('')}</ul></div></section>`; }).join('')}</div>`;
  if (tab==='progress') body = card(t('ms2.progress'), completionCard(pa.id) + (ci.status==='approved' ? `<div class="row" style="margin-top:12px"><button class="btn btn-primary" data-action="previewCert" data-pid="${pa.id}">${icon('award',16)}${t('viewCert')}</button><a class="btn" href="${href('verify',null,{code:ci.rec.code})}">${icon('shield',16)}${t('verifyPage')}</a></div>` : ''))
    + `<div style="height:16px"></div>` + card(t('myAttendance'), `<ul class="list">${activeSessions(ch.id).filter(s=>s.status!=='scheduled').map(s=>`<li class="row between"><span class="small">${t('dayN',{n:dayIndex(s)})} · ${LE(s.title)}</span>${attBadge(rec(s.id,pa.id), s)}</li>`).join('') || `<li class="small muted">${t('noSessionsYet')}</li>`}</ul>`);
  if (tab==='about') body = card(t('ms2.overview'), `${L(c.desc)?`<p class="small" style="margin-bottom:12px">${LE(c.desc)}</p>`:''}<dl class="dl"><dt>${t('instructorTeam')}</dt><dd>${courseInstructors(c.id).map(id=>`<div>${profileLink(id, esc(userLabel(id)))}${id===leadOf(c.id)&&courseInstructors(c.id).length>1?` <span class="xs muted">(${t('leadShort')})</span>`:''} · <span class="ltr small">${esc(user(id).email)}</span></div>`).join('') || '—'}</dd><dt>${t('program')}</dt><dd>${LE(p.title)}</dd><dt>${t('dates')}</dt><dd>${esc(courseRangeTxt(c.id))}</dd><dt>${t('language')}</dt><dd>${t('lang.'+c.language)}</dd></dl>${c.objectives&&c.objectives.length?`<h3 style="margin:12px 0 6px">${t('objectives')}</h3><ol class="small" style="margin:0;padding-inline-start:20px">${c.objectives.map(o=>`<li>${esc(L(o))}</li>`).join('')}</ol>`:''}`);
  const head = `<div class="hub-head">${breadcrumb([[t('nav.mycourse'),'#/mycourse'],[LE(c.title)]])}<h1>${LE(c.title)}</h1><p class="page-sub">${LE(p.title)} · ${icon('user',13)} ${esc(courseTeamText(c.id))} · ${esc(courseRangeTxt(c.id))}</p></div>`;
  return {title:L(c.title), html:`<div>${head}${tabsHtml}${banner}<div role="tabpanel" class="hub-panel">${body}</div></div>`};
};
const HUB_ICON = {materials:'book', todo:'clipboard', schedule:'calendar', progress:'trend', about:'info'};
/* Check in: the fastest path — every session today across your courses, with the code box right there */
SCREENS.checkin = () => {
  const ens = myEnrollments(), rows = ens.flatMap(pa=>todayOf(pa).map(s=>({pa, s}))).sort((a,b)=>a.s.start.localeCompare(b.s.start));
  const live = ens.filter(pa=>liveOf(pa) || geoOpenOf(pa));
  const nextUp = ens.flatMap(pa=>activeSessions(pa.cohortId).filter(s=>s.status==='scheduled' && sOff(s)>0).map(s=>({pa, s}))).sort((a,b)=>sessSort(a.s,b.s))[0];
  let body;
  if (live.length) body = `<div class="stack">${live.map(pa=>checkinCard(pa)).join('')}</div>`;
  else if (rows.length) body = card('', `<ul class="list today-list">${rows.map(x=>todayRow(x.pa, x.s)).join('')}</ul><div style="margin-top:12px">${note(t('ciWaiting'),'', 'clock')}</div>`);
  else body = card('', empty(t('noSessionToday'), nextUp ? t('nextSessionIs',{s:L(nextUp.s.title), d:dayLabel(sOff(nextUp.s)), t:nextUp.s.start}) : '', 'calendar'));
  const others = live.length && rows.length > live.length ? card(t('laterToday'), `<ul class="list today-list">${rows.filter(x=>x.s.status!=='live' && geoOpenOf(x.pa)?.id!==x.s.id).map(x=>todayRow(x.pa, x.s)).join('')}</ul>`) : '';
  return {title:t('nav.checkin'), html:`${pageHead(t('nav.checkin'), t('checkinSub'))}<div class="ci-layout"><div class="ci-main">${body}</div><div class="ci-side stack">${others||''}
    <details class="explain card card-b"><summary>${t('howCheckIn')}</summary><ol class="small" style="margin:8px 0 0;padding-inline-start:18px;line-height:1.8"><li>${t('how1')}</li><li>${t('how2')}</li><li>${t('how3b')}</li></ol><p class="xs muted" style="margin-top:6px">${t('how4')}</p></details></div></div>`,
    after: ()=>{ const i = $('.code-input'); i && !topModal() && i.focus({preventScroll:true}); }};
};
ACT.submitActivity = el => { const a = byId(S.activities, el.dataset.aid), key = a.id+':'+myPid(a.courseId), dr = S.drafts[key];
  openModal({title:LE(a.title), body:`<form data-submit="submitActivity" data-aid="${a.id}" novalidate><p class="small muted" style="margin-bottom:6px">${LE(a.instructions)}</p><p class="xs muted" style="margin-bottom:12px">${t('due')}: ${esc(dayLabel(a.dueOffset))} <span class="ltr">${a.dueTime}</span></p>
    ${a.type!=='file' ? field('atext', a.type==='reflection'?t('yourReflection'):t('yourResponse'), `<textarea class="textarea" id="f-atext" name="atext" rows="5">${esc(dr?.text||'')}</textarea>`, t('responseHelp')) : ''}
    ${a.type==='file' ? `${field('atext', t('noteOptional'), `<textarea class="textarea" id="f-atext" name="atext" rows="2">${esc(dr?.text||'')}</textarea>`)}<div class="file-drop"><label class="btn btn-primary" for="f-afile">${icon('upload',14)}${t('attachFile')}</label><input id="f-afile" name="afile" type="file" class="sr-only" data-change="actFile"><p class="xs muted" id="afileName" style="margin-top:6px">${t('fileNameOnly')}</p></div><span class="err small" id="e-afile" style="color:var(--bad);font-weight:600"></span>` : ''}
    ${dr?`<p class="xs muted" style="margin-top:8px">${t('draftSavedAt',{t:fmtDT(dr.at)})}</p>`:''}</form>`,
  footer:`<button class="btn" data-action="closeModal">${t('cancel')}</button><button class="btn" data-action="saveActDraft" data-aid="${a.id}">${t('saveDraft')}</button><button class="btn btn-primary" data-action="submitForm">${t('submit')}</button>`}); };
CHG.actFile = el => { const f = el.files && el.files[0]; $('#afileName').textContent = f ? `${f.name} · ${fmtSize(f.size)}` : t('fileNameOnly'); };
ACT.saveActDraft = el => { const f = topModal().querySelector('form'), a = byId(S.activities, el.dataset.aid), key = a.id+':'+myPid(a.courseId), text = f.atext ? f.atext.value : '';
  S.drafts[key] = {text, at:Date.now()}; save(); closeModal(); render(); toast(t('draftSaved')); };
SUB.submitActivity = form => { const a = byId(S.activities, form.dataset.aid), paid = myPid(a.courseId), key = a.id+':'+paid; if (S.submissions[key]){ closeModal(); return toast(t('alreadySubmitted'),'warn'); }
  const text = form.atext ? form.atext.value.trim() : '', file = form.afile && form.afile.files[0];
  if (a.type==='file' && !file) return formErrors(form, {afile:t('errFile')}); if (a.type!=='file' && text.length<10) return formErrors(form, {atext:t('errSubmission')});
  S.submissions[key] = {at:Date.now(), text, fileName: file?file.name:'', reviewed:false}; delete S.drafts[key]; addLog('submission', {course:a.courseId, pid:paid, aid:a.id}); closeModal(); save(); render(); toast(t('submissionReceived')); };


/* Account activation (simulated): invitation → confirm details → one-time code → password → done */
SCREENS.activate = () => {
  const pa = myPart(), u = me(), c = courseOfPart(pa.id), done = inviteStatus(pa)==='completed';
  if (!V.act || V.act.uid!==u.id) V.act = {uid:u.id, step: done ? 5 : 1};
  const A = V.act, step = done && A.step<5 ? 5 : A.step, labels = ['act.s1','act.s2','act.s3','act.s4'];
  const stepper = `<ol class="stepper" aria-label="${esc(t('actProgress'))}">${labels.map((k,i)=>`<li><span class="step ${step>i+1?'done':''}" ${step===i+1?'aria-current="step"':''}><span class="n">${step>i+1?icon('check',12):i+1}</span><span class="lbl">${t(k)}</span></span></li>`).join('')}</ol>`;
  let body = '';
  if (step===1){ const m = welcomeMessage(pa); body = card(t('act.welcomeT'), `<p class="small muted" style="margin-bottom:12px">${t('act.welcomeIntro')}</p><div class="readonly">${welcomeHtml(m)}</div><div style="margin-top:12px">${note(t('act.simNote'),'sim','info')}</div><div class="row" style="margin-top:14px"><button class="btn btn-primary btn-lg" data-action="actGo" data-k="2">${t('act.start')}</button></div>`); }
  if (step===2) body = card(t('act.s2'), `<form data-submit="actDetails" novalidate>${field('aname', t('fullName'), inp('aname', L(pa.name)))}${field('aemail', t('email'), inp('aemail', pa.email, 'email', 'dir="ltr" readonly aria-readonly="true"'), t('act.emailHelp'))}
    ${field('aphone', t('mobileOptional'), inp('aphone', A.phone||'', 'tel', 'dir="ltr" placeholder="+966 5x xxx xxxx"'))}${field('alang', t('preferredLang'), selF('alang', [['ar','العربية'],['en','English']], LANG))}
    <div class="row between" style="margin-top:6px"><button type="button" class="btn" data-action="actGo" data-k="1">${t('back')}</button><button class="btn btn-primary" type="submit">${t('act.sendCode')}</button></div></form>`);
  if (step===3) body = card(t('act.s3'), `${note(t('act.otpShown',{c:A.otp.slice(0,3)+' '+A.otp.slice(3), d:A.phone?t('act.toPhone',null,true):t('act.toEmail',null,true)}),'sim','info')}<form data-submit="actOtp" novalidate style="margin-top:14px"><label for="f-aotp" class="small" style="font-weight:600;display:block;margin-bottom:6px">${t('act.enterCode')}</label><input class="code-input" id="f-aotp" name="aotp" inputmode="numeric" autocomplete="one-time-code" maxlength="7" placeholder="000 000"><span class="err small" id="e-aotp" role="alert" style="color:var(--bad);font-weight:600;display:block;min-height:18px"></span>
    <div class="row between" style="margin-top:6px"><button type="button" class="btn btn-ghost" data-action="actResend">${t('act.resendCode')}</button><button class="btn btn-primary" type="submit">${t('act.verify')}</button></div></form>`);
  if (step===4) body = card(t('act.s4'), `<form data-submit="actPassword" novalidate>${field('apw', t('act.password'), inp('apw','', 'password', 'autocomplete="new-password" dir="ltr"'), t('act.pwHelp'))}${field('apw2', t('act.password2'), inp('apw2','', 'password', 'autocomplete="new-password" dir="ltr"'))}${note(t('act.pwSim'),'sim','lock')}
    <div class="row" style="margin-top:14px;justify-content:flex-end"><button class="btn btn-primary" type="submit">${t('act.finish')}</button></div></form>`);
  if (step===5) body = `<div class="card card-b"><div class="result r-ok"><div class="ring">${icon('checkCircle',38)}</div><h2>${t('act.doneT')}</h2><p class="small muted" style="max-width:52ch;margin:6px auto 0">${t('act.doneMsg',{c:L(c.title)})}</p></div><div class="row" style="justify-content:center;margin-top:12px"><a class="btn btn-primary btn-lg" href="#/home">${t('act.goHome')}</a></div><p class="xs muted" style="text-align:center;margin-top:12px">${t('act.simDone')}</p></div>`;
  return {title:t('act.title'), html:`<div class="focus-col">${pageHead(t('act.title'), t('act.sub',{n:L(pa.name).split(' ')[0]}))}${stepper}${body}</div>`, after: ()=>{ const f = $('#f-aotp') || $('#f-apw'); f && f.focus(); }};
};
ACT.actGo = el => { V.act.step = Number(el.dataset.k); render(); };
const newOtp = () => String(100000 + Math.floor(Math.random()*900000));
SUB.actDetails = form => { const n = form.aname.value.trim(), ph = form.aphone.value.trim(); const errs = {}; if (n.length<3) errs.aname = t('errName'); if (ph && !/^[+\d][\d\s-]{7,}$/.test(ph)) errs.aphone = t('errPhone'); if (!formErrors(form, errs)) return;
  const pa = myPart(); pa.name = Object.assign({}, pa.name, {[LANG]:n}); V.act.phone = ph; if (ph) me().phone = ph; V.act.otp = newOtp();
  if (form.alang.value !== LANG){ LANG = form.alang.value; UIP.lang = LANG; saveUI(); } save(); V.act.step = 3; render(); toast(t('act.codeSent'),'info'); };
ACT.actResend = () => { V.act.otp = newOtp(); render(); toast(t('act.codeSent'),'info'); };
SUB.actOtp = form => { const v = String(form.aotp.value||'').replace(/\D/g,''); if (v!==V.act.otp) return formErrors(form, {aotp: v.length!==6 ? t('ci.sixDigits') : t('act.wrongCode')}); V.act.step = 4; render(); };
SUB.actPassword = form => { const a = form.apw.value, b = form.apw2.value, errs = {}; if (a.length<8 || !/[A-Za-z]/.test(a) || !/\d/.test(a)) errs.apw = t('act.pwWeak'); else if (a!==b) errs.apw2 = t('act.pwMismatch'); if (!formErrors(form, errs)) return;
  const pa = myPart(), u = me(); myEnrollments().concat(pa).forEach(x=>{ x.invite = {status:'completed', at:Date.now()}; }); u.status = 'active'; addLog('account_activate', {course:courseOfPart(pa.id).id, pid:pa.id}); save(); V.act.step = 5; render(); toast(t('act.doneT')); };

/* ---------- Certificates (approval is contextual on the course Progress tab; template lives in Configuration) ---------- */
ACT.approveAll = el => { const list = courseParticipants(el.dataset.cid).map(x=>certInfo(x.id)).filter(c=>c.status==='pending'); if (!list.length) return toast(t('nothingToApprove'),'info');
  confirmModal(t('approveAll',{n:list.length}), t('approveAllConfirm',{n:list.length}), t('approve'), ()=>{ list.forEach(c=>approveOne(c.p.id)); save(); render(); toast(t('certsApproved',{n:list.length})); }); };
let EXPORT = null;
function exportDialog(name, csv){ EXPORT = {name, csv};
  openModal({title:t('exportTitle'), size:'lg', body:`${note(t('exportNote'),'sim','info')}<p class="small muted" style="margin:12px 0 6px">${esc(name)} · ${t('rowsN',{n:csv.split('\r\n').length-1})}</p><textarea class="textarea ltr" readonly rows="10" aria-label="${esc(t('csvPreview'))}" style="font-family:var(--mono);font-size:12px;white-space:pre">${esc(csv)}</textarea>`,
    footer:`<button class="btn" data-action="exportCopy">${icon('copy',15)}${t('copyCsv')}</button><button class="btn btn-primary" data-action="exportDownload">${icon('download',15)}${t('downloadCsv')}</button>`}); }
ACT.exportDownload = () => { if (EXPORT && downloadText(EXPORT.name, EXPORT.csv)) toast(t('exported')); };
ACT.exportCopy = () => { if (EXPORT) copyText(EXPORT.csv, t('csvCopied')); };

/* ---------- Certificates: approvals + template editor ---------- */
const MERGE = ['participant_name','program_title','course_title','certificate_description','issue_date','certificate_id','trainer_name','duration'];
function mergeValues(paid){
  const ci = certInfo(paid), r = ci.rec, approved = r && r.state==='approved';
  const vals = {participant_name:L(ci.p.name), program_title:L(ci.program.title), course_title:L(ci.course.title), issue_date: approved ? fmtDateLong(r.at) : t('notIssuedYet',null,true), certificate_id: approved ? r.code : 'DEMO-PREVIEW', trainer_name: courseTeamText(ci.course.id), duration: t('nHours',{n:ci.course.hours},true)};
  vals.certificate_description = L(S.certTpl.desc).replace(/\{\{(\w+)\}\}/g, (m,k)=> vals[k] ?? m);
  return vals;
}
const FIELD_PREFIX = {issue_date:'pfx.issue', certificate_id:'pfx.id', trainer_name:'pfx.trainer'};
function certStage(paid, opts={}){
  const tpl = S.certTpl, v = mergeValues(paid), bg = opts.bgUrl;
  const fields = MERGE.filter(k=>tpl.fields[k] && tpl.fields[k].show).map(k=>{ const f = tpl.fields[k];
    return `<div class="tpl-field${opts.sel===k?' sel':''}" style="left:${f.x}%;top:${f.y}%;width:${f.w}%;font-size:${f.size}cqi;text-align:${f.align};color:${esc(f.color)};font-weight:${f.bold?700:400};" data-field="${k}">${FIELD_PREFIX[k]?esc(t(FIELD_PREFIX[k],null,true)):''}${k==='certificate_id'?`<bdi class="ltr" style="font-family:var(--mono)">${esc(v[k])}</bdi>`:esc(v[k])}</div>`; }).join('');
  return `<div class="tpl-stage" role="img" aria-label="${esc(t('certAria',{n:v.participant_name, p:v.course_title}))}">${bg ? `<img class="bg" src="${bg}" alt="">` : `<div class="tpl-default"><div class="wm2">KAUST <b>Academy</b></div><div class="kick">${t('appName')} · ${t('demoBranding')}</div><div class="ttl">${t('certOfCompletion')}</div></div>`}
    <span class="tpl-wm" aria-hidden="true">SAMPLE</span><span class="tpl-ribbon">${t('demoCertRibbon')}</span>${fields}</div>`;
}
function approveOne(paid){ S.certs[paid] = {state:'approved', code:certCode(paid), at:Date.now(), by:me().id}; addLog('cert_approve', {course:courseOfPart(paid).id, pid:paid}); }
ACT.approveCert = el => { const c = certInfo(el.dataset.pid); if (!c.eligible || cohortRun(c.cohort.id)!=='completed') return toast(t('notEligibleToast'),'warn'); approveOne(c.p.id); save(); render(); toast(t('certApproved',{n:L(c.p.name)})); ACT.previewCert({dataset:{pid:c.p.id}}); };
ACT.returnCert = el => { const c = certInfo(el.dataset.pid);
  openModal({title:t('returnReview'), body:`<form data-submit="returnCert" data-pid="${c.p.id}" novalidate><p class="small muted" style="margin-bottom:12px">${LE(c.p.name)} · ${LE(c.course.title)}</p>${field('rnote', t('returnNote')+' *', `<textarea class="textarea" id="f-rnote" name="rnote" rows="3"></textarea>`)}</form>`, footer:`<button class="btn" data-action="closeModal">${t('cancel')}</button><button class="btn btn-primary" data-action="submitForm">${t('returnReview')}</button>`}); };
SUB.returnCert = form => { const n = form.rnote.value.trim(); if (n.length<5) return formErrors(form, {rnote:t('errNote')}); const paid = form.dataset.pid; S.certs[paid] = {state:'returned', at:Date.now(), by:me().id, note:bi(n)}; addLog('cert_return', {course:courseOfPart(paid).id, pid:paid}); closeModal(); save(); render(); toast(t('certReturned')); };
ACT.previewCert = async el => { const ci = certInfo(el.dataset.pid); const bg = S.certTpl.bgKey ? await FILES.url(S.certTpl.bgKey) : null;
  openModal({title:t('certPreview'), size:'xl', body: certStage(ci.p.id, {bgUrl:bg}) + `<div class="no-print" style="margin-top:12px">${note(t('certDisclaimer'),'sim')}${S.certTpl.bgKey && !bg ? '<div style="height:8px"></div>'+note(t('bgMissing'),'warn') : ''}</div>`,
    footer: ci.status==='approved' ? `<a class="btn" href="${href('verify',null,{code:ci.rec.code})}" data-action="closeAllThen">${icon('shield',15)}${t('verifyPage')}</a><button class="btn" data-action="copyCode" data-k="${esc(ci.rec.code)}">${icon('copy',15)}${t('copyCode')}</button><button class="btn btn-primary" data-action="printCert">${icon('printer',15)}${t('printCert')}</button>` : `<button class="btn btn-primary" data-action="printCert">${icon('printer',15)}${t('printPreview')}</button>`}); };
ACT.closeAllThen = () => { closeAllModals(); V.verify.code = ''; };
function templateEditor(){
  const tpl = S.certTpl, cand = S.participants.filter(x=>!x.withdrawn); if (!V.cert.paid || !part(V.cert.paid)) V.cert.paid = (cand.find(x=>certInfo(x.id).status==='approved') || cand[0]).id;
  const f = tpl.fields[V.cert.field];
  const fieldList = MERGE.map(k=>`<button class="btn btn-sm ${k===V.cert.field?'btn-primary':''}" data-action="tplField" data-k="${k}" aria-pressed="${k===V.cert.field}">${tpl.fields[k].show?'':'⦸ '}{{${k}}}</button>`).join(' ');
  const rng = (k, label, min, max, step) => `<div class="range-row"><label for="tf-${k}">${label}</label><input type="range" id="tf-${k}" min="${min}" max="${max}" step="${step}" value="${f[k]}" data-input="tplProp" data-k="${k}"><span class="num xs" id="tv-${k}">${f[k]}</span></div>`;
  return `<div class="split"><div class="stack"><div id="tplStage">${certStage(V.cert.paid, {sel:V.cert.field})}</div>${note(t('tplHonest'),'sim','info')}</div>
  <div class="stack">${card(t('tplBackground'), `<div class="file-drop"><label class="btn btn-primary" for="tplBgIn">${icon('upload',15)}${t('uploadBg')}</label><input id="tplBgIn" type="file" accept="image/png,image/jpeg,.png,.jpg,.jpeg,.pdf,.doc,.docx,.ppt,.pptx" class="sr-only" data-change="tplBg"><p class="xs muted" style="margin-top:8px">${t('bgFormats')}</p>
      ${tpl.bgName?`<p class="small" style="margin-top:6px">${icon('file',13)} <span class="ltr">${esc(tpl.bgName)}</span> ${tpl.bgPersisted?'':badge('b-warn',t('sessionOnly'),false)}</p><button class="btn btn-sm btn-ghost" data-action="tplBgClear">${t('useDefaultDesign')}</button>`:`<p class="small" style="margin-top:6px">${t('usingDefaultDesign')}</p>`}<div id="tplBgErr"></div></div>`)}
    ${card(t('tplDescription'), `<form data-submit="tplDesc" novalidate><div class="field"><label for="f-tdesc">${t('descriptionText')} (${LANG==='ar'?'العربية':'English'})</label><textarea class="textarea" id="f-tdesc" name="tdesc" rows="3" data-input="tplDescLive">${esc(L(tpl.desc))}</textarea><span class="help">${t('placeholdersHelp')} ${MERGE.filter(k=>k!=='certificate_description').map(k=>`<code class="ltr">{{${k}}}</code>`).join(' ')}</span></div><button class="btn btn-sm btn-primary" type="submit">${t('saveText')}</button></form>`)}
    ${card(t('tplFields'), `<div class="row" style="gap:6px;margin-bottom:12px">${fieldList}</div><label class="check" style="margin-bottom:10px"><input type="checkbox" data-change="tplShow" ${f.show?'checked':''}>${t('showField')}</label>
      ${rng('x',t('posX'),0,100,1)}${rng('y',t('posY'),0,100,1)}${rng('w',t('width'),10,100,1)}${rng('size',t('fontSize'),0.8,7,0.1)}
      <div class="range-row"><span>${t('align')}</span><div class="row">${['left','center','right'].map(a=>`<label class="check xs"><input type="radio" name="talign" value="${a}" data-change="tplAlign" ${f.align===a?'checked':''}>${t('al.'+a)}</label>`).join('')}</div><span></span></div>
      <div class="range-row"><label for="tf-color">${t('color')}</label><input type="color" id="tf-color" value="${esc(f.color)}" data-input="tplProp" data-k="color"><label class="check xs"><input type="checkbox" data-change="tplBold" ${f.bold?'checked':''}>${t('bold')}</label></div>`)}
    ${card(t('tplPreviewWith'), `${field('tplPart', t('participant'), `<select class="select" id="f-tplPart" data-change="tplPart">${cand.map(x=>opt(x.id, `${LE(x.name)} — ${LE(courseOfPart(x.id).title)} (${esc(t('cs.'+certInfo(x.id).status,null,true))})`, V.cert.paid)).join('')}</select>`)}
      <div class="row"><button class="btn btn-sm" data-action="tplReset">${t('resetLayout')}</button><button class="btn btn-sm btn-primary" data-action="previewCert" data-pid="${V.cert.paid}">${icon('printer',14)}${t('printPreview')}</button>${certInfo(V.cert.paid).status==='pending' && can('certApprove')?`<button class="btn btn-sm btn-teal" data-action="approveCert" data-pid="${V.cert.paid}">${t('approve')}</button>`:''}</div>`)}</div></div>`;
}
async function loadTplBg(){ if (!S.certTpl.bgKey) return; const u = await FILES.url(S.certTpl.bgKey); const st = $('#tplStage'); if (st && u) st.innerHTML = certStage(V.cert.paid, {sel:V.cert.field, bgUrl:u}); else if (st && !u) $('#tplBgErr').innerHTML = note(t('bgMissing'),'warn'); }
const tplRedraw = async () => { const st = $('#tplStage'); if (!st) return; const u = S.certTpl.bgKey ? await FILES.url(S.certTpl.bgKey) : null; st.innerHTML = certStage(V.cert.paid, {sel:V.cert.field, bgUrl:u}); };
let tplSaveTimer = null; const tplSaveSoon = () => { clearTimeout(tplSaveTimer); tplSaveTimer = setTimeout(()=>{ addLog('template_update', {scope:'layout'}); save(); }, 600); };
ACT.tplField = el => { V.cert.field = el.dataset.k; render(); };
INP.tplProp = el => { const f = S.certTpl.fields[V.cert.field], k = el.dataset.k; f[k] = k==='color' ? el.value : Number(el.value); const v = $('#tv-'+k); if (v) v.textContent = el.value; tplRedraw(); tplSaveSoon(); };
CHG.tplProp = INP.tplProp;
CHG.tplShow = el => { S.certTpl.fields[V.cert.field].show = el.checked; tplSaveSoon(); render(); };
CHG.tplBold = el => { S.certTpl.fields[V.cert.field].bold = el.checked; tplRedraw(); tplSaveSoon(); };
CHG.tplAlign = el => { S.certTpl.fields[V.cert.field].align = el.value; tplRedraw(); tplSaveSoon(); };
CHG.tplPart = el => { V.cert.paid = el.value; render(); };
INP.tplDescLive = el => { const prev = S.certTpl.desc[LANG]; S.certTpl.desc[LANG] = el.value; tplRedraw(); S.certTpl.desc[LANG] = prev; };
SUB.tplDesc = form => { const v = form.tdesc.value.trim(); if (!v) return toast(t('errRequired'),'warn'); S.certTpl.desc[LANG] = v; addLog('template_update', {scope:'description'}); save(); render(); toast(t('saved')); };
CHG.tplBg = async el => { const f = el.files && el.files[0]; if (!f) return;
  if (!/^image\/(png|jpeg)$/.test(f.type) && !/\.(png|jpe?g)$/i.test(f.name)){ $('#tplBgErr').innerHTML = note(t('bgUnsupported',{n:f.name}),'warn','alert'); el.value = ''; return; }
  const key = 'tpl_'+Date.now(), ok = await FILES.put(key, f); Object.assign(S.certTpl, {bgKey:key, bgName:f.name, bgPersisted:ok}); addLog('template_update', {scope:'background'}); save(); render(); toast(ok ? t('bgSaved') : t('bgSessionOnly'), ok?'ok':'warn'); };
ACT.tplBgClear = () => { Object.assign(S.certTpl, {bgKey:null, bgName:null, bgPersisted:false}); addLog('template_update', {scope:'background'}); save(); render(); toast(t('saved')); };
ACT.tplReset = () => { const d = seed().certTpl; S.certTpl.fields = d.fields; addLog('template_update', {scope:'layout'}); save(); render(); toast(t('layoutReset')); };
ACT.printCert = () => { document.body.classList.add('printing-cert'); safePrint(); setTimeout(()=>document.body.classList.remove('printing-cert'), 800); };
ACT.copyCode = el => copyText(el.dataset.k, t('codeCopied'));

ACT.openEval = el => { const kind = el.dataset.k, day = el.dataset.day ? Number(el.dataset.day) : null, epid = el.dataset.pid || me().participantId;
  const stars = (n, label) => `<fieldset><legend>${label} *</legend><div class="stars" role="radiogroup">${[1,2,3,4,5].map(v=>`<label title="${v}/5"><input type="radio" name="${n}" value="${v}"><span>${v}</span><span class="sr-only"> / 5</span></label>`).join('')}</div><span class="err small" id="e-${n}" style="color:var(--bad);font-weight:600;display:block;margin-top:4px"></span></fieldset>`;
  openModal({title: kind==='final'?t('finalEvalTitle'):t('dailyEvalTitle',{n:day}), body:`<form data-submit="submitEval" data-k="${kind}" data-day="${day||''}" data-pid="${epid}" novalidate><p class="small muted" style="margin-bottom:14px">${t('scaleHelp')}</p>${stars('rp',t('rateProgram'))}${stars('rt',t('rateTrainer'))}${stars('rr',t('rateRelevance'))}${field('ecomment', t('commentsOpt'), `<textarea class="textarea" id="f-ecomment" name="ecomment" rows="3"></textarea>`)}</form>`, footer:`<button class="btn" data-action="closeModal">${t('cancel')}</button><button class="btn btn-primary" data-action="submitForm">${t('submitEval')}</button>`}); };
SUB.submitEval = form => { const fd = new FormData(form), kind = form.dataset.k, day = form.dataset.day ? Number(form.dataset.day) : null, paid = form.dataset.pid || me().participantId, ch = cohortOf(paid), errs = {};
  ['rp','rt','rr'].forEach(k=>{ if (!fd.get(k)) errs[k] = t('errRating'); }); if (!formErrors(form, errs)) return;
  if (evalsOf(ch.id, paid).some(e=>e.kind===kind && (kind==='final' || e.day===day))){ closeModal(); return toast(t('alreadySubmitted'),'warn'); }
  const cm = String(fd.get('ecomment')||'').trim(); S.evaluations.push({id:uid('ev'), cohortId:ch.id, participantId:paid, kind, day, at:Date.now(), ratings:{program:Number(fd.get('rp')), trainer:Number(fd.get('rt')), relevance:Number(fd.get('rr'))}, comment: cm?bi(cm):null});
  addLog('eval', {course:ch.courseId, pid:paid, kind}); save(); setModal(`<div class="result r-ok"><div class="ring">${icon('checkCircle',36)}</div><h2>${t('thanksEval')}</h2><p class="small muted">${t('thanksEvalMsg')}</p></div>`, `<button class="btn btn-primary" data-action="closeModal">${t('close')}</button>`); render(); };
/* ---------- Audit log & verification ---------- */
SCREENS.audit = () => {
  const types = ['all','structure','access','participants','content','attendance','participants_act','certificates','requests','admin'];
  return {title:t('nav.audit'), html: pageHead(t('nav.audit'), t('auditSub'), `<button class="btn" data-action="exportAudit">${icon('download',16)}${t('exportCsv')}</button>`) + note(t('auditNote'),'warn','alert')
    + `<div class="toolbar" style="margin-top:14px"><div class="search">${icon('search',16)}<input class="input" id="auQ" type="search" data-input="auditSearch" value="${esc(V.audit.q)}" placeholder="${esc(t('searchLog'))}" aria-label="${esc(t('searchLog'))}"></div>${sel('auType','auditPick', types.map(k=>[k, t('lg.'+k)]), V.audit.type, t('category'))}<button class="btn btn-ghost btn-sm" data-action="auditClear">${t('clearFilters')}</button></div><div id="audit-results">${auditTable()}</div>`};
};
function auditRows(){ const q = V.audit.q.trim().toLowerCase(); return S.log.slice().sort((a,b)=>b.ts-a.ts).filter(e=>(V.audit.type==='all' || LOG_GROUP[e.type]===V.audit.type) && (!q || (logText(e,true)+' '+nameOf(e.actor)).toLowerCase().includes(q))); }
function auditTable(){ const rows = auditRows(); if (!rows.length) return card('', empty(t('noResults'),'','list'));
  return `<p class="small muted" style="margin-bottom:8px">${t('showingN',{n:rows.length})}</p>` + card('', `<div class="table-wrap"><table class="tbl"><thead><tr><th>${t('time')}</th><th>${t('actor')}</th><th>${t('category')}</th><th>${t('details')}</th></tr></thead><tbody>${rows.slice(0,250).map(e=>`<tr><td class="nowrap small num">${esc(fmtDT(e.ts))}</td><td class="small">${esc(nameOf(e.actor))}</td><td>${badge('b-navy', t('lg.'+(LOG_GROUP[e.type]||'admin')), false)}</td><td class="small">${logText(e)}</td></tr>`).join('')}</tbody></table></div>`, {flush:true}); }
INP.auditSearch = el => { V.audit.q = el.value; $('#audit-results').innerHTML = auditTable(); };
CHG.auditPick = el => { V.audit.type = el.value; $('#audit-results').innerHTML = auditTable(); };
ACT.auditClear = () => { V.audit = {q:'', type:'all'}; render(); };
ACT.exportAudit = () => { exportDialog(`ka-demo-activity-log-${isoOf(0)}.csv`, toCSV([[t('csvBanner',null,true)], [t('time',null,true), t('actor',null,true), t('category',null,true), t('details',null,true)]].concat(auditRows().map(e=>[new Date(e.ts).toISOString(), nameOf(e.actor), t('lg.'+(LOG_GROUP[e.type]||'admin'),null,true), logText(e,true)])))); addLog('export', {scope:'audit'}); save(); };
SCREENS.verify = R => {
  if (R.q.code && R.q.code!==V.verify.code){ V.verify.code = R.q.code; V.verify.result = findCert(R.q.code) || 'nf'; }
  const res = V.verify.result; let out = '';
  if (res==='nf') out = `<div style="margin-top:16px">${note(t('verifyNotFound'),'bad','ban')}</div>`;
  else if (res){ const ci = certInfo(res.paid); out = `<div class="card card-b" style="margin-top:16px"><div class="row between"><div class="row"><span style="color:var(--ok)">${icon('shield',26)}</span><h2>${t('verifyFound')}</h2></div>${badge('b-ok', t('validDemo'))}</div>
    <dl class="dl" style="margin-top:14px"><dt>${t('participant')}</dt><dd>${LE(ci.p.name)}</dd><dt>${t('program')}</dt><dd>${LE(ci.program.title)}</dd><dt>${t('course')}</dt><dd>${LE(ci.course.title)}</dd><dt>${t('cohort')}</dt><dd>${LE(ci.cohort.name)} · ${esc(cohortRange(ci.cohort.id))}</dd><dt>${t('issuedBy')}</dt><dd>KAUST Academy (${t('demoBranding')})</dd><dt>${t('issuedOnLbl')}</dt><dd>${esc(fmtDateLong(res.r.at))}</dd><dt>${t('verificationCode')}</dt><dd class="ltr" style="text-align:start">${esc(res.r.code)}</dd></dl><div style="margin-top:14px">${note(t('verifyDisclaimer'),'sim')}</div></div>`; }
  const samples = Object.values(S.certs).filter(c=>c.state==='approved').slice(0,3).map(c=>`<button class="btn btn-sm btn-ghost ltr" data-action="verifySample" data-k="${esc(c.code)}">${esc(c.code)}</button>`).join('');
  return {title:t('nav.verify'), html:`<div class="focus-col">${pageHead(t('verifyTitle'), t('verifySub'))}<div class="card card-b"><form data-submit="verifyCode" class="row" style="align-items:flex-end" novalidate><div class="field" style="flex:1;margin:0;min-width:220px"><label for="f-vcode">${t('verificationCode')}</label><input class="input ltr" id="f-vcode" name="vcode" value="${esc(V.verify.code)}" placeholder="DEMO-KA26-XXXX-XXXX" autocomplete="off" spellcheck="false"><span class="err" id="e-vcode"></span></div><button class="btn btn-primary" type="submit">${icon('shield',16)}${t('verify')}</button></form>${samples?`<div class="row xs muted" style="margin-top:10px">${t('tryCodes')} ${samples}</div>`:''}</div>${out}<p class="xs muted" style="margin-top:12px">${t('verifyFoot')}</p></div>`};
};
SUB.verifyCode = form => { const c = form.vcode.value.trim(); if (!c) return formErrors(form, {vcode:t('errRequired')}); V.verify.code = c.toUpperCase(); V.verify.result = findCert(c) || 'nf'; setHash(href('verify',null,{code:V.verify.code}), true); render(); };
ACT.verifySample = el => { V.verify.code = el.dataset.k; V.verify.result = findCert(el.dataset.k) || 'nf'; setHash(href('verify',null,{code:V.verify.code}), true); render(); };

