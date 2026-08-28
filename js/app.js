/* =============================================================================
   APP.JS — LOGIC CHÍNH CỦA MINIGAME
   Đọc dữ liệu từ CONFIG (config.js, nạp TRƯỚC file này) và điều phối toàn bộ
   giao diện + animation (qua PuzzleStage, moon-geometry.js, puzzle-stage.js).
   Thường không cần sửa file này khi tái sử dụng cho campaign khác — chỉ cần
   sửa config.js và style.css.
   ============================================================================= */

const TOTAL = CONFIG.pieces.length;
const state = {
  employeeCode: "",
  employeeName: "",
  employeeTitle: "",
  unlocked: new Set(),
  activePieceId: null,
  selectedOptionIdx: null
};

const GEO = PuzzleStage.init(TOTAL);

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

/* ---------------- kiểm tra mã nhân viên trong danh sách Google Sheet ----
   Trả về Promise<{found, name, title}>. Nếu chưa cấu hình backend, hoặc
   requireVerification=false, luôn coi như hợp lệ (found:true) để không chặn
   demo/test khi chưa deploy Apps Script. Nếu request lỗi mạng, cũng cho qua
   (found:true) kèm cảnh báo console, tránh chặn người chơi vì backend sập. */
async function verifyEmployee(code){
  if(!CONFIG.backend.appsScriptUrl || !CONFIG.backend.requireVerification){
    return { found: true, name: "", title: "" };
  }
  const TIMEOUT_MS = 6000; // Apps Script có thể chậm lúc "cold start"; giới hạn để không bắt chờ vô thời hạn
  const controller = new AbortController();
  const timer = setTimeout(()=> controller.abort(), TIMEOUT_MS);
  try{
    const url = CONFIG.backend.appsScriptUrl + "?action=lookup&code=" + encodeURIComponent(code);
    const res = await fetch(url, { method: "GET", signal: controller.signal });
    const data = await res.json();
    return { found: !!data.found, name: data.name || "", title: data.title || "" };
  }catch(e){
    console.warn("Không thể kiểm tra mã nhân viên (lỗi mạng/backend hoặc quá thời gian chờ), tạm thời cho qua:", e);
    return { found: true, name: "", title: "" };
  }finally{
    clearTimeout(timer);
  }
}

/* ---------------- starfield background ---------------------------------- */
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
      }catch(e){ }
    }
    size(); addEventListener('resize', size); draw();
  }catch(e){ }
})();

/* ---------------- puzzle stage refs -------------------------------------- */
const puzzleAreaEl = document.getElementById('puzzle-area');
const targetMoonEl = document.getElementById('moon-target-stage');
const screenHomeEl = document.getElementById('screen-home');

function updateProgressUI(){
  const n = state.unlocked.size;
  document.getElementById('pill-count').textContent = `${n}/${TOTAL}`;
  document.getElementById('progress-text').textContent = `${n} / ${TOTAL} mảnh`;
  document.getElementById('pieces-left').textContent = TOTAL - n;
  document.getElementById('bar-fill').style.width = (n/TOTAL*100) + "%";
}

/* ---------------- puzzle modal (câu đố) ------------------------------------ */
function openPuzzle(id){
  if(state.unlocked.has(id)) return;
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
    fb.textContent = "✨ Chính xác! Mảnh trăng đang bay về vị trí...";
    fb.className = 'feedback correct';
    state.unlocked.add(pc.id);
    logEvent('piece_unlocked', { pieceId: pc.id, totalUnlocked: state.unlocked.size });
    updateProgressUI();
    setTimeout(()=>{
      closePuzzle();
      PuzzleStage.setState('PIECE_FLYING_HOME');
      PuzzleStage.flyPieceHome(pc.id, targetMoonEl, ()=>{
        PuzzleStage.setState('PIECE_LOCKED');
        PuzzleStage.syncTargetVisuals(state.unlocked);
        const tEl = document.getElementById('target-piece-'+pc.id);
        if(tEl){ tEl.classList.add('pulse'); setTimeout(()=>tEl.classList.remove('pulse'), 900); }
        burstSparkles();
        if(state.unlocked.size === TOTAL){
          PuzzleStage.setState('MOON_COMPLETED');
          setTimeout(showCompletion, 700);
        }
      });
    }, 520);
  } else {
    fb.textContent = "Chưa đúng, thử lại nhé!";
    fb.className = 'feedback wrong';
    const modal = document.querySelector('.modal');
    modal.classList.remove('shake'); void modal.offsetWidth; modal.classList.add('shake');
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
  }catch(e){ }
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
  }catch(e){ }
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

