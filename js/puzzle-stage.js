/* =============================================================================
   PUZZLE-STAGE.JS
   Toàn bộ hoạt cảnh: trăng nguyên vẹn → nứt → vỡ thành 10 mảnh → mảnh rải rác
   trên màn hình → giải đúng thì mảnh bay về khuôn trăng đích → hoàn thành.

   State machine (đúng yêu cầu, không hard-code rời rạc):
   INTRO_MOON -> MOON_CRACKING -> MOON_SHATTERING -> PIECES_SCATTERED
   -> PUZZLE_ACTIVE -> (mỗi mảnh) PIECE_SOLVED -> PIECE_FLYING_HOME -> PIECE_LOCKED
   -> MOON_COMPLETED
   ============================================================================= */

const PuzzleStage = (() => {
  let GEO = null;
  let PX_PER_UNIT = 0.75;      // px trên mỗi đơn vị không gian 400x400 (khớp giữa khuôn đích & mảnh rời)
  let layout = [];             // vị trí rải rác hiện tại của từng mảnh: {id,x,y,tilt}
  let pieceEls = {};           // id -> element SVG của mảnh rời (còn trong DOM khi chưa mở khoá)
  let state = 'IDLE';

  function setState(s){ state = s; }
  function getState(){ return state; }

  /* ---------------- layout: rải 10 mảnh trên màn hình, tránh chồng nhau ---------------- */
  function computeScatterLayout(targetRect){
    const vw = window.innerWidth, vh = window.innerHeight;
    const areaTop = 190;                    // chừa chỗ cho brandbar + heading
    const areaBottom = vh - 120;            // chừa chỗ cho progress bar + footer
    const cx = targetRect.left + targetRect.width / 2;
    const cy = Math.max(areaTop + 60, Math.min(targetRect.top + targetRect.height / 2, areaBottom - 60));

    const n = GEO.pieces.length;
    const pts = GEO.pieces.map((p, i) => {
      const baseAngle = (360 / n) * i + (Math.random() * 22 - 11);
      const ringR = Math.min(vw, vh) * (0.30 + (i % 2 === 0 ? 0.10 : 0));
      const rad = (baseAngle - 90) * Math.PI / 180;
      let x = cx + Math.cos(rad) * ringR * (0.7 + Math.random() * 0.5);
      let y = cy + Math.sin(rad) * ringR * (0.55 + Math.random() * 0.5);
      return { id: p.id, x, y, tilt: (Math.random() * 26 - 13) };
    });

    // đẩy nhẹ các điểm quá gần nhau ra xa (relaxation đơn giản)
    const minDist = Math.min(vw, vh) * 0.13;
    for (let iter = 0; iter < 24; iter++) {
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[j].x - pts[i].x, dy = pts[j].y - pts[i].y;
          const dist = Math.hypot(dx, dy) || 0.001;
          if (dist < minDist) {
            const push = (minDist - dist) / 2;
            const ux = dx / dist, uy = dy / dist;
            pts[i].x -= ux * push; pts[i].y -= uy * push;
            pts[j].x += ux * push; pts[j].y += uy * push;
          }
        }
      }
    }
    // giới hạn trong vùng nhìn thấy & click được
    const margin = 60;
    pts.forEach(p => {
      p.x = Math.min(Math.max(p.x, margin), vw - margin);
      p.y = Math.min(Math.max(p.y, areaTop + margin * 0.6), areaBottom - margin * 0.2);
    });
    return pts;
  }

  /* ---------------- khuôn trăng đích (cố định trên màn puzzle) ---------------- */
  function buildTargetMoonSVG(){
    const pieces = GEO.pieces.map(p =>
      `<path class="target-piece locked" id="target-piece-${p.id}" d="${p.d}"></path>`
    ).join('');
    return `
    <svg viewBox="0 0 400 400" width="100%" height="100%" overflow="visible" aria-label="Khuôn trăng đích">
      <circle class="target-moon-glow" cx="200" cy="200" r="188" fill="url(#moonGlowGrad)"></circle>
      <g>${pieces}</g>
    </svg>`;
  }

  function ensureGlowGradient(){
    if (document.getElementById('moonGlowGrad')) return;
    const svgNS = 'http://www.w3.org/2000/svg';
    const holder = document.createElementNS(svgNS, 'svg');
    holder.setAttribute('width', '0'); holder.setAttribute('height', '0');
    holder.style.position = 'absolute';
    const defs = document.createElementNS(svgNS, 'defs');
    defs.innerHTML = `<radialGradient id="moonGlowGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#E3E4E8" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#E3E4E8" stop-opacity="0"/>
    </radialGradient>`;
    holder.appendChild(defs);
    document.body.appendChild(holder);
  }

  function syncTargetVisuals(unlockedSet){
    GEO.pieces.forEach(p => {
      const el = document.getElementById('target-piece-' + p.id);
      if (!el) return;
      if (unlockedSet.has(p.id)) { el.classList.remove('locked'); el.classList.add('unlocked'); }
      else { el.classList.add('locked'); el.classList.remove('unlocked'); }
    });
  }

  /* ---------------- mảnh rời rạc, có thể click ---------------- */
  function pieceViewBox(piece){
    const pad = 6;
    return `${(piece.bbox.minX - pad).toFixed(1)} ${(piece.bbox.minY - pad).toFixed(1)} ${(piece.bbox.w + pad * 2).toFixed(1)} ${(piece.bbox.h + pad * 2).toFixed(1)}`;
  }

  function renderScatteredPieces(container, unlockedSet, onClick){
    container.querySelectorAll('.loose-piece').forEach(n => n.remove());
    pieceEls = {};
    GEO.pieces.forEach(piece => {
      if (unlockedSet.has(piece.id)) return; // đã bay về nhà, không hiển thị rời nữa
      const pos = layout.find(l => l.id === piece.id);
      const wPx = piece.bbox.w * PX_PER_UNIT, hPx = piece.bbox.h * PX_PER_UNIT;

      const wrap = document.createElement('div');
      wrap.className = 'loose-piece';
      wrap.id = 'loose-' + piece.id;
      wrap.style.width = wPx + 'px';
      wrap.style.height = hPx + 'px';
      wrap.style.left = (pos.x - wPx / 2) + 'px';
      wrap.style.top = (pos.y - hPx / 2) + 'px';
      wrap.style.setProperty('--tilt', pos.tilt + 'deg');
      wrap.setAttribute('role', 'button');
      wrap.setAttribute('tabindex', '0');
      wrap.setAttribute('aria-label', 'Mảnh trăng ' + piece.id);
      wrap.innerHTML = `<svg viewBox="${pieceViewBox(piece)}" width="100%" height="100%" overflow="visible">
        <path class="loose-piece-path" d="${piece.d}"></path>
      </svg>`;
      wrap.addEventListener('click', () => onClick(piece.id));
      wrap.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(piece.id); } });
      container.appendChild(wrap);
      pieceEls[piece.id] = wrap;
    });
  }

  /* ---------------- bay về khuôn trăng khi giải đúng ---------------- */
  function flyPieceHome(id, targetMoonEl, onArrive){
    const el = pieceEls[id];
    if (!el) { onArrive && onArrive(); return; }
    const piece = GEO.pieces.find(p => p.id === id);
    const targetRect = targetMoonEl.getBoundingClientRect();
    const scale = targetRect.width / GEO.SPACE;
    const targetX = targetRect.left + targetRect.width / 2 + piece.centroidOffset.dx * scale;
    const targetY = targetRect.top + targetRect.height / 2 + piece.centroidOffset.dy * scale;

    const elRect = el.getBoundingClientRect();
    const curX = elRect.left + elRect.width / 2;
    const curY = elRect.top + elRect.height / 2;

    const tl = gsap.timeline({
      onComplete: () => { el.remove(); delete pieceEls[id]; onArrive && onArrive(); }
    });
    tl.set(el, { zIndex: 80 })
      .to(el, {
        duration: 0.85, ease: 'power2.inOut',
        x: targetX - curX, y: targetY - curY,
        rotation: 0, scale: 0.94,
        filter: 'drop-shadow(0 0 18px rgba(230,232,238,.9))'
      })
      .to(el, { duration: 0.22, scale: 1.05, ease: 'power1.out' })
      .to(el, { duration: 0.22, scale: 1, ease: 'power1.in', filter: 'drop-shadow(0 0 0 rgba(230,232,238,0))' });
  }

  /* ---------------- INTRO: trăng nguyên vẹn → nứt → vỡ → tán loạn ---------------- */
  function playIntro(finalLayout, targetMoonEl, onDone){
    setState('INTRO_MOON');
    const vw = window.innerWidth, vh = window.innerHeight;
    const heroX = vw / 2;
    const heroY = Math.min(vh * 0.40, 340);
    const heroR = Math.max(90, Math.min(vw, vh) * 0.20);
    const heroScale = heroR / GEO.R;
    const targetRect = targetMoonEl.getBoundingClientRect();
    const finalScale = targetRect.width / GEO.SPACE;

    const overlay = document.createElement('div');
    overlay.id = 'intro-overlay';
    overlay.className = 'intro-overlay';
    overlay.innerHTML = `<svg id="intro-svg" width="${vw}" height="${vh}" overflow="visible"></svg><div class="intro-flash"></div>`;
    document.body.appendChild(overlay);
    const svg = overlay.querySelector('#intro-svg');
    const flash = overlay.querySelector('.intro-flash');
    const svgNS = 'http://www.w3.org/2000/svg';

    const g = document.createElementNS(svgNS, 'g');
    g.setAttribute('transform', `translate(${heroX} ${heroY}) scale(${heroScale}) translate(-200 -200)`);
    svg.appendChild(g);

    // group riêng để rung nhẹ (translate qua CSS), tách khỏi transform định vị của g
    const gShake = document.createElementNS(svgNS, 'g');
    g.appendChild(gShake);

    const glow = document.createElementNS(svgNS, 'circle');
    glow.setAttribute('cx', '200'); glow.setAttribute('cy', '200'); glow.setAttribute('r', '230');
    glow.setAttribute('fill', 'url(#moonGlowGrad)');
    gShake.appendChild(glow);

    const disc = document.createElementNS(svgNS, 'circle');
    disc.setAttribute('cx', '200'); disc.setAttribute('cy', '200'); disc.setAttribute('r', String(GEO.R));
    disc.setAttribute('fill', 'url(#moonTexture)');
    disc.setAttribute('class', 'intro-disc');
    gShake.appendChild(disc);

    const crackGroup = document.createElementNS(svgNS, 'g');
    crackGroup.setAttribute('class', 'intro-cracks');
    GEO.crackEdges.forEach(([p1, p2]) => {
      const path = document.createElementNS(svgNS, 'path');
      path.setAttribute('d', `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} L ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`);
      path.setAttribute('class', 'intro-crack-line');
      crackGroup.appendChild(path);
    });
    gShake.appendChild(crackGroup);

    const pieceGroup = document.createElementNS(svgNS, 'g');
    pieceGroup.setAttribute('class', 'intro-pieces');
    pieceGroup.style.opacity = '0';
    const piecePaths = {};
    GEO.pieces.forEach(p => {
      const path = document.createElementNS(svgNS, 'path');
      path.setAttribute('d', p.d);
      path.setAttribute('fill', 'url(#moonTexture)');
      path.setAttribute('class', 'intro-piece-path');
      pieceGroup.appendChild(path);
      piecePaths[p.id] = path;
    });
    gShake.appendChild(pieceGroup);

    gsap.set(overlay, { opacity: 0 });
    gsap.set(disc, { transformOrigin: '200px 200px', scale: 0.6, opacity: 0 });
    gsap.set(crackGroup.children, { opacity: 0 });

    const tl = gsap.timeline();

    // Phase 1 — trăng nguyên vẹn hiện ra, đứng yên chuẩn bị
    tl.to(overlay, { opacity: 1, duration: 0.35, ease: 'power1.out' })
      .to(disc, { scale: 1, opacity: 1, duration: 0.55, ease: 'back.out(1.4)' })
      .to({}, { duration: 0.28 }) // giữ yên ngắn để tạo cảm giác chuẩn bị
      .call(() => setState('MOON_CRACKING'))
      // Phase 2 — các vết nứt lan ra, lệch thời gian nhẹ, không đồng loạt
      // + rung nhẹ suốt quá trình, tăng dần cường độ, DỪNG ĐÚNG LÚC nứt xong hết
      .to(crackGroup.children, {
        opacity: 1, duration: 0.32, ease: 'power1.out',
        stagger: { each: 0.07, from: 'random' }
      }, 'crack')
      .add(() => {
        // tổng thời gian các vết nứt hiện ra hết (đúng bằng thời lượng của tween ở trên)
        const crackDuration = Math.max(0, (crackGroup.children.length - 1)) * 0.07 + 0.32;
        const step = 0.05;
        const steps = Math.max(2, Math.round(crackDuration / step));
        const keyframes = [];
        for (let i = 0; i < steps; i++) {
          const t = i / (steps - 1);           // 0 -> 1 theo tiến trình rung
          const amp = 0.5 + t * 1.8;            // cường độ tăng dần khi gần vỡ
          const dir = i % 2 === 0 ? 1 : -1;
          keyframes.push({
            x: dir * amp * (0.7 + Math.random() * 0.6),
            y: -dir * amp * (0.5 + Math.random() * 0.6),
            duration: crackDuration / steps
          });
        }
        keyframes.push({ x: 0, y: 0, duration: step }); // về lại đúng tâm trước khi vỡ
        gsap.fromTo(gShake, { x: 0, y: 0 }, { keyframes, ease: 'none' });
      }, 'crack')
      .to({}, { duration: 0.1 })
      .call(() => setState('MOON_SHATTERING'))
      // Phase 3 — vỡ thành 10 mảnh, mỗi mảnh bay theo hướng/tốc độ khác nhau
      .call(() => {
        disc.style.opacity = '0';
        crackGroup.style.opacity = '0';
        pieceGroup.style.opacity = '1';
      })
      .add(() => {
        GEO.pieces.forEach((p, i) => {
          const targetPos = finalLayout.find(l => l.id === p.id);
          const targetPxX = heroX + (targetPos.x - heroX);
          const targetPxY = heroY + (targetPos.y - heroY);
          const dxLocal = (targetPos.x - heroX) / heroScale - p.centroidOffset.dx;
          const dyLocal = (targetPos.y - heroY) / heroScale - p.centroidOffset.dy;
          const el = piecePaths[p.id];
          gsap.set(el, { transformBox: 'fill-box', transformOrigin: '50% 50%' });
          gsap.to(el, {
            duration: 0.75 + Math.random() * 0.35,
            delay: i * 0.045 + Math.random() * 0.05,
            ease: 'power3.out',
            x: dxLocal, y: dyLocal,
            rotation: targetPos.tilt,
            scale: finalScale / heroScale,
            opacity: 1
          });
        });
      })
      .to({}, { duration: 1.15 }) // chờ gần hết các mảnh bay xong
      // Flash toàn màn hình che khoảnh khắc chuyển sang màn puzzle thật
      .to(flash, { opacity: 1, duration: 0.1, ease: 'power1.in' })
      .call(() => {
        // đúng lúc màn hình trắng loá che khuất mọi thứ: hiện màn puzzle thật phía sau
        setState('PUZZLE_ACTIVE');
        onDone && onDone();
      })
      .to(flash, { opacity: 0, duration: 0.5, ease: 'power2.out' })
      .call(() => overlay.remove());

    return tl;
  }

  return {
    init(total){ GEO = buildShardGeometry(total); injectSharedMoonPattern(GEO); ensureGlowGradient(); return GEO; },
    getGeo(){ return GEO; },
    setPxPerUnit(v){ PX_PER_UNIT = v; },
    computeScatterLayout,
    buildTargetMoonSVG,
    syncTargetVisuals,
    renderScatteredPieces,
    flyPieceHome,
    playIntro,
    setState, getState,
    setLayout(l){ layout = l; },
    getLayout(){ return layout; }
  };
})();