"use strict";

/* =====================================================================
   5. CORE: utilities, persistence, permissions, derived data
   Single source of truth — every screen derives totals from S.
   ===================================================================== */
const DATA_VERSION = 'v3.2', COMPAT_VERSIONS = ['v3.1','v3.2'], STORE_KEY = 'kaPPDemo3.data', UI_KEY = 'kaPPDemo3.ui';
const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let LANG = 'ar';
/** Translate key; params are HTML-escaped unless raw=true. */
function t(k, p, raw){ const e = STR[k]; let s = e ? e[LANG==='ar'?0:1] : k; if (p) s = s.replace(/\{(\w+)\}/g, (m,x)=> p[x]===undefined ? m : (raw ? String(p[x]) : esc(p[x]))); return s; }
const L = o => o==null ? '' : (typeof o==='string' ? o : (o[LANG] || o.en || o.ar || ''));
const LE = o => esc(L(o));
const bi = s => ({en:s, ar:s});
let _uid = 0; const uid = p => p + Date.now().toString(36) + (++_uid).toString(36) + Math.floor(Math.random()*1296).toString(36);
function hash32(str){ let h = 0x811c9dc5; for (let i=0;i<str.length;i++){ h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); } return h>>>0; }
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const avg = a => a.length ? a.reduce((x,y)=>x+y,0)/a.length : null;
const clamp = (x,a,b)=>Math.max(a,Math.min(b,x));
const inFrame = () => { try { return window.self !== window.top; } catch(e){ return true; } };

