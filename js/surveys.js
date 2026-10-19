"use strict";

/* =====================================================================
   9c. COURSE SURVEYS (instructor-built feedback)
   Question types: rating (1–5), multiple choice, free text. Draft →
   explicit Publish → Close. Responses live in S.surveyResponses, apart
   from assessment attempts and scores. Staff see aggregates and
   unattributed comments; participants only ever see their own answers;
   clients see completion counts only. The platform's standard daily and
   final evaluations are unchanged.
   ===================================================================== */
const SV_KINDS = ['rating','choice','text'];
const surveysOf = cid => (S.surveys||[]).filter(x=>x.courseId===cid && !x.deleted);
const svResponses = sid => (S.surveyResponses||[]).filter(r=>r.surveyId===sid);
const svMine = (sid, paid) => (S.surveyResponses||[]).find(r=>r.surveyId===sid && r.participantId===paid);
/** Checklist status: not_started | draft | published */
function surveyStatus(cid){ const ss = surveysOf(cid); if (!ss.length) return 'not_started'; return ss.some(s=>s.status==='published' || s.status==='closed') ? 'published' : 'draft'; }
const svBlankQ = (kind='rating') => ({id:null, kind, text:'', options:kind==='choice'?['','','']:[], required:true});
const SV_STARTER = () => [
  {kind:'rating', text:T('Overall, how useful was this course for your work?','بشكل عام، ما مدى فائدة هذه الدورة لعملك؟')},
  {kind:'rating', text:T('How clear were the explanations and examples?','ما مدى وضوح الشرح والأمثلة؟')},
  {kind:'choice', text:T('How much of what you learned will you apply in the next month?','ما مقدار ما تعلمته الذي ستطبقه خلال الشهر القادم؟'), options:[T('Most of it','معظمه'), T('Some of it','بعضه'), T('Very little','القليل جدًا')]},
  {kind:'text', text:T('What should we improve next time?','ما الذي يجب تحسينه في المرة القادمة؟'), required:false},
].map((q,i)=>Object.assign({id:'sq'+i+uid('').slice(-4), options:[], required:true}, q));

/* ---------- Instructor tab ---------- */
function surveysTab(c){
  if (V.sv && V.sv.cid===c.id) return surveyEditor(c);
  const mine = can('content', c.id), list = surveysOf(c.id), n = courseParticipants(c.id).length;
  const cardFor = s => { const rs = svResponses(s.id).length, st = s.status;
    return `<div class="card card-b"><div class="row between"><h2>${LE(s.title)}</h2>${badge(st==='published'?'b-ok':st==='closed'?'':'b-info', t('sv.st.'+st))}</div>
      <div class="meta" style="margin:8px 0 10px"><span>${icon('list',13)}${t('nQuestions',{n:s.questions.length})}</span><span>${icon('users',13)}${t('sv.respN',{a:rs, b:n})}</span>${s.publishedAt?`<span>${icon('calendar',13)}${t('sv.publishedOn',{d:fmtDT(s.publishedAt)})}</span>`:''}</div>
      ${rs && st!=='draft' ? note(t('sv.lockedNote'), '', 'lock') : ''}
      <div class="row" style="margin-top:10px">${mine && !rs ? `<button class="btn btn-sm btn-primary" data-action="svEdit" data-id="${s.id}">${icon('edit',14)}${st==='draft'?t('continueEditing'):t('edit')}</button>` : ''}
        <button class="btn btn-sm" data-action="svPreview" data-id="${s.id}">${icon('eye',14)}${t('previewAsParticipant')}</button>
        ${rs ? `<button class="btn btn-sm" data-action="svResults" data-id="${s.id}">${icon('chart',14)}${t('sv.results')}</button>` : ''}
        ${mine && st==='published' ? `<button class="btn btn-sm btn-ghost" data-action="svClose" data-id="${s.id}">${t('sv.close')}</button>` : ''}${mine && st==='closed' ? `<button class="btn btn-sm btn-ghost" data-action="svReopen" data-id="${s.id}">${t('sv.reopen')}</button>` : ''}
        ${mine && st==='draft' && !rs ? `<button class="btn btn-sm btn-ghost" data-action="svDelete" data-id="${s.id}">${t('remove')}</button>` : ''}</div></div>`; };
  const create = mine ? `<div class="row"><button class="btn btn-primary" data-action="svNew" data-cid="${c.id}" data-k="starter">${icon('plus',15)}${t('sv.newStarter')}</button><button class="btn" data-action="svNew" data-cid="${c.id}" data-k="blank">${t('sv.newBlank')}</button></div>` : '';
  return `${note(t('sv.intro'), '', 'info')}<div class="stack" style="margin-top:14px">${list.length ? list.map(cardFor).join('') : card('', empty(t('sv.emptyT'), mine ? t('sv.emptyD') : t('sv.emptyRO'), 'clipboard'))}${create}</div>`;
}
ACT.svNew = el => { const c = course(el.dataset.cid); if (!c || !can('content', c.id)) return toast(t('ai.denied'),'bad');
  const s = {id:uid('sv'), courseId:c.id, title:T('Course feedback survey','استبيان رأي المشاركين في الدورة'), status:'draft', questions: el.dataset.k==='starter' ? SV_STARTER() : [], updatedAt:Date.now(), publishedAt:null};
  if (el.dataset.k!=='starter') s.title = bi(t('sv.untitled',null,true));
  V.sv = {cid:c.id, id:s.id, isNew:true, draft:s, q:svBlankQ()}; if (V.cw.tab!=='surveys') go('course', c.id, {tab:'surveys'}); else render(); };
