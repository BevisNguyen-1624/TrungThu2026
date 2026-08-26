/* ============================================================
   GHÉP TRĂNG ĐOÀN VIÊN — app.js
   State machine: IDLE → LOGIN → INTRO_MOON → MOON_CRACKING →
   MOON_SHATTERING → PIECES_SCATTERED → PUZZLE_ACTIVE →
   PIECE_FLYING_HOME → PIECE_LOCKED → MOON_COMPLETED
   ============================================================ */

'use strict';

/* ----------------------------------------------------------
   PIECE GEOMETRY — 10 irregular Voronoi-style polygons
   defined as normalized [0..1] coordinates relative to
   a circle of radius R. Generated offline; fixed forever.
   ---------------------------------------------------------- */
const PIECE_DEFS = [
  // [id, [[x,y], ...] in unit-circle space -1..1]
  { id: 0, pts: [[-0.08,-0.02],[0.10,-0.35],[0.38,-0.12],[0.22,0.18],[-0.05,0.28]] },
  { id: 1, pts: [[0.10,-0.35],[0.55,-0.62],[0.68,-0.28],[0.38,-0.12]] },
  { id: 2, pts: [[0.55,-0.62],[0.82,-0.15],[0.68,0.10],[0.68,-0.28]] },
  { id: 3, pts: [[0.68,-0.28],[0.82,-0.15],[0.90,0.20],[0.72,0.48],[0.38,0.32],[0.22,0.18],[0.38,-0.12]] },
  { id: 4, pts: [[0.38,0.32],[0.72,0.48],[0.55,0.78],[0.15,0.65],[-0.05,0.52]] },
  { id: 5, pts: [[-0.05,0.52],[0.15,0.65],[0.00,0.92],[-0.40,0.80],[-0.45,0.55]] },
  { id: 6, pts: [[-0.45,0.55],[-0.40,0.80],[-0.72,0.55],[-0.82,0.22],[-0.55,0.18]] },
  { id: 7, pts: [[-0.82,0.22],[-0.72,0.55],[-0.88,0.00],[-0.70,-0.38]] },
  { id: 8, pts: [[-0.70,-0.38],[-0.88,0.00],[-0.82,0.22],[-0.55,0.18],[-0.35,-0.10],[-0.38,-0.42]] },
  { id: 9, pts: [[-0.08,-0.02],[-0.05,0.28],[-0.45,0.55],[-0.55,0.18],[-0.35,-0.10],[0.10,-0.35]] },
];

/* scatter directions — each piece flies a different way */
const SCATTER_DIRS = [
  {dx:-1.4,dy:-1.6,rot:-25}, {dx: 0.2,dy:-2.0,rot: 18}, {dx: 1.8,dy:-1.2,rot: 30},
  {dx: 2.0,dy: 0.3,rot:-20}, {dx: 1.5,dy: 1.5,rot: 22}, {dx: 0.2,dy: 2.0,rot:-15},
  {dx:-1.5,dy: 1.6,rot: 28}, {dx:-2.1,dy: 0.4,rot:-35}, {dx:-1.8,dy:-0.8,rot: 16},
  {dx:-0.5,dy:-1.9,rot:-22},
];

/* ----------------------------------------------------------
   STATE MANAGER
   ---------------------------------------------------------- */
const STATE = {
  IDLE:'IDLE', LOGIN:'LOGIN', INTRO_MOON:'INTRO_MOON',
  MOON_CRACKING:'MOON_CRACKING', MOON_SHATTERING:'MOON_SHATTERING',
  PIECES_SCATTERED:'PIECES_SCATTERED', PUZZLE_ACTIVE:'PUZZLE_ACTIVE',
  PIECE_FLYING:'PIECE_FLYING', MOON_COMPLETED:'MOON_COMPLETED'
};
let currentState = STATE.IDLE;
let employeeCode = '';
let solvedCount  = 0;

function setState(s){ currentState = s; document.body.dataset.state = s; }

/* ----------------------------------------------------------
   CANVAS — STARS BACKGROUND
   ---------------------------------------------------------- */
