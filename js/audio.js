/* =============================================================================
   AUDIO.JS — Âm thanh của minigame
   - Tiếng nứt/vỡ: tổng hợp trực tiếp bằng Web Audio API (không cần file âm
     thanh ngoài, luôn hoạt động ngay).
   - Nhạc nền Trung thu: phát từ file assets/audio/bgm-trungthu.mp3 (bạn tự
     thêm file — xem assets/audio/README.md). Nếu không có file, bỏ qua êm
     ái, không lỗi.
   Có nút bật/tắt tiếng chung cho cả 2 loại âm thanh (id="sound-toggle").
   ============================================================================= */

const BGM_SRC = 'assets/audio/bgm-trungthu.mp3';

const AudioEngine = (() => {
  let ctx = null;
  let masterGain = null;
  let muted = false;
  let bgmEl = null;
  let bgmReady = false;

  function ensureCtx(){
    if(ctx) return ctx;
    try{
      const AC = window.AudioContext || window.webkitAudioContext;
      if(!AC) return null;
      ctx = new AC();
      masterGain = ctx.createGain();
      masterGain.gain.value = muted ? 0 : 0.8;
      masterGain.connect(ctx.destination);
    }catch(e){ ctx = null; }
    return ctx;
  }

  function resume(){
    const c = ensureCtx();
    if(c && c.state === 'suspended') c.resume().catch(()=>{});
  }

  function noiseBuffer(duration){
    const size = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buf = ctx.createBuffer(1, size, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for(let i=0;i<size;i++) data[i] = Math.random()*2-1;
    return buf;
  }

  /* Tiếng "tách" nhỏ — dùng cho mỗi vết nứt xuất hiện */
  function playCrackTick(){
    const c = ensureCtx();
    if(!c) return;
    try{
      const dur = 0.09 + Math.random()*0.05;
      const src = c.createBufferSource();
      src.buffer = noiseBuffer(dur);
      const bp = c.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 1500 + Math.random()*2200;
      bp.Q.value = 1.1;
      const g = c.createGain();
      g.gain.setValueAtTime(0.22, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
      src.connect(bp).connect(g).connect(masterGain);
      src.start(); src.stop(c.currentTime + dur);
    }catch(e){}
  }

  /* Tiếng "vỡ" lớn — dùng đúng lúc mặt trăng tách thành 10 mảnh */
  function playShatterBoom(){
    const c = ensureCtx();
    if(!c) return;
    try{
      const dur = 0.5;
      const src = c.createBufferSource();
      src.buffer = noiseBuffer(dur);
      const hp = c.createBiquadFilter();
      hp.type = 'highpass'; hp.frequency.value = 500;
      const lp = c.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.setValueAtTime(6000, c.currentTime);
      lp.frequency.exponentialRampToValueAtTime(400, c.currentTime + dur);
      const g = c.createGain();
      g.gain.setValueAtTime(0.5, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
      src.connect(hp).connect(lp).connect(g).connect(masterGain);
      src.start(); src.stop(c.currentTime + dur);

      // thêm 1 lớp "thud" trầm cho cảm giác nặng
      const osc = c.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(120, c.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, c.currentTime + 0.3);
      const og = c.createGain();
      og.gain.setValueAtTime(0.4, c.currentTime);
      og.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.35);
      osc.connect(og).connect(masterGain);
      osc.start(); osc.stop(c.currentTime + 0.35);
    }catch(e){}
  }

  /* Tiếng "lấp lánh" ngắn — dùng khi 1 mảnh khớp đúng vị trí */
  function playChime(){
    const c = ensureCtx();
    if(!c) return;
    try{
      const notes = [880, 1108, 1318]; // A5, C#6, E6 — nghe "lấp lánh" nhẹ
      notes.forEach((freq, i)=>{
        const osc = c.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;
        const g = c.createGain();
        const start = c.currentTime + i*0.06;
        g.gain.setValueAtTime(0.0001, start);
        g.gain.exponentialRampToValueAtTime(0.18, start + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, start + 0.5);
        osc.connect(g).connect(masterGain);
        osc.start(start); osc.stop(start + 0.55);
      });
    }catch(e){}
  }

  /* ---------------- nhạc nền ---------------- */
  function initBgm(){
    if(bgmEl) return;
    bgmEl = document.createElement('audio');
    bgmEl.loop = true;
    bgmEl.preload = 'none';
    bgmEl.volume = 0.35;
    bgmEl.src = BGM_SRC;
    bgmEl.addEventListener('canplaythrough', ()=>{ bgmReady = true; }, { once:true });
    bgmEl.addEventListener('error', ()=>{ bgmReady = false; }, { once:true });
    document.body.appendChild(bgmEl);
  }
  function startBgm(){
    initBgm();
    resume();
    if(muted) return;
    try{
      const p = bgmEl.play();
      if(p && typeof p.catch === 'function') p.catch(()=>{});
    }catch(e){}
  }
  function stopBgm(fadeMs){
    if(!bgmEl) return;
    if(!fadeMs){ bgmEl.pause(); return; }
    const steps = 10, start = bgmEl.volume, stepTime = fadeMs/steps;
    let i = 0;
    const iv = setInterval(()=>{
      i++;
      bgmEl.volume = Math.max(0, start * (1 - i/steps));
      if(i>=steps){ clearInterval(iv); bgmEl.pause(); bgmEl.volume = start; }
    }, stepTime);
  }

  function setMuted(v){
    muted = v;
    if(masterGain) masterGain.gain.value = muted ? 0 : 0.8;
    if(bgmEl){
      if(muted) bgmEl.pause();
      else if(bgmEl.paused){
        try{
          const p = bgmEl.play();
          if(p && typeof p.catch === 'function') p.catch(()=>{});
        }catch(e){}
      }
    }
  }
  function toggleMute(){ setMuted(!muted); return muted; }
  function isMuted(){ return muted; }

  return {
    unlock: resume,
    playCrackTick, playShatterBoom, playChime,
    startBgm, stopBgm,
    toggleMute, isMuted
  };
})();