/* ---------- Dates: day offsets relative to today ---------- */
const LOC = () => LANG==='ar' ? 'ar-SA-u-ca-gregory-nu-latn' : 'en-GB';
function day0(){ const d = new Date(); d.setHours(0,0,0,0); return d; }
function dateAt(off, hm='00:00'){ const d = day0(); d.setDate(d.getDate()+off); const [h,m] = String(hm).split(':').map(Number); d.setHours(h||0,m||0,0,0); return d; }
const ts = (off, hm) => dateAt(off, hm).getTime();
const fmt = (d, o) => new Intl.DateTimeFormat(LOC(), o).format(d);
const fmtDay = (off, long) => fmt(dateAt(off), long ? {weekday:'long', day:'numeric', month:'long', year:'numeric'} : {weekday:'short', day:'numeric', month:'short'});
const fmtDate = ms => fmt(new Date(ms), {day:'numeric', month:'short', year:'numeric'});
const fmtDateLong = ms => fmt(new Date(ms), {day:'numeric', month:'long', year:'numeric'});
const fmtTime = ms => fmt(new Date(ms), {hour:'2-digit', minute:'2-digit', hour12:false});
const fmtDT = ms => fmt(new Date(ms), {day:'numeric', month:'short', hour:'2-digit', minute:'2-digit', hour12:false});
function dayLabel(off){ if (off===0) return t('today'); if (off===1) return t('tomorrow'); if (off===-1) return t('yesterday'); return fmtDay(off); }
function fmtRel(ms){
  const s = (ms - Date.now())/1000, a = Math.abs(s), rtf = new Intl.RelativeTimeFormat(LANG, {numeric:'auto'});
  if (a < 50) return t('justNow'); if (a < 3600) return rtf.format(Math.round(s/60), 'minute'); if (a < 86400) return rtf.format(Math.round(s/3600), 'hour'); return rtf.format(Math.round(s/86400), 'day');
}
const isoOf = off => { const d = dateAt(off); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const offOf = iso => { const [y,m,d] = String(iso).split('-').map(Number); return Math.round((new Date(y, m-1, d) - day0())/86400000); };
const pctTxt = x => x==null ? '—' : `${Math.round(x)}%`;
const n1 = x => x==null ? '—' : (Math.round(x*10)/10).toFixed(1);
const n2 = x => x==null ? '—' : x.toFixed(2);
const toMin = hm => { const [h,m] = String(hm).split(':').map(Number); return h*60+m; };

/* ---------- State & persistence ---------- */
let S = null;
let UIP = {userId:'u_admin', lang:'ar', seen:{}};
let STORAGE_OK = true;
const V = {
  pl:{q:'', status:'all', client:'all', cat:'all'}, pw:{tab:'overview', course:'all', cohort:null, q:''}, cw:{tab:'overview', cohort:null, q:''},
  wz:{course:null, cohort:null}, se:{course:null, cohort:null}, sch:{trainer:'all', room:'all', onlyConflicts:false},
  att:{q:''}, ab:null, rep:{program:null, course:null, cohort:null, q:'', f:'all'}, cert:{tab:'approvals', course:null, cohort:null, paid:null, field:'participant_name'},
  cfg:{tab:null, cls:'category'}, audit:{q:'', type:'all'}, ps:{tab:'schedule'}, ci:{mode:'code', result:null, openedAt:null},
  verify:{code:'', result:null}, navOpen:false, notifOpen:false, attempt:null, req:{f:'open'}, cfgQ:'', ccl:{q:''}, find:{q:''}, wzCourse:null, imp:{cid:null},
};
function load(){
  try { const raw = localStorage.getItem(STORE_KEY); if (raw){ const d = JSON.parse(raw); if (d && COMPAT_VERSIONS.includes(d.version)) S = d; } } catch(e){ STORAGE_OK = false; }
  try { const u = JSON.parse(localStorage.getItem(UI_KEY) || 'null'); if (u && u.userId) UIP = Object.assign(UIP, u); } catch(e){ STORAGE_OK = false; }
  if (!S) S = seed();
  migrate(S);
  if (!S.users.find(u=>u.id===UIP.userId && u.demo)) UIP.userId = 'u_admin';
  LANG = UIP.lang === 'en' ? 'en' : 'ar';
  shiftToToday(); save();
}
/** Safe, idempotent upgrade of stored data (keeps every existing record).
    v3.1 → v3.2: course.trainerId → course.instructorIds[] (+ leadId); session.instructorIds[];
    program.coordinatorIds[] (KAUST Program Coordinators); user.status. trainerId is kept for compatibility. */
function migrate(D){
  D.courses.forEach(c=>{ if (!Array.isArray(c.instructorIds)) c.instructorIds = c.trainerId ? [c.trainerId] : []; if (c.leadId===undefined || (c.leadId && !c.instructorIds.includes(c.leadId))) c.leadId = c.instructorIds[0] || null; c.trainerId = c.leadId || null; });
  D.sessions.forEach(s=>{ if (!Array.isArray(s.instructorIds)){ const c = D.courses.find(x=>x.id===s.courseId); s.instructorIds = c ? c.instructorIds.slice() : []; } if (s.leadId===undefined) s.leadId = s.instructorIds[0] || null; });
  D.programs.forEach(p=>{ if (!Array.isArray(p.coordinatorIds)){ const o = D.users.find(u=>u.id===p.ownerId); p.coordinatorIds = o && o.role==='coordinator' ? [o.id] : []; } });
  D.users.forEach(u=>{ if (!u.status) u.status = 'active'; });
  D.courses.forEach(c=>{ if (!Array.isArray(c.taIds)) c.taIds = []; });
  if (!D.users.some(u=>u.id==='u_ta1')){ D.users.push({id:'u_ta1', role:'ta', demo:true, name:{en:'Reem Al-Ghamdi', ar:'ريم الغامدي'}, title:{en:'Teaching Assistant', ar:'مساعدة تدريس'}, email:'r.alghamdi@academy.example', status:'active'}); ['CR1','CR3'].forEach(id=>{ const c = D.courses.find(x=>x.id===id); if (c && !c.taIds.includes('u_ta1')) c.taIds.push('u_ta1'); }); }
  D.drafts = D.drafts || {}; D.requests = D.requests || []; D.surveys = D.surveys || []; D.surveyResponses = D.surveyResponses || [];
  // Location check-in (sample venue pins; defaults 100 m radius, ±50 m accuracy, opens 30 min early)
  const pins = {r1:[22.30955,39.10465,'Academy Building A — sample pin','مبنى الأكاديمية A — موقع تجريبي'], r2:[22.31190,39.10230,'Academy Building B — sample pin','مبنى الأكاديمية B — موقع تجريبي'], r3:[22.30720,39.10790,'Academy Building C — sample pin','مبنى الأكاديمية C — موقع تجريبي']};
  D.rooms.forEach(r=>{ if (!r.geo && pins[r.id]) r.geo = {lat:pins[r.id][0], lng:pins[r.id][1], label:{en:pins[r.id][2], ar:pins[r.id][3]}}; });
  if (D.settings.geofenceRadius===150) D.settings.geofenceRadius = 100; if (D.settings.geoAccuracy==null) D.settings.geoAccuracy = 50; if (D.settings.geoBefore==null) D.settings.geoBefore = 30;
  if (D.version !== DATA_VERSION){ D.log.push({id:'Lmig'+Date.now().toString(36), ts:Date.now(), actor:'system', type:'data_migrate', p:{v:DATA_VERSION}}); D.version = DATA_VERSION; }
}
function save(){ try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); localStorage.setItem(UI_KEY, JSON.stringify(UIP)); STORAGE_OK = true; } catch(e){ STORAGE_OK = false; } }
function saveUI(){ try { localStorage.setItem(UI_KEY, JSON.stringify(UIP)); } catch(e){} }
/** On a new calendar day, move stored timestamps so relative schedules stay coherent. */
function shiftToToday(){
  const now0 = day0().getTime(), delta = now0 - S.anchor; if (!delta) return;
  const keys = new Set(['at','ts','startedAt','endedAt','completedAt','started','completed','updatedAt']);
  (function walk(o){ if (!o || typeof o!=='object') return; for (const k of Object.keys(o)){ const v = o[k]; if (keys.has(k) && typeof v==='number') o[k] = v + delta; else if (typeof v==='object') walk(v); } })(S);
  S.anchor = now0;
}
function resetDemo(){ S = seed(); UIP.seen = {}; V.ab = null; V.ci = {mode:'code', result:null, openedAt:null}; V.verify = {code:'', result:null}; FILES.clearAll(); save(); }