function svOpenEditor(s){ V.sv = {cid:s.courseId, id:s.id, draft:JSON.parse(JSON.stringify(s)), q:svBlankQ()}; render(); }
ACT.svEdit = el => { const s = byId(S.surveys, el.dataset.id); if (!s || !can('content', s.courseId)) return toast(t('ai.denied'),'bad'); if (svResponses(s.id).length) return toast(t('sv.lockedNote'),'warn'); svOpenEditor(s); };
function surveyEditor(c){
  const E = V.sv, d = E.draft, Q = E.q, qs = d.questions, editing = Q.id && qs.some(x=>x.id===Q.id), n = editing ? qs.findIndex(x=>x.id===Q.id)+1 : qs.length+1;
  const list = qs.map((q,i)=>`<li class="item-row"><span class="badge b-navy nodot">${i+1}</span><div class="grow"><div class="small cell-main" dir="auto">${LE(q.text)}</div><div class="xs muted">${t('sv.k.'+q.kind)}${q.kind==='choice'?' · '+q.options.map(o=>esc(L(o))).join(' / '):''} · ${q.required?t('required'):t('optional')}</div></div>
    <div class="row" style="flex-wrap:nowrap"><button class="btn btn-sm" data-action="svQEdit" data-qid="${q.id}">${t('edit')}</button><button class="btn btn-sm btn-ghost" data-action="svMove" data-qid="${q.id}" data-k="-1" ${i===0?'disabled':''} aria-label="${esc(t('moveUp'))}">↑</button><button class="btn btn-sm btn-ghost" data-action="svMove" data-qid="${q.id}" data-k="1" ${i===qs.length-1?'disabled':''} aria-label="${esc(t('moveDown'))}">↓</button><button class="btn btn-sm btn-ghost" data-action="svDel" data-qid="${q.id}" aria-label="${esc(t('deleteQuestion'))}">${icon('x',14)}</button></div></li>`).join('');
  const panel = `<form id="svQForm" class="qe" data-submit="svQSave" novalidate><div class="qe-h"><h3>${editing?t('editQuestionN',{n}):t('addQuestionN',{n})}</h3>
      <div class="row" role="radiogroup" aria-label="${esc(t('questionType'))}">${SV_KINDS.map(k=>`<label class="check small"><input type="radio" name="svkind" value="${k}" data-change="svQKind" ${Q.kind===k?'checked':''}>${t('sv.k.'+k)}</label>`).join('')}</div></div>
    <label class="small cell-main" for="f-svtext">${t('questionText')}</label><textarea class="textarea" id="f-svtext" name="svtext" rows="2" style="min-height:56px;margin:4px 0 10px">${esc(Q.text)}</textarea>
    ${Q.kind==='choice' ? `<div class="small muted" style="margin-bottom:6px">${t('sv.optionsHelp')}</div>${Q.options.map((o,j)=>`<div class="opt-row" style="grid-template-columns:minmax(0,1fr)"><input class="input sv-opt" data-i="${j}" value="${esc(o)}" aria-label="${esc(t('optionN',{n:j+1},true))}"></div>`).join('')}${Q.options.length<6?`<button type="button" class="btn btn-sm btn-ghost" data-action="svQAddOpt">${icon('plus',13)}${t('addOption')}</button>`:''}`
      : Q.kind==='rating' ? `<p class="xs muted">${t('sv.ratingHelp')}</p>` : `<p class="xs muted">${t('sv.textHelp')}</p>`}
    <label class="check small" style="margin-top:8px"><input type="checkbox" name="svreq" ${Q.required?'checked':''}>${t('sv.requiredQ')}</label>
    <div id="svq-err"></div><div class="row" style="margin-top:8px"><button type="submit" class="btn btn-primary">${icon(editing?'check':'plus',14)}${editing?t('saveQuestion'):t('addQuestion')}</button>${editing?`<button type="button" class="btn" data-action="svQCancel">${t('cancel')}</button>`:''}</div></form>`;
  return `<div class="card card-b"><div class="section-label"><h2>${t('sv.editorTitle')}</h2>${badge(d.status==='published'?'b-ok':'b-info', t('sv.st.'+d.status))}</div>
    <p class="small muted" style="margin-bottom:12px">${t('sv.editorIntro')}</p>
    ${field('svtitle', t('sv.titleLbl')+' *', inp('svtitle', L(d.title)))}
    <div id="sv-err"></div>${qs.length ? `<ul class="list" style="margin-bottom:14px">${list}</ul>` : `<p class="small muted" style="margin-bottom:12px">${t('noQuestionsYet')}</p>`}${panel}<div class="divider"></div>
    <div class="row between"><button class="btn" data-action="svCancel">${t('backToList')}</button><div class="row"><button class="btn" data-action="svPreviewDraft">${icon('eye',14)}${t('preview')}</button><button class="btn" data-action="svSave" data-k="draft">${t('saveDraft')}</button><button class="btn btn-primary" data-action="svSave" data-k="publish">${icon('check',14)}${t('publish')}</button></div></div></div>`;
}
function svCollect(){ const E = V.sv; if (!E) return; const tt = $('#f-svtitle'); if (tt) E.draft.title = Object.assign({}, E.draft.title, {[LANG]:tt.value});
  const f = $('#svQForm'); if (!f) return; const Q = E.q; Q.text = f.svtext.value; Q.required = f.svreq.checked; if (Q.kind==='choice') $$('.sv-opt', f).forEach(o=>{ Q.options[Number(o.dataset.i)] = o.value; }); }