(function initStars(){
  const c = document.getElementById('stars');
  if(!c) return;
  const ctx = c.getContext('2d');
  let stars = [];
  function resize(){ c.width=innerWidth; c.height=innerHeight; buildStars(); }
  function buildStars(){
    stars=[];
    for(let i=0;i<160;i++) stars.push({
      x:Math.random()*c.width, y:Math.random()*c.height,
      r:Math.random()*1.4+0.3, a:Math.random(), da:(Math.random()-0.5)*0.008
    });
  }
  function tick(){
    ctx.clearRect(0,0,c.width,c.height);
    stars.forEach(s=>{
      s.a=Math.max(0.05,Math.min(1,s.a+s.da));
      if(s.a<=0.05||s.a>=1) s.da*=-1;
      ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2);
      ctx.fillStyle=`rgba(255,255,200,${s.a})`; ctx.fill();
    });
    requestAnimationFrame(tick);
  }
  addEventListener('resize',resize); resize(); tick();
})();

/* ----------------------------------------------------------
   CONFETTI CANVAS
   ---------------------------------------------------------- */
let confettiActive = false;
let confettiParticles = [];
(function initConfetti(){
  const c = document.getElementById('confetti');
  if(!c) return;
  const ctx = c.getContext('2d');
  function resize(){ c.width=innerWidth; c.height=innerHeight; }
  addEventListener('resize',resize); resize();
  const COLS=['#f5c518','#ff8c42','#e8d5b7','#7ecfce','#ff6b9d','#c8e6c9'];
  function tick(){
    if(!confettiActive){ ctx.clearRect(0,0,c.width,c.height); requestAnimationFrame(tick); return; }
    ctx.clearRect(0,0,c.width,c.height);
    confettiParticles.forEach((p,i)=>{
      p.y+=p.vy; p.x+=p.vx; p.vy+=0.12; p.rot+=p.rotV;
      ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot);
      ctx.globalAlpha=Math.max(0,(1-p.y/c.height)*1.2);
      ctx.fillStyle=p.col; ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h);
      ctx.restore();
    });
    confettiParticles=confettiParticles.filter(p=>p.y<c.height+40);
    requestAnimationFrame(tick);
  }
  tick();
  window.launchConfetti=function(){
    confettiActive=true;
    for(let i=0;i<180;i++) confettiParticles.push({
      x:Math.random()*innerWidth, y:-10-Math.random()*60,
      vx:(Math.random()-0.5)*6, vy:Math.random()*3+2,
      w:8+Math.random()*8, h:5+Math.random()*5,
      rot:Math.random()*Math.PI*2, rotV:(Math.random()-0.5)*0.25,
      col:COLS[Math.floor(Math.random()*COLS.length)]
    });
    setTimeout(()=>{ confettiActive=false; },5000);
  };
})();

/* ----------------------------------------------------------
   SVG MOON ENGINE
   The SVG is injected into #moon-stage. All pieces live here.
   ---------------------------------------------------------- */
const MOON_R   = 140;   // radius in SVG units
const MOON_CX  = 160;   // SVG viewBox center
const MOON_CY  = 160;

function ptsToSVGPath(pts){
  const coords = pts.map(([x,y])=>`${MOON_CX+x*MOON_R},${MOON_CY+y*MOON_R}`);
  return `M${coords.join('L')}Z`;
}

function clipToCircle(pts){
  /* Sutherland-Hodgman clip polygon pts to unit circle approximated by 32-gon */
  const N=64, poly=[];
  for(let i=0;i<N;i++){
    const a=i/N*Math.PI*2;
    poly.push([Math.cos(a),Math.sin(a)]);
  }
  let out = [...pts];
  for(let i=0;i<poly.length;i++){
    if(!out.length) break;
    const p1=poly[i], p2=poly[(i+1)%poly.length];
    const edge=[p2[0]-p1[0],p2[1]-p1[1]];
    const inp=[...out]; out=[];
    for(let j=0;j<inp.length;j++){
      const A=inp[j], B=inp[(j+1)%inp.length];
      const dA=edge[0]*(A[1]-p1[1])-edge[1]*(A[0]-p1[0]);
      const dB=edge[0]*(B[1]-p1[1])-edge[1]*(B[0]-p1[0]);
      if(dA>=0) out.push(A);
      if((dA>=0)!==(dB>=0)){
        const t=dA/(dA-dB);
        out.push([A[0]+t*(B[0]-A[0]),A[1]+t*(B[1]-A[1])]);
      }
    }
  }
  return out;
}

