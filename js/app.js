/* =============================================================================
   APP.JS — LOGIC CHÍNH CỦA MINIGAME
   File này đọc dữ liệu từ CONFIG (định nghĩa trong config.js, phải được nạp
   TRƯỚC file này trong index.html) và điều khiển toàn bộ giao diện, trạng thái,
   hiệu ứng. Thường không cần sửa file này khi tái sử dụng cho campaign khác —
   chỉ cần sửa config.js và style.css.
   ============================================================================= */

const TOTAL = CONFIG.pieces.length;
const state = {
  employeeCode: "",
  unlocked: new Set(),
  activePieceId: null,
  selectedOptionIdx: null
};

/* ---------------- backend logging (Google Sheet via Apps Script) -------- */
function logEvent(type, payload){
  if(!CONFIG.backend.appsScriptUrl) return;
  try{
    fetch(CONFIG.backend.appsScriptUrl, {
      method:"POST", mode:"no-cors",
      headers:{"Content-Type":"text/plain;charset=utf-8"},
      body: JSON.stringify({ type, employeeCode: state.employeeCode, ts: new Date().toISOString(), ...payload })
    }).catch(()=>{});
  }catch(e){}
}

/* ---------------- starfield background ---------------------------------- */
/* Wrapped defensively: if canvas 2D context is unavailable (privacy mode,
   fingerprint-blocking extensions, sandboxed preview, etc.) this must fail
   silently and never block the rest of the app's script from running. */
(function stars(){
  try{
    const c = document.getElementById('stars');
    const ctx = c && c.getContext && c.getContext('2d');
    if(!ctx) return;
    let w,h,pts;
    function size(){ w=c.width=innerWidth; h=c.height=innerHeight;
      pts = Array.from({length:70}, ()=>({x:Math.random()*w,y:Math.random()*h*0.7,r:Math.random()*1.4+.3,a:Math.random(),s:Math.random()*.015+.004})); }
    function draw(){
      try{
        ctx.clearRect(0,0,w,h);
        pts.forEach(p=>{ p.a += p.s; const op = Math.abs(Math.sin(p.a));
          ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,7); ctx.fillStyle=`rgba(244,224,180,${op*.8})`; ctx.fill(); });
        requestAnimationFrame(draw);
      }catch(e){ /* stop silently, never throw past this point */ }
    }
    size(); addEventListener('resize', size); draw();
  }catch(e){ /* decorative only — app must keep working without it */ }
})();

/* ---------------- moon SVG: shattered pieces radiating from centre ------ */
const CX=200, CY=200, R=170;
function seeded(n){ const x = Math.sin(n*999.7)*10000; return x - Math.floor(x); }
function polar(r, deg){ const rad = (deg-90)*Math.PI/180; return { x: CX + r*Math.cos(rad), y: CY + r*Math.sin(rad) }; }

// crack polyline from centre to outer edge for boundary k
function boundaryPoints(k){
  const angle = k * (360/TOTAL);
  const stops = [0, .32, .68, 1];
  return stops.map((t,i)=>{
    const r = t*R;
    let jitterAngle = 0;
    if(i>0 && i<stops.length-1){
      const amp = 7 * Math.sin(t*Math.PI); // zero at ends, max mid
      const dir = seeded(k*7+i) > .5 ? 1 : -1;
      jitterAngle = dir * amp * (180/(Math.PI*Math.max(r,1)));
    }
    return polar(r, angle + jitterAngle);
  });
}
function buildMoonSVG(){
  const boundaries = Array.from({length:TOTAL}, (_,k)=>boundaryPoints(k));
  let piecesSVG = "";
  const centers = [];
  for(let i=0;i<TOTAL;i++){
    const b0 = boundaries[i];
    const b1 = boundaries[(i+1)%TOTAL];
    const a0 = i*(360/TOTAL);
    let d = `M ${CX} ${CY} `;
    for(let j=1;j<b0.length;j++) d += `L ${b0[j].x.toFixed(2)} ${b0[j].y.toFixed(2)} `;
    d += `A ${R} ${R} 0 0 1 ${b1[b1.length-1].x.toFixed(2)} ${b1[b1.length-1].y.toFixed(2)} `;
    for(let j=b1.length-2;j>=0;j--) d += `L ${b1[j].x.toFixed(2)} ${b1[j].y.toFixed(2)} `;
    d += "Z";
    const labelPt = polar(R*0.62, a0 + (360/TOTAL)/2);
    centers.push(labelPt);
    piecesSVG += `<path class="piece-path locked" id="piece-${i+1}" data-id="${i+1}" d="${d}"></path>`;
  }
  let labelsSVG = centers.map((p,i)=>`<text class="piece-num" x="${p.x.toFixed(1)}" y="${p.y.toFixed(1)}" text-anchor="middle" dominant-baseline="middle" font-family="Baloo 2" font-weight="700" font-size="15" fill="#ffffff" fill-opacity="0" id="num-${i+1}">${i+1}</text>`).join("");

  return `
  <svg viewBox="0 0 400 400" width="400" height="400" role="img" aria-label="Mặt trăng ghép mảnh">
    <defs>
      <radialGradient id="moonGradient" cx="35%" cy="30%" r="80%">
        <stop offset="0%" stop-color="#FFF6DE"/>
        <stop offset="55%" stop-color="#F4C572"/>
        <stop offset="100%" stop-color="#E39A34"/>
      </radialGradient>
      <radialGradient id="glowGrad" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#F4C572" stop-opacity="0.45"/>
        <stop offset="100%" stop-color="#F4C572" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <circle class="moon-core-glow" cx="200" cy="200" r="185" fill="url(#glowGrad)"></circle>
    <g id="pieces-group">${piecesSVG}</g>
    <g id="labels-group">${labelsSVG}</g>
  </svg>`;
}

