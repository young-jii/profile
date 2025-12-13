/* =========================================
   GAME (FULL) - robust version (sprite+popup fix)
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

  // ✅ popup-overlay 들을 gameLayer로 "이동" (fixed/transform 이슈 완전 해결)
  document.querySelectorAll('.popup-overlay').forEach((el) => {
    layer.appendChild(el);
  });

  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const W = canvas.width, H = canvas.height;
  const keys = new Set();
  let paused = false;

  // ✅ 충돌 박스
  const player = { x: 40, y: 88, w: 12, h: 12, vx: 0, vy: 0, speed: 1.25 };

  // ✅ 스프라이트
  const SRC_W = 16, SRC_H = 16;
  const DRAW_W = 32, DRAW_H = 32;

  const SPRITE_BASE = 'assets/css/images/';
  const sprites = {
    front: new Image(),
    back:  new Image(),
    side1: new Image(),
    side2: new Image(),
  };

  // ✅ 로딩 성공 플래그 (complete/naturalWidth 의존 제거)
  const spriteReady = { front:false, back:false, side1:false, side2:false };

  function setSprite(img, key, filename){
    const url = new URL(SPRITE_BASE + filename, document.baseURI).href;
    img.onload = () => { spriteReady[key] = true; };
    img.onerror = () => { spriteReady[key] = false; console.warn('[sprite load fail]', url); };
    img.src = url;
  }

  setSprite(sprites.front, 'front', 'dot_front.png');
  setSprite(sprites.back,  'back',  'dot_back.png');
  setSprite(sprites.side1, 'side1', 'dot_side(1).png');
  setSprite(sprites.side2, 'side2', 'dot_side(2).png');

  function imgOkKey(key){ return spriteReady[key] === true; }

  let facing = 'right';
  let walkFrame = 0;
  let walkTimer = 0;
  const WALK_INTERVAL = 140;

  // ===== MAP ICONS =====
  const ICON_BASE = 'assets/css/images/';
  const icons = {
    popupTrigger1: new Image(),
    popupTrigger2: new Image(),
    popupTrigger3: new Image(),
    popupTrigger4: new Image(),
    popupTrigger5: new Image(),
    popupTrigger6: new Image(),
    timeline:      new Image(),
  };

  function setIcon(img, filename){
    img.onload = () => {};
    img.onerror = () => {};
    img.src = new URL(ICON_BASE + filename, document.baseURI).href;
  }

  setIcon(icons.popupTrigger1, 'icon_school.png');
  setIcon(icons.popupTrigger2, 'icon_training.png');
  setIcon(icons.popupTrigger3, 'icon_company.png');
  setIcon(icons.popupTrigger4, 'icon_award.png');
  setIcon(icons.popupTrigger5, 'icon_cert.png');
  setIcon(icons.popupTrigger6, 'icon_lang.png');
  setIcon(icons.timeline,      'icon_timeline.png');

  function iconOk(img){ return img && img.complete && img.naturalWidth > 0; }

  // 오브젝트 배치(좌 -> 우)
  const objects = [
    { type:'timeline', id:'timeline',      label:'Timeline', x: 28,  y: 82,  w: 18, h: 18 },

    { type:'popup', id:'popupTrigger1', label:'School',   x: 82,  y: 44,  w: 18, h: 18 },
    { type:'popup', id:'popupTrigger2', label:'Training', x: 120, y: 128, w: 18, h: 18 },

    { type:'popup', id:'popupTrigger3', label:'Company',  x: 180, y: 44,  w: 18, h: 18 },
    { type:'popup', id:'popupTrigger4', label:'Award',    x: 220, y: 128, w: 18, h: 18 },

    { type:'popup', id:'popupTrigger5', label:'Cert',     x: 268, y: 44,  w: 18, h: 18 },
    { type:'popup', id:'popupTrigger6', label:'Lang',     x: 296, y: 128, w: 18, h: 18 },
  ];

  const triggerToPopup = {
    popupTrigger1: 'popup1',
    popupTrigger2: 'popup2',
    popupTrigger3: 'popup3',
    popupTrigger4: 'popup4',
    popupTrigger5: 'popup5',
    popupTrigger6: 'popup6',
  };

  function enterGame(){
    toggle.checked = true;
    toggle.dispatchEvent(new Event('change'));
  }
  function exitGame(){
    toggle.checked = false;
    toggle.dispatchEvent(new Event('change'));
  }

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

  // ===== Popup Open/Close (overlay 직접 제어) =====
  function openPopupInGame(triggerId){
    paused = true;

    const popupId = triggerToPopup[triggerId];
    const overlay = popupId ? document.getElementById(popupId) : null;

    if (!overlay){
      paused = false;
      return;
    }

    overlay.classList.add('on');
    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden', 'false');
  }

  function wirePopupCloseToResume(){
    Object.values(triggerToPopup).forEach((popupId) => {
      const overlay = document.getElementById(popupId);
      if (!overlay) return;

      const closeBtn = overlay.querySelector('.close-popup');

      const close = () => {
        overlay.classList.remove('on');
        overlay.classList.remove('active');
        overlay.setAttribute('aria-hidden', 'true');
        paused = false;
      };

      if (closeBtn) closeBtn.addEventListener('click', close);

      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close();
      });
    });
  }
  wirePopupCloseToResume();

  // ===== 충돌/상호작용 =====
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

  // ===== 배경 =====
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

    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(12, 86, 296, 12);

    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.fillRect(12, 86, 296, 1);
    ctx.fillRect(12, 97, 296, 1);

    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(90, 52, 10, 46);
    ctx.fillRect(128, 86, 10, 46);
    ctx.fillRect(188, 52, 10, 46);
    ctx.fillRect(228, 86, 10, 46);
    ctx.fillRect(276, 52, 10, 46);
    ctx.fillRect(304, 86, 10, 46);

    const scanY = Math.floor((t * 24) % H);
    ctx.fillStyle = 'rgba(122,162,247,0.06)';
    ctx.fillRect(0, scanY, W, 2);
  }

  function drawObjects(ts){
    const near = nearestInteractable();
    const t = ts / 1000;

    for (const o of objects){
      const img = icons[o.id];
      const bob = Math.sin(t * 3 + o.x * 0.05 + o.y * 0.08) * 2;
      const isNear = near && near.id === o.id;
      const scale = isNear ? 1.12 : 1.0;

      const size = 22;
      const dw = size * scale;
      const dh = size * scale;
      const dx = o.x + o.w/2 - dw/2;
      const dy = o.y + o.h/2 - dh/2 + bob;

      if (iconOk(img)){
        ctx.drawImage(img, Math.round(dx), Math.round(dy), Math.round(dw), Math.round(dh));
      } else {
        ctx.fillStyle = (o.type === 'timeline') ? '#9ece6a' : '#7aa2f7';
        ctx.fillRect(o.x, o.y, o.w, o.h);
      }

      ctx.font = '10px monospace';
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillText(o.label, o.x - 2, o.y - 6);
    }

    if (near){
      const cx = near.x + near.w/2;
      const cy = near.y + near.h/2;

      for (let i=0; i<7; i++){
        const ang = (t*2 + i) * 1.55;
        const r = 10 + (i%3)*4;
        const px = cx + Math.cos(ang) * r;
        const py = cy + Math.sin(ang) * r;

        const a = 0.35 + 0.45 * Math.sin(t*6 + i);
        ctx.fillStyle = `rgba(255,255,255,${a})`;
        ctx.fillRect(Math.round(px), Math.round(py), 2, 2);
      }
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
    // fallback (항상)
    ctx.fillStyle = '#f7768e';
    ctx.fillRect(Math.round(player.x), Math.round(player.y), player.w, player.h);

    const dx = Math.round(player.x - (DRAW_W - player.w) / 2);
    const dy = Math.round(player.y - (DRAW_H - player.h) / 2);

    if (facing === 'up' && imgOkKey('back')){
      ctx.drawImage(sprites.back, 0, 0, SRC_W, SRC_H, dx, dy, DRAW_W, DRAW_H);
      return;
    }
    if (facing === 'down' && imgOkKey('front')){
      ctx.drawImage(sprites.front, 0, 0, SRC_W, SRC_H, dx, dy, DRAW_W, DRAW_H);
      return;
    }

    const sideKey = (walkFrame === 0) ? 'side1' : 'side2';
    const sideImg = (walkFrame === 0) ? sprites.side1 : sprites.side2;

    if (facing === 'left' && imgOkKey(sideKey)){
      ctx.drawImage(sideImg, 0, 0, SRC_W, SRC_H, dx, dy, DRAW_W, DRAW_H);
      return;
    }
    if (facing === 'right' && imgOkKey(sideKey)){
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(sideImg, 0, 0, SRC_W, SRC_H, -(dx + DRAW_W), dy, DRAW_W, DRAW_H);
      ctx.restore();
      return;
    }

    // 옆이 없더라도 front가 있으면 대체
    if (imgOkKey('front')){
      ctx.drawImage(sprites.front, 0, 0, SRC_W, SRC_H, dx, dy, DRAW_W, DRAW_H);
    }
  }

  function render(ts){
    ctx.clearRect(0,0,W,H);
    drawBG(ts);
    drawObjects(ts);
    drawPlayerSprite();
    drawPressSpaceBubble();
  }

  // ===== 업데이트 =====
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
      exitGame();
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
      else if (o.type === 'popup') openPopupInGame(o.id);
    }

    if (e.key === 'Escape'){
      e.preventDefault();
      paused = false;
      exitGame();
    }
  });

  window.addEventListener('keyup', (e) => keys.delete(e.key));

  enterGame();
});
