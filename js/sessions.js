"use strict";

/* =====================================================================
   10. SESSIONS & ATTENDANCE
   Code rule: unique per session + session date, stable all session day,
   expires when the session ends; the Academy Admin can regenerate it.
   The QR image is a real, standards-compliant QR code that encodes the
   session code; scanning it with a camera is NOT implemented (simulated).
   ===================================================================== */
SCREENS.sessions = () => {
  const r = role(), mine = s => r==='trainer' ? sessionInstructors(s).includes(me().id) : canSeeCourse(s.courseId);
  const all = S.sessions.filter(s=>s.status!=='cancelled' && mine(s) && !cohort(s.cohortId).archived && !course(s.courseId).archived && program(course(s.courseId).programId).status!=='draft').sort(sessSort);
  const groups = [['today', all.filter(s=>sOff(s)===0)], ['upcoming', all.filter(s=>sOff(s)>0 && sOff(s)<=21)], ['recent', all.filter(s=>sOff(s)<0 && sOff(s)>=-14).reverse()]];
  const row = s => { const c = course(s.courseId), k = sessCounts(s.id);
    return `<tr><td class="small nowrap">${esc(dayLabel(sOff(s)))}<div class="ltr cell-sub" style="text-align:start">${s.start}–${s.end}</div></td><td><div class="cell-main small">${LE(s.title)}</div><div class="cell-sub">${LE(c.title)} · ${LE(client(program(c.programId).clientId)?.name)}</div><div class="cell-sub">${icon('user',11)} ${esc(sessionTeamText(s))}</div></td><td class="small">${locationHtml(s)}</td><td>${sessBadge(s)}</td><td class="num small">${s.status==='scheduled'?'—':`${k.present+k.late}/${k.total}`}</td><td><a class="btn btn-sm ${s.status==='live'||sOff(s)===0?'btn-primary':''}" href="${href('attendance',s.id)}">${t('open')}</a></td></tr>`; };
  const html = pageHead(t('nav.sessions'), r==='trainer'?t('sessSubTrainer'):t('sessSubCoord2'), r==='coordinator'?`<button class="btn" data-action="requestChange">${icon('edit',16)}${t('requestChange')}</button>`:'') + `<div class="stack">${groups.map(([k,list])=>card(t('sg.'+k), list.length ? `<div class="table-wrap"><table class="tbl"><tbody>${list.map(row).join('')}</tbody></table></div>` : `<div class="card-b small muted">${t('sgEmpty.'+k)}</div>`, {flush:true})).join('')}</div>`;
  return {title:t('nav.sessions'), html};
};