let svgEl=null, pieceEls=[], crackEls=[], moonGlowEl=null, moonOutlineEl=null;
let piecesData=[];  // runtime per-piece state

function buildMoonSVG(container){
  const ns='http://www.w3.org/2000/svg';
  const svg=document.createElementNS(ns,'svg');
  svg.setAttribute('viewBox','0 0 320 320');
  svg.setAttribute('id','moon-svg');
  svg.style.cssText='width:100%;height:100%;overflow:visible;';

  /* defs */
  const defs=document.createElementNS(ns,'defs');

  /* radial gradient for moon surface */
  const grad=document.createElementNS(ns,'radialGradient');
  grad.setAttribute('id','moonGrad'); grad.setAttribute('cx','42%'); grad.setAttribute('cy','38%');
  grad.setAttribute('r','58%');
  [{o:'0%',c:'#fff9e8'},{o:'40%',c:'#f0d890'},{o:'100%',c:'#b8860b'}].forEach(s=>{
    const stop=document.createElementNS(ns,'stop');
    stop.setAttribute('offset',s.o);
    stop.setAttribute('stop-color',s.c);
    grad.appendChild(stop);
  });
  defs.appendChild(grad);

  /* glow filter */
  const filter=document.createElementNS(ns,'filter');
  filter.setAttribute('id','moonGlow'); filter.setAttribute('x','-50%'); filter.setAttribute('y','-50%');
  filter.setAttribute('width','200%'); filter.setAttribute('height','200%');
  const fe=document.createElementNS(ns,'feGaussianBlur');
  fe.setAttribute('stdDeviation','14'); fe.setAttribute('result','blur');
  const feM=document.createElementNS(ns,'feMerge');
  ['blur','SourceGraphic'].forEach(n=>{ const node=document.createElementNS(ns,'feMergeNode'); node.setAttribute('in',n); feM.appendChild(node); });
  filter.appendChild(fe); filter.appendChild(feM);
  defs.appendChild(filter);

  /* clip path */
  const clip=document.createElementNS(ns,'clipPath');
  clip.setAttribute('id','moonClip');
  const clipCirc=document.createElementNS(ns,'circle');
  clipCirc.setAttribute('cx',MOON_CX); clipCirc.setAttribute('cy',MOON_CY); clipCirc.setAttribute('r',MOON_R);
  clip.appendChild(clipCirc);
  defs.appendChild(clip);

  /* shadow piece filter */
  const sf=document.createElementNS(ns,'filter');
  sf.setAttribute('id','pieceGlow');
  const sfb=document.createElementNS(ns,'feGaussianBlur');
  sfb.setAttribute('in','SourceGraphic'); sfb.setAttribute('stdDeviation','4');
  sf.appendChild(sfb); defs.appendChild(sf);

  svg.appendChild(defs);

  /* halo / glow ring behind moon */
  moonGlowEl=document.createElementNS(ns,'circle');
  moonGlowEl.setAttribute('cx',MOON_CX); moonGlowEl.setAttribute('cy',MOON_CY);
  moonGlowEl.setAttribute('r',MOON_R+22);
  moonGlowEl.setAttribute('fill','none');
  moonGlowEl.setAttribute('stroke','rgba(255,220,80,0.18)');
  moonGlowEl.setAttribute('stroke-width','28');
  moonGlowEl.setAttribute('id','moonHalo');
  svg.appendChild(moonGlowEl);

  /* moon outline circle (target silhouette) — always visible in puzzle */
  moonOutlineEl=document.createElementNS(ns,'circle');
  moonOutlineEl.setAttribute('cx',MOON_CX); moonOutlineEl.setAttribute('cy',MOON_CY);
  moonOutlineEl.setAttribute('r',MOON_R);
  moonOutlineEl.setAttribute('fill','rgba(255,220,80,0.06)');
  moonOutlineEl.setAttribute('stroke','rgba(255,200,60,0.3)');
  moonOutlineEl.setAttribute('stroke-width','1.5');
  moonOutlineEl.setAttribute('stroke-dasharray','6 5');
  moonOutlineEl.setAttribute('id','moonOutline');
  moonOutlineEl.style.opacity='0';
  svg.appendChild(moonOutlineEl);

  /* crack lines group */
  const crackG=document.createElementNS(ns,'g');
  crackG.setAttribute('id','crack-group');
  crackG.setAttribute('clip-path','url(#moonClip)');
  svg.appendChild(crackG);

  /* pieces group */
  const pieceG=document.createElementNS(ns,'g');
  pieceG.setAttribute('id','piece-group');
  svg.appendChild(pieceG);

  /* build each piece */
  piecesData=[];
  PIECE_DEFS.forEach((def,i)=>{
    const clipped=clipToCircle(def.pts);
    const pathD=ptsToSVGPath(clipped);

    /* compute centroid */
    const cx_=clipped.reduce((s,p)=>s+p[0],0)/clipped.length;
    const cy_=clipped.reduce((s,p)=>s+p[1],0)/clipped.length;
    const svgCx=MOON_CX+cx_*MOON_R, svgCy=MOON_CY+cy_*MOON_R;

    const g=document.createElementNS(ns,'g');
    g.setAttribute('id',`piece-g-${i}`);
    g.dataset.id=i;

    /* shadow copy for depth */
    const shadow=document.createElementNS(ns,'path');
    shadow.setAttribute('d',pathD);
    shadow.setAttribute('fill','rgba(0,0,0,0.35)');
    shadow.setAttribute('transform','translate(3,4)');
    shadow.setAttribute('class','piece-shadow');
    g.appendChild(shadow);

    /* main piece */
    const path=document.createElementNS(ns,'path');
    path.setAttribute('d',pathD);
    path.setAttribute('fill','url(#moonGrad)');
    path.setAttribute('stroke','rgba(255,240,140,0.6)');
    path.setAttribute('stroke-width','1');
    path.setAttribute('class','moon-piece');
    g.appendChild(path);

    /* hover glow overlay */
    const glow=document.createElementNS(ns,'path');
    glow.setAttribute('d',pathD);
    glow.setAttribute('fill','rgba(255,220,80,0)');
    glow.setAttribute('class','piece-glow');
    g.appendChild(glow);

    /* solved checkmark badge */
    const badge=document.createElementNS(ns,'circle');
    badge.setAttribute('cx',svgCx); badge.setAttribute('cy',svgCy);
    badge.setAttribute('r',10); badge.setAttribute('fill','rgba(80,220,120,0.9)');
    badge.setAttribute('class','piece-badge'); badge.style.opacity='0';
    g.appendChild(badge);

    pieceG.appendChild(g);
    pieceEls.push(g);

    piecesData.push({
      id:i, el:g, pathEl:path, glowEl:glow, badgeEl:badge,
      clipped,
      svgCx, svgCy,           /* centroid in SVG space */
      nCx:cx_, nCy:cy_,       /* centroid in -1..1 space */
      targetX:svgCx, targetY:svgCy,  /* final resting position = centroid of piece on moon */
      currentX:svgCx, currentY:svgCy,
      currentRot:0,
      scatterX:0, scatterY:0, scatterRot:0,
      solved:false, animState:'idle'
    });
  });

  /* build crack lines between pieces */
  buildCracks(crackG, ns);

  svgEl=svg;
  container.innerHTML='';
  container.appendChild(svg);
  return svg;
}

