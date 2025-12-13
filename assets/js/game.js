/* =========================================
   GAME (FULL) - robust version
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

  // ✅ 충돌 박스(작게)
  const player = { x: 40, y: 88, w: 12, h: 12, vx: 0, vy: 0, speed: 1.25 };

  // ✅ 캐릭터 스프라이트 (원본 16x16 가정)
  const SRC_W = 16, SRC_H = 16;
  const DRAW_W = 32, DRAW_H = 32; // 2배

  const SPRITE_BASE = 'assets/css/images/';
  const sprites = {
    front: new Image(),
    back: new Image(),
    side1: new Image(),
    side2: new Image(),
  };

  sprites.front.src = SPRITE_BASE + 'dot_front.png';
  sprites.back.src  = SPRITE_BASE + 'dot_back.png';
  sprites.side1.src = SPRITE_BASE + 'dot_side(1).png';
  sprites.side2.src = SPRITE_BASE + 'dot_side(2).png';

  // ✅ 안전 로더(장당 체크)
  function imgOk(img){
    return img && img.complete && img.naturalWidth > 0;
  }

  let facing = 'right';  // down | up | left | right
  let walkFrame = 0;     // 0/1
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

  // 파일명이 다르면 여기만 맞춰주면 돼
  icons.popupTrigger1.src = ICON_BASE + 'icon_school.png';
  icons.popupTrigger2.src = ICON_BASE + 'icon_training.png';
  icons.popupTrigger3.src = ICON_BASE + 'icon_company.png';
  icons.popupTrigger4.src = ICON_BASE + 'icon_award.png';
  icons.popupTrigger5.src = ICON_BASE + 'icon_cert.png';
  icons.popupTrigger6.src = ICON_BASE + 'icon_lang.png';
  icons.timeline.src      = ICON_BASE + 'icon_timeline.png';

  // 오브젝트 배치(좌 -> 우)
  const objects = [
    { type:'timeline', id:'timeline',       label:'Timeline', x: 28,  y: 82,  w: 18, h: 18 },

    { type:'popup',    id:'popupTrigger1',  label:'School',   x: 82,  y: 44,  w: 18, h: 18 },
    { type:'popup',    id:'popupTrigger2',  label:'Training', x: 120, y: 128, w: 18, h: 18 },

    { type:'popup',    id:'popupTrigger3',  label:'Company',  x: 180, y: 44,  w: 18, h: 18 },
    { type:'popup',    id:'popupTrigger4',  label:'Award',    x: 220, y: 128, w: 18, h: 18 },

    { type:'popup',    id:'popupTrigger5',  label:'Cert',     x: 268, y: 44,  w: 18, h: 18 },
    { type:'popup',    id:'popupTrigger6',  label:'Lang',     x: 296, y: 128, w: 18, h: 18 },
  ];

  // ✅ 트리거 -> overlay id 매핑 (팝업 직접 오픈용)
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

  // ===== Popup Open/Close (✅ overlay 직접 제어) =====
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

  // ===== 배경(길 + 분기) =====
  function drawBG(ts){
    const t = ts / 1000;

    ctx.fillStyle = '#0b0f16';
    ctx.fillRect(0,0,W,H);

    // 미세 그리드
    for (let y=0; y<H; y+=8){
      for (let x=0; x<W; x+=8){
        const a = ((x+y)/8) % 2 === 0 ? 0.06 : 0.04;
        ctx.fillStyle = `rgba(255,255,255,${a})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }

    // 메인 길
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(12, 86, 296, 12);

    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.fillRect(12, 86, 296, 1);
    ctx.fillRect(12, 97, 296, 1);

    // 분기
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

  // ===== 오브젝트(아이콘 + 둥둥 + 반짝) =====
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

      if (imgOk(img)){
        ctx.drawImage(img, Math.round(dx), Math.round(dy), Math.round(dw), Math.round(dh));
      } else {
        ctx.fillStyle = (o.type === 'timeline') ? '#9ece6a' : '#7aa2f7';
        ctx.fillRect(o.x, o.y, o.w, o.h);
      }

      // 라벨
      ctx.font = '10px monospace';
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillText(o.label, o.x - 2, o.y - 6);
    }

    // near sparkle
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

  // “Press Space” 말풍선
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

  // ✅ 플레이어(무조건 fallback 먼저 그림 → 그 위에 스프라이트)
  function drawPlayerSprite(){
    // fallback(무조건 보이게)
    ctx.fillStyle = '#f7768e';
    ctx.fillRect(Math.round(player.x), Math.round(player.y), player.w, player.h);

    // 중심 정렬 좌표
    const dx = Math.round(player.x - (DRAW_W - player.w) / 2);
    const dy = Math.round(player.y - (DRAW_H - player.h) / 2);

    // facing별 이미지 선택 (있는 것만 그리기)
    if (facing === 'up' && imgOk(sprites.back)){
      ctx.drawImage(sprites.back, 0, 0, SRC_W, SRC_H, dx, dy, DRAW_W, DRAW_H);
      return;
    }
    if (facing === 'down' && imgOk(sprites.front)){
      ctx.drawImage(sprites.front, 0, 0, SRC_W, SRC_H, dx, dy, DRAW_W, DRAW_H);
      return;
    }

    const sideImg = (walkFrame === 0) ? sprites.side1 : sprites.side2;

    if (facing === 'left' && imgOk(sideImg)){
      ctx.drawImage(sideImg, 0, 0, SRC_W, SRC_H, dx, dy, DRAW_W, DRAW_H);
      return;
    }

    if (facing === 'right' && imgOk(sideImg)){
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(sideImg, 0, 0, SRC_W, SRC_H, -(dx + DRAW_W), dy, DRAW_W, DRAW_H);
      ctx.restore();
      return;
    }

    // 옆 이미지가 없더라도 front가 있으면 대체로라도 표시
    if (imgOk(sprites.front)){
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

  // ===== 업데이트(Arrow 키만) =====
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

  // 토글 on/off
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

  // Exit 버튼
  if (exitBtn){
    exitBtn.addEventListener('click', () => {
      paused = false;
      exitGame();
    });
  }

  // 키 입력
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

  // 첫 랜딩: 게임 자동 진입
  enterGame();
});
