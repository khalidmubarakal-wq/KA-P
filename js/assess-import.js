"use strict";

/* =====================================================================
   9b. ASSESSMENT IMPORT FROM THE STANDARD EXCEL TEMPLATE (instructor)
   Template download → upload → row-by-row validation → review in the
   existing assessment editor → instructor saves a draft / publishes.
   Parsing and validation (aiParse*) are pure; nothing here writes to S.
   ===================================================================== */
const AI_MAX_BYTES = 5e6, AI_MAX_Q = 200, AI_MAX_TEXT = 1000, AI_MAX_OPT = 300, AI_LETTERS = ['A','B','C','D','E','F'];
/** Fixed template schema. Header cells read "English · Arabic"; either part (or both) is accepted. */
const AI_COLS = [
  {k:'num',  en:'Question number', ar:'رقم السؤال', req:true, w:12},
  {k:'type', en:'Question type', ar:'نوع السؤال', req:true, w:20},
  {k:'text', en:'Question text', ar:'نص السؤال', req:true, w:50},
  ...AI_LETTERS.map((l,i)=>({k:'opt'+l, en:'Option '+l, ar:'الخيار '+l, req:i<2, w:24})),
  {k:'correct', en:'Correct answer', ar:'الإجابة الصحيحة', req:true, w:16},
  {k:'points', en:'Points', ar:'الدرجة', req:false, w:10},
  {k:'obj', en:'Learning objective', ar:'هدف التعلم', req:false, w:16},
];
const AI_SHEET = {en:'Questions', ar:'الأسئلة'}, AI_SHEET_HELP = {en:'Instructions', ar:'التعليمات'};
const AI_TEMPLATE_ROWS = 100;
/** Normalize a token for matching (case, spaces, punctuation, Arabic letter variants, diacritics). */
const aiTok = s => String(s ?? '').normalize('NFKC').toLowerCase().replace(/[ً-ٟـ]/g,'').replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').replace(/[\s\-_/\\|·.,:;()'"“”«»]+/g,'');
const AI_TYPES = {
  mcq:   ['mcq','multiplechoice','multiple choice question','اختيار من متعدد','اختيارمتعدد','متعدد'],
  tf:    ['tf','truefalse','true or false','صح / خطأ','صح أو خطأ','صحيح أو خطأ','صح خطأ'],
  short: ['short','shortanswer','openanswer','open','إجابة قصيرة','إجابة مفتوحة','سؤال مفتوح'],
};
const AI_UNSUPPORTED = ['fillintheblank','fillblank','blank','findtheerror','finderror','matching','match','ordering','essay','numeric','ملءالفراغ','املاالفراغ','اكملالفراغ','اكتشفالخطا','صوبالخطا','توصيل','مزاوجه','ترتيب'];
const AI_TRUE = ['true','t','صحيح','صح'].map(aiTok), AI_FALSE = ['false','f','خطا','خطأ'].map(aiTok);
const AI_AR_LETTERS = {'ا':'A','ب':'B','ج':'C','د':'D','ه':'E','و':'F'};
function aiKind(v){ const k = aiTok(v); if (!k) return null; for (const [kind, names] of Object.entries(AI_TYPES)) if (names.some(n=>aiTok(n)===k) || aiTok(t('qk.'+kind,null,true))===k || aiTok(STR['qk.'+kind][0])===k || aiTok(STR['qk.'+kind][1])===k) return kind; return AI_UNSUPPORTED.includes(k) ? 'unsupported' : 'unknown'; }
const aiTypeLabel = k => t('qk.'+k, null, true);