CHG.svQKind = el => { svCollect(); const Q = V.sv.q; Q.kind = el.value; if (Q.kind==='choice' && Q.options.length<2) Q.options = ['','','']; render(); $('#f-svtext')?.focus(); };
ACT.svQAddOpt = () => { svCollect(); V.sv.q.options.push(''); render(); const o = $$('.sv-opt').pop(); o && o.focus(); };
ACT.svQEdit = el => { svCollect(); const q = V.sv.draft.questions.find(x=>x.id===el.dataset.qid); V.sv.q = {id:q.id, kind:q.kind, text:L(q.text), options:q.options.map(o=>L(o)), required:q.required}; render(); const f = $('#f-svtext'); if (f){ f.focus(); f.scrollIntoView({block:'center'}); } };
ACT.svQCancel = () => { V.sv.q = svBlankQ(); render(); };
SUB.svQSave = () => { svCollect(); const E = V.sv, Q = E.q, errs = [], opts = Q.options.map(o=>o.trim()).filter(Boolean);
  if (!Q.text.trim()) errs.push(t('vErrTextOne')); if (Q.kind==='choice' && opts.length<2) errs.push(t('vErrOptionsOne'));
  if (Q.kind==='choice' && new Set(opts.map(o=>o.toLowerCase())).size!==opts.length) errs.push(t('ai.e.dupOption'));
  if (errs.length){ $('#svq-err').innerHTML = note(errs.join('<br>'), 'bad', 'alert') + '<div style="height:10px"></div>'; return; }
  const ex = Q.id && E.draft.questions.find(x=>x.id===Q.id), mk = (txt, old) => Object.assign({}, old && typeof old==='object' ? old : {}, {[LANG]:txt}, (old && old[LANG==='ar'?'en':'ar']) ? {} : {[LANG==='ar'?'en':'ar']:txt});
  const q = {id: ex ? ex.id : 'sq'+uid('').slice(-6), kind:Q.kind, text:mk(Q.text.trim(), ex && ex.text), options: Q.kind==='choice' ? opts.map((o,i)=>mk(o, ex && ex.options[i])) : [], required:Q.required};
  if (ex) Object.assign(ex, q); else E.draft.questions.push(q);
  E.q = svBlankQ(Q.kind); render(); toast(ex ? t('questionSaved') : t('questionAdded',{n:E.draft.questions.length})); $('#f-svtext')?.focus(); };
