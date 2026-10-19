"use strict";

/* =====================================================================
   6c. MINIMAL .XLSX READER (first worksheet → rows of text)
   Uses the browser's built-in DecompressionStream; no library.
   ===================================================================== */
async function readXlsx(file){
  if (typeof DecompressionStream === 'undefined') throw new Error('nodecomp');
  const buf = new Uint8Array(await file.arrayBuffer()), dv = new DataView(buf.buffer);
  let eocd = -1; for (let i=buf.length-22; i>=Math.max(0, buf.length-66000); i--) if (dv.getUint32(i,true)===0x06054b50){ eocd = i; break; }
  if (eocd<0) throw new Error('notzip');
  const count = dv.getUint16(eocd+10,true); let p = dv.getUint32(eocd+16,true); const entries = {};
  for (let k=0;k<count;k++){ const method = dv.getUint16(p+10,true), csize = dv.getUint32(p+20,true), nlen = dv.getUint16(p+28,true), elen = dv.getUint16(p+30,true), clen = dv.getUint16(p+32,true), off = dv.getUint32(p+42,true);
    const name = new TextDecoder().decode(buf.subarray(p+46, p+46+nlen)); entries[name] = {method, csize, off}; p += 46+nlen+elen+clen; }
  const read = async name => { const e = entries[name]; if (!e) return null; const lnl = dv.getUint16(e.off+26,true), lel = dv.getUint16(e.off+28,true), start = e.off+30+lnl+lel, raw = buf.subarray(start, start+e.csize);
    if (e.method===0) return new TextDecoder().decode(raw);
    const ds = new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw')); return await new Response(ds).text(); };
  const parse = s => new DOMParser().parseFromString(s, 'application/xml');
  const shared = []; const ss = await read('xl/sharedStrings.xml'); if (ss) parse(ss).querySelectorAll('si').forEach(si=>shared.push(Array.from(si.querySelectorAll('t')).map(x=>x.textContent).join('')));
  let sheetPath = 'xl/worksheets/sheet1.xml';
  const wb = await read('xl/workbook.xml'), rels = await read('xl/_rels/workbook.xml.rels');
  if (wb && rels){ const first = parse(wb).querySelector('sheet'); const rid = first && (first.getAttribute('r:id') || first.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id'));
    const rel = rid && Array.from(parse(rels).querySelectorAll('Relationship')).find(r=>r.getAttribute('Id')===rid); if (rel){ const tgt = rel.getAttribute('Target'); sheetPath = tgt.startsWith('/') ? tgt.slice(1) : 'xl/'+tgt.replace(/^\.\//,''); } }
  const sx = await read(sheetPath); if (!sx) throw new Error('nosheet');
  const colIdx = ref => { const m = /^([A-Z]+)/.exec(ref||''); let n = 0; if (m) for (const ch of m[1]) n = n*26 + ch.charCodeAt(0)-64; return n-1; };
  const rows = [];
  parse(sx).querySelectorAll('sheetData > row').forEach(r=>{ const row = []; r.querySelectorAll('c').forEach(c=>{ const t = c.getAttribute('t'), vEl = c.querySelector('v'); let val = '';
      if (t==='s') val = shared[Number(vEl?.textContent)] ?? ''; else if (t==='inlineStr') val = Array.from(c.querySelectorAll('is t')).map(x=>x.textContent).join(''); else val = vEl ? vEl.textContent : '';
      row[colIdx(c.getAttribute('r'))] = String(val).trim(); });
    for (let i=0;i<row.length;i++) if (row[i]===undefined) row[i] = ''; if (row.some(x=>x)) rows.push(row); });
  return rows;
}