/* ---------------- khởi động màn puzzle: đo layout thật rồi chạy intro ------ */
function startJourney(){
  showScreen('screen-home');
  screenHomeEl.classList.add('prepping');

  requestAnimationFrame(()=>{
    targetMoonEl.innerHTML = PuzzleStage.buildTargetMoonSVG();
    const targetRect = targetMoonEl.getBoundingClientRect();
    PuzzleStage.setPxPerUnit(targetRect.width / GEO.SPACE);
    const layout = PuzzleStage.computeScatterLayout(targetRect);
    PuzzleStage.setLayout(layout);

    PuzzleStage.playIntro(layout, targetMoonEl, ()=>{
      PuzzleStage.renderScatteredPieces(puzzleAreaEl, state.unlocked, openPuzzle);
      PuzzleStage.syncTargetVisuals(state.unlocked);
      updateProgressUI();
      screenHomeEl.classList.remove('prepping');
    });
  });
}

let resizeTimer;
addEventListener('resize', ()=>{
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(()=>{
    if(PuzzleStage.getState() !== 'PUZZLE_ACTIVE' || !targetMoonEl.firstChild) return;
    const targetRect = targetMoonEl.getBoundingClientRect();
    if(targetRect.width < 10) return;
    PuzzleStage.setPxPerUnit(targetRect.width / GEO.SPACE);
    const layout = PuzzleStage.computeScatterLayout(targetRect);
    PuzzleStage.setLayout(layout);
    PuzzleStage.renderScatteredPieces(puzzleAreaEl, state.unlocked, openPuzzle);
  }, 250);
});

/* ---------------- events ---------------------------------------------------- */
document.getElementById('login-form').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const code = document.getElementById('employee-code').value.trim();
  const err = document.getElementById('login-err');
  const btn = document.getElementById('login-submit-btn');
  if(!code){ err.textContent = "Vui lòng nhập mã nhân viên."; return; }
  err.textContent = "";

  const oldLabel = btn.textContent;
  btn.innerHTML = '<span class="btn-spinner"></span> Đang kiểm tra...';
  btn.classList.add('loading');
  btn.disabled = true;
  const result = await verifyEmployee(code);
  btn.textContent = oldLabel;
  btn.classList.remove('loading');
  btn.disabled = false;

  if(!result.found){
    err.textContent = "Mã nhân viên không có trong danh sách tham gia. Vui lòng kiểm tra lại.";
    return;
  }

  state.employeeCode = code;
  state.employeeName = result.name;
  state.employeeTitle = result.title;
  logEvent('login', {});

  document.getElementById('confirm-name').textContent = result.name || code;
  document.getElementById('confirm-title').textContent = result.title || `Mã nhân viên: ${code}`;
  document.getElementById('home-heading').textContent = `Chào bạn, ${result.name || code} 👋`;
  showScreen('screen-confirm');
});
document.getElementById('confirm-start-btn').addEventListener('click', ()=>{
  logEvent('journey_started', {});
  startJourney();
});
document.getElementById('confirm-back-btn').addEventListener('click', ()=>{
  document.getElementById('employee-code').value = '';
  document.getElementById('login-err').textContent = '';
  showScreen('screen-login');
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