/* ---------- Lookups ---------- */
const byId = (arr, id) => arr.find(x=>x.id===id);
const program = id => byId(S.programs, id), course = id => byId(S.courses, id), cohort = id => byId(S.cohorts, id), dayRec = id => byId(S.days, id);
const sess = id => byId(S.sessions, id), part = id => byId(S.participants, id), client = id => byId(S.clients, id), room = id => byId(S.rooms, id), user = id => byId(S.users, id);
const me = () => user(UIP.userId) || user('u_admin');
const role = () => me().role;
const nameOf = id => { const u = user(id); if (u) return L(u.name); const p = part(id); return p ? L(p.name) : t('system'); };
const byName = (a,b) => L(a.name).localeCompare(L(b.name), LANG);
const coursesOf = pid => S.courses.filter(c=>c.programId===pid && !c.archived);
const cohortsOf = cid => S.cohorts.filter(c=>c.courseId===cid && !c.archived);
const daysOfCohort = chid => S.days.filter(d=>d.cohortId===chid).sort((a,b)=>a.dayOffset-b.dayOffset);
const sOff = s => (dayRec(s.dayId)||{dayOffset:0}).dayOffset;
const sessSort = (a,b) => sOff(a)-sOff(b) || (a.order||0)-(b.order||0) || a.start.localeCompare(b.start);
const sessionsOfCohort = chid => S.sessions.filter(s=>s.cohortId===chid).sort(sessSort);
const activeSessions = chid => sessionsOfCohort(chid).filter(s=>s.status!=='cancelled');
const endedOf = chid => activeSessions(chid).filter(s=>s.status==='ended');
const partsOf = chid => S.participants.filter(x=>x.cohortId===chid && !x.withdrawn).sort(byName);
const cohortOf = paid => cohort(part(paid).cohortId);
/** Each course runs as one group of participants (a cohort record kept internally, never shown). */
const courseCohort = cid => cohortsOf(cid)[0] || null;
const ensureCohort = cid => courseCohort(cid) || (S.cohorts.push({id:'CH'+uid('').slice(-6).toUpperCase(), courseId:cid, name:bi('—'), archived:false}), courseCohort(cid));
const inviteStatus = x => (x.invite && x.invite.status) || 'not_sent';
const courseParticipants = cid => { const ch = courseCohort(cid); return ch ? partsOf(ch.id) : []; };
const courseSessions = cid => { const ch = courseCohort(cid); return ch ? activeSessions(ch.id) : []; };
const courseDays = cid => { const ch = courseCohort(cid); return ch ? daysOfCohort(ch.id) : []; };
const normName = s => String(s||'').toLowerCase().replace(/[\u064B-\u0652]/g,'').replace(/[إأآ]/g,'ا').replace(/ة/g,'ه').replace(/\b(co|company|group|llc|ltd|inc|شركة|مجموعة)\b/g,'').replace(/[^\p{L}\p{N}]+/gu,'');
const courseOfPart = paid => course(cohortOf(paid).courseId);
const programOfCourse = cid => program(course(cid).programId);
const dayIndex = (s) => { const ds = daysOfCohort(s.cohortId); return ds.findIndex(d=>d.id===s.dayId)+1; };
/* ---------- Instructor teams (multi-instructor courses and sessions) ---------- */
const courseInstructors = cid => { const c = course(cid); if (!c) return []; return (Array.isArray(c.instructorIds) ? c.instructorIds : (c.trainerId ? [c.trainerId] : [])).filter(id=>user(id)); };
const leadOf = cid => { const c = course(cid), ids = courseInstructors(cid); return c && ids.includes(c.leadId) ? c.leadId : (ids[0] || null); };
const isCourseInstructor = (cid, uid) => courseInstructors(cid).includes(uid);
/** Teaching Assistants support assigned courses (roster, attendance, participant help) — no structure or content changes. */
const courseTAs = cid => ((course(cid)||{}).taIds || []).filter(id=>user(id));
const isCourseTA = (cid, uid) => courseTAs(cid).includes(uid);
const sessionInstructors = s => !s ? [] : (Array.isArray(s.instructorIds) ? s.instructorIds : courseInstructors(s.courseId)).filter(id=>user(id));
const sessionLead = s => { const ids = sessionInstructors(s); return ids.includes(s.leadId) ? s.leadId : (ids[0] || null); };
const trainerOf = cid => user(leadOf(cid));
const userLabel = id => { const u = user(id); return u ? L(u.name) + (u.status==='deactivated' ? ' ('+t('accessOff',null,true)+')' : '') : '—'; };
/** "Name (lead), Name" — plain text. */
const teamText = (ids, lead) => ids.length ? ids.map(id=>userLabel(id) + (ids.length>1 && id===lead ? ' ('+t('leadShort',null,true)+')' : '')).join('، ').replace(/، /g, LANG==='ar'?'، ':', ') : t('noTrainer',null,true);
const courseTeamText = cid => teamText(courseInstructors(cid), leadOf(cid));
const sessionTeamText = s => teamText(sessionInstructors(s), sessionLead(s));
/** Set a course team; future (scheduled) sessions drop removed instructors. Started/ended sessions keep their recorded staff. */
function setCourseTeam(c, ids, lead){
  ids = [...new Set(ids)].filter(id=>user(id)); const removed = (c.instructorIds||[]).filter(id=>!ids.includes(id)), added = ids.filter(id=>!(c.instructorIds||[]).includes(id));
  c.instructorIds = ids; c.leadId = ids.includes(lead) ? lead : (ids[0] || null); c.trainerId = c.leadId;
  S.sessions.filter(s=>s.courseId===c.id && s.status==='scheduled').forEach(s=>{ s.instructorIds = sessionInstructors(s).filter(id=>ids.includes(id)); if (!s.instructorIds.length && c.leadId) s.instructorIds = [c.leadId]; if (!s.instructorIds.includes(s.leadId)) s.leadId = s.instructorIds[0] || null; });
  added.forEach(id=>addLog('trainer_assign', {course:c.id, user:id})); removed.forEach(id=>addLog('trainer_unassign', {course:c.id, user:id}));
  return {added, removed};
}
const programCoordinators = pid => (program(pid)?.coordinatorIds || []).filter(id=>user(id));
const cohortRange = chid => { const ds = daysOfCohort(chid); return ds.length ? `${fmtDay(ds[0].dayOffset)} – ${fmtDay(ds[ds.length-1].dayOffset)}` : '—'; };
const cohortEnd = chid => { const ds = daysOfCohort(chid); return ds.length ? ds[ds.length-1].dayOffset : null; };
const cohortStart = chid => { const ds = daysOfCohort(chid); return ds.length ? ds[0].dayOffset : null; };
const programRange = p => { const off = coursesOf(p.id).flatMap(c=>cohortsOf(c.id)).flatMap(ch=>daysOfCohort(ch.id).map(d=>d.dayOffset)); if (!off.length) return p.startOffset!=null ? `${fmtDay(p.startOffset)} – ${fmtDay(p.endOffset ?? p.startOffset)}` : '—'; return `${fmtDay(Math.min(...off))} – ${fmtDay(Math.max(...off))}`; };
const clsList = (type, all) => (S.cls[type]||[]).filter(x=>all || x.active);
const clsName = (type, id) => { const x = (S.cls[type]||[]).find(c=>c.id===id); return x ? L(x) : '—'; };
const clsOpts = (type, cur) => clsList(type).concat((S.cls[type]||[]).filter(x=>!x.active && x.id===cur)).map(x=>[x.id, esc(L(x)) + (x.active?'':' ('+t('inactive',null,true)+')')]);