function buildCracks(group, ns){
  crackEls=[];
  /* Build crack segments from adjacent piece boundaries */
  const cracksCoords=[
    /* a few prominent fracture lines across the moon */
    [[0.10,-0.35],[0.38,-0.12],[0.22,0.18]],
    [[0.38,-0.12],[0.68,-0.28],[0.82,-0.15]],
    [[-0.08,-0.02],[0.22,0.18],[-0.05,0.28],[0.38,0.32]],
    [[0.38,0.32],[0.68,0.48],[0.55,0.78]],
    [[-0.05,0.52],[-0.45,0.55],[-0.82,0.22]],
    [[-0.82,0.22],[-0.70,-0.38],[-0.38,-0.42]],
    [[-0.35,-0.10],[-0.08,-0.02],[0.10,-0.35]],
  ];
  cracksCoords.forEach((pts,i)=>{
    const line=document.createElementNS(ns,'polyline');
    const pointsStr=pts.map(([x,y])=>`${MOON_CX+x*MOON_R},${MOON_CY+y*MOON_R}`).join(' ');
    line.setAttribute('points',pointsStr);
    line.setAttribute('fill','none');
    line.setAttribute('stroke','rgba(20,10,0,0.9)');
    line.setAttribute('stroke-width','1.5');
    line.setAttribute('stroke-linecap','round');
    line.style.strokeDasharray='1000';
    line.style.strokeDashoffset='1000';
    line.style.opacity='0';
    line.setAttribute('clip-path','url(#moonClip)');
    group.appendChild(line);
    crackEls.push(line);
  });
}

