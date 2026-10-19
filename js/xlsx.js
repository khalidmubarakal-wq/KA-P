"use strict";

/* =====================================================================
   6c. MINIMAL .XLSX READER (worksheets → rows of text) AND WRITER
   Uses the browser's built-in DecompressionStream; no library.
   ===================================================================== */
const XLSX_NS_R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
/** Open an .xlsx file: returns the sheet names and a reader for one sheet's rows ({n: Excel row number, cells:[text]}). */
async function openXlsx(file){
  if (typeof DecompressionStream === 'undefined') throw new Error('nodecomp');
  const buf = new Uint8Array(await file.arrayBuffer()), dv = new DataView(buf.buffer);
  let eocd = -1; for (let i=buf.length-22; i>=Math.max(0, buf.length-66000); i--) if (dv.getUint32(i,true)===0x06054b50){ eocd = i; break; }
  if (eocd<0) throw new Error('notzip');
  const count = dv.getUint16(eocd+10,true); let p = dv.getUint32(eocd+16,true); const entries = {};
  for (let k=0;k<count;k++){ if (p+46>buf.length || dv.getUint32(p,true)!==0x02014b50) throw new Error('notzip');
    const method = dv.getUint16(p+10,true), csize = dv.getUint32(p+20,true), nlen = dv.getUint16(p+28,true), elen = dv.getUint16(p+30,true), clen = dv.getUint16(p+32,true), off = dv.getUint32(p+42,true);
    const name = new TextDecoder().decode(buf.subarray(p+46, p+46+nlen)); entries[name] = {method, csize, off}; p += 46+nlen+elen+clen; }
  const read = async name => { const e = entries[name]; if (!e) return null; const lnl = dv.getUint16(e.off+26,true), lel = dv.getUint16(e.off+28,true), start = e.off+30+lnl+lel, raw = buf.subarray(start, start+e.csize);
    if (e.method===0) return new TextDecoder().decode(raw);
    const ds = new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw')); return await new Response(ds).text(); };
  const parse = s => new DOMParser().parseFromString(s, 'application/xml');
  const shared = []; const ss = await read('xl/sharedStrings.xml'); if (ss) parse(ss).querySelectorAll('si').forEach(si=>shared.push(Array.from(si.querySelectorAll('t')).filter(x=>!x.closest('rPh')).map(x=>x.textContent).join('')));
  const sheets = []; const wb = await read('xl/workbook.xml'), rels = await read('xl/_rels/workbook.xml.rels');
  if (wb && rels){ const rl = Array.from(parse(rels).querySelectorAll('Relationship'));
    parse(wb).querySelectorAll('sheet').forEach(s=>{ const rid = s.getAttribute('r:id') || s.getAttributeNS(XLSX_NS_R,'id'), rel = rid && rl.find(r=>r.getAttribute('Id')===rid);
      if (rel){ const tgt = rel.getAttribute('Target'); sheets.push({name:s.getAttribute('name')||'', path: tgt.startsWith('/') ? tgt.slice(1) : 'xl/'+tgt.replace(/^\.\//,'')}); } }); }
  if (!sheets.length && entries['xl/worksheets/sheet1.xml']) sheets.push({name:'', path:'xl/worksheets/sheet1.xml'});
  const colIdx = ref => { const m = /^([A-Z]+)/.exec(ref||''); let n = 0; if (m) for (const ch of m[1]) n = n*26 + ch.charCodeAt(0)-64; return n-1; };
  async function rows(name){
    const sh = name==null ? sheets[0] : sheets.find(s=>s.name===name); const sx = sh && await read(sh.path); if (!sx) throw new Error('nosheet');
    const out = []; let last = 0;
    parse(sx).querySelectorAll('sheetData > row').forEach(r=>{ const cells = []; const n = Number(r.getAttribute('r')) || last+1; last = n;
      r.querySelectorAll('c').forEach(c=>{ const t = c.getAttribute('t'), vEl = c.querySelector('v'); let val = '';
        if (t==='s') val = shared[Number(vEl?.textContent)] ?? ''; else if (t==='inlineStr') val = Array.from(c.querySelectorAll('is t')).map(x=>x.textContent).join(''); else if (t==='b') val = vEl ? (vEl.textContent==='1' ? 'TRUE' : 'FALSE') : ''; else val = vEl ? vEl.textContent : '';
        cells[colIdx(c.getAttribute('r'))] = String(val).trim(); });
      for (let i=0;i<cells.length;i++) if (cells[i]===undefined) cells[i] = ''; if (cells.some(x=>x)) out.push({n, cells}); });
    return out;
  }
  return {sheets: sheets.map(s=>s.name), rows};
}
/** First worksheet → rows of text (empty rows skipped). */
async function readXlsx(file){ const x = await openXlsx(file); return (await x.rows(null)).map(r=>r.cells); }

/* ---------- Writer: a small, valid .xlsx (stored ZIP, inline strings) ---------- */
const CRC_T = (()=>{ const t = new Uint32Array(256); for (let n=0;n<256;n++){ let c = n; for (let k=0;k<8;k++) c = c&1 ? 0xEDB88320^(c>>>1) : c>>>1; t[n] = c>>>0; } return t; })();
const crc32 = b => { let c = 0xFFFFFFFF; for (let i=0;i<b.length;i++) c = CRC_T[(c^b[i])&255]^(c>>>8); return (c^0xFFFFFFFF)>>>0; };
function zipStore(files){ // [{name, data:Uint8Array}] → Uint8Array (no compression)
  const enc = new TextEncoder(), parts = [], cen = []; let off = 0;
  for (const f of files){ const nm = enc.encode(f.name), crc = crc32(f.data), h = new DataView(new ArrayBuffer(30));
    h.setUint32(0,0x04034b50,true); h.setUint16(4,20,true); h.setUint16(6,0x0800,true); h.setUint32(14,crc,true); h.setUint32(18,f.data.length,true); h.setUint32(22,f.data.length,true); h.setUint16(26,nm.length,true);
    parts.push(new Uint8Array(h.buffer), nm, f.data);
    const c = new DataView(new ArrayBuffer(46)); c.setUint32(0,0x02014b50,true); c.setUint16(4,20,true); c.setUint16(6,20,true); c.setUint16(8,0x0800,true); c.setUint32(16,crc,true); c.setUint32(20,f.data.length,true); c.setUint32(24,f.data.length,true); c.setUint16(28,nm.length,true); c.setUint32(42,off,true);
    cen.push(new Uint8Array(c.buffer), nm); off += 30+nm.length+f.data.length; }
  const csz = cen.reduce((s,x)=>s+x.length,0), e = new DataView(new ArrayBuffer(22));
  e.setUint32(0,0x06054b50,true); e.setUint16(8,files.length,true); e.setUint16(10,files.length,true); e.setUint32(12,csz,true); e.setUint32(16,off,true);
  const all = parts.concat(cen, [new Uint8Array(e.buffer)]), out = new Uint8Array(all.reduce((s,x)=>s+x.length,0)); let p = 0; for (const x of all){ out.set(x,p); p += x.length; } return out;
}
const xmlEsc = s => String(s ?? '').replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'');
const colName = i => { let s = ''; i++; while (i>0){ const m = (i-1)%26; s = String.fromCharCode(65+m)+s; i = Math.floor((i-1)/26); } return s; };
/**
 * Build an .xlsx Blob. sheets: [{name, rtl, cols:[width], rows:[[cell]], freeze, validations:[{sqref, type:'list'|'whole'|'decimal', list|min,max, prompt, error, strict}]}]
 * A cell is text/number, or {v, style} where style is 'h' (header), 'b' (bold) or 'w' (wrapped text).
 */
function writeXlsx(sheets){
  const enc = s => new TextEncoder().encode(s), ST = {h:1, b:2, w:3};
  const cell = (v, r, c) => { const o = v && typeof v==='object' ? v : {v}; const ref = colName(c)+r, s = ST[o.style] ? ` s="${ST[o.style]}"` : '';
    if (o.v==null || o.v==='') return s ? `<c r="${ref}"${s}/>` : ''; if (typeof o.v==='number') return `<c r="${ref}"${s}><v>${o.v}</v></c>`;
    return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${xmlEsc(o.v)}</t></is></c>`; };
  const dv = v => { const a = `sqref="${v.sqref}" allowBlank="1" showErrorMessage="1" errorStyle="${v.strict?'stop':'warning'}"${v.prompt?` showInputMessage="1" prompt="${xmlEsc(v.prompt.slice(0,250))}"`:''}${v.error?` error="${xmlEsc(v.error.slice(0,250))}"`:''}`;
    if (v.type==='list') return `<dataValidation type="list" ${a}><formula1>"${xmlEsc(v.list.join(','))}"</formula1></dataValidation>`;
    return `<dataValidation type="${v.type}" operator="between" ${a}><formula1>${v.min}</formula1><formula2>${v.max}</formula2></dataValidation>`; };
  const sheetXml = sh => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="${XLSX_NS_R}"><sheetViews><sheetView workbookViewId="0"${sh.rtl?' rightToLeft="1"':''}>${sh.freeze?`<pane ySplit="${sh.freeze}" topLeftCell="A${sh.freeze+1}" activePane="bottomLeft" state="frozen"/>`:''}</sheetView></sheetViews>
${sh.cols?`<cols>${sh.cols.map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join('')}</cols>`:''}<sheetData>${sh.rows.map((r,i)=>`<row r="${i+1}">${r.map((v,j)=>cell(v,i+1,j)).join('')}</row>`).join('')}</sheetData>
${sh.validations&&sh.validations.length?`<dataValidations count="${sh.validations.length}">${sh.validations.map(dv).join('')}</dataValidations>`:''}<pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/></worksheet>`;
  const files = [
    {name:'[Content_Types].xml', data:enc(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`)},
    {name:'_rels/.rels', data:enc(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`)},
    {name:'xl/workbook.xml', data:enc(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="${XLSX_NS_R}"><sheets>${sheets.map((s,i)=>`<sheet name="${xmlEsc(s.name)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')}</sheets></workbook>`)},
    {name:'xl/_rels/workbook.xml.rels', data:enc(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`)},
    {name:'xl/styles.xml', data:enc(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="3"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF12305A"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment wrapText="1" vertical="center"/></xf><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`)},
  ].concat(sheets.map((s,i)=>({name:`xl/worksheets/sheet${i+1}.xml`, data:enc(sheetXml(s))})));
  return new Blob([zipStore(files)], {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
}