/* ---------- Permissions (front-end simulation only — real RBAC needs a secure backend) ---------- */
function can(action, ctx){
  const u = me(), r = u.role;
  switch(action){
    case 'structure': return r==='admin';                                   // programs, courses, cohorts, days, sessions, rooms, trainer assignment
    case 'content': return r==='trainer' && !!ctx && isCourseInstructor(ctx, u.id); // materials, assessments, activities of an assigned course
    case 'participants': return r==='admin';
    case 'resendInvite': return r==='admin' || r==='coordinator';
    case 'certApprove': return r==='admin' || r==='coordinator';
    case 'certTemplate': return r==='admin';
    case 'runSession': return r==='trainer' && !!ctx && sessionInstructors(sess(ctx)).includes(u.id); // only instructors assigned to THIS session
    case 'attendanceException': return r==='admin' || (r==='coordinator' && !!ctx && canSeeCourse(sess(ctx).courseId)) || (r==='trainer' && !!ctx && sessionInstructors(sess(ctx)).includes(u.id)) || (r==='ta' && !!ctx && isCourseTA(sess(ctx).courseId, u.id));
    case 'regenCode': return r==='admin';
    case 'requestChange': return r==='coordinator' || (r==='trainer' && (!ctx || isCourseInstructor(ctx, u.id))) || (r==='ta' && (!ctx || isCourseTA(ctx, u.id)));
    case 'config': return r==='admin';
    case 'audit': return r==='admin' || r==='coordinator';
    case 'reports': return r!=='participant';
  }
  return false;
}
function visibleCourses(){
  const u = me();
  if (u.role==='trainer') return S.courses.filter(c=>isCourseInstructor(c.id, u.id) && !c.archived && program(c.programId).status!=='draft' && !program(c.programId).archived);
  if (u.role==='coordinator'){ const ids = new Set(visiblePrograms().map(p=>p.id)); return S.courses.filter(c=>ids.has(c.programId) && !c.archived); }
  if (u.role==='ta') return S.courses.filter(c=>isCourseTA(c.id, u.id) && !c.archived && program(c.programId).status!=='draft' && !program(c.programId).archived);
  if (u.role==='client') return S.courses.filter(c=>program(c.programId).clientId===u.clientId && !c.archived && program(c.programId).status!=='draft' && !program(c.programId).archived);
  if (u.role==='participant') return myEnrollments().map(x=>course(cohort(x.cohortId).courseId));
  return S.courses.slice();
}
function visiblePrograms(){
  const u = me();
  if (u.role==='admin') return S.programs.slice();
  if (u.role==='coordinator') return S.programs.filter(p=>p.status!=='draft' && !p.archived && (p.coordinatorIds||[]).includes(u.id)); // assigned programs only
  if (u.role==='client') return S.programs.filter(p=>p.clientId===u.clientId && p.status!=='draft' && !p.archived);
  const ids = new Set(visibleCourses().map(c=>c.programId)); return S.programs.filter(p=>ids.has(p.id));
}
/** A participant (one person, one account) can be enrolled in several courses: enrollments share the account email. */
function myEnrollments(){ const u = me(); if (u.role!=='participant') return []; const p0 = part(u.participantId); if (!p0) return [];
  const em = String(p0.email).toLowerCase(), list = S.participants.filter(x=>x.id===p0.id || (!x.withdrawn && String(x.email).toLowerCase()===em && cohort(x.cohortId) && !cohort(x.cohortId).archived && (()=>{ const c = course(cohort(x.cohortId).courseId); return c && !c.archived && program(c.programId).status!=='draft' && !program(c.programId).archived; })()));
  return list.sort((a,b)=>(cohortStart(a.cohortId)??999)-(cohortStart(b.cohortId)??999)); }
const myPid = cid => (myEnrollments().find(x=>cohort(x.cohortId).courseId===cid) || part(me().participantId) || {}).id;
const canSeeCourse = cid => visibleCourses().some(c=>c.id===cid);
const canSeeProgram = pid => visiblePrograms().some(p=>p.id===pid);