/* ----------------------------------------------------------
   COORDINATE HELPERS
   ---------------------------------------------------------- */
function getSVGContainerRect(){
  const stage=document.getElementById('moon-stage');
  if(!stage) return {left:0,top:0,width:320,height:320};
  return stage.getBoundingClientRect();
}

/* Convert SVG unit coords to viewport px (for CSS transforms on scattered pieces) */
function svgToViewport(svgX, svgY){
  const r=getSVGContainerRect();
  const scale=r.width/320;
  return { x:r.left + svgX*scale, y:r.top + svgY*scale };
}

/* ----------------------------------------------------------
   PIECE CLICK — opens puzzle modal
   ---------------------------------------------------------- */
function setupPieceClicks(){
  piecesData.forEach(p=>{
    p.el.addEventListener('click',()=>{
      if(p.solved || currentState!==STATE.PUZZLE_ACTIVE) return;
      openPuzzleModal(p.id);
    });
    p.el.addEventListener('mouseenter',()=>{
      if(p.solved) return;
      p.glowEl.setAttribute('fill','rgba(255,220,80,0.18)');
      p.el.style.cursor='pointer';
      p.el.style.filter='drop-shadow(0 0 8px rgba(255,200,60,0.7))';
    });
    p.el.addEventListener('mouseleave',()=>{
      p.glowEl.setAttribute('fill','rgba(255,220,80,0)');
      p.el.style.filter='';
    });
  });
}

/* ----------------------------------------------------------
   ANIMATION PHASES
   ---------------------------------------------------------- */

/* ---- PHASE 0: show whole moon, gentle glow ------------- */
function animIntroMoon(){
  setState(STATE.INTRO_MOON);
  const svg=document.getElementById('moon-svg');
  /* Hide crack lines */
  crackEls.forEach(c=>{ c.style.opacity='0'; c.style.strokeDashoffset='1000'; });
  /* Reset piece positions — all at their moon positions */
  piecesData.forEach(p=>{
    p.el.style.transition='none';
    p.el.setAttribute('transform','translate(0,0) rotate(0,'+p.svgCx+','+p.svgCy+')');
    p.el.style.opacity='1';
    p.badgeEl.style.opacity='0';
  });
  /* Animate halo pulse */
  moonGlowEl.style.animation='haloPulse 2s ease-in-out infinite';

  /* Wait, then crack */
  setTimeout(animCracking, 1200);
}

/* ---- PHASE 1: animate crack lines ---------------------- */
function animCracking(){
  setState(STATE.MOON_CRACKING);
  /* animate each crack line with staggered delays */
  crackEls.forEach((c,i)=>{
    const delay=i*120+Math.random()*80;
    setTimeout(()=>{
      c.style.opacity='1';
      c.style.transition=`stroke-dashoffset ${300+i*40}ms ease-out`;
      c.style.strokeDashoffset='0';
    }, delay);
  });
  /* After cracks done, shatter */
  setTimeout(animShattering, crackEls.length*120+600);
}

/* ---- PHASE 2: pieces fly apart ------------------------- */
function animShattering(){
  setState(STATE.MOON_SHATTERING);
  moonGlowEl.style.animation='';

  /* Screen shake */
  const stage=document.getElementById('moon-stage');
  stage.style.animation='shake 0.4s ease-out';
  setTimeout(()=>{ stage.style.animation=''; },400);

  const R=MOON_R;
  piecesData.forEach((p,i)=>{
    const dir=SCATTER_DIRS[i];
    const delay=i*60+Math.random()*40;

    setTimeout(()=>{
      /* Fly out from moon center — big distance in SVG units */
      const tx=dir.dx * R * 2.8;
      const ty=dir.dy * R * 2.8;
      const rot=dir.rot;
      p.el.style.transition=`transform 700ms cubic-bezier(0.25,0.46,0.45,0.94), opacity 700ms ease`;
      p.el.setAttribute('transform',
        `translate(${tx},${ty}) rotate(${rot},${p.svgCx},${p.svgCy})`);
      p.scatterX=tx; p.scatterY=ty; p.scatterRot=rot;
    }, delay);
  });

  setTimeout(transitionToPuzzle, piecesData.length*60+900);
}