SCREENS.attendance = R => {
  const s = sess(R.id); if (!s) return denied(t('notFound'));
  const c = course(s.courseId), r = role();
  if (!(r==='admin' || (r==='coordinator' && canSeeCourse(c.id)) || (r==='trainer' && isCourseInstructor(c.id, me().id)) || (r==='ta' && isCourseTA(c.id, me().id)))) return denied();
  const p = program(c.programId), k = sessCounts(s.id), live = s.status==='live', run = can('runSession', s.id), exc = can('attendanceException', s.id), cs = codeState(s);
  const actions = run ? (live ? `<button class="btn btn-teal" data-action="presentMode" data-sid="${s.id}">${icon('maximize',16)}${t('presentMode')}</button><button class="btn btn-danger" data-action="endSession" data-sid="${s.id}">${icon('stop',16)}${t('endSession')}</button>` : s.status==='scheduled' ? `<button class="btn btn-primary btn-lg" data-action="startSession" data-sid="${s.id}">${icon('play',18)}${t('startSession')}</button>` : '') : '';
  const info = `<div class="card card-b"><div class="row between" style="align-items:flex-start;gap:14px"><div style="min-width:0"><div class="row">${sessBadge(s)}${modeBadge(s.mode)}</div>
    <div class="meta" style="margin-top:10px"><span>${icon('calendar',14)}${esc(fmtDay(sOff(s),true))}</span><span>${icon('clock',14)}<span class="ltr">${s.start}–${s.end}</span></span><span>${locationHtml(s)}</span><span>${icon('user',14)}${esc(sessionTeamText(s))}</span>${s.startedAt?`<span>${icon('play',14)}${t('startedAt',{t:fmtTime(s.startedAt)})}</span>`:''}${s.endedAt?`<span>${icon('stop',14)}${t('endedAt',{t:fmtTime(s.endedAt)})}</span>`:''}</div></div><div class="actions">${actions}</div></div>
    ${!run && r!=='admin' ? '' : ''}${r!=='trainer' && !live && s.status==='scheduled' ? `<p class="xs muted" style="margin-top:10px">${t('trainerStarts2',{n:sessionTeamText(s)})}</p>` : ''}${r==='trainer' && !run ? `<div style="margin-top:10px">${note(t('notYourSession',{n:sessionTeamText(s)}),'warn','lock')}</div>` : ''}
    ${r==='trainer' ? `<div class="divider"></div><div class="row small">${ownerTag('admin')}<span class="muted">${t('scheduleReadOnly')}</span><button class="btn btn-sm btn-ghost" data-action="requestChange" data-cid="${c.id}" data-sid="${s.id}">${t('requestChange')}</button></div>` : ''}</div>`;
  const code = sessCode(s), today = sOff(s)===0, qrText = `KA-ATT|${s.id}|${isoOf(sOff(s))}|${code}`;
  const showCode = (run || r==='admin') ? (live || (today && s.status==='scheduled')) : (r==='coordinator' && live);
  const codePanel = showCode ? `<div class="qr-panel" style="margin-top:16px"><div class="qr-box">${QR.svg(qrText, 190, t('qrAria2',{c:fmtCode(code)},true))}</div><div style="min-width:0">
      <div class="code-label">${s.mode==='virtual'?t('virtualCode'):t('attendanceCode')}</div><div class="code-big">${fmtCode(code)}</div>
      <div class="row" style="margin-bottom:10px">${badge(cs==='active'?'b-ok':'b-info', t('cst2.'+cs))}${s.codeVer?badge('b-warn', t('regeneratedN',{n:s.codeVer}), false):''}</div>
      <p class="small" style="color:#D6E0EC;max-width:62ch">${t('codeRule',{d:fmtDay(sOff(s),true)})}</p>
      <div class="row" style="margin-top:10px">${simTag('simQr')}</div><p class="xs" style="color:#A9BBD1;margin-top:6px;max-width:62ch">${t('qrDisclaimer')}</p>
      ${can('regenCode') && s.status!=='ended' ? `<div style="margin-top:12px"><button class="btn btn-sm" data-action="regenCode" data-sid="${s.id}">${icon('refresh',14)}${t('regenCode')}</button></div>` : ''}
      ${s.mode==='virtual'?`<div class="row" style="margin-top:10px"><button class="btn btn-sm" data-action="joinMeeting" data-sid="${s.id}">${icon('video',14)}${t('joinMeeting')}</button></div>`:''}
      ${live && run ? `<div class="row" style="margin-top:14px;padding-top:12px;border-top:1px solid rgba(255,255,255,.12)"><span class="small" style="color:#C9D5E4">${t('demoClock')}: <b>${t('minSinceStart',{n:Math.max(0,Math.floor(minutesSinceStart(s)))})}</b></span><button class="btn btn-sm" data-action="clockAdd" data-sid="${s.id}" data-k="15">+15 ${t('min')}</button>${s.clockOffset?`<button class="btn btn-sm btn-ghost" style="color:#fff" data-action="clockAdd" data-sid="${s.id}" data-k="0">${t('reset')}</button>`:''}</div><p class="xs" style="color:#8FA6C2;margin-top:6px">${t('demoClockHelp',{w:S.settings.checkinWindow})}</p>` : ''}</div></div>`
    : `<div style="margin-top:16px">${note(cs==='expired' ? t('codeExpired') : cs==='not_yet' ? t('codeNotYet') : t('codeHidden'), cs==='expired'?'warn':'', 'info')}</div>`;
  const tiles = `<div class="count-tiles c5" style="margin-top:16px" aria-live="polite">
    ${[['present','var(--c-present)',k.present],['late','var(--c-late)',k.late],[live?'notYet':'absent','var(--c-absent)', s.status==='scheduled'?'—':k.absent],['manualEx','var(--info)',k.manual],['rejected','var(--bad)',k.rejected]].map(x=>`<div class="ct"><div class="l"><i style="background:${x[1]}"></i>${t('st.'+x[0])}</div><div class="n">${x[2]}</div></div>`).join('')}</div>`;
  const list = attendeeTable(s);
  const rj = (S.rejected[s.id]||[]).slice().sort((a,b)=>b.at-a.at);
  const side = `<div class="stack">${card(t('rejectedAttempts'), rj.length ? `<ul class="list">${rj.map(x=>`<li class="row between"><div><div class="small cell-main">${LE(part(x.paid)?.name)}</div><div class="xs muted">${t('rj.'+x.reason)}</div></div><span class="xs muted ltr">${fmtTime(x.at)}</span></li>`).join('')}</ul>` : `<p class="small muted">${t('noRejected')}</p>`)}
    ${card(t('sessionActivity'), (()=>{ const lg = S.log.filter(e=>e.p && e.p.sid===s.id).sort((a,b)=>b.ts-a.ts).slice(0,8); return lg.length ? `<ul class="list">${lg.map(e=>`<li><div class="small">${logText(e)}</div><div class="xs muted">${fmtTime(e.ts)} · ${esc(nameOf(e.actor))}</div></li>`).join('')}</ul>` : `<p class="small muted">${t('noActivity')}</p>`; })())}</div>`;
  const html = pageHead(LE(s.title), '', '', [[t('nav.sessions'), r==='admin'?null:'#/sessions'],[LE(c.title), href('course',c.id,{tab: r==='admin'?'overview':r==='trainer'?'sessions':'sessions'})],[LE(s.title)]])
    + info + codePanel + tiles + `<p class="small muted" style="margin-top:6px">${t('countsFoot',{t:k.total, w:S.settings.checkinWindow})}</p><div class="grid g-main" style="margin-top:16px"><div>${list}</div>${side}</div>`;
  return {title:t('att.title'), html};
};
function attendeeTable(s){
  const exc = can('attendanceException', s.id), q = (V.att.q||'').toLowerCase();
  const ps = partsOf(s.cohortId).filter(x=>!q || (x.name.en+' '+x.name.ar).toLowerCase().includes(q));
  const rows = ps.map(x=>{ const rr = rec(s.id, x.id);
    return `<tr><td><div class="cell-main small">${LE(x.name)}</div><div class="cell-sub">${LE(x.title)}</div></td><td>${attBadge(rr, s)}</td><td class="num ltr">${rr?fmtTime(rr.at):'—'}</td><td class="small">${rr?(rr.method==='manual'?`${t('method.manual')}: ${t('mr.'+rr.reason)}${rr.note?`<div class="cell-sub">${esc(rr.note)}</div>`:''}`:methodText(rr)):'—'}</td>
    <td>${exc && !rr && s.status!=='scheduled' ? `<button class="btn btn-sm" data-action="manualCheckin" data-sid="${s.id}" data-pid="${x.id}">${t('manualShort')}</button>`:''}</td></tr>`; }).join('');
  return card(t('attendeeList'), `<div class="card-b" style="padding-bottom:0"><div class="search" style="width:100%">${icon('search',16)}<input class="input" id="attQ" type="search" data-input="attSearch" data-sid="${s.id}" value="${esc(V.att.q||'')}" placeholder="${esc(t('searchParticipants'))}" aria-label="${esc(t('searchParticipants'))}" style="width:100%"></div></div>
    <div id="att-rows"><div class="table-wrap" style="margin-top:10px"><table class="tbl"><thead><tr><th>${t('participant')}</th><th>${t('status')}</th><th class="num">${t('checkinTime')}</th><th>${t('method')}</th><th><span class="sr-only">${t('actions')}</span></th></tr></thead><tbody>${rows || `<tr><td colspan="5">${empty(t('noResults'),'','search')}</td></tr>`}</tbody></table></div></div>`,
    {flush:true, right: exc && s.status!=='scheduled' ? `<button class="btn btn-sm" data-action="manualCheckin" data-sid="${s.id}">${icon('edit',14)}${t('manualCheckin')}</button>` : ''});
}
INP.attSearch = el => { V.att.q = el.value; const tmp = document.createElement('div'); tmp.innerHTML = attendeeTable(sess(el.dataset.sid)); $('#att-rows').replaceWith($('#att-rows', tmp)); };
ACT.startSession = el => { const s = sess(el.dataset.sid); if (s.status!=='scheduled') return; if (!can('runSession', s.id)) return toast(t('notYourSessionShort'),'warn');
  const go2 = () => { s.status = 'live'; s.startedAt = Date.now(); s.clockOffset = 0; s.startedBy = me().id; s.instructorIds = sessionInstructors(s).slice(); addLog('session_start', {course:s.courseId, sid:s.id}); save(); render(); toast(t('sessionStarted')); };
  if (sOff(s)!==0) confirmModal(t('startSession'), t('startNotToday',{d:fmtDay(sOff(s),true)}), t('startSession'), go2); else go2(); };