/* ---------- Lifecycle & readiness ---------- */
const STATUS_ORDER = ['draft','structure','awaiting','ready','in_progress','completed','archived'];
function cohortRun(chid){ const ss = activeSessions(chid); if (!ss.length) return 'none'; if (ss.every(s=>s.status==='ended')) return 'completed'; if (ss.some(s=>s.status!=='scheduled')) return 'in_progress'; return 'not_started'; }
/** Admin-owned setup checks for a course (structure). */
function adminSetup(cid){
  const c = course(cid), ch = courseCohort(cid), ss = ch ? activeSessions(ch.id) : [], ps = ch ? partsOf(ch.id) : [], items = [];
  items.push({k:'trainer', ok: courseInstructors(cid).length>0});
  items.push({k:'schedule', ok: ss.length>0});
  items.push({k:'rooms', ok: ss.length>0 && ss.every(s=>s.roomId)});
  items.push({k:'participants', ok: ps.length>0});
  const pend = ps.filter(x=>['not_sent','failed'].includes(inviteStatus(x))).length;
  items.push({k:'invites', ok: ps.length>0 && pend===0, soft:true, n:pend});
  const unstaffed = ss.filter(s=>s.status==='scheduled' && !sessionInstructors(s).length).length;
  if (courseInstructors(cid).length) items.push({k:'sessionStaff', ok: unstaffed===0, soft:true, n:unstaffed});
  items.push({k:'coordinator', ok: programCoordinators(c.programId).length>0, soft:true});
  const conf = ss.filter(s=>s.status==='scheduled' && conflictsFor(s).length).length;
  items.push({k:'conflicts', ok: conf===0, soft:true, n:conf});
  return {items, complete: items.filter(i=>!i.soft).every(i=>i.ok)};
}
/** Instructor preparation checklist, in order. The survey is optional; the rest are required for "content ready". */
const CONTENT_KEYS = ['materials','pre','post','survey'], CONTENT_REQ = ['materials','pre','post'];
const contentDone = st => st==='ready' || st==='published';
/** Status per item: not_started | draft | ready (scheduled to release) | published. */
function contentStatus(cid){
  const a = type => { const x = curAssessment(cid, type); if (!x) return 'not_started'; if (x.status==='ready') return 'published'; return (x.questions.length || (type==='post' && x.sameAsPre)) ? 'draft' : 'not_started'; };
  const mats = S.materials.filter(x=>x.courseId===cid && x.state!=='archived');
  const items = {materials: !mats.length ? 'not_started' : mats.some(x=>matState(x)==='available') ? 'published' : mats.some(x=>x.state==='scheduled') ? 'ready' : 'draft',
    pre:a('pre'), post:a('post'), survey: surveyStatus(cid)};
  return {items, complete: CONTENT_REQ.every(k=>contentDone(items[k])), done: CONTENT_REQ.filter(k=>contentDone(items[k])).length, of: CONTENT_REQ.length};
}
function courseStatus(cid){
  const c = course(cid); if (c.archived) return 'archived';
  const p = program(c.programId); if (p.archived) return 'archived'; if (p.status==='draft') return 'draft';
  const runs = cohortsOf(cid).map(ch=>cohortRun(ch.id));
  if (runs.includes('in_progress')) return 'in_progress';
  if (runs.length && runs.every(r=>r==='completed')) return 'completed';
  if (!adminSetup(cid).complete) return 'structure';
  if (!contentStatus(cid).complete) return 'awaiting';
  return 'ready';
}
function programStatus(p){
  if (p.archived) return 'archived'; if (p.status==='draft') return 'draft';
  const cs = coursesOf(p.id).map(c=>courseStatus(c.id)); if (!cs.length) return 'structure';
  if (cs.includes('in_progress')) return 'in_progress';
  if (cs.every(s=>s==='completed')) return 'completed';
  if (cs.includes('structure')) return 'structure';
  if (cs.includes('awaiting')) return 'awaiting';
  return 'ready';
}
const cohortStatus = ch => { if (ch.archived) return 'archived'; const r = cohortRun(ch.id); if (r==='completed') return 'completed'; if (r==='in_progress') return 'in_progress'; const cs = courseStatus(ch.courseId); return ['in_progress','completed'].includes(cs) ? (adminSetup(ch.courseId).complete && contentStatus(ch.courseId).complete ? 'ready' : 'awaiting') : cs; };
/** Who owns the next action for a course, and what it is. */
function nextAction(cid){
  const st = courseStatus(cid);
  if (st==='structure' || st==='draft'){ const miss = adminSetup(cid).items.find(i=>!i.ok && !i.soft); return {owner:'admin', key: miss ? 'na.'+miss.k : 'na.finishSetup'}; }
  if (st==='awaiting'){ const ci = contentStatus(cid).items; const k = CONTENT_REQ.find(x=>!contentDone(ci[x])); return {owner:'trainer', key:'na.'+k}; }
  if (st==='ready') return {owner:'coord', key:'na.deliver'};
  if (st==='in_progress') return {owner:'trainer', key:'na.runSessions'};
  if (st==='completed') return {owner:'coord', key:'na.certificates'};
  return null;
}