/* ---- PHASE 3: switch screens, reposition pieces -------- */
function transitionToPuzzle(){
  setState(STATE.PIECES_SCATTERED);

  /* Switch HTML screens */
  document.getElementById('screen-login').classList.remove('active');
  document.getElementById('screen-home').classList.add('active');

  /* Show moon outline / target silhouette */
  moonOutlineEl.style.transition='opacity 0.8s ease';
  moonOutlineEl.style.opacity='1';

  /* Update player greeting */
  const code=document.getElementById('employee-code').value.trim().toUpperCase();
  employeeCode=code;
  document.getElementById('home-heading').textContent=`Chào ${code} 👋`;

  /* Log login to backend */
  logToBackend({ type:'login', employeeCode:code });

  /* Reposition pieces in scatter formation across SVG */
  /* SVG viewBox = 320x320, moon center at 160,160 */
  /* Scatter positions: distribute around a wider area */
  const scatterPositions=[
    {x:20,  y:20},  {x:200, y:10},  {x:290, y:60},
    {x:300, y:190}, {x:260, y:290}, {x:140, y:300},
    {x:20,  y:280}, {x:5,   y:160}, {x:10,  y:80},
    {x:270, y:120},
  ];

  setTimeout(()=>{
    piecesData.forEach((p,i)=>{
      const sp=scatterPositions[i];
      /* translate from moon centroid to scatter position */
      const tx=sp.x-p.svgCx;
      const ty=sp.y-p.svgCy;
      const rot=SCATTER_DIRS[i].rot;
      p.currentX=tx; p.currentY=ty; p.currentRot=rot;
      p.el.style.transition='transform 0.5s cubic-bezier(0.34,1.56,0.64,1), opacity 0.5s ease';
      p.el.setAttribute('transform',`translate(${tx},${ty}) rotate(${rot},${p.svgCx},${p.svgCy})`);
      p.el.style.opacity='1';
    });

    /* Build piece rail buttons */
    buildPieceRail();
    updateProgress();
    setState(STATE.PUZZLE_ACTIVE);
    setupPieceClicks();
  }, 300);
}

/* ----------------------------------------------------------
   PIECE RAIL — small thumbnail indicators
   ---------------------------------------------------------- */
function buildPieceRail(){
  const rail=document.getElementById('piece-rail');
  if(!rail) return;
  rail.innerHTML='';
  piecesData.forEach(p=>{
    const btn=document.createElement('button');
    btn.className='rail-btn'; btn.dataset.id=p.id;
    btn.innerHTML=`<span class="rail-num">${p.id+1}</span>`;
    btn.title=`Mảnh ${p.id+1}`;
    btn.addEventListener('click',()=>{
      if(p.solved) return;
      openPuzzleModal(p.id);
    });
    p.railBtn=btn;
    rail.appendChild(btn);
  });
}

function updateProgress(){
  const total=piecesData.length;
  const count=piecesData.filter(p=>p.solved).length;
  solvedCount=count;
  const pill=document.getElementById('pill-count');
  const bar=document.getElementById('bar-fill');
  const progText=document.getElementById('progress-text');
  const piecesLeft=document.getElementById('pieces-left');
  if(pill)    pill.textContent=`${count}/${total}`;
  if(bar)     bar.style.width=`${(count/total)*100}%`;
  if(progText) progText.textContent=`${count} / ${total} mảnh`;
  if(piecesLeft) piecesLeft.textContent=total-count;
}

/* ----------------------------------------------------------
   PUZZLE MODAL
   ---------------------------------------------------------- */