ACT.endSession = el => { const s = sess(el.dataset.sid); if (!can('runSession', s.id)) return toast(t('notYourSessionShort'),'warn'); confirmModal(t('endSession'), t('endConfirm',{n:sessCounts(s.id).absent}), t('endSession'), ()=>{ s.status = 'ended'; s.endedAt = Date.now(); addLog('session_end', {course:s.courseId, sid:s.id}); save(); render(); toast(t('sessionEnded')); }); };
ACT.clockAdd = el => { const s = sess(el.dataset.sid), k = Number(el.dataset.k); s.clockOffset = k ? (s.clockOffset||0)+k : 0; save(); render(); };
ACT.regenCode = el => { const s = sess(el.dataset.sid); confirmModal(t('regenCode'), t('regenConfirm'), t('regenCode'), ()=>{ s.codeVer = (s.codeVer||0)+1; addLog('code_regen', {course:s.courseId, sid:s.id, v:s.codeVer}); save(); render(); toast(t('codeRegenerated')); }); };
ACT.joinMeeting = el => { const s = sess(el.dataset.sid); openModal({title:t('joinMeeting'), body: note(t('meetingSim'),'sim') + (s.meetingUrl?`<p class="small ltr" style="margin-top:10px">${esc(s.meetingUrl)}</p>`:'')}); };
ACT.presentMode = el => { const s = sess(el.dataset.sid), code = sessCode(s), qrText = `KA-ATT|${s.id}|${isoOf(sOff(s))}|${code}`;
  openModal({title:`${LE(s.title)} — ${t('presentMode')}`, size:'xl', body:`<div class="present-mode" style="border-radius:12px;padding:28px"><div class="qr-box">${QR.svg(qrText, 280, t('qrAria2',{c:fmtCode(code)},true))}</div><div class="code-label" style="margin-top:18px">${s.mode==='virtual'?t('virtualCode'):t('attendanceCode')}</div><div class="code-big">${fmtCode(code)}</div><p class="small" style="margin-top:10px;color:#C9D5E4">${t('presentInstr')}</p><p class="xs" style="color:#A9BBD1;margin-top:6px">${t('codeRuleShort',{d:fmtDay(sOff(s))})}</p><div style="margin-top:10px">${simTag('simQr')}</div></div>`}); };