function renderMoon(){
  document.getElementById('moon-stage').innerHTML = buildMoonSVG();
  document.querySelectorAll('.piece-path').forEach(p=>{
    p.addEventListener('click', ()=> openPuzzle(parseInt(p.dataset.id)));
  });
  syncPieceVisuals();
}
function syncPieceVisuals(){
  CONFIG.pieces.forEach(pc=>{
    const el = document.getElementById('piece-'+pc.id);
    const num = document.getElementById('num-'+pc.id);
    if(!el) return;
    if(state.unlocked.has(pc.id)){ el.classList.remove('locked'); el.classList.add('unlocked'); if(num) num.setAttribute('fill-opacity','0'); }
    else { el.classList.add('locked'); el.classList.remove('unlocked'); if(num) num.setAttribute('fill-opacity','.55'); }
  });
  const core = document.querySelector('.moon-core-glow');
  if(core) core.style.opacity = (0.15 + 0.55*(state.unlocked.size/TOTAL)).toString();
}

/* ---------------- chip rail ---------------------------------------------- */
function renderRail(){
  const rail = document.getElementById('piece-rail');
  rail.innerHTML = CONFIG.pieces.map(pc=>{
    const unlocked = state.unlocked.has(pc.id);
    return `<button class="chip ${unlocked?'unlocked':''}" data-id="${pc.id}" aria-label="Mảnh ${pc.id}${unlocked?' đã mở':' chưa mở'}">${unlocked?'🌕':'🔒'}</button>`;
  }).join("");
  rail.querySelectorAll('.chip').forEach(ch=> ch.addEventListener('click', ()=> openPuzzle(parseInt(ch.dataset.id))));
}

function updateProgressUI(){
  const n = state.unlocked.size;
  document.getElementById('pill-count').textContent = `${n}/${TOTAL}`;
  document.getElementById('progress-text').textContent = `${n} / ${TOTAL} mảnh`;
  document.getElementById('pieces-left').textContent = TOTAL - n;
  document.getElementById('bar-fill').style.width = (n/TOTAL*100) + "%";
}

/* ---------------- puzzle modal ------------------------------------------- */
function openPuzzle(id){
  if(state.unlocked.has(id)) return; // already solved
  const pc = CONFIG.pieces.find(p=>p.id===id);
  state.activePieceId = id;
  state.selectedOptionIdx = null;
  document.getElementById('modal-tag').textContent = `Mảnh ${id} / ${TOTAL}`;
  document.getElementById('modal-question').textContent = pc.prompt;
  document.getElementById('modal-feedback').textContent = '';
  document.getElementById('modal-feedback').className = 'feedback';

  const optWrap = document.getElementById('modal-options');
  if(pc.type === 'mcq'){
    optWrap.innerHTML = pc.options.map((opt,i)=>`<button class="option" data-idx="${i}">${opt}</button>`).join("");
    optWrap.querySelectorAll('.option').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        optWrap.querySelectorAll('.option').forEach(b=>b.classList.remove('selected'));
        btn.classList.add('selected');
        state.selectedOptionIdx = parseInt(btn.dataset.idx);
      });
    });
  } else {
    optWrap.innerHTML = `<input type="text" id="short-answer" placeholder="Nhập câu trả lời...">`;
  }
  document.getElementById('puzzle-overlay').classList.add('active');
}
function closePuzzle(){ document.getElementById('puzzle-overlay').classList.remove('active'); }

function checkAnswer(){
  const pc = CONFIG.pieces.find(p=>p.id===state.activePieceId);
  const fb = document.getElementById('modal-feedback');
  let correct = false;
  if(pc.type === 'mcq'){
    if(state.selectedOptionIdx === null){ fb.textContent = "Hãy chọn một đáp án nhé."; fb.className='feedback wrong'; return; }
    correct = state.selectedOptionIdx === pc.answer;
  } else {
    const val = (document.getElementById('short-answer').value || '').trim().toLowerCase();
    if(!val){ fb.textContent = "Hãy nhập câu trả lời nhé."; fb.className='feedback wrong'; return; }
    correct = pc.answer.some(a => a.toLowerCase() === val);
  }

  if(correct){
    fb.textContent = "✨ Chính xác! Mảnh trăng đã sáng lên.";
    fb.className = 'feedback correct';
    state.unlocked.add(pc.id);
    logEvent('piece_unlocked', { pieceId: pc.id, totalUnlocked: state.unlocked.size });
    setTimeout(()=>{
      closePuzzle();
      unlockPieceVisual(pc.id);
    }, 550);
  } else {
    fb.textContent = "Chưa đúng, thử lại nhé!";
    fb.className = 'feedback wrong';
    const modal = document.querySelector('.modal');
    modal.classList.remove('shake'); void modal.offsetWidth; modal.classList.add('shake');
  }
}