/* ---------- Schedule conflicts (trainer double-booking, room double-booking) ---------- */
const overlap = (a,b) => toMin(a.start) < toMin(b.end) && toMin(b.start) < toMin(a.end);
function conflictsFor(s){
  if (!s || s.status==='cancelled') return [];
  const off = sOff(s), mine = sessionInstructors(s), out = [];
  S.sessions.forEach(o=>{
    if (o.id===s.id || o.status==='cancelled' || sOff(o)!==off || !overlap(o,s)) return;
    const oc = course(o.courseId), och = cohort(o.cohortId); if (!oc || oc.archived || !och || och.archived || program(oc.programId).archived) return;
    const who = mine.filter(id=>sessionInstructors(o).includes(id)), kinds = []; if (who.length) kinds.push('trainer'); if (s.roomId && s.roomId===o.roomId && !room(s.roomId)?.virtual) kinds.push('room');
    if (kinds.length) out.push({o, kinds, who});
  });
  return out;
}
function allConflicts(){
  const seen = new Set(), list = [];
  S.sessions.filter(s=>s.status==='scheduled' && !cohort(s.cohortId)?.archived && !course(s.courseId)?.archived).forEach(s=>conflictsFor(s).forEach(c=>{ const k = [s.id, c.o.id].sort().join('|'); if (!seen.has(k)){ seen.add(k); list.push({a:s, b:c.o, o:c.o, kinds:c.kinds, who:c.who}); } }));
  return list;
}
/** Readable conflict text for every assigned instructor and the room. */
const conflictText = x => x.kinds.map(k=>k==='trainer' ? t('conf.trainer2',{n:x.who.map(id=>L(user(id)?.name)).join(LANG==='ar'?'، ':', '), s:L(x.o.title), c:L(course(x.o.courseId).title)}) : t('conf.room',{s:L(x.o.title), c:L(course(x.o.courseId).title)})).join(' · ');
/** Conflicts a hypothetical session would create (used before saving). */
function conflictsDraft(d){ const tmp = Object.assign({id:'__draft'}, d); S.sessions.push(tmp); const c = conflictsFor(tmp); S.sessions.pop(); return c; }

/* ---------- Attendance ---------- */
const rec = (sid, paid) => (S.attendance[sid] || {})[paid];
function attStats(paid){ const ch = cohortOf(paid), es = endedOf(ch.id); const att = es.filter(s=>rec(s.id,paid)).length; return {att, total:es.length, pct: es.length ? att/es.length*100 : null}; }
function sessCounts(sid){
  const s = sess(sid), ps = partsOf(s.cohortId); let present=0, late=0, manual=0;
  ps.forEach(p=>{ const r = rec(sid,p.id); if (!r) return; if (r.status==='late') late++; else present++; if (r.method==='manual') manual++; });
  return {present, late, manual, absent: ps.length-present-late, total: ps.length, rejected: (S.rejected[sid]||[]).length};
}
const minutesSinceStart = s => s.startedAt ? (Date.now() + (s.clockOffset||0)*60000 - s.startedAt)/60000 : 0;
/* Attendance code: unique to session + session date + version; stable all day; NOT rotating.
   Demo only — a real system needs server-issued, signed tokens and server-side validation. */
const sessCode = (s, ver) => String(hash32(`${s.id}|${isoOf(sOff(s))}|v${ver ?? (s.codeVer||0)}|ka-demo`) % 1000000).padStart(6,'0');
const fmtCode = c => c.slice(0,3)+' '+c.slice(3);
function codeState(s){ if (s.status==='cancelled') return 'cancelled'; if (s.status==='live') return 'active'; if (s.status==='ended' || sOff(s)<0) return 'expired'; return 'not_yet'; }

/* ---------- Assessments (versioned; locked once any attempt starts) ---------- */
const curAssessment = (cid, type) => S.assessments.filter(a=>a.courseId===cid && a.type===type && !a.superseded).sort((a,b)=>b.version-a.version)[0] || null;
/** Questions used by an assessment (a post-assessment can reuse the pre-assessment bank). */
function questionsOf(a){ if (!a) return []; if (a.type==='post' && a.sameAsPre){ const pre = curAssessment(a.courseId,'pre'); return pre ? pre.questions : []; } return a.questions; }
const attemptsOf = aid => S.attempts.filter(x=>x.assessmentId===aid);
const isLocked = a => !!a && (attemptsOf(a.id).length>0 || (a.type==='pre' && S.assessments.some(p=>p.courseId===a.courseId && p.type==='post' && p.sameAsPre && !p.superseded && attemptsOf(p.id).length)));
const gradable = q => q.kind==='mcq' || q.kind==='tf';
const getAttempt = (paid, cid, type) => S.attempts.find(x=>x.participantId===paid && x.courseId===cid && x.type===type && x.completed);
const pctOf = a => a.max ? a.score/a.max*100 : 0;
function assessmentOpen(a, chid){
  if (!a || a.status!=='ready') return {open:false, why:'notReady'};
  const run = cohortRun(chid);
  if (a.opens==='manual' && !a.openNow) return {open:false, why:'manual'};
  if (a.type==='pre' && run==='completed') return {open:false, why:'closed'};
  if (a.closes==='afterEnd7' && run==='completed' && (cohortEnd(chid)??0) < -7) return {open:false, why:'closed'};
  if (a.opens==='lastDay' && run!=='completed' && cohortEnd(chid) > 0) return {open:true, why:'demoOpen'};
  return {open:true};
}
/** Matched-pair impact: only participants who completed BOTH pre and post. */
function impactStats(chids){
  const pairs = [], unmatched = [];
  chids.forEach(chid=>{ const ch = cohort(chid); partsOf(chid).forEach(p=>{
    const pre = getAttempt(p.id, ch.courseId, 'pre'), post = getAttempt(p.id, ch.courseId, 'post');
    if (pre && post) pairs.push({p, pre, post, preP:pctOf(pre), postP:pctOf(post)}); else unmatched.push({p, has: pre?'pre':post?'post':'none'});
  }); });
  const n = pairs.length, out = {n, pairs, unmatched, meanPre:null, meanPost:null, raw:null, gClass:null, gInd:null, gUndef:0, dz:null};
  if (!n) return out;
  out.meanPre = avg(pairs.map(x=>x.preP)); out.meanPost = avg(pairs.map(x=>x.postP)); out.raw = out.meanPost - out.meanPre;
  out.gClass = out.meanPre < 100 ? out.raw/(100-out.meanPre) : null;
  pairs.forEach(x=>{ x.gain = x.postP - x.preP; x.g = x.preP < 100 ? x.gain/(100-x.preP) : null; });
  const gs = pairs.filter(x=>x.g!=null).map(x=>x.g); out.gInd = avg(gs); out.gUndef = n - gs.length;
  if (n>=2){ const d = pairs.map(x=>x.gain), m = avg(d), sd = Math.sqrt(d.reduce((a,v)=>a+(v-m)**2,0)/(n-1)); out.dz = sd>0 ? m/sd : null; }
  return out;
}
/** Objective growth: score per objective tag, matched pairs only. */
function objectiveStats(cid, st){
  const c = course(cid); if (!st.n) return [];
  const pct = (att, oid) => { const qs = Object.entries(att.items).filter(([,v])=>v.obj===oid && v.gradable); return qs.length ? qs.filter(([,v])=>v.correct).length/qs.length*100 : null; };
  return c.objectives.map(o=>{ const pre = avg(st.pairs.map(x=>pct(x.pre,o.id)).filter(v=>v!=null)), post = avg(st.pairs.map(x=>pct(x.post,o.id)).filter(v=>v!=null)); return pre==null||post==null ? null : {o, pre, post}; }).filter(Boolean);
}
const MIN_GROUP = 3;
const suppressGroup = st => role()==='client' && st.n>0 && st.n<MIN_GROUP;

