window.addEventListener('load', () => {
  const toggle = document.getElementById('contentToggle');
  const layer  = document.getElementById('gameLayer');
  const canvas = document.getElementById('gameCanvas');
  const exitBtn = document.getElementById('exitGameBtn');

  if (!toggle || !layer || !canvas) return;

  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const main = document.getElementById('main');
  const header = document.getElementById('header');

  const W = canvas.width, H = canvas.height;
  const TILE = 16;
  const keys = new Set();

  // 캐릭터 픽셀 크기(이미지가 16x16이면 이대로 추천)
  const SPRITE_W = 16;
  const SPRITE_H = 16;

  // 이동/충돌은 약간 작게 잡아도 됨(모션 깔끔해짐)
  const player = { x: 40, y: 40, w: 12, h: 12, vx: 0, vy: 0, speed: 1.2 };

  // ====== 스프라이트 로드 ======
  const SPRITE_BASE = 'assets/css/images/';

  const sprites = {
    front: new Image(),
    back: new Image(),
    side1: new Image(), // 왼쪽 걷기 1
    side2: new Image(), // 왼쪽 걷기 2
  };
  sprites.front.src = SPRITE_BASE + 'dot_front.png';
  sprites.back.src  = SPRITE_BASE + 'dot_back.png';
  sprites.side1.src = SPRITE_BASE + 'dot_side(1).png';
  sprites.side2.src = SPRITE_BASE + 'dot_side(2).png';

  // 스프라이트 상태
  let facing = 'down';          // 'down' | 'up' | 'left' | 'right'
  let walkFrame = 0;            // 0 or 1
  let walkTimer = 0;            // 애니메이션 타이머
  const WALK_INTERVAL = 140;    // ms (작을수록 빠르게 걷기)

  function allSpritesReady(){
    return Object.values(sprites).every(img => img.complete && img.naturalWidth > 0);
  }

  // 팝업 트리거와 연결
  const objects = [
    { id: 'popupTrigger1', label: 'School',   x: 80,  y: 60,  w: 18, h: 18 },
    { id: 'popupTrigger2', label: 'Training', x: 130, y: 90,  w: 18, h: 18 },
    { id: 'popupTrigger3', label: 'Company',  x: 190, y: 60,  w: 18, h: 18 },
    { id: 'popupTrigger4', label: 'Award',    x: 240, y: 95,  w: 18, h: 18 },
    { id: 'popupTrigger5', label: 'Cert',     x: 105, y: 125, w: 18, h: 18 },
    { id: 'popupTrigger6', label: 'Lang',     x: 210, y: 130, w: 18, h: 18 },
  ];

  const triggerToPopup = {
    popupTrigger1: 'popup1',
    popupTrigger2: 'popup2',
    popupTrigger3: 'popup3',
    popupTrigger4: 'popup4',
    popupTrigger5: 'popup5',
    popupTrigger6: 'popup6',
  };

  let resumeGameOnPopupClose = false;

  function enterGame(){
    toggle.checked = true;
    toggle.dispatchEvent(new Event('change'));
  }
  function exitGame(){
    toggle.checked = false;
    toggle.dispatchEvent(new Event('change'));
  }

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

  // --- 렌더링 ---
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
      ctx.fillStyle = '#7aa2f7';
      ctx.fillRect(o.x, o.y, o.w, o.h);

      ctx.font = '10px monospace';
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.fillText(o.label, o.x - 2, o.y - 4);
    }
  }

  // (3) Space 누르기 전에 “Press Space” 말풍선 UI
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

  // ====== 캐릭터 스프라이트 그리기 ======
  function drawPlayerSprite(){
    // 스프라이트가 아직 로드 전이면 임시 사각형
    if (!allSpritesReady()){
      ctx.fillStyle = '#f7768e';
      ctx.fillRect(player.x, player.y, player.w, player.h);
      return;
    }

    // 플레이어의 좌상단 기준으로 16x16을 그리되, 살짝 가운데 정렬
    const dx = Math.round(player.x - (SPRITE_W - player.w) / 2);
    const dy = Math.round(player.y - (SPRITE_H - player.h) / 2);

    if (facing === 'up'){
      ctx.drawImage(sprites.back, dx, dy, SPRITE_W, SPRITE_H);
      return;
    }
    if (facing === 'down'){
      ctx.drawImage(sprites.front, dx, dy, SPRITE_W, SPRITE_H);
      return;
    }

    // left/right는 side 2프레임을 번갈아 사용
    const sideImg = (walkFrame === 0) ? sprites.side1 : sprites.side2;

    if (facing === 'left'){
      ctx.drawImage(sideImg, dx, dy, SPRITE_W, SPRITE_H);
      return;
    }

    // right: 좌우 반전 (왼쪽 스프라이트를 뒤집어서 사용)
    if (facing === 'right'){
      ctx.save();
      // canvas를 좌우 반전시키고, x 위치를 변환해 맞춰줌
      ctx.scale(-1, 1);
      // 뒤집힌 좌표계에서 그릴 x = -(원래 x + width)
      ctx.drawImage(sideImg, -(dx + SPRITE_W), dy, SPRITE_W, SPRITE_H);
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

  // ====== 업데이트(이동 + 방향 + 걷기 애니) ======
  let lastTs = performance.now();

  function update(ts){
    const dt = ts - lastTs;
    lastTs = ts;

    player.vx = 0; player.vy = 0;

    const left  = keys.has('ArrowLeft') || keys.has('a');
    const right = keys.has('ArrowRight')|| keys.has('d');
    const up    = keys.has('ArrowUp')   || keys.has('w');
    const down  = keys.has('ArrowDown') || keys.has('s');

    if (left)  player.vx = -player.speed;
    if (right) player.vx =  player.speed;
    if (up)    player.vy = -player.speed;
    if (down)  player.vy =  player.speed;

    // 방향(facing) 결정: 마지막 입력 우선(원하는 규칙대로 바꿔도 됨)
    if (player.vx < 0) facing = 'left';
    else if (player.vx > 0) facing = 'right';
    else if (player.vy < 0) facing = 'up';
    else if (player.vy > 0) facing = 'down';

    const isMoving = (player.vx !== 0 || player.vy !== 0);

    // 걷기 애니: 좌/우 이동일 때만 프레임 토글
    if (isMoving && (facing === 'left' || facing === 'right')){
      walkTimer += dt;
      if (walkTimer >= WALK_INTERVAL){
        walkTimer = 0;
        walkFrame = (walkFrame === 0) ? 1 : 0;
      }
    } else {
      // 멈추거나 위/아래 이동이면 걷기 프레임 초기화
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

  // (2) 팝업 열릴 때 fade 전환
  function openLinkedPopupFromGame(obj){
    resumeGameOnPopupClose = true;
    exitGame();

    setTimeout(() => {
      const trigger = document.getElementById(obj.id);
      if (trigger) trigger.click();
    }, 240);
  }

  // (1) 팝업 닫으면 자동으로 게임 복귀
  function wirePopupAutoResume(){
    const popupIds = Object.values(triggerToPopup);
    popupIds.forEach((pid) => {
      const overlay = document.getElementById(pid);
      if (!overlay) return;

      const closeBtn = overlay.querySelector('.close-popup');
      if (closeBtn){
        closeBtn.addEventListener('click', () => {
          if (!resumeGameOnPopupClose) return;
          setTimeout(() => enterGame(), 120);
          resumeGameOnPopupClose = false;
        });
      }

      overlay.addEventListener('click', (e) => {
        if (e.target !== overlay) return;
        if (!resumeGameOnPopupClose) return;
        setTimeout(() => enterGame(), 120);
        resumeGameOnPopupClose = false;
      });
    });
  }
  wirePopupAutoResume();

  // 토글로 게임 on/off (fade)
  toggle.addEventListener('change', () => {
    const on = toggle.checked;

    layer.classList.toggle('on', on);
    layer.setAttribute('aria-hidden', (!on).toString());

    if (main) main.style.visibility = on ? 'hidden' : 'visible';
    if (header) header.style.visibility = on ? 'hidden' : 'visible';

    // 게임 진입 시, 타이머 초기화(부드럽게)
    if (on){
      lastTs = performance.now();
      requestAnimationFrame(loop);
    }
  });

  // (4) Exit 버튼
  if (exitBtn){
    exitBtn.addEventListener('click', () => {
      resumeGameOnPopupClose = false;
      exitGame();
    });
  }

  window.addEventListener('keydown', (e) => {
    keys.add(e.key);

    if (!layer.classList.contains('on')) return;

    if (e.key === ' '){
      e.preventDefault();
      const o = nearestInteractable();
      if (o) openLinkedPopupFromGame(o);
    }

    if (e.key === 'Escape'){
      e.preventDefault();
      resumeGameOnPopupClose = false;
      exitGame();
    }
  });

  window.addEventListener('keyup', (e) => keys.delete(e.key));
});