/** Locate the header row and map columns. Returns {hdrRow, map:{key:index}, unknown:[{i,name}], missing:[cols]} */
function aiParseHeader(rows){
  const match = cell => { const parts = String(cell||'').split(/[·|\n]|\s\/\s/).map(aiTok).filter(Boolean), whole = aiTok(cell);
    return AI_COLS.find(c => [aiTok(c.en), aiTok(c.ar), aiTok(c.en+c.ar)].some(x=>x===whole || parts.includes(x))); };
  for (const r of rows.slice(0, 10)){
    const map = {}, unknown = []; r.cells.forEach((cell,i)=>{ if (!cell) return; const c = match(cell); if (c && map[c.k]==null) map[c.k] = i; else if (!c) unknown.push({i, name:cell}); });
    if (Object.keys(map).length >= 3) return {hdrRow:r.n, map, unknown, missing: AI_COLS.filter(c=>c.req && map[c.k]==null)};
  }
  return null;
}
/**
 * Validate data rows against the schema for one course. Pure: returns
 * {questions:[platform question objects], issues:[{row, q, sev:'error'|'warn', msg}], points}
 */
function aiParseRows(rows, hdr, c){
  const issues = [], out = [], seen = new Map(), get = (r,k) => hdr.map[k]==null ? '' : String(r.cells[hdr.map[k]] ?? '').trim();
  const err = (row, q, k, p) => issues.push({row, q, sev:'error', msg:t('ai.e.'+k, p, true)}), warn = (row, q, k, p) => issues.push({row, q, sev:'warn', msg:t('ai.w.'+k, p, true)});
  const objs = c.objectives || [], noObj = [];
  for (const r of rows.filter(r=>r.n>hdr.hdrRow)){
    const v = {}; AI_COLS.forEach(col=>{ v[col.k] = get(r, col.k); });
    if (!AI_COLS.some(col=>v[col.k])) continue; // fully empty row
    if (Object.values(v).some(x=>/^#(N\/A|VALUE!|REF!|DIV\/0!|NAME\?|NUM!|NULL!)$/.test(x))){ err(r.n, v.num||'—', 'excelError'); continue; }
    const content = ['type','text','correct',...AI_LETTERS.map(l=>'opt'+l)].some(k=>v[k]);
    if (!content){ err(r.n, v.num||'—', 'onlyNumber'); continue; }
    const before = issues.filter(i=>i.sev==='error').length;
    // Question number
    let num = null;
    if (!v.num) err(r.n, '—', 'noNumber');
    else if (!/^\d+(\.0+)?$/.test(v.num) || Number(v.num)<1) err(r.n, v.num, 'badNumber', {v:v.num});
    else { num = Number(v.num); if (seen.has(num)) err(r.n, num, 'dupNumber', {n:num, r:seen.get(num)}); else seen.set(num, r.n); }
    const q = num ?? (v.num || '—');
    // Type
    const kind = aiKind(v.type);
    if (!v.type) err(r.n, q, 'noType');
    else if (kind==='unsupported' || kind==='unknown') err(r.n, q, kind==='unsupported'?'unsupportedType':'unknownType', {v:v.type, list:['mcq','tf','short'].map(aiTypeLabel).join(' / ')});
    // Text
    if (!v.text) err(r.n, q, 'noText'); else if (v.text.length>AI_MAX_TEXT) err(r.n, q, 'longText', {n:AI_MAX_TEXT});
    // Options, answer, points by type
    const opts = AI_LETTERS.map(l=>v['opt'+l]); let lastFilled = -1; opts.forEach((o,i)=>{ if (o) lastFilled = i; });
    let correct = null, options = [];
    if (kind==='mcq'){
      const gap = opts.slice(0, lastFilled+1).findIndex(o=>!o);
      if (lastFilled < 1) err(r.n, q, 'fewOptions');
      else if (gap>=0) err(r.n, q, 'optionGap', {l:AI_LETTERS[gap]});
      opts.forEach((o,i)=>{ if (o.length>AI_MAX_OPT) err(r.n, q, 'longOption', {l:AI_LETTERS[i], n:AI_MAX_OPT}); });
      const lowered = opts.slice(0,lastFilled+1).map(aiTok); if (lowered.some((x,i)=>x && lowered.indexOf(x)!==i)) err(r.n, q, 'dupOption');
      options = opts.slice(0, lastFilled+1);
      const ans = String(v.correct).trim(), L1 = ans.toUpperCase(), L2 = AI_AR_LETTERS[aiTok(ans)] || (/^[A-F]$/.test(L1) ? L1 : null);
      if (!ans) err(r.n, q, 'noCorrect');
      else if (!L2) err(r.n, q, 'badLetter', {v:ans});
      else if (!opts[AI_LETTERS.indexOf(L2)]) err(r.n, q, 'letterEmpty', {l:L2});
      else correct = AI_LETTERS.indexOf(L2);
    } else if (kind==='tf'){
      if (lastFilled>=0) warn(r.n, q, 'tfOptionsIgnored');
      const a = aiTok(v.correct);
      if (!a) err(r.n, q, 'noCorrect'); else if (AI_TRUE.includes(a)) correct = 0; else if (AI_FALSE.includes(a)) correct = 1; else err(r.n, q, 'badTf', {v:v.correct});
    } else if (kind==='short'){
      if (lastFilled>=0) warn(r.n, q, 'shortOptionsIgnored');
      if (v.correct) warn(r.n, q, 'shortAnswerIgnored');
    }
    // Points: the platform scores 1 per auto-graded question; short answers are not scored
    let pts = kind==='short' ? 0 : 1;
    if (v.points){ const n = Number(v.points.replace(',','.'));
      if (!isFinite(n) || !/^-?\d+([.,]\d+)?$/.test(v.points)) err(r.n, q, 'badPoints', {v:v.points});
      else if (n<0) err(r.n, q, 'negPoints', {v:v.points});
      else if (kind==='short' && n!==0) err(r.n, q, 'shortPoints', {v:v.points});
      else if ((kind==='mcq' || kind==='tf') && n!==1) err(r.n, q, 'fixedPoints', {v:v.points}); }
    // Learning objective (number from the template's list)
    let obj = objs[0]?.id || 'O1';
    if (v.obj){ const n = Number(v.obj), byNum = Number.isInteger(n) && objs[n-1], byId = objs.find(o=>aiTok(o.id)===aiTok(v.obj));
      if (!objs.length) warn(r.n, q, 'noObjectives');
      else if (byNum || byId) obj = (byNum || byId).id;
      else err(r.n, q, 'badObjective', {v:v.obj, n:objs.length}); }
    else if (objs.length) noObj.push(q);
    if (issues.filter(i=>i.sev==='error').length > before) continue;
    out.push({num, row:r.n, pts, q:{id:null, kind, obj, required:true, text:bi(v.text),
      options: kind==='tf' ? [T('True','صحيح'), T('False','خطأ')] : options.map(bi), correct: kind==='short' ? null : correct}});
  }
  if (noObj.length && objs.length) issues.push({row:'—', q:noObj.join(', '), sev:'warn', msg:t('ai.w.defaultObjective', {o:L(objs[0])}, true)});
  out.sort((a,b)=>a.num-b.num);
  return {items: out, questions: out.map(x=>x.q), issues, points: out.reduce((s,x)=>s+x.pts, 0)};
}
/** Stable fingerprint of a question's content (for duplicate detection). */
const aiQKey = q => aiTok([q.kind, L(q.text), (q.options||[]).map(o=>L(o)).join('|'), q.correct].join('#'));
const aiFileHash = qs => (hash32(qs.map(aiQKey).join('\n')).toString(36) + '-' + qs.length);
/** Full check of an uploaded file (format, sheets, columns, rows). Throws only for unreadable files. */
async function aiCheckFile(file, c){
  const res = {fileErrors:[], issues:[], questions:[], items:[], points:0, hdr:null};
  if (!/\.xlsx$/i.test(file.name)){ res.fileErrors.push(t(/\.(xls|csv|ods|numbers)$/i.test(file.name) ? 'ai.f.convert' : 'ai.f.ext', null, true)); return res; }
  if (file.size > AI_MAX_BYTES){ res.fileErrors.push(t('ai.f.size', {n:fmtSize(AI_MAX_BYTES)}, true)); return res; }
  if (!file.size){ res.fileErrors.push(t('ai.f.empty', null, true)); return res; }
  const head = new Uint8Array(await file.slice(0,4).arrayBuffer());
  if (!(head[0]===0x50 && head[1]===0x4B && head[2]===3 && head[3]===4)){ res.fileErrors.push(t('ai.f.notXlsx', null, true)); return res; }
  const x = await openXlsx(file);
  const sheet = x.sheets.find(n=>[AI_SHEET.en, AI_SHEET.ar].map(aiTok).includes(aiTok(n)));
  if (!sheet){ res.fileErrors.push(t('ai.f.noSheet', {a:AI_SHEET.en, b:AI_SHEET.ar, list:x.sheets.join(', ')||'—'}, true)); return res; }
  const rows = await x.rows(sheet), hdr = aiParseHeader(rows); res.hdr = hdr;
  if (!hdr){ res.fileErrors.push(t('ai.f.noHeader', null, true)); return res; }
  if (hdr.missing.length){ res.fileErrors.push(t('ai.f.missingCols', {list:hdr.missing.map(col=>`${col.en} · ${col.ar}`).join(', ')}, true)); return res; }
  hdr.unknown.forEach(u=>res.issues.push({row:hdr.hdrRow, q:'—', sev:'warn', msg:t('ai.w.unknownCol', {c:colName(u.i), v:u.name}, true)}));
  const p = aiParseRows(rows, hdr, c); res.issues = res.issues.concat(p.issues); Object.assign(res, {questions:p.questions, items:p.items, points:p.points});
  if (!p.questions.length && !p.issues.some(i=>i.sev==='error')) res.fileErrors.push(t('ai.f.noRows', null, true));
  if (p.questions.length > AI_MAX_Q) res.fileErrors.push(t('ai.f.tooMany', {n:AI_MAX_Q}, true));
  return res;
}

/* ---------- Template download ---------- */
function aiTemplateBlob(c){
  const ar = LANG==='ar', tt = k => t(k, null, true), objs = c.objectives || [];
  const head = AI_COLS.map(col=>({v:`${col.en} · ${col.ar}`, style:'h'}));
  const ex = [ // shown on the Instructions sheet only, so they are never imported by mistake
    [1, aiTypeLabel('mcq'), tt('ai.ex.q1'), tt('ai.ex.q1a'), tt('ai.ex.q1b'), tt('ai.ex.q1c'), tt('ai.ex.q1d'), '', '', 'B', 1, objs.length?1:''],
    [2, aiTypeLabel('tf'), tt('ai.ex.q2'), '', '', '', '', '', '', tt('true'), 1, objs.length?1:''],
    [3, aiTypeLabel('short'), tt('ai.ex.q3'), '', '', '', '', '', '', '', 0, ''],
  ];
  const help = [[{v:tt('ai.tpl.title'), style:'b'}], [tt('ai.tpl.course')+': '+L(c.title)], [],
    [{v:tt('ai.tpl.howH'), style:'b'}], ...['ai.tpl.how1','ai.tpl.how2','ai.tpl.how3','ai.tpl.how4','ai.tpl.how5'].map(k=>[{v:tt(k), style:'w'}]), [],
    [{v:tt('ai.tpl.typesH'), style:'b'}],
    [`${aiTypeLabel('mcq')}: ${tt('ai.tpl.mcq')}`], [`${aiTypeLabel('tf')}: ${tt('ai.tpl.tf')}`], [`${aiTypeLabel('short')}: ${tt('ai.tpl.short')}`], [{v:tt('ai.tpl.notSupported'), style:'w'}], [],
    [{v:tt('ai.tpl.colsH'), style:'b'}],
    ...AI_COLS.map(col=>[`${col.en} · ${col.ar}`, col.req ? tt('ai.tpl.required') : tt('ai.tpl.optionalCol'), {v:tt('ai.col.'+col.k), style:'w'}]), [],
    [{v:tt('ai.tpl.objH'), style:'b'}], ...(objs.length ? objs.map((o,i)=>[i+1, L(o)]) : [[tt('ai.tpl.noObj')]]), [],
    [{v:tt('ai.tpl.exH'), style:'b'}], head, ...ex, [],
    [{v:tt('ai.tpl.moreH'), style:'b'}], [{v:tt('ai.tpl.more'), style:'w'}]];
  const last = AI_TEMPLATE_ROWS+1, col = k => colName(AI_COLS.findIndex(x=>x.k===k));
  const validations = [
    {sqref:`${col('type')}2:${col('type')}${last}`, type:'list', list:['mcq','tf','short'].map(aiTypeLabel), strict:true, prompt:tt('ai.dv.type'), error:tt('ai.dv.typeErr')},
    {sqref:`${col('correct')}2:${col('correct')}${last}`, type:'list', list:[...AI_LETTERS, tt('true'), tt('false')], prompt:tt('ai.dv.correct'), error:tt('ai.dv.correctErr')},
    {sqref:`${col('points')}2:${col('points')}${last}`, type:'whole', min:0, max:1, strict:true, prompt:tt('ai.dv.points'), error:tt('ai.dv.pointsErr')},
    {sqref:`${col('num')}2:${col('num')}${last}`, type:'whole', min:1, max:9999, strict:true, prompt:tt('ai.dv.num'), error:tt('ai.dv.numErr')},
  ];
  if (objs.length) validations.push({sqref:`${col('obj')}2:${col('obj')}${last}`, type:'whole', min:1, max:objs.length, strict:true, prompt:t('ai.dv.obj',{n:objs.length},true), error:t('ai.dv.obj',{n:objs.length},true)});
  return writeXlsx([
    {name: ar ? AI_SHEET_HELP.ar : AI_SHEET_HELP.en, rtl:ar, cols:[34,18,70,24,24,24,24,10,10,16,10,16], rows:help},
    {name: ar ? AI_SHEET.ar : AI_SHEET.en, rtl:ar, freeze:1, cols:AI_COLS.map(x=>x.w), rows:[head], validations},
  ]);
}
ACT.aiTemplate = el => { const c = course(el.dataset.cid); if (!c || !can('content', c.id)) return toast(t('ai.denied'),'bad');
  if (downloadBlob(`assessment-template-${c.code||c.id}.xlsx`, aiTemplateBlob(c))) toast(t('templateDownloaded'),'info'); };

/* ---------- Import dialog ---------- */
let AIMP = null;
/** Where an import for (course, type) would go, and whether it may. */
function aiTarget(cid, type){
  const a = curAssessment(cid, type), qs = a ? questionsOf(a) : [], open = V.ab && V.ab.kind==='assessment' && V.ab.courseId===cid && V.ab.draft.type===type;
  const draftQs = open ? (V.ab.draft.sameAsPre && type==='post' ? [] : V.ab.draft.questions) : (a && !(a.type==='post' && a.sameAsPre) ? a.questions : []);
  return {a, open, locked: isLocked(a), existing: draftQs, sharedPre: !!(a && a.type==='post' && a.sameAsPre && !open) || !!(open && V.ab.draft.sameAsPre)};
}
ACT.aiOpen = el => { const c = course(el.dataset.cid); if (!c || !can('content', c.id)) return toast(t('ai.denied'),'bad');
  const fixed = !!el.dataset.fixed; AIMP = {cid:c.id, type: el.dataset.k || 'pre', fixed, file:null, res:null, mode:'replace', busy:false};
  openModal({title:t('ai.title'), size:'lg', body:aiBody(), footer:aiFooter(), onClose:()=>{ AIMP = null; }}); };
function aiBody(){
  const A = AIMP, c = course(A.cid), T0 = aiTarget(A.cid, A.type), nm = t(A.type==='pre'?'preAssessment':'postAssessment');
  const cat = A.fixed ? `<p class="small" style="margin-bottom:10px">${t('ai.category')}: <b>${nm}</b></p>`
    : `<fieldset class="field" style="border:0;padding:0;margin:0 0 12px"><legend class="lbl">${t('ai.category')}</legend><div class="row">${['pre','post'].map(k=>`<label class="check"><input type="radio" name="aitype" value="${k}" data-change="aiType" ${A.type===k?'checked':''}>${t(k==='pre'?'preAssessment':'postAssessment')}</label>`).join('')}</div></fieldset>`;
  const state = T0.locked ? note(t('ai.locked', {a:nm}), 'bad', 'lock')
    : T0.a && T0.a.status==='ready' ? note(t('ai.publishedNote', {a:nm}), 'warn', 'alert')
    : T0.sharedPre && A.type==='post' ? note(t('ai.sharedPre'), 'warn', 'info') : '';
  const steps = `<ol class="ai-steps"><li><div class="cell-main small">${t('ai.step1')}</div><div class="xs muted">${t('ai.step1h')}</div>
      <button type="button" class="btn btn-sm" style="margin-top:6px" data-action="aiTemplate" data-cid="${c.id}">${icon('download',14)}${t('ai.download')}</button></li>
    <li><div class="cell-main small">${t('ai.step2')}</div><div class="xs muted">${t('ai.step2h', {n:fmtSize(AI_MAX_BYTES)})}</div>
      <div class="file-drop" style="margin-top:6px"><input id="f-aifile" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" class="sr-only" data-change="aiFile" ${T0.locked||A.busy?'disabled':''} aria-describedby="ai-status">
        <label class="btn btn-primary" for="f-aifile" ${T0.locked?'aria-disabled="true" style="opacity:.55;pointer-events:none"':''}>${icon('upload',15)}${A.file ? t('ai.chooseAnother') : t('ai.choose')}</label>
        <p class="small" id="ai-status" role="status" aria-live="polite" style="margin-top:8px">${A.busy ? `<span class="spinner" aria-hidden="true"></span> ${t('ai.reading', {f:esc(A.file.name)})}` : A.file ? `${esc(A.file.name)} · ${fmtSize(A.file.size)}` : ''}</p></div></li></ol>`;
  return `<div class="note" style="margin-bottom:12px">${icon('book',16)}<div>${t('ai.into')}: <b>${LE(c.title)}</b> · ${LE(program(c.programId).title)}<div class="xs">${t('ai.nothingSaved')}</div></div></div>${cat}${state}${steps}<div id="ai-result">${A.res ? aiResult() : ''}</div>`;
}
function aiResult(){
  const A = AIMP, R = A.res, T0 = aiTarget(A.cid, A.type);
  if (R.crash) return note(`<b>${t('ai.unreadable')}</b><div>${esc(R.crash)}</div>`, 'bad', 'alert');
  if (R.fileErrors.length) return note(`<b>${t('ai.fileProblem')}</b><ul style="margin:6px 0 0;padding-inline-start:18px">${R.fileErrors.map(e=>`<li>${esc(e)}</li>`).join('')}</ul><div class="xs" style="margin-top:6px">${t('ai.fixAndRetry')}</div>`, 'bad', 'alert');
  const errs = R.issues.filter(i=>i.sev==='error'), warns = R.issues.filter(i=>i.sev==='warn');
  const have = new Set(T0.existing.map(aiQKey)), dupQs = R.questions.filter(q=>have.has(aiQKey(q))), hash = aiFileHash(R.questions);
  const prev = S.assessments.filter(a=>a.courseId===A.cid).flatMap(a=>(a.imports||[]).filter(x=>x.hash===hash).map(x=>({a, x})));
  const gradableN = R.questions.filter(gradable).length;
  const summary = `<div class="row" style="margin:14px 0 8px">${badge('b-info', t('nQuestions',{n:R.questions.length}))}${badge('b-info', t('ai.nPoints',{n:R.points}))}${badge(errs.length?'b-bad':'b-ok', t('ai.nErrors',{n:errs.length}))}${badge(warns.length?'b-warn':'', t('ai.nWarnings',{n:warns.length}))}</div>
    <p class="xs muted">${t('ai.byType', {m:R.questions.filter(q=>q.kind==='mcq').length, t:R.questions.filter(q=>q.kind==='tf').length, s:R.questions.filter(q=>q.kind==='short').length, g:gradableN})}</p>`;
  const report = R.issues.length ? `<h3 style="margin:12px 0 6px">${t('ai.report')}</h3><div class="table-wrap" style="border:1px solid var(--g-200);border-radius:8px;max-height:260px"><table class="tbl"><caption class="sr-only">${t('ai.report')}</caption><thead><tr><th scope="col">${t('imp.row')}</th><th scope="col">${t('ai.qNo')}</th><th scope="col">${t('ai.severity')}</th><th scope="col">${t('ai.problem')}</th></tr></thead><tbody>${R.issues.slice().sort((a,b)=>(a.sev===b.sev?0:a.sev==='error'?-1:1) || (Number(a.row)||0)-(Number(b.row)||0)).map(i=>`<tr><td class="num">${esc(i.row)}</td><td class="num">${esc(i.q)}</td><td>${i.sev==='error'?badge('b-bad', t('ai.error')):badge('b-warn', t('ai.warning'))}</td><td class="small">${esc(i.msg)}</td></tr>`).join('')}</tbody></table></div>` : '';
  const blocked = errs.length ? note(`<b>${t('ai.blocked', {n:errs.length})}</b><div class="xs">${t('ai.fixAndRetry')}</div>`, 'bad', 'alert') : '';
  const dupNote = !errs.length && prev.length ? note(t('ai.sameFile', {a:t(prev[0].a.type==='pre'?'preAssessment':'postAssessment', null, true), v:prev[0].a.version, d:fmtDT(prev[0].x.at)}), 'warn', 'copy') : '';
  const mode = !errs.length && T0.existing.length ? `<fieldset class="field" style="border:0;padding:0;margin:12px 0 0"><legend class="lbl">${t('ai.modeQ', {n:T0.existing.length})}</legend>
    <label class="check"><input type="radio" name="aimode" value="replace" data-change="aiMode" ${A.mode==='replace'?'checked':''}>${t('ai.replace', {n:T0.existing.length})}</label>
    <label class="check"><input type="radio" name="aimode" value="add" data-change="aiMode" ${A.mode==='add'?'checked':''}>${t('ai.add', {n:R.questions.length-dupQs.length, d:dupQs.length})}</label></fieldset>` : '';
  const objName = id => esc(L(course(A.cid).objectives.find(o=>o.id===id)) || '—');
  const preview = !errs.length && R.questions.length ? `<h3 style="margin:14px 0 6px">${t('ai.preview')}</h3><ul class="list ai-preview">${R.items.map(it=>{ const q = it.q;
      return `<li class="item-row"><span class="badge b-navy nodot">${it.num}</span><div class="grow"><div class="small cell-main" dir="auto">${LE(q.text)}</div>
      ${q.kind==='mcq' ? `<ol class="ai-opts">${q.options.map((o,i)=>`<li${i===q.correct?' class="ok"':''}><span class="ltr">${AI_LETTERS[i]}</span> <span dir="auto">${LE(o)}</span>${i===q.correct?` ${icon('check',13)}<span class="sr-only">${t('correctAnswer')}</span>`:''}</li>`).join('')}</ol>` : ''}
      <div class="xs muted">${aiTypeLabel(q.kind)} · ${q.kind==='short' ? t('ai.notGraded') : `${t('correctAnswer')}: ${LE(q.options[q.correct])}`} · ${t('ai.nPoints',{n:it.pts})} · ${t('objectiveTag')}: ${objName(q.obj)}${have.has(aiQKey(q))?' · '+badge('b-warn', t('ai.alreadyIn'), false):''}</div></div></li>`; }).join('')}</ul>` : '';
  return summary + blocked + dupNote + report + mode + preview;
}
function aiFooter(){ const A = AIMP, R = A && A.res, T0 = A && aiTarget(A.cid, A.type);
  const ok = R && !R.crash && !R.fileErrors.length && !R.issues.some(i=>i.sev==='error') && R.questions.length && !T0.locked;
  const addNone = ok && A.mode==='add' && T0.existing.length && R.questions.every(q=>T0.existing.some(e=>aiQKey(e)===aiQKey(q)));
  return `<button class="btn" data-action="closeModal">${t('cancel')}</button><button class="btn btn-primary" data-action="aiApply" ${ok && !addNone ? '' : 'disabled'} ${addNone?`title="${esc(t('ai.nothingNew'))}"`:''}>${icon('eye',14)}${addNone ? t('ai.nothingNew') : t('ai.review')}</button>`; }
function aiRefresh(focusSel){ setModal(aiBody(), aiFooter()); if (focusSel){ const f = topModal()?.querySelector(focusSel); f && f.focus(); } }
CHG.aiType = el => { AIMP.type = el.value; AIMP.mode = 'replace'; aiRefresh(`input[name="aitype"][value="${el.value}"]`); };
CHG.aiMode = el => { AIMP.mode = el.value; aiRefresh(`input[name="aimode"][value="${el.value}"]`); };
CHG.aiFile = async el => { const f = el.files && el.files[0]; if (!f || !AIMP) return; const A = AIMP;
  A.file = f; A.res = null; A.busy = true; aiRefresh();
  try { A.res = await aiCheckFile(f, course(A.cid)); }
  catch(e){ A.res = {crash: e.message==='nodecomp' ? t('xlsxBrowser',null,true) : t('ai.corrupt',null,true), fileErrors:[], issues:[], questions:[]}; }
  if (AIMP !== A) return; A.busy = false; aiRefresh('#ai-result h3, #f-aifile');
  const R = A.res, n = R.issues ? R.issues.filter(i=>i.sev==='error').length : 0;
  toast(R.crash || R.fileErrors.length ? t('ai.toastFile') : n ? t('ai.toastErrors',{n}) : t('ai.toastOk',{n:R.questions.length}), R.crash || R.fileErrors.length || n ? 'warn' : 'ok'); };
/** Move the validated questions into the existing editor as an unsaved draft (nothing is stored until Save draft). */
ACT.aiApply = () => { const A = AIMP; if (!A || !A.res) return;
  if (!can('content', A.cid)) return toast(t('ai.denied'),'bad');
  const R = A.res, T0 = aiTarget(A.cid, A.type), c = course(A.cid);
  if (R.crash || R.fileErrors.length || R.issues.some(i=>i.sev==='error') || !R.questions.length) return;
  if (T0.locked) return toast(t('lockedToast'),'warn');
  if (!T0.open){ if (T0.a) openBuilder(T0.a, true); else V.ab = {courseId:c.id, aid:null, kind:'assessment', pending:newAssessment(c, A.type), draft:null, q:blankQ('mcq', c.objectives[0]?.id)}; if (!V.ab.draft) V.ab.draft = JSON.parse(JSON.stringify(V.ab.pending)); }
  else abCollect();
  const d = V.ab.draft, fresh = R.questions.map((q,i)=>Object.assign(JSON.parse(JSON.stringify(q)), {id:'q'+uid('').slice(-6)+i}));
  const base = A.mode==='add' && !(d.type==='post' && d.sameAsPre) ? d.questions : [], have = new Set(base.map(aiQKey));
  const added = fresh.filter(q=>!have.has(aiQKey(q)));
  d.questions = base.concat(added); if (d.type==='post') d.sameAsPre = false;
  V.ab.imported = {hash: aiFileHash(R.questions), file: A.file.name, at: Date.now(), n: added.length, mode: A.mode};
  V.ab.q = blankQ('mcq', c.objectives[0]?.id);
  AIMP = null; closeModal();
  if (parseHash().name==='course' && parseHash().id===c.id && V.cw.tab==='assessments') render(); else go('course', c.id, {tab:'assessments'});
  toast(t('ai.applied', {n:added.length}), 'ok'); const h = $('#ab-import-note'); h && h.focus(); };