/* ---------- Evaluations ---------- */
const heldDays = chid => { const ds = daysOfCohort(chid); return ds.map((d,i)=>({d, n:i+1})).filter(x=>activeSessions(chid).some(s=>s.dayId===x.d.id && s.status!=='scheduled')).map(x=>x.n); };
const evalsOf = (chid, paid) => S.evaluations.filter(e=>e.cohortId===chid && (!paid || e.participantId===paid));
function evalStats(chids){
  let dResp=0, dExp=0, fResp=0, fExp=0; const all = [];
  chids.forEach(chid=>{ const n = partsOf(chid).length, evs = evalsOf(chid); all.push(...evs);
    heldDays(chid).forEach(d=>{ dResp += evs.filter(e=>e.kind==='daily' && e.day===d).length; dExp += n; });
    fResp += evs.filter(e=>e.kind==='final').length; if (cohortRun(chid)==='completed') fExp += n; });
  return {dResp, dExp, dRate: dExp ? dResp/dExp*100 : null, fResp, fExp, fRate: fExp ? fResp/fExp*100 : null, avgP: avg(all.map(e=>e.ratings.program)), avgT: avg(all.map(e=>e.ratings.trainer)), avgR: avg(all.map(e=>e.ratings.relevance)), total: all.length, all, dist:[1,2,3,4,5].map(v=>all.filter(e=>e.ratings.program===v).length)};
}

/* ---------- Activities ---------- */
const activitiesFor = (chid, publishedOnly) => { const ch = cohort(chid); return S.activities.filter(a=>a.courseId===ch.courseId && (!a.cohortId || a.cohortId===chid) && a.status!=='archived' && (!publishedOnly || a.status==='published')).sort((a,b)=>a.dueOffset-b.dueOffset); };
/** Participant state for an activity: pending (not started) | progress | submitted | completed | overdue. */
function subState(a, paid){ const s = S.submissions[a.id+':'+paid]; if (s) return s.reviewed || a.type==='quiz' ? 'completed' : 'submitted'; if (ts(a.dueOffset, a.dueTime) < Date.now()) return 'overdue'; return (S.drafts && S.drafts[a.id+':'+paid]) ? 'progress' : 'pending'; }
const subDone = st => st==='submitted' || st==='completed';

/* ---------- Certificates (per participant's course/cohort) ---------- */
function certInfo(paid){
  const p = part(paid), ch = cohort(p.cohortId), c = course(ch.courseId), st = S.settings, a = attStats(paid);
  const post = !!getAttempt(paid, c.id, 'post'), fin = evalsOf(ch.id, paid).some(e=>e.kind==='final');
  const reasons = []; if (a.pct==null || a.pct < st.minAttendance) reasons.push('att'); if (st.requirePost && !post) reasons.push('post'); if (st.requireFinal && !fin) reasons.push('final');
  const eligible = !reasons.length, r = S.certs[paid], done = cohortRun(ch.id)==='completed';
  let status; if (r && r.state==='approved') status = 'approved'; else if (!done) status = 'in_progress'; else if (!eligible) status = 'ineligible'; else if (r && r.state==='returned') status = 'returned'; else status = 'pending';
  return {status, eligible, reasons, att:a, post, fin, rec:r, p, cohort:ch, course:c, program:program(c.programId)};
}
function certCode(paid){ const al = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let x = hash32('cert|'+paid+'|ka2'), y = hash32('salt|'+paid), s=''; for (let i=0;i<8;i++){ s += al[(i<4?x:y) % 32]; if (i<4) x = Math.floor(x/32); else y = Math.floor(y/32); } return `DEMO-KA26-${s.slice(0,4)}-${s.slice(4)}`; }
const findCert = code => { const c = String(code||'').trim().toUpperCase(); if (!c) return null; const e = Object.entries(S.certs).find(([,r])=>r.state==='approved' && r.code===c); return e ? {r:e[1], paid:e[0]} : null; };