ACT.manualCheckin = el => { const s = sess(el.dataset.sid), absent = partsOf(s.cohortId).filter(x=>!rec(s.id,x.id));
  if (!absent.length) return toast(t('allCheckedIn'),'info');
  openModal({title:t('manualCheckin'), body:`<form data-submit="manualCheckin" data-sid="${s.id}" novalidate><p class="small muted" style="margin-bottom:14px">${LE(s.title)} · ${esc(dayLabel(sOff(s)))} <span class="ltr">${s.start}</span></p>
    ${field('mpid', t('participant'), selF('mpid', absent.map(x=>[x.id, LE(x.name)]), el.dataset.pid || absent[0].id))}
    ${field('mstatus', t('status'), selF('mstatus', [['present',t('st.present')],['late',t('st.late')]], s.status==='live' && minutesSinceStart(s)>S.settings.checkinWindow ? 'late' : 'present'))}
    ${field('mreason', t('reason')+' *', selF('mreason', [['',t('chooseReason')]].concat(['location_unavailable','location_inaccurate','qr_failed','device_issue','no_phone','verified_in_person','late_registration','other'].map(k=>[k, t('mr.'+k)])), ''), t('reasonRequired'))}
    ${field('mnote', t('details'), `<textarea class="textarea" id="f-mnote" name="mnote" rows="3" placeholder="${esc(t('notePlaceholder'))}"></textarea>`, t('noteHelp'))}${note(t('manualAuditNote'),'', 'list')}</form>`,
    footer:`<button class="btn" data-action="closeModal">${t('cancel')}</button><button class="btn btn-primary" data-action="submitForm">${t('recordException')}</button>`}); };