ACT.svMove = el => { svCollect(); const qs = V.sv.draft.questions, i = qs.findIndex(q=>q.id===el.dataset.qid), j = i+Number(el.dataset.k); if (j<0||j>=qs.length) return; [qs[i],qs[j]] = [qs[j],qs[i]]; render(); };
ACT.svDel = el => { svCollect(); V.sv.draft.questions = V.sv.draft.questions.filter(q=>q.id!==el.dataset.qid); if (V.sv.q.id===el.dataset.qid) V.sv.q = svBlankQ(); render(); toast(t('questionRemoved'),'info'); };
ACT.svCancel = () => { V.sv = null; render(); };
ACT.svSave = el => { svCollect(); const E = V.sv, d = E.draft, pub = el.dataset.k==='publish', errs = [];
  if (!can('content', E.cid)) return toast(t('ai.denied'),'bad');
  if (E.q && E.q.text.trim()){ $('#sv-err').innerHTML = note(t('unsavedQuestion'), 'warn', 'alert') + '<div style="height:12px"></div>'; return; }
  if (!L(d.title).trim()) errs.push(t('sv.e.title')); if (pub && !d.questions.length) errs.push(t('vErrNoQuestions'));
  if (errs.length){ $('#sv-err').innerHTML = note(`<b>${t('fixBeforeReady')}</b><ul style="margin:6px 0 0;padding-inline-start:18px">${errs.map(e=>`<li>${e}</li>`).join('')}</ul>`, 'bad', 'alert') + '<div style="height:12px"></div>'; return; }
  let s = byId(S.surveys, E.id); if (s && svResponses(s.id).length){ V.sv = null; render(); return toast(t('sv.lockedNote'),'warn'); }
  if (!s){ s = d; S.surveys.push(s); }
  Object.assign(s, {title:d.title, questions:d.questions, status: pub ? 'published' : 'draft', updatedAt:Date.now(), publishedAt: pub ? Date.now() : s.publishedAt || null});
  addLog(pub ? 'survey_publish' : 'survey_save', {course:s.courseId}); V.sv = null; save(); render(); toast(pub ? t('sv.publishedT') : t('draftSaved')); };
const svSet = (el, status, msg) => { const s = byId(S.surveys, el.dataset.id); if (!s || !can('content', s.courseId)) return toast(t('ai.denied'),'bad'); s.status = status; s.updatedAt = Date.now(); addLog('survey_publish', {course:s.courseId}); save(); render(); toast(t(msg)); };
ACT.svClose = el => svSet(el, 'closed', 'sv.closedT');
ACT.svReopen = el => svSet(el, 'published', 'sv.publishedT');
ACT.svDelete = el => { const s = byId(S.surveys, el.dataset.id); if (!s || !can('content', s.courseId) || svResponses(s.id).length) return;
  confirmModal(t('remove'), t('sv.deleteQ', {s:L(s.title)}), t('remove'), ()=>{ s.deleted = true; addLog('survey_save', {course:s.courseId}); save(); render(); toast(t('sv.deletedT')); }, true); };

