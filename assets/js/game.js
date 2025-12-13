/* =========================================
   GAME (FULL) - Sprite auto-path resolver + on-canvas debug
   File: assets/js/game.js
========================================= */

window.addEventListener('load', () => {
  const toggle = document.getElementById('contentToggle');
  const layer  = document.getElementById('gameLayer');
  const canvas = document.getElementById('gameCanvas');
  const exitBtn = document.getElementById('exitGameBtn');

  const timelineModal = document.getElementById('timelineModal');
  const timelineCloseBtn = document.getElementById('timelineCloseBtn');

  if (!toggle || !layer || !canvas) return;

  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const W = canvas.width, H = canvas.height;
  const keys = new Set();
  let paused = false;

  // ✅ 플레이어 hitbox
  const player = { x: 40, y: 88, w: 12, h: 12, vx: 0, vy: 0, speed: 1.25 };

  // ✅ 스프라이트 (16x16 -> 32x32)
  const SRC_W = 16, SRC_H = 16;
  const DRAW_W = 32, DRAW_H = 32;

  let facing = 'right';
  let walkFrame = 0;
  let walkTimer = 0;
  const WALK_INTERVAL = 140;

  // =========================================
  // ✅ Unified Info Modal (timeline 스타일)
  // =========================================
  const infoModal = document.createElement('div');
  infoModal.id = 'infoModal';
  infoModal.className = 'game-modal';
  infoModal.setAttribute('aria-hidden', 'true');

  infoModal.innerHTML = `
    <div class="game-modal-card">
      <div class="game-modal-head">
        <div class="game-modal-title" id="infoModalTitle">Info</div>
        <button class="game-modal-close" id="infoModalClose" type="button">×</button>
      </div>
      <div class="game-modal-body" id="infoModalBody"></div>
    </div>
  `;
  layer.appendChild(infoModal);

  const infoModalTitle = infoModal.querySelector('#infoModalTitle');
  const infoModalBody  = infoModal.querySelector('#infoModalBody');
  const infoModalClose = infoModal.querySelector('#infoModalClose');

  function openInfoModal(title, html){
    paused = true;
    infoModalTitle.textContent = title || 'Info';
    infoModalBody.innerHTML = html || '';
    infoModal.classList.add('on');
    infoModal.setAttribute('aria-hidden', 'false');
  }
  function closeInfoModal(){
    infoModal.classList.remove('on');
    infoModal.setAttribute('aria-hidden', 'true');
    paused = false;
  }
  infoModalClose.addEventListener('click', closeInfoModal);
  infoModal.addEventListener('click', (e) => {
    if (e.target === infoModal) closeInfoModal();
  });

  // ===== Timeline Modal =====
  function openTimeline(){
    if (!timelineModal) return;
    paused = true;
    timelineModal.classList.add('on');
    timelineModal.setAttribute('aria-hidden', 'false');
  }
  function closeTimeline(){
    if (!timelineModal) return;
    timelineModal.classList.remove('on');
    timelineModal.setAttribute('aria-hidden', 'true');
    paused = false;
  }
  if (timelineCloseBtn) timelineCloseBtn.addEventListener('click', closeTimeline);
  if (timelineModal){
    timelineModal.addEventListener('click', (e) => {
      if (e.target === timelineModal) closeTimeline();
    });
  }

  // =========================================
  // ✅ 기존 popup1~6 내용을 가져와 모달로 표시
  // =========================================
  const triggerToPopup = {
    popupTrigger1: 'popup1',
    popupTrigger2: 'popup2',
    popupTrigger3: 'popup3',
    popupTrigger4: 'popup4',
    popupTrigger5: 'popup5',
    popupTrigger6: 'popup6',
  };

  function openPopupLikeTimeline(triggerId){
    const popupId = triggerToPopup[triggerId];
    const overlay = popupId ? document.getElementById(popupId) : null;
    if (!overlay) { paused = false; return; }

    const content = overlay.querySelector('.popup-content');
    if (!content) { paused = false; return; }

    const clone = content.cloneNode(true);
    const closeBtn = clone.querySelector('.close-popup');
    if (closeBtn) closeBtn.remove();

    const h3 = clone.querySelector('.popup-title');
    const title = h3 ? h3.textContent.trim() : (triggerId || 'Info');

    openInfoModal(title, clone.innerHTML);
  }

  // =========================================
  // ✅ 오브젝트 배치(좌->우)
  // =========================================
  const objects = [
    { type:'timeline', id:'timeline',      label:'Timeline', x: 28,  y: 82,  w: 18, h: 18 },

    { type:'popup', id:'popupTrigger1', label:'School',   x: 82,  y: 44,  w: 18, h: 18 },
    { type:'popup', id:'popupTrigger2', label:'Training', x: 120, y: 128, w: 18, h: 18 },

    { type:'popup', id:'popupTrigger3', label:'Company',  x: 180, y: 44,  w: 18, h: 18 },
    { type:'popup', id:'popupTrigger4', label:'Award',    x: 220, y: 128, w: 18, h: 18 },

    { type:'popup', id:'popupTrigger5', label:'Cert',     x: 268, y: 44,  w: 18, h: 18 },
    { type:'popup', id:'popupTrigger6', label:'Lang',     x: 296, y: 128, w: 18, h: 18 },
  ];

  // =========================================
  // ✅ Sprite loader: "경로 후보"를 자동 탐색
  // =========================================
  const sprites = {
    front: new Image(),
    back:  new Image(),
    side1: new Image(),
    side2: new Image(),
  };
  const spriteReady = { front:false, back:false, side1:false, side2:false };

  // 🔥 여기서 경로를 여러 개 후보로 둠 (너의 실제 위치를 자동으로 맞춤)
  const SPRITE_BASE_CANDIDATES = [
    'assets/css/images/',   // 네가 말한 위치
    'assets/images/',
    'images/',
    './assets/css/images/',
    './images/',
  ];

  // 파일 후보(괄호 버전 + 언더스코어 버전)
  const FILE_CANDIDATES = {
    front: ['dot_front.png'],
    back:  ['dot_back.png'],
    side1: ['dot_side_1.png', 'dot_side(1).png'],
    side2: ['dot_side_2.png', 'dot_side(2).png'],
  };

  // ✅ 디버그 로그(캔버스에 찍어줌)
  const debug = {
    enabled: true,
    lines: [],
    push(msg){
      this.lines.unshift(msg);
      if (this.lines.length > 10) this.lines.pop();
    }
  };

  function tryLoadImage(img, key, baseIdx, fileIdx){
    const base = SPRITE_BASE_CANDIDATES[baseIdx];
    const file = FILE_CANDIDATES[key][fileIdx];

    const url = new URL(base + file, document.baseURI).href;

    img.onload = () => {
      spriteReady[key] = true;
      debug.push(`✅ ${key}: LOADED -> ${base}${file}`);
    };
    img.onerror = () => {
      debug.push(`❌ ${key}: FAIL   -> ${base}${file}`);

      // 다음 파일 후보
      const nextFileIdx = fileIdx + 1;
      if (nextFileIdx < FILE_CANDIDATES[key].length){
        tryLoadImage(img, key, baseIdx, nextFileIdx);
        return;
      }

      // 다음 base 경로 후보
      const nextBaseIdx = baseIdx + 1;
      if (nextBaseIdx < SPRITE_BASE_CANDIDATES.length){
        tryLoadImage(img, key, nextBaseIdx, 0);
        return;
      }

      // 전부 실패
      spriteReady[key] = false;
      debug.push(`🛑 ${key}: ALL CANDIDATES FAILED`);
    };

    img.src = url;
  }

  // 로딩 시작
  tryLoadImage(sprites.front, 'front', 0, 0);
  tryLoadImage(sprites.back,  'back',  0, 0);
  tryLoadImage(sprites.side1, 'side1', 0, 0);
  tryLoadImage(sprites.side2, 'side2', 0, 0);

  const ok = (k) => spriteReady[k] === true;

  // =========================================
  // ✅ 충돌/상호작용
  // =========================================
  function rectsOverlap(a, b){
    return a.x < b.x + b.w && a.x + a.w > b.x &&
           a.y < b.y + b.h && a.y + a.h > b.y;
  }
  function nearestInteractable(){
    const zone = { x: player.x - 6, y: player.y - 6, w: player.w + 12, h: player.h + 12 };
    for (const o of objects){
      if (rectsOverlap(zone, o)) return o;
    }
    return null;
  }

  // =========================================
  // ✅ 배경 & 오브젝트 렌더
  // =========================================
  function drawBG(ts){
    const t = ts / 1000;

    ctx.fillStyle = '#0b0f16';
    ctx.fillRect(0,0,W,H);

    for (let y=0; y<H; y+=8){
      for (let x=0; x<W; x+=8){
        const a = ((x+y)/8) % 2 === 0 ? 0.06 : 0.04;
        ctx.fillStyle = `rgba(255,255,255,${a})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }

    // 길
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(12, 86, 296, 12);

    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.fillRect(12, 86, 296, 1);
    ctx.fillRect(12, 97, 296, 1);

    // 세로 길
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(90, 52, 10, 46);
    ctx.fillRect(128, 86, 10, 46);
    ctx.fillRect(188, 52, 10, 46);
    ctx.fillRect(228, 86, 10, 46);
    ctx.fillRect(276, 52, 10, 46);
    ctx.fillRect(304, 86, 10, 46);

    // 스캔 라인
    const scanY = Math.floor((t * 24) % H);
    ctx.fillStyle = 'rgba(122,162,247,0.06)';
    ctx.fillRect(0, scanY, W, 2);
  }

  function drawObjects(ts){
    for (const o of objects){
      ctx.fillStyle = (o.type === 'timeline') ? '#9ece6a' : '#7aa2f7';
      ctx.fillRect(o.x, o.y, o.w, o.h);

      ctx.font = '10px monospace';
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillText(o.label, o.x - 2, o.y - 6);
    }
  }

  function drawPressSpaceBubble(){
    const o = nearestInteractable();
    if (!o) return;

    const text = 'Press Space';
    ctx.font = '10px monospace';
    const pad = 6;
    const tw = ctx.measureText(text).width;
    const bw = tw + pad * 2;
    const bh = 16;

    const bx = Math.max(6, Math.min(W - bw - 6, player.x + player.w/2 - bw/2));
    const by = Math.max(6, player.y - 22);

    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillRect(Math.floor(bx + bw/2) - 2, by + bh, 4, 3);

    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.fillText(text, bx + pad, by + 11);
  }

  function drawPlayerSprite(){
    // fallback
    ctx.fillStyle = '#f7768e';
    ctx.fillRect(Math.round(player.x), Math.round(player.y), player.w, player.h);

    const dx = Math.round(player.x - (DRAW_W - player.w) / 2);
    const dy = Math.round(player.y - (DRAW_H - player.h) / 2);

    if (facing === 'up' && ok('back')){
      ctx.drawImage(sprites.back, 0, 0, SRC_W, SRC_H, dx, dy, DRAW_W, DRAW_H);
      return;
    }
    if (facing === 'down' && ok('front')){
      ctx.drawImage(sprites.front, 0, 0, SRC_W, SRC_H, dx, dy, DRAW_W, DRAW_H);
      return;
    }

    const sideKey = (walkFrame === 0) ? 'side1' : 'side2';
    const sideImg = (walkFrame === 0) ? sprites.side1 : sprites.side2;

    if (facing === 'left' && ok(sideKey)){
      ctx.drawImage(sideImg, 0, 0, SRC_W, SRC_H, dx, dy, DRAW_W, DRAW_H);
      return;
    }
    if (facing === 'right' && ok(sideKey)){
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(sideImg, 0, 0, SRC_W, SRC_H, -(dx + DRAW_W), dy, DRAW_W, DRAW_H);
      ctx.restore();
      return;
    }

    // side가 안 되면 front로 대체
    if (ok('front')){
      ctx.drawImage(sprites.front, 0, 0, SRC_W, SRC_H, dx, dy, DRAW_W, DRAW_H);
    }
  }

  function drawDebug(){
    if (!debug.enabled) return;

    ctx.save();
    ctx.font = '9px monospace';
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(6, 6, 308, 52);

    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillText(`SPRITES: front=${ok('front')} back=${ok('back')} side1=${ok('side1')} side2=${ok('side2')}`, 10, 18);

    for (let i=0; i<Math.min(debug.lines.length, 4); i++){
      ctx.fillText(debug.lines[i], 10, 30 + i*10);
    }
    ctx.restore();
  }

  function render(ts){
    ctx.clearRect(0,0,W,H);
    drawBG(ts);
    drawObjects(ts);
    drawPlayerSprite();
    drawPressSpaceBubble();
    drawDebug(); // ✅ 여기
  }

  // =========================================
  // ✅ 업데이트 루프
  // =========================================
  let lastTs = performance.now();

  function update(ts){
    const dt = ts - lastTs;
    lastTs = ts;

    if (paused){
      player.vx = 0; player.vy = 0;
      walkTimer = 0; walkFrame = 0;
      return;
    }

    player.vx = 0; player.vy = 0;

    const left  = keys.has('ArrowLeft');
    const right = keys.has('ArrowRight');
    const up    = keys.has('ArrowUp');
    const down  = keys.has('ArrowDown');

    if (left)  player.vx = -player.speed;
    if (right) player.vx =  player.speed;
    if (up)    player.vy = -player.speed;
    if (down)  player.vy =  player.speed;

    if (player.vx < 0) facing = 'left';
    else if (player.vx > 0) facing = 'right';
    else if (player.vy < 0) facing = 'up';
    else if (player.vy > 0) facing = 'down';

    const isMoving = (player.vx !== 0 || player.vy !== 0);

    if (isMoving && (facing === 'left' || facing === 'right')){
      walkTimer += dt;
      if (walkTimer >= WALK_INTERVAL){
        walkTimer = 0;
        walkFrame = (walkFrame === 0) ? 1 : 0;
      }
    } else {
      walkTimer = 0;
      walkFrame = 0;
    }

    player.x += player.vx;
    player.y += player.vy;

    player.x = Math.max(0, Math.min(W - player.w, player.x));
    player.y = Math.max(0, Math.min(H - player.h, player.y));
  }

  function loop(ts){
    if (!layer.classList.contains('on')) return;
    update(ts);
    render(ts);
    requestAnimationFrame(loop);
  }

  toggle.addEventListener('change', () => {
    const on = toggle.checked;
    layer.classList.toggle('on', on);
    layer.setAttribute('aria-hidden', (!on).toString());

    if (on){
      paused = false;
      lastTs = performance.now();
      requestAnimationFrame(loop);
    }
  });

  if (exitBtn){
    exitBtn.addEventListener('click', () => {
      paused = false;
      toggle.checked = false;
      toggle.dispatchEvent(new Event('change'));
    });
  }

  window.addEventListener('keydown', (e) => {
    keys.add(e.key);
    if (!layer.classList.contains('on')) return;

    if (e.key === ' '){
      e.preventDefault();
      const o = nearestInteractable();
      if (!o) return;

      if (o.type === 'timeline') openTimeline();
      else if (o.type === 'popup') openPopupLikeTimeline(o.id);
    }

    if (e.key === 'Escape'){
      e.preventDefault();
      paused = false;
      toggle.checked = false;
      toggle.dispatchEvent(new Event('change'));
    }
  });

  window.addEventListener('keyup', (e) => keys.delete(e.key));

  // 첫 랜딩 게임 진입
  toggle.checked = true;
  toggle.dispatchEvent(new Event('change'));
});