SUB.manualCheckin = form => { const fd = new FormData(form), s = sess(form.dataset.sid), paid = fd.get('mpid'), reason = fd.get('mreason'), nt = String(fd.get('mnote')||'').trim(), errs = {};
  if (!reason) errs.mreason = t('errReason'); if (reason==='other' && nt.length<5) errs.mnote = t('errNoteOther'); if (!formErrors(form, errs)) return;
  if (rec(s.id, paid)){ closeModal(); return toast(t('ci.alreadyTitle'),'warn'); }
  (S.attendance[s.id] = S.attendance[s.id] || {})[paid] = {status:fd.get('mstatus'), at: Date.now() + (s.status==='live'?(s.clockOffset||0)*60000:0), method:'manual', reason, note:nt, by:me().id};
  addLog('manual', {course:s.courseId, sid:s.id, pid:paid, status:fd.get('mstatus'), reason}); closeModal(); save(); render(); toast(t('manualRecorded',{n:L(part(paid).name)})); };

/* ---------- Participant check-in card (embedded in the participant home) ---------- */
function checkinCard(pa){
  const ch = cohort(pa.cohortId), c = course(ch.courseId), ss = activeSessions(ch.id), ci = V.ci;
  const live = ss.find(s=>s.status==='live'), next = ss.filter(s=>s.status==='scheduled' && sOff(s)>=0).sort(sessSort)[0], early = !live && geoOpenOf(pa);
  if (live && !ci.openedAt) ci.openedAt = Date.now();
  if (early){ const r0 = rec(early.id, pa.id); return `<div class="ci-card"><div class="ci-top"><div class="row between"><span class="badge" style="background:rgba(255,255,255,.12);color:#fff">${t('geo.openEarly')}</span><span class="xs" style="color:#C9D5E4">${LE(c.title)}</span></div><h2>${LE(early.title)}</h2><div class="meta"><span>${icon('clock',13)}<span class="ltr">${early.start}–${early.end}</span></span><span>${locationHtml(early)}</span></div></div>
      <div class="ci-body">${r0 && !(V.geo && V.geo.sid===early.id) ? checkinResult({res:'already', rec:r0}, early) : geoBlock(early, pa)}<p class="xs muted" style="margin-top:10px">${t('geo.codeLater')}</p></div></div>`; }
  if (!live) return `<div class="ci-card"><div class="ci-top"><span class="badge" style="background:rgba(255,255,255,.12);color:#fff">${t('ci.noneOpen')}</span><h2>${next ? LE(next.title) : LE(c.title)}</h2>${next?`<div class="meta"><span>${icon('calendar',13)}${esc(dayLabel(sOff(next)))} · <span class="ltr">${next.start}–${next.end}</span></span><span>${locationHtml(next)}</span></div>`:''}</div>
      <div class="ci-body"><p class="small">${next ? t('ci.nextHelp2') : t('ci.programDone')}</p>${next && next.agenda && L(next.agenda) ? `<p class="xs muted" style="margin-top:6px">${t('agenda')}: ${LE(next.agenda)}</p>` : ''}</div></div>`;
  const r = rec(live.id, pa.id);
  const top = `<div class="ci-top"><div class="row between"><span class="badge b-live">${t('st.live')}</span><span class="xs" style="color:#C9D5E4">${LE(c.title)}</span></div><h2>${LE(live.title)}</h2><div class="meta"><span>${icon('clock',13)}<span class="ltr">${live.start}–${live.end}</span></span><span>${locationHtml(live)}</span></div></div>`;
  if (ci.result && ci.result.sid===live.id) return `<div class="ci-card">${top}<div class="ci-body">${checkinResult(ci.result, live)}</div></div>`;
  if (r) return `<div class="ci-card">${top}<div class="ci-body">${checkinResult({res:'already', rec:r}, live)}</div></div>`;
  if (V.geo && V.geo.sid===live.id && V.geo.result) return `<div class="ci-card">${top}<div class="ci-body">${geoBlock(live, pa)}</div></div>`;
  const gb = geoReady(live) ? geoBlock(live, pa) + `<div class="or-sep"><span>${t('geo.orCode')}</span></div>` : geoCfg(live) ? geoBlock(live, pa) : '';
  return `<div class="ci-card">${top}<div class="ci-body">${gb}<form data-submit="ciCode" data-sid="${live.id}" novalidate><label for="ciCodeIn-${live.id}" class="small" style="font-weight:600;display:block;margin-bottom:6px">${live.mode==='virtual'?t('ci.codeLabelVirtual'):t('ci.codeLabel')}</label>
        <input class="code-input" id="ciCodeIn-${live.id}" name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="7" placeholder="000 000" aria-describedby="ciCodeErr-${live.id} ciRule-${live.id}">
        <p class="err small ci-err" id="ciCodeErr-${live.id}" role="alert" style="color:var(--bad);font-weight:600;min-height:18px;margin-top:4px"></p>
        <button class="btn btn-teal btn-checkin" type="submit">${icon('login',20)}${t('ci.submit')}</button></form>
        <button class="btn btn-checkin" style="margin-top:10px;height:46px;font-size:14px" data-action="ciScan" data-sid="${live.id}">${icon('qr',18)}${t('ci.simScan')}</button>
        <p class="xs muted" id="ciRule-${live.id}" style="margin-top:12px">${t('ci.rule2')}</p>
        <details class="explain" style="margin-top:10px"><summary>${t('ci.demoControls')}</summary><div class="row" style="margin-top:8px"><button class="btn btn-sm" data-action="ciSim" data-k="other" data-sid="${live.id}">${t('ci.simOther')}</button><button class="btn btn-sm" data-action="ciSim" data-k="wrong" data-sid="${live.id}">${t('ci.simWrong')}</button></div></details>
        <div style="margin-top:12px">${simTag('simCheckin')}</div></div></div>`;
}
function checkinResult(res, s){
  const r = res.rec;
  const RES = {present:['r-ok','checkCircle', t('ci.okTitle'), t('ci.okMsg')], late:['r-late','clock', t('ci.lateTitle'), t('ci.lateMsg',{w:S.settings.checkinWindow})],
    already:['r-dup','checkCircle', t('ci.alreadyTitle'), t('ci.alreadyMsg')], duplicate:['r-dup','info', t('ci.dupTitle'), t('ci.dupMsg')],
    other_session:['r-bad','ban', t('ci.rejTitle'), t('rj.other_session')], regenerated:['r-bad','ban', t('ci.rejTitle'), t('rj.regenerated')], invalid:['r-bad','ban', t('ci.rejTitle'), t('rj.invalid_code')], closed:['r-bad','ban', t('ci.closedTitle'), t('ci.closedMsg')]}[res.res];
  const okish = ['present','late','already','duplicate'].includes(res.res);
  return `<div class="result ${RES[0]}" role="status"><div class="ring">${icon(RES[1],38)}</div><h2>${RES[2]}</h2><p class="small muted" style="margin-top:4px">${RES[3]}</p></div>
  ${okish && r ? `<div style="margin-top:14px"><div class="kv"><span>${t('status')}</span><span>${attBadge(r, s)}</span></div><div class="kv"><span>${t('checkinTime')}</span><span class="ltr">${fmtTime(r.at)}</span></div><div class="kv"><span>${t('method')}</span><span>${t('method.'+r.method)}</span></div>${res.secs!=null?`<div class="kv"><span>${t('ci.duration')}</span><span>${t('secN',{n:res.secs})}</span></div>`:''}</div>` : ''}
  ${!okish ? `<div class="stack-sm" style="margin-top:14px"><button class="btn btn-teal btn-checkin" data-action="ciRetry">${t('ci.tryAgain')}</button><p class="xs muted" style="text-align:center">${t('ci.askTrainer')}</p></div>` : `<details class="explain" style="margin-top:14px"><summary>${t('ci.demoControls')}</summary><div class="row" style="margin-top:8px"><button class="btn btn-sm" data-action="ciScan" data-sid="${s.id}">${t('ci.simDuplicate')}</button></div></details>`}
  <div style="margin-top:12px">${simTag('simCheckin')}</div>`;
}
function doCheckin(sid, code, method){ return Object.assign(doCheckin0(sid, code, method), {sid}); }
function doCheckin0(sid, code, method){
  const s = sess(sid), paid = s ? myPid(s.courseId) : null; if (!s || s.status!=='live') return {res:'closed', sid};
  const rej = reason => { (S.rejected[sid] = S.rejected[sid] || []).push({id:uid('rj'), paid, reason, at:Date.now()}); addLog('checkin_rejected', {course:s.courseId, sid, pid:paid, reason}); };
  const ex = rec(sid, paid); if (ex){ rej('duplicate'); return {res:'duplicate', rec:ex}; }
  if (code === sessCode(s)){
    const status = minutesSinceStart(s) <= S.settings.checkinWindow ? 'present' : 'late';
    const r = (S.attendance[sid] = S.attendance[sid] || {})[paid] = {status, at: Date.now() + (s.clockOffset||0)*60000, method};
    addLog('checkin', {course:s.courseId, sid, pid:paid, status}); return {res:status, rec:r, secs: V.ci.openedAt ? Math.max(1, Math.round((Date.now()-V.ci.openedAt)/1000)) : null};
  }
  for (let v=0; v<(s.codeVer||0); v++) if (sessCode(s, v)===code){ rej('regenerated'); return {res:'regenerated'}; }
  if (S.sessions.some(o=>o.id!==s.id && sessCode(o)===code)){ rej('other_session'); return {res:'other_session'}; }
  rej('invalid_code'); return {res:'invalid'};
}
const ciDone = () => { save(); render(); const r = V.ci.result; if (!r) return; const k = {present:'ci.okTitle', late:'ci.lateTitle', duplicate:'ci.dupTitle', closed:'ci.closedTitle'}[r.res] || 'ci.rejTitle'; toast(t(k), ['present','late'].includes(r.res)?'ok':r.res==='duplicate'?'info':'bad'); const h = $('.result h2'); if (h){ h.setAttribute('tabindex','-1'); h.focus(); } };
SUB.ciCode = form => { const v = String(new FormData(form).get('code')||'').replace(/\D/g,''), inp = form.querySelector('input[name=code]'); if (v.length!==6){ form.querySelector('.ci-err').textContent = t('ci.sixDigits'); inp.setAttribute('aria-invalid','true'); inp.focus(); return; } V.ci.result = doCheckin(form.dataset.sid, v, 'code'); ciDone(); };
ACT.ciScan = el => { const s = sess(el.dataset.sid); V.ci.result = doCheckin(s.id, sessCode(s), 'qr'); ciDone(); };
ACT.ciSim = el => { const s = sess(el.dataset.sid); let code;
  if (el.dataset.k==='other'){ const o = S.sessions.find(x=>x.cohortId===s.cohortId && x.id!==s.id && x.status==='ended') || S.sessions.find(x=>x.id!==s.id); code = sessCode(o); }
  else code = String((Number(sessCode(s))+137911)%1000000).padStart(6,'0');
  V.ci.result = doCheckin(s.id, code, 'code'); ciDone(); };
ACT.ciRetry = () => { V.ci.result = null; render(); const i = $('.code-input'); i && i.focus(); };