/* ---------- Participant form (also used for the instructor preview) ---------- */
function svFormHtml(s, preview, paid){
  const qs = s.questions.map((q,i)=>{ const name = 'q_'+q.id, req = q.required ? ' *' : ` <span class="xs muted">(${t('optional')})</span>`;
    const ctl = q.kind==='rating' ? `<div class="stars" role="radiogroup" aria-label="${esc(L(q.text))}">${[1,2,3,4,5].map(v=>`<label title="${v}/5"><input type="radio" name="${name}" value="${v}"><span>${v}</span><span class="sr-only"> / 5</span></label>`).join('')}</div><div class="xs muted row between" style="max-width:260px"><span>${t('sv.low')}</span><span>${t('sv.high')}</span></div>`
      : q.kind==='choice' ? q.options.map((o,j)=>`<label class="opt"><input type="radio" name="${name}" value="${j}"><span dir="auto">${LE(o)}</span></label>`).join('')
      : `<textarea class="textarea" name="${name}" rows="3" maxlength="2000" aria-label="${esc(L(q.text))}"></textarea>`;
    return `<fieldset class="sv-q"><legend class="q-text small" dir="auto">${i+1}. ${LE(q.text)}${req}</legend>${ctl}<span class="err small" id="e-${name}" role="alert" style="color:var(--bad);font-weight:600;display:block;margin-top:4px"></span></fieldset>`; }).join('');
  return `<form data-submit="svSubmit" data-id="${s.id}" data-pid="${paid||''}" ${preview?'data-preview="1"':''} novalidate>${preview ? note(t('sv.previewNote'), 'sim', 'eye') : note(t('sv.privacyP'), '', 'shield')}<div class="stack-sm" style="margin-top:12px">${qs}</div></form>`;
}
ACT.svPreview = el => { const s = byId(S.surveys, el.dataset.id); if (!s) return; svShowPreview(s); };
ACT.svPreviewDraft = () => { svCollect(); svShowPreview(V.sv.draft); };
function svShowPreview(s){ if (!s.questions.length) return toast(t('noQuestions'),'warn');
  openModal({title:`${LE(s.title)} — ${t('previewMode')}`, size:'lg', body:svFormHtml(s, true), footer:`<button class="btn" data-action="closeModal">${t('close')}</button><button class="btn btn-primary" data-action="submitForm">${t('sv.submit')}</button>`}); }
ACT.svOpen = el => { const s = byId(S.surveys, el.dataset.id), paid = myPid(s.courseId);
  if (!s || s.status!=='published' || role()!=='participant' || !paid) return toast(t('sv.notOpen'),'warn');
  if (svMine(s.id, paid)) return toast(t('alreadySubmitted'),'info');
  openModal({title:LE(s.title), size:'lg', body:svFormHtml(s, false, paid), footer:`<button class="btn" data-action="closeModal">${t('cancel')}</button><button class="btn btn-primary" data-action="submitForm">${t('sv.submit')}</button>`}); };
SUB.svSubmit = form => { const s = byId(S.surveys, form.dataset.id) || (V.sv && V.sv.draft.id===form.dataset.id ? V.sv.draft : null), fd = new FormData(form), errs = {}, answers = {};
  s.questions.forEach(q=>{ const v = fd.get('q_'+q.id), txt = v==null ? '' : String(v).trim();
    if (q.required && !txt) errs['q_'+q.id] = q.kind==='text' ? t('sv.e.text') : t('sv.e.pick');
    if (txt) answers[q.id] = q.kind==='text' ? txt.slice(0,2000) : Number(txt); });
  $$('.err', form).forEach(e=>e.textContent=''); Object.entries(errs).forEach(([k,v])=>{ const e = $('#e-'+k, form); if (e) e.textContent = v; });
  if (Object.keys(errs).length){ const first = form.querySelector(`[name="${Object.keys(errs)[0]}"]`); first && first.focus(); return; }
  if (form.dataset.preview){ setModal(`<div class="result r-dup"><div class="ring">${icon('eye',34)}</div><h2>${t('previewDone')}</h2><p class="small muted">${t('sv.previewDone')}</p></div>`, `<button class="btn btn-primary" data-action="closeModal">${t('close')}</button>`); return; }
  const paid = form.dataset.pid; if (role()!=='participant' || myPid(s.courseId)!==paid || s.status!=='published') return toast(t('sv.notOpen'),'warn');
  if (svMine(s.id, paid)){ closeModal(); return toast(t('alreadySubmitted'),'info'); }
  S.surveyResponses.push({id:uid('sr'), surveyId:s.id, courseId:s.courseId, participantId:paid, at:Date.now(), answers});
  addLog('survey_response', {course:s.courseId, pid:paid}); save();
  setModal(`<div class="result r-ok"><div class="ring">${icon('checkCircle',36)}</div><h2>${t('thanksEval')}</h2><p class="small muted">${t('sv.thanks')}</p></div>`, `<button class="btn btn-primary" data-action="closeModal">${t('close')}</button>`); render(); };
