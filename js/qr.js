"use strict";

/* =====================================================================
   6b. REAL QR CODE ENCODER (byte mode, error-correction level M, v1–10)
   Produces a standards-compliant, scannable QR image (SVG). Based on the
   public QR specification (ISO/IEC 18004). No external library.
   ===================================================================== */
const QR = (()=>{
  const ECC_M = [-1,10,16,26,18,24,16,18,22,22,26], BLOCKS_M = [-1,1,1,1,2,2,4,4,4,5,5];
  const rawModules = v => { let r = (16*v+128)*v+64; if (v>=2){ const n = Math.floor(v/7)+2; r -= (25*n-10)*n-55; if (v>=7) r -= 36; } return r; };
  const dataCodewords = v => Math.floor(rawModules(v)/8) - ECC_M[v]*BLOCKS_M[v];
  const gmul = (x,y) => { let z = 0; for (let i=7;i>=0;i--){ z = (z<<1) ^ ((z>>>7)*0x11D); z ^= ((y>>>i)&1)*x; } return z & 0xFF; };
  function rsDivisor(deg){ const r = new Array(deg).fill(0); r[deg-1] = 1; let root = 1; for (let i=0;i<deg;i++){ for (let j=0;j<deg;j++){ r[j] = gmul(r[j], root); if (j+1<deg) r[j] ^= r[j+1]; } root = gmul(root, 0x02); } return r; }
  function rsRemainder(data, div){ const r = div.map(()=>0); for (const b of data){ const f = b ^ r.shift(); r.push(0); div.forEach((c,i)=>{ r[i] ^= gmul(c, f); }); } return r; }
  function alignPos(v, size){ if (v===1) return []; const n = Math.floor(v/7)+2, step = Math.ceil((v*4+4)/(n*2-2))*2; const res = [6]; for (let p = size-7; res.length<n; p -= step) res.splice(1,0,p); return res; }
  function encode(text){
    const bytes = Array.from(new TextEncoder().encode(text));
    let v = 1; while (v<=10 && 4+8+bytes.length*8 > dataCodewords(v)*8) v++;
    if (v>10) throw new Error('QR text too long');
    const bits = []; const push = (val, len) => { for (let i=len-1;i>=0;i--) bits.push((val>>>i)&1); };
    push(4,4); push(bytes.length,8); bytes.forEach(b=>push(b,8));
    const cap = dataCodewords(v)*8; push(0, Math.min(4, cap-bits.length)); while (bits.length%8) bits.push(0);
    const data = []; for (let i=0;i<bits.length;i+=8) data.push(parseInt(bits.slice(i,i+8).join(''),2));
    for (let pad=0xEC; data.length < dataCodewords(v); pad ^= 0xEC^0x11) data.push(pad);
    // Error correction + interleaving
    const nb = BLOCKS_M[v], ecl = ECC_M[v], raw = Math.floor(rawModules(v)/8), nShort = nb - raw%nb, shortLen = Math.floor(raw/nb), div = rsDivisor(ecl);
    const blocks = []; for (let i=0, k=0; i<nb; i++){ const dat = data.slice(k, k + shortLen - ecl + (i<nShort?0:1)); k += dat.length; const ec = rsRemainder(dat, div); if (i<nShort) dat.push(0); blocks.push(dat.concat(ec)); }
    const all = []; for (let i=0;i<blocks[0].length;i++) blocks.forEach((b,j)=>{ if (i !== shortLen-ecl || j>=nShort) all.push(b[i]); });
    // Matrix
    const size = v*4+17, M = [], F = []; for (let y=0;y<size;y++){ M.push(new Array(size).fill(false)); F.push(new Array(size).fill(false)); }
    const setF = (x,y,d) => { M[y][x] = d; F[y][x] = true; };
    for (let i=0;i<size;i++){ setF(6,i,i%2===0); setF(i,6,i%2===0); }
    const finder = (cx,cy) => { for (let dy=-4;dy<=4;dy++) for (let dx=-4;dx<=4;dx++){ const d = Math.max(Math.abs(dx),Math.abs(dy)), x = cx+dx, y = cy+dy; if (x>=0&&x<size&&y>=0&&y<size) setF(x,y, d!==2 && d!==4); } };
    finder(3,3); finder(size-4,3); finder(3,size-4);
    const ap = alignPos(v, size), na = ap.length;
    for (let i=0;i<na;i++) for (let j=0;j<na;j++){ if ((i===0&&j===0)||(i===0&&j===na-1)||(i===na-1&&j===0)) continue; for (let dy=-2;dy<=2;dy++) for (let dx=-2;dx<=2;dx++) setF(ap[i]+dx, ap[j]+dy, Math.max(Math.abs(dx),Math.abs(dy))!==1); }
    const fmt = mask => { const d = (0<<3)|mask; let r = d; for (let i=0;i<10;i++) r = (r<<1) ^ ((r>>>9)*0x537); const b = ((d<<10)|r) ^ 0x5412, g = i => ((b>>>i)&1)!==0;
      for (let i=0;i<=5;i++) setF(8,i,g(i)); setF(8,7,g(6)); setF(8,8,g(7)); setF(7,8,g(8)); for (let i=9;i<15;i++) setF(14-i,8,g(i));
      for (let i=0;i<8;i++) setF(size-1-i,8,g(i)); for (let i=8;i<15;i++) setF(8,size-15+i,g(i)); setF(8,size-8,true); };
    fmt(0);
    if (v>=7){ let r = v; for (let i=0;i<12;i++) r = (r<<1) ^ ((r>>>11)*0x1F25); const b = (v<<12)|r; for (let i=0;i<18;i++){ const bit = ((b>>>i)&1)!==0, a = size-11+i%3, c = Math.floor(i/3); setF(a,c,bit); setF(c,a,bit); } }
    let i = 0; for (let right=size-1; right>=1; right-=2){ if (right===6) right = 5; for (let vert=0; vert<size; vert++) for (let j=0;j<2;j++){ const x = right-j, up = ((right+1)&2)===0, y = up ? size-1-vert : vert; if (!F[y][x] && i < all.length*8){ M[y][x] = ((all[i>>>3]>>>(7-(i&7)))&1)!==0; i++; } } }
    for (let y=0;y<size;y++) for (let x=0;x<size;x++) if (!F[y][x] && (x+y)%2===0) M[y][x] = !M[y][x];   // mask pattern 0
    fmt(0);
    return {size, M};
  }
  function svg(text, px=220, label=''){
    const {size, M} = encode(text), q = 4, n = size+q*2; let d = '';
    for (let y=0;y<size;y++) for (let x=0;x<size;x++) if (M[y][x]) d += `M${x+q} ${y+q}h1v1h-1z`;
    return `<svg viewBox="0 0 ${n} ${n}" width="${px}" height="${px}" role="img" aria-label="${esc(label)}" shape-rendering="crispEdges"><rect width="${n}" height="${n}" fill="#fff"/><path d="${d}" fill="#071830"/></svg>`;
  }
  return {encode, svg};
})();