function openPuzzleModal(pieceId){
  if(!window.CONFIG || !CONFIG.questions) return;
  const q=CONFIG.questions[pieceId];
  if(!q) return;

  document.getElementById('modal-tag').textContent=`Mảnh ${pieceId+1} / ${piecesData.length}`;
  document.getElementById('modal-question').textContent=q.question;
  document.getElementById('modal-feedback').textContent='';
  document.getElementById('modal-feedback').className='feedback';

  const opts=document.getElementById('modal-options');
  opts.innerHTML='';
  q.options.forEach((opt,i)=>{
    const label=document.createElement('label');
    label.className='option';
    const radio=document.createElement('input');
    radio.type='radio'; radio.name='quiz-opt'; radio.value=i;
    label.appendChild(radio);
    label.append(' '+opt);
    opts.appendChild(label);
  });

  const submitBtn=document.getElementById('modal-submit');
  submitBtn.textContent='Trả lời';
  submitBtn.disabled=false;
  submitBtn.onclick=()=>submitAnswer(pieceId, q);

  document.getElementById('puzzle-overlay').classList.add('active');
}

function submitAnswer(pieceId, q){
  const sel=document.querySelector('input[name="quiz-opt"]:checked');
  if(!sel){ flashFeedback('Hãy chọn một đáp án!','warn'); return; }
  const chosen=parseInt(sel.value);
  const fb=document.getElementById('modal-feedback');
  const submitBtn=document.getElementById('modal-submit');

  if(chosen===q.correct){
    fb.textContent='✅ Chính xác! Mảnh trăng đã được mở khoá!';
    fb.className='feedback correct';
    submitBtn.disabled=true;
    setTimeout(()=>{
      document.getElementById('puzzle-overlay').classList.remove('active');
      pieceFlyHome(pieceId);
    },1000);
  } else {
    fb.textContent='❌ Chưa đúng rồi. Thử lại nhé!';
    fb.className='feedback wrong';
    /* shake modal */
    const modal=document.querySelector('.modal');
    modal.style.animation='shake 0.3s ease';
    setTimeout(()=>{ modal.style.animation=''; },300);
  }
}

function flashFeedback(msg, type){
  const fb=document.getElementById('modal-feedback');
  fb.textContent=msg;
  fb.className='feedback '+type;
}

/* ----------------------------------------------------------
   PIECE FLY HOME ANIMATION
   ---------------------------------------------------------- */
function pieceFlyHome(pieceId){
  const p=piecesData[pieceId];
  if(p.solved) return;
  setState(STATE.PIECE_FLYING);

  /* The piece needs to animate from its current scatter position
     back to translate(0,0) — which is its natural moon position */
  p.el.style.transition='none';
  /* First add a golden glow */
  p.pathEl.setAttribute('stroke','rgba(255,210,60,0.95)');
  p.pathEl.setAttribute('stroke-width','2.5');

  /* Animate: translate back to 0,0 and rotate back to 0 */
  const animDuration=900;
  const startTime=performance.now();
  const startX=p.currentX, startY=p.currentY, startRot=p.currentRot;

  function fly(now){
    const t=Math.min(1,(now-startTime)/animDuration);
    /* spring-like easing */
    const e=t<1 ? 1-Math.pow(1-t,3)*(1+1.5*Math.pow(1-t,1)) : 1;
    const ease=easeOutBack(t);
    const tx=startX*(1-ease);
    const ty=startY*(1-ease);
    const rot=startRot*(1-ease);
    /* subtle scale pulse mid-flight */
    const scl=1+0.08*Math.sin(t*Math.PI);
    p.el.setAttribute('transform',
      `translate(${tx},${ty}) rotate(${rot},${p.svgCx},${p.svgCy}) scale(${scl})`);

    if(t<1){ requestAnimationFrame(fly); }
    else { pieceLocked(pieceId); }
  }
  requestAnimationFrame(fly);
}

function easeOutBack(t){
  const c1=1.70158, c3=c1+1;
  return 1+c3*Math.pow(t-1,3)+c1*Math.pow(t-1,2);
}

function pieceLocked(pieceId){
  const p=piecesData[pieceId];
  p.solved=true;

  /* Snap to exact position */
  p.el.setAttribute('transform','translate(0,0)');
  p.el.style.transition='none';

  /* Restore normal stroke */
  p.pathEl.setAttribute('stroke','rgba(255,240,140,0.6)');
  p.pathEl.setAttribute('stroke-width','1');

  /* Flash glow on snap */
  p.glowEl.setAttribute('fill','rgba(255,220,80,0.5)');
  setTimeout(()=>{ p.glowEl.setAttribute('fill','rgba(255,220,80,0)'); }, 600);

  /* Show badge */
  p.badgeEl.style.opacity='1';

  /* Remove interactivity */
  p.el.style.cursor='default';
  p.el.style.pointerEvents='none';

  /* Update rail button */
  if(p.railBtn){ p.railBtn.classList.add('solved'); p.railBtn.disabled=true; }

  /* Log */
  logToBackend({ type:'piece_solved', employeeCode, pieceId, totalUnlocked:solvedCount+1 });

  updateProgress();

  const allSolved=piecesData.every(p=>p.solved);
  if(allSolved){
    setTimeout(animMoonComplete, 500);
  } else {
    setState(STATE.PUZZLE_ACTIVE);
  }
}