/** To-do items for one enrollment (published surveys). */
function surveyTodos(pa){ const c = courseOfPa(pa); return surveysOf(c.id).filter(s=>s.status==='published' || (s.status==='closed' && svMine(s.id, pa.id))).map(s=>{ const r = svMine(s.id, pa.id);
  return {k:'survey', req:false, title:L(s.title), sub: r ? t('submittedAt',{t:fmtDT(r.at)}) : t('sv.todoHelp',{n:s.questions.length}), state: r ? 'completed' : 'open', due: cohortEnd(pa.cohortId), btn: r ? '' : `<button class="btn btn-sm btn-primary" data-action="svOpen" data-id="${s.id}">${t('sv.answer')}</button>`}; }); }

/* ---------- Results: aggregates for staff, completion only for clients ---------- */
ACT.svResults = el => { const s = byId(S.surveys, el.dataset.id), r = role();
  if (!s || !canSeeCourse(s.courseId) || !['admin','coordinator','trainer'].includes(r)) return toast(t('ai.denied'),'bad');
  const rs = svResponses(s.id), n = courseParticipants(s.courseId).length;
  const body = s.questions.map((q,i)=>{ const vals = rs.map(x=>x.answers[q.id]).filter(v=>v!=null && v!==''), k = vals.length;
    let agg = '';
    if (q.kind==='rating'){ const avg = k ? vals.reduce((a,b)=>a+b,0)/k : null; agg = `<div class="small" style="margin-bottom:6px">${t('sv.avg')}: <b>${avg==null?'—':avg.toFixed(1)}</b> / 5 · ${t('sv.nAnswers',{n:k})}</div>${[5,4,3,2,1].map(v=>{ const c = vals.filter(x=>x===v).length; return svBar(String(v), c, k); }).join('')}`; }
    if (q.kind==='choice') agg = `<div class="xs muted" style="margin-bottom:6px">${t('sv.nAnswers',{n:k})}</div>` + q.options.map((o,j)=>svBar(L(o), vals.filter(x=>x===j).length, k)).join('');
    if (q.kind==='text') agg = k ? `<ul class="list sv-comments">${vals.map(v=>`<li class="small" dir="auto">${esc(v)}</li>`).join('')}</ul>` : `<p class="small muted">${t('sv.noComments')}</p>`;
    return `<section style="margin-bottom:16px"><h3 style="font-size:14px;margin-bottom:6px" dir="auto">${i+1}. ${LE(q.text)}</h3>${agg}</section>`; }).join('');
  openModal({title:`${LE(s.title)} — ${t('sv.results')}`, size:'lg', body:`<p class="small" style="margin-bottom:12px">${t('sv.respN',{a:rs.length, b:n})}</p>${note(t('sv.anonNote'),'', 'shield')}<div style="margin-top:14px">${body}</div>`}); };
const svBar = (label, c, k) => `<div class="hbar-row"><span class="small" dir="auto">${esc(label)}</span><div class="hbar" aria-hidden="true"><span style="width:${k?c/k*100:0}%"></span></div><span class="small num">${c}</span></div>`;
/** Summary line for progress views (all staff roles and the client). */
function surveySummary(cid){ const ss = surveysOf(cid).filter(s=>s.status!=='draft'); if (!ss.length) return '';
  const n = courseParticipants(cid).length, staff = ['admin','coordinator','trainer'].includes(role());
  return card(t('sv.cardTitle'), `<ul class="list">${ss.map(s=>`<li class="row between"><div><div class="small cell-main">${LE(s.title)}</div><div class="xs muted">${t('sv.respN',{a:svResponses(s.id).length, b:n})} · ${t('sv.st.'+s.status)}</div></div>${staff && svResponses(s.id).length ? `<button class="btn btn-sm" data-action="svResults" data-id="${s.id}">${t('sv.results')}</button>` : ''}</li>`).join('')}</ul>${staff?'':`<p class="xs muted" style="margin-top:8px">${t('sv.clientNote')}</p>`}`); }