/* ---------- Audit log (append-only in the UI; localStorage is NOT immutable) ---------- */
const logActor = () => { const u = me(); return u.role==='participant' ? u.participantId : u.id; };
function addLog(type, p={}, actor){ S.log.push({id:uid('L'), ts:Date.now(), actor: actor || logActor(), type, p}); }
const LOG_GROUP = {checkin:'attendance', checkin_rejected:'attendance', manual:'attendance', session_start:'attendance', session_end:'attendance', code_regen:'attendance',
  program_create:'structure', program_update:'structure', program_archive:'structure', program_activate:'structure', course_save:'structure', course_archive:'structure', cohort_create:'structure', cohort_archive:'structure', day_add:'structure', day_update:'structure', day_remove:'structure', session_save:'structure', session_cancel:'structure', session_reorder:'structure', trainer_assign:'structure', notify_trainer:'structure',
  participant_add:'participants', participant_update:'participants', import:'participants',
  assessment_save:'content', assessment_import:'content', survey_save:'content', survey_publish:'content', survey_response:'participants_act', assessment_ready:'content', assessment_version:'content', activity_save:'content', material_save:'content', material_release:'content', material_archive:'content', submission_review:'content',
  submission:'participants_act', eval:'participants_act', assessment:'participants_act',
  cert_approve:'certificates', cert_return:'certificates', template_update:'certificates',
  request_create:'requests', request_resolve:'requests', client_create:'structure', client_update:'structure', invite_send:'participants', invite_resend:'participants', account_activate:'participants_act', settings:'admin', cls_update:'admin', trainer_unassign:'structure', session_staff:'structure', coord_assign:'access', coord_unassign:'access', access_update:'access', access_deactivate:'access', access_reactivate:'access', data_migrate:'admin', room_add:'admin', user_invite:'access', export:'admin'};
function visibleLog(){
  const r = role(); if (r==='admin' || r==='coordinator') return S.log;
  const ids = new Set(visibleCourses().map(c=>c.id));
  return S.log.filter(e=> e.p && e.p.course && ids.has(e.p.course) && !['settings','user_invite','room_add','cls_update','request_create','request_resolve'].includes(e.type) && (r!=='participant' || myEnrollments().some(x=>x.id===e.p.pid) || ['material_release','session_start'].includes(e.type)));
}
function logText(e, raw){
  const p = e.p || {}, x = {};
  if (p.pid) x.name = L(part(p.pid)?.name) || '—';
  if (p.sid) x.session = L(sess(p.sid)?.title) || '—';
  if (p.course) x.course = L(course(p.course)?.title) || '—';
  if (p.prog) x.program = L(program(p.prog)?.title) || '—';
  if (p.cohort) x.cohort = L(cohort(p.cohort)?.name) || '—';
  if (p.status) x.status = t('st.'+p.status, null, true);
  if (p.reason) x.reason = STR['rj.'+p.reason] ? t('rj.'+p.reason, null, true) : (STR['mr.'+p.reason] ? t('mr.'+p.reason, null, true) : p.reason);
  if (p.mid) x.material = L(byId(S.materials,p.mid)?.title) || '—';
  if (p.aid) x.activity = L(byId(S.activities,p.aid)?.title) || '—';
  if (p.kind) x.kind = t('kind.'+p.kind, null, true);
  if (p.area) x.area = t('cfgTab.'+p.area, null, true);
  if (p.n != null) x.n = p.n;
  if (p.v != null) x.v = p.v;
  if (p.user) x.user = L(user(p.user)?.name) || p.user;
  if (p.room) x.room = L(room(p.room)?.name) || p.room;
  if (p.scope) x.scope = p.scope;
  if (p.client) x.client = L(client(p.client)?.name) || '—';
  return t('log.'+e.type, x, raw);
}

/* ---------- Materials ---------- */
function matState(m){
  if (m.state==='scheduled' && m.releaseOffset!=null && ts(m.releaseOffset, m.releaseTime||'08:00') <= Date.now()) return 'available';
  if (m.state==='available'){ const end = cohortEnd(m.cohortId); if (end!=null && end + S.settings.materialDays < 0) return 'expired'; }
  return m.state;
}
const materialsFor = (chid) => S.materials.filter(m=>m.cohortId===chid);
const fmtSize = b => b==null ? '—' : b>=1e6 ? (b/1e6).toFixed(1)+' MB' : Math.max(1,Math.round(b/1e3))+' KB';
function typeFromName(n, mime){ const e = String(n||'').split('.').pop().toLowerCase();
  if (e==='pdf' || mime==='application/pdf') return 'pdf'; if (['ppt','pptx','key','odp'].includes(e)) return 'pptx'; if (['doc','docx','odt','rtf'].includes(e)) return 'docx';
  if (['xls','xlsx','csv','ods'].includes(e)) return 'xlsx'; if (['mp4','webm','mov','m4v','ogg'].includes(e) || /^video\//.test(mime||'')) return 'video';
  if (['png','jpg','jpeg','gif','webp','svg'].includes(e) || /^image\//.test(mime||'')) return 'image'; if (['txt','md'].includes(e)) return 'text'; return 'docx'; }