function unlockPieceVisual(id){
  syncPieceVisuals();
  renderRail();
  updateProgressUI();
  const el = document.getElementById('piece-'+id);
  if(el){ el.classList.add('pulse'); setTimeout(()=>el.classList.remove('pulse'), 900); }
  burstSparkles();
  if(state.unlocked.size === TOTAL){
    setTimeout(showCompletion, 900);
  }
}

/* ---------------- sparkle / confetti particles ---------------------------- */
function burstSparkles(){
  try{
    const canvas = document.getElementById('confetti');
    const ctx = canvas.getContext('2d');
    if(!ctx) return;
    canvas.width = innerWidth; canvas.height = innerHeight;
    const cx = innerWidth/2, cy = innerHeight*0.38;
    const parts = Array.from({length:26}, ()=>({
      x:cx, y:cy, vx:(Math.random()-.5)*7, vy:(Math.random()-1.4)*7,
      life:1, r:Math.random()*3+1.5
    }));
    let frame=0;
    function tick(){
      ctx.clearRect(0,0,canvas.width,canvas.height);
      parts.forEach(p=>{ p.x+=p.vx; p.y+=p.vy; p.vy+=0.14; p.life-=0.018;
        if(p.life>0){ ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,7);
          ctx.fillStyle = `rgba(244,197,114,${p.life})`; ctx.fill(); } });
      frame++;
      if(frame<70) requestAnimationFrame(tick); else ctx.clearRect(0,0,canvas.width,canvas.height);
    }
    tick();
  }catch(e){ /* sparkle burst is decorative only */ }
}
function confettiFall(){
  try{
    const canvas = document.getElementById('confetti');
    const ctx = canvas.getContext('2d');
    if(!ctx) return;
    canvas.width = innerWidth; canvas.height = innerHeight;
    const colors = ['#F4C572','#FFE3A6','#2F6FDB','#FBF8F2','#E39A34'];
    const parts = Array.from({length:90}, ()=>({
      x:Math.random()*innerWidth, y:-20-Math.random()*innerHeight*0.5,
      vy:Math.random()*2+1.5, vx:(Math.random()-.5)*1.4, r:Math.random()*4+2,
      color: colors[Math.floor(Math.random()*colors.length)], rot:Math.random()*7, vr:(Math.random()-.5)*.3
    }));
    let t=0;
    function tick(){
      ctx.clearRect(0,0,canvas.width,canvas.height);
      parts.forEach(p=>{ p.y+=p.vy; p.x+=p.vx; p.rot+=p.vr;
        ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot);
        ctx.fillStyle=p.color; ctx.fillRect(-p.r/2,-p.r/2,p.r,p.r*1.6); ctx.restore(); });
      t++;
      if(t<260) requestAnimationFrame(tick); else ctx.clearRect(0,0,canvas.width,canvas.height);
    }
    tick();
  }catch(e){ /* confetti is decorative only */ }
}

/* ---------------- screen navigation --------------------------------------- */
function showScreen(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}
function showCompletion(){
  document.getElementById('reward-code').textContent = CONFIG.reward.code;
  document.querySelector('.reward-note').textContent = CONFIG.reward.note;
  showScreen('screen-complete');
  confettiFall();
  logEvent('campaign_completed', { rewardCode: CONFIG.reward.code });
}

/* ---------------- events ---------------------------------------------------- */
document.getElementById('login-form').addEventListener('submit', (e)=>{
  e.preventDefault();
  const code = document.getElementById('employee-code').value.trim();
  const err = document.getElementById('login-err');
  if(!code){ err.textContent = "Vui lòng nhập mã nhân viên."; return; }
  err.textContent = "";
  state.employeeCode = code;
  document.getElementById('home-heading').textContent = `Chào bạn, ${code} 👋`;
  logEvent('login', {});
  renderMoon();
  renderRail();
  updateProgressUI();
  showScreen('screen-home');
});
document.getElementById('modal-close').addEventListener('click', closePuzzle);
document.getElementById('modal-submit').addEventListener('click', checkAnswer);
document.getElementById('puzzle-overlay').addEventListener('click', (e)=>{ if(e.target.id==='puzzle-overlay') closePuzzle(); });
document.getElementById('copy-reward').addEventListener('click', ()=>{
  navigator.clipboard?.writeText(CONFIG.reward.code).then(()=>{
    const btn = document.getElementById('copy-reward');
    const old = btn.textContent; btn.textContent = "Đã sao chép ✓";
    setTimeout(()=> btn.textContent = old, 1500);
  });
});
document.title = CONFIG.campaignTitle + " · YODY";
