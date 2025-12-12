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
  const TILE = 16;

  const keys = new Set();
  let paused = false; // 팝업/모달 열리면 이동 멈춤

  // ✅ 이동/충돌 박스는 작게 유지
  const player = { x: 40, y: 40, w: 12, h: 12, vx: 0, vy: 0, speed: 1.2 };

  // ✅ 원본 이미지 크기(대부분 16x16), 그릴 때는 2배로
  const SRC_W = 16, SRC_H = 16;
  const DRAW_W = 32, DRAW_H = 32; // (1) 두 배

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

  function allSpritesReady(){
    return Object.values(sprites).every(img => img.complete && img.naturalWidth > 0);
  }

  let facing = 'down';    // down | up | left | right
  let walkFrame = 0;      // 0 or 1
  let walkTimer = 0;
  const WALK_INTERVAL = 140;

  // ✅ 기존 팝업 트리거 + Timeline 오브젝트 추가
  const objects = [
    { type:'popup', id:'popupTrigger1', label:'School',   x: 80,  y: 60,  w: 18, h: 18 },
    { type:'popup', id:'popupTrigger2', label:'Training', x: 130, y: 90,  w: 18, h: 18 },
    { type:'popup', id:'popupTrigger3', label:'Company',  x: 190, y: 60,  w: 18, h: 18 },
    { type:'popup', id:'popupTrigger4', label:'Award',    x: 240, y: 95,  w: 18, h: 18 },
    { type:'popup', id:'popupTrigger5', label:'Cert',     x: 105, y: 125, w: 18, h: 18 },
    { type:'popup', id:'popupTrigger6', label:'Lang',     x: 210, y: 130, w: 18, h: 18 },

    // (4) Timeline 표지판
    { type:'timeline', id:'timeline',   label:'Timeline', x: 26,  y: 120, w: 18, h: 18 },
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

  // ====== 팝업/모달 열고 닫기 제어 ======
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

  // (3) Space → 게임 끄지 않고 팝업을 "게임 위에" 띄우기
  function openPopupInGame(triggerId){
    paused = true;
    const trigger = document.getElementById(triggerId);
    if (trigger) trigger.click(); // 기존 팝업 로직 재사용
  }

  // (3) 팝업 닫히면 자동으로 게임 계속(이동 재개)
  function wirePopupCloseToResume(){
    Object.entries(triggerToPopup).forEach(([triggerId, popupId]) => {
      const overlay = document.getElementById(popupId);
      if (!overlay) return;

      const closeBtn = overlay.querySelector('.close-popup');
      if (closeBtn){
        closeBtn.addEventListener('click', () => {
          paused = false;
        });
      }

      // 오버레이 바깥 클릭 닫힘 대비
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) paused = false;
      });
    });
  }
  wirePopupCloseToResume();

  // ====== 충돌/상호작용 ======
  function rectsOverlap(a, b){
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function nearestInteractable(){
    const zone = { x: player.x - 6, y: player.y - 6, w: player.w + 12, h: player.h + 12 };
    for (const o of objects){
      if (rectsOverlap(zone, o)) return o;
    }
    return null;
  }

  // ====== 렌더 ======
  function drawTileBG(){
    for (let y=0; y<H; y+=TILE){
      for (let x=0; x<W; x+=TILE){
        const even = ((x/TILE + y/TILE) % 2 === 0);
        ctx.fillStyle = even ? '#1b2430' : '#18202b';
        ctx.fillRect(x, y, TILE, TILE);
      }
    }
    ctx.fillStyle = '#2a3646';
    ctx.fillRect(40, 72, 240, 16);
    ctx.fillRect(120, 40, 16, 120);
  }

  function drawObjects(){
    for (const o of objects){
      ctx.fillStyle = (o.type === 'timeline') ? '#9ece6a' : '#7aa2f7';
      ctx.fillRect(o.x, o.y, o.w, o.h);

      ctx.font = '10px monospace';
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.fillText(o.label, o.x - 2, o.y - 4);
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

  function drawPlayerSprite(){
    if (!allSpritesReady()){
      ctx.fillStyle = '#f7768e';
      ctx.fillRect(player.x, player.y, player.w, player.h);
      return;
    }

    // ✅ 2배로 그리기: 캐릭터 중심 정렬
    const dx = Math.round(player.x - (DRAW_W - player.w) / 2);
    const dy = Math.round(player.y - (DRAW_H - player.h) / 2);

    if (facing === 'up'){
      ctx.drawImage(sprites.back, 0, 0, SRC_W, SRC_H, dx, dy, DRAW_W, DRAW_H);
      return;
    }
    if (facing === 'down'){
      ctx.drawImage(sprites.front, 0, 0, SRC_W, SRC_H, dx, dy, DRAW_W, DRAW_H);
      return;
    }

    const sideImg = (walkFrame === 0) ? sprites.side1 : sprites.side2;

    if (facing === 'left'){
      ctx.drawImage(sideImg, 0, 0, SRC_W, SRC_H, dx, dy, DRAW_W, DRAW_H);
      return;
    }

    // right: 좌우 반전
    if (facing === 'right'){
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(sideImg, 0, 0, SRC_W, SRC_H, -(dx + DRAW_W), dy, DRAW_W, DRAW_H);
      ctx.restore();
      return;
    }
  }

  function render(){
    ctx.clearRect(0,0,W,H);
    drawTileBG();
    drawObjects();
    drawPlayerSprite();
    drawPressSpaceBubble();
  }

  // ====== 업데이트 (2) Arrow 키만 ======
  let lastTs = performance.now();

  function update(ts){
    const dt = ts - lastTs;
    lastTs = ts;

    if (paused){
      // 멈춘 상태에서도 렌더는 유지
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
    render();
    requestAnimationFrame(loop);
  }

  // 토글 on/off: 첫 랜딩 게임 ON을 위해 body class도 같이 관리
  toggle.addEventListener('change', () => {
    const on = toggle.checked;
    layer.classList.toggle('on', on);
    layer.setAttribute('aria-hidden', (!on).toString());

    document.body.classList.toggle('game-on', on);

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

      if (o.type === 'timeline'){
        openTimeline();
      } else if (o.type === 'popup'){
        openPopupInGame(o.id);
      }
    }

    if (e.key === 'Escape'){
      e.preventDefault();
      paused = false;
      exitGame();
    }
  });

  window.addEventListener('keyup', (e) => keys.delete(e.key));

  // ✅ (2) 첫 랜딩 시 게임이 메인이 되도록 자동 진입
  enterGame();
});
