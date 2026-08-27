/* =============================================================================
   MOON-GEOMETRY.JS
   Sinh hình học 10 mảnh trăng vỡ bằng thuật toán Voronoi (mỗi mảnh là một đa
   giác bất quy tắc thực sự — không phải hình quạt), diện tích các mảnh được
   cân bằng bằng cách thử nhiều hạt giống (seed) và chọn phương án lệch diện
   tích ít nhất. Viền ngoài mặt trăng luôn là hình tròn mượt; chỉ các đường
   nứt bên trong mới gấp khúc bất quy tắc.

   Chỉ cần gọi buildShardGeometry() MỘT LẦN khi tải trang; toàn bộ hệ thống
   (animation mở đầu, khuôn trăng đích, mảnh puzzle rải rác) dùng lại kết quả
   này để đảm bảo hình dạng mảnh nhất quán xuyên suốt.
   ============================================================================= */

function mulberry32(seed){
  return function(){
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function polygonArea(pts){
  let a = 0;
  for(let i=0;i<pts.length;i++){
    const p1=pts[i], p2=pts[(i+1)%pts.length];
    a += p1.x*p2.y - p2.x*p1.y;
  }
  return Math.abs(a)/2;
}
function polygonCentroid(pts){
  let cx=0, cy=0, a=0;
  for(let i=0;i<pts.length;i++){
    const p1=pts[i], p2=pts[(i+1)%pts.length];
    const cross = p1.x*p2.y - p2.x*p1.y;
    a += cross; cx += (p1.x+p2.x)*cross; cy += (p1.y+p2.y)*cross;
  }
  a/=2;
  if(Math.abs(a) < 1e-6){
    const n=pts.length; let sx=0,sy=0; pts.forEach(p=>{sx+=p.x;sy+=p.y;});
    return {x:sx/n, y:sy/n};
  }
  cx/=(6*a); cy/=(6*a);
  return {x:cx, y:cy};
}
function intersect(p1,p2,a,b,c){
  const d1 = a*p1.x+b*p1.y-c, d2 = a*p2.x+b*p2.y-c;
  const t = d1/(d1-d2);
  return { x: p1.x+t*(p2.x-p1.x), y: p1.y+t*(p2.y-p1.y) };
}
function clipHalfPlane(poly, a, b, c){
  const out=[];
  for(let i=0;i<poly.length;i++){
    const cur=poly[i], prev=poly[(i-1+poly.length)%poly.length];
    const curIn = (a*cur.x+b*cur.y) <= c;
    const prevIn = (a*prev.x+b*prev.y) <= c;
    if(curIn){ if(!prevIn) out.push(intersect(prev,cur,a,b,c)); out.push(cur); }
    else if(prevIn){ out.push(intersect(prev,cur,a,b,c)); }
  }
  return out;
}
function voronoiCell(seed, others, boundary){
  let poly = boundary;
  for(const o of others){
    if(o===seed) continue;
    const a = 2*(o.x-seed.x), b = 2*(o.y-seed.y);
    const c = (o.x*o.x+o.y*o.y) - (seed.x*seed.x+seed.y*seed.y);
    poly = clipHalfPlane(poly, a, b, c);
    if(poly.length===0) break;
  }
  return poly;
}
function circlePoly(cx,cy,r,segs=72){
  const pts=[];
  for(let i=0;i<segs;i++){ const a=(i/segs)*Math.PI*2; pts.push({x:cx+Math.cos(a)*r, y:cy+Math.sin(a)*r}); }
  return pts;
}
function generateSeeds(n, cx, cy, r, rng){
  const seeds=[]; let attempts=0; let minD = r*0.85;
  while(seeds.length<n && attempts<8000){
    attempts++;
    const ang = rng()*Math.PI*2;
    const rad = Math.sqrt(rng())*r*0.7;
    const x = cx+Math.cos(ang)*rad, y=cy+Math.sin(ang)*rad;
    let ok=true;
    for(const s of seeds){ if(Math.hypot(s.x-x,s.y-y) < minD){ ok=false; break; } }
    if(ok) seeds.push({x,y});
    if(attempts%500===0) minD*=0.9;
  }
  while(seeds.length<n){
    const ang = rng()*Math.PI*2, rad=Math.sqrt(rng())*r*0.7;
    seeds.push({x:cx+Math.cos(ang)*rad, y:cy+Math.sin(ang)*rad});
  }
  return seeds;
}
function hash2(x1,y1,x2,y2){
  // hash xác định từ 2 điểm đầu mút (không phân biệt thứ tự) để 2 mảnh kề
  // nhau tính ra CÙNG một độ lệch cho đường biên chung -> luôn khớp khít
  const ax = Math.round(x1*10), ay = Math.round(y1*10);
  const bx = Math.round(x2*10), by = Math.round(y2*10);
  let k1,k2,k3,k4;
  if(ax<bx || (ax===bx && ay<=by)){ k1=ax;k2=ay;k3=bx;k4=by; } else { k1=bx;k2=by;k3=ax;k4=ay; }
  let h = 2166136261;
  [k1,k2,k3,k4].forEach(v=>{ h ^= (v|0); h = Math.imul(h, 16777619); });
  h = h>>>0;
  return (h % 100000)/100000;
}
function jitterEdge(p1, p2, R, cx, cy){
  const onBoundary = (p) => Math.abs(Math.hypot(p.x-cx,p.y-cy) - R) < 0.75;
  if(onBoundary(p1) || onBoundary(p2)) return [p1, p2]; // viền ngoài giữ mượt, không nứt
  const len = Math.hypot(p2.x-p1.x, p2.y-p1.y);
  if(len < 6) return [p1,p2];
  const nx = -(p2.y-p1.y)/len, ny = (p2.x-p1.x)/len;
  const steps = len > 40 ? 3 : 2;
  const pts = [p1];
  for(let i=1;i<steps;i++){
    const t = i/steps;
    const bx = p1.x + (p2.x-p1.x)*t, by = p1.y + (p2.y-p1.y)*t;
    const rnd = hash2(p1.x,p1.y,p2.x,p2.y) + i*0.6180339887;
    const frac = rnd - Math.floor(rnd);
    const amp = Math.min(len*0.16, 9) * Math.sin(t*Math.PI);
    const sign = frac > 0.5 ? 1 : -1;
    pts.push({ x: bx + nx*amp*sign*(0.4+frac), y: by + ny*amp*sign*(0.4+frac) });
  }
  pts.push(p2);
  return pts;
}
function jitterPolygon(poly, R, cx, cy){
  const out=[];
  const crackEdges = [];
  for(let i=0;i<poly.length;i++){
    const p1=poly[i], p2=poly[(i+1)%poly.length];
    const seg = jitterEdge(p1,p2,R,cx,cy);
    for(let j=0;j<seg.length-1;j++){
      out.push(seg[j]);
      const onBoundary = (p) => Math.abs(Math.hypot(p.x-cx,p.y-cy) - R) < 0.75;
      if(!onBoundary(seg[j]) || !onBoundary(seg[j+1])) crackEdges.push([seg[j], seg[j+1]]);
    }
  }
  return { poly: out, crackEdges };
}

function buildShardGeometry(total){
  const CX = 200, CY = 200, R = 168;
  const boundaryCircle = circlePoly(CX, CY, R);

  let best = null;
  for(let s = 1; s <= 60; s++){
    const rng = mulberry32(s * 977 + 13);
    const seeds = generateSeeds(total, CX, CY, R, rng);
    const cells = seeds.map(seed => voronoiCell(seed, seeds, boundaryCircle));
    const areas = cells.map(polygonArea);
    const avg = areas.reduce((a,b)=>a+b,0) / areas.length;
    const variance = areas.reduce((s,a)=>s + Math.pow(a-avg,2), 0) / areas.length;
    if(!best || variance < best.variance) best = { cells, areas, variance, seeds, seedNum: s };
  }

  const allCrackEdges = [];
  const pieces = best.cells.map((cell, i) => {
    const { poly, crackEdges } = jitterPolygon(cell, R, CX, CY);
    crackEdges.forEach(e => allCrackEdges.push(e));
    const d = 'M ' + poly.map(p => `${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' L ') + ' Z';
    const xs = poly.map(p=>p.x), ys = poly.map(p=>p.y);
    const minX=Math.min(...xs), maxX=Math.max(...xs), minY=Math.min(...ys), maxY=Math.max(...ys);
    const centroid = polygonCentroid(poly);
    return {
      id: i+1,
      d,
      bbox: { minX, minY, maxX, maxY, w:maxX-minX, h:maxY-minY },
      centroidOffset: { dx: centroid.x - CX, dy: centroid.y - CY },
      midAngle: Math.atan2(centroid.y-CY, centroid.x-CX) * 180/Math.PI
    };
  });

  return { pieces, crackEdges: allCrackEdges, R, CX, CY, SPACE: 400 };
}

/* Thêm định nghĩa <pattern> ảnh trăng thật DÙNG CHUNG cho mọi SVG trong trang
   (khuôn trăng đích, các mảnh rải rác, trăng nguyên vẹn lúc mở đầu) — chỉ
   nhúng ảnh base64 MỘT LẦN duy nhất trong toàn bộ DOM để nhẹ trang. */
function injectSharedMoonPattern(geo){
  if (document.getElementById('moonTexture')) return;
  const svgNS = 'http://www.w3.org/2000/svg';
  const holder = document.createElementNS(svgNS, 'svg');
  holder.setAttribute('width', '0');
  holder.setAttribute('height', '0');
  holder.style.position = 'absolute';
  holder.style.overflow = 'hidden';
  holder.setAttribute('aria-hidden', 'true');

  const defs = document.createElementNS(svgNS, 'defs');
  const pattern = document.createElementNS(svgNS, 'pattern');
  pattern.setAttribute('id', 'moonTexture');
  pattern.setAttribute('patternUnits', 'userSpaceOnUse');
  pattern.setAttribute('x', '0'); pattern.setAttribute('y', '0');
  pattern.setAttribute('width', String(geo.SPACE)); pattern.setAttribute('height', String(geo.SPACE));

  const img = document.createElementNS(svgNS, 'image');
  img.setAttribute('href', MOON_PHOTO_DATA_URI);
  img.setAttribute('x', String(geo.CX - geo.R));
  img.setAttribute('y', String(geo.CY - geo.R));
  img.setAttribute('width', String(geo.R * 2));
  img.setAttribute('height', String(geo.R * 2));
  img.setAttribute('preserveAspectRatio', 'xMidYMid slice');

  pattern.appendChild(img);
  defs.appendChild(pattern);
  holder.appendChild(defs);
  document.body.appendChild(holder);
}