/* ----------------------------------------------------------
   MOON COMPLETION ANIMATION
   ---------------------------------------------------------- */
function animMoonComplete(){
  setState(STATE.MOON_COMPLETED);

  /* Pulse the whole moon */
  moonGlowEl.style.animation='completionPulse 1.5s ease-out forwards';

  /* All pieces glow gold */
  piecesData.forEach((p,i)=>{
    setTimeout(()=>{
      p.glowEl.setAttribute('fill','rgba(255,210,60,0.35)');
    }, i*60);
  });

  /* Fade cracks out */
  crackEls.forEach(c=>{ c.style.transition='opacity 1s ease'; c.style.opacity='0'; });

  setTimeout(()=>{
    moonOutlineEl.style.opacity='0';
    if(window.launchConfetti) launchConfetti();
    setTimeout(showCompleteScreen, 1500);
  }, 2000);
}

function showCompleteScreen(){
  document.getElementById('screen-home').classList.remove('active');
  document.getElementById('screen-complete').classList.add('active');

  /* Generate reward code */
  const code=CONFIG.rewardCode || 'YODY-MOON-2026';
  document.getElementById('reward-code').textContent=code;
  logToBackend({ type:'completed', employeeCode, rewardCode:code });
}

/* ----------------------------------------------------------
   LOGIN
   ---------------------------------------------------------- */
document.addEventListener('DOMContentLoaded',()=>{
  setState(STATE.LOGIN);

  const form=document.getElementById('login-form');
  const errEl=document.getElementById('login-err');
  const moonStage=document.getElementById('moon-stage');

  /* Build SVG immediately so it's ready */
  buildMoonSVG(moonStage);

  form && form.addEventListener('submit',async(e)=>{
    e.preventDefault();
    errEl.textContent='';
    const code=document.getElementById('employee-code').value.trim();
    if(!code){ errEl.textContent='Vui lòng nhập mã nhân viên.'; return; }

    /* Validate via backend if configured */
    if(CONFIG.backend && CONFIG.backend.appsScriptUrl){
      try{
        const res=await fetch(CONFIG.backend.appsScriptUrl,{
          method:'POST', body:JSON.stringify({ type:'validate', employeeCode:code }),
          headers:{'Content-Type':'application/json'}
        });
        const data=await res.json();
        if(data.ok===false){ errEl.textContent=data.message||'Mã không hợp lệ.'; return; }
      } catch(_){ /* offline — continue anyway */ }
    }

    /* START ANIMATION */
    document.getElementById('screen-login').classList.add('fading');
    setTimeout(()=>{
      animIntroMoon();
    }, 400);
  });

  /* Copy reward code */
  document.getElementById('copy-reward')?.addEventListener('click',()=>{
    const code=document.getElementById('reward-code').textContent;
    navigator.clipboard.writeText(code).then(()=>{
      document.getElementById('copy-reward').textContent='✅ Đã sao chép!';
    });
  });

  /* Close modal */
  document.getElementById('modal-close')?.addEventListener('click',()=>{
    document.getElementById('puzzle-overlay').classList.remove('active');
  });
  document.getElementById('puzzle-overlay')?.addEventListener('click',(e)=>{
    if(e.target===document.getElementById('puzzle-overlay'))
      document.getElementById('puzzle-overlay').classList.remove('active');
  });
});

/* ----------------------------------------------------------
   BACKEND LOGGING
   ---------------------------------------------------------- */
async function logToBackend(data){
  if(!CONFIG.backend?.appsScriptUrl) return;
  try{
    await fetch(CONFIG.backend.appsScriptUrl,{
      method:'POST',
      body:JSON.stringify({ ts:new Date().toISOString(), ...data }),
      headers:{'Content-Type':'application/json'}
    });
  } catch(_){}
}