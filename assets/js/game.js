window.addEventListener('load', () => {
  const toggle = document.getElementById('contentToggle');
  const layer  = document.getElementById('gameLayer');
  const canvas = document.getElementById('gameCanvas');
  const exitBtn = document.getElementById('exitGameBtn');

  const timelineModal = document.getElementById('timelineModal');
  const timelineCloseBtn = document.getElementById('timelineCloseBtn');
  const timelineBody = document.getElementById('timelineBody');

  if (!toggle || !layer || !canvas) return;

  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const W = canvas.width, H = canvas.height;
  const keys = new Set();
  let paused = false;

  // =========================================
  // ✅ 효과음 (4단계)
  // =========================================
  const audio = {
    armed: false,
    bgm: new Audio('assets/audio/bgm.mp3'),   // 없으면 콘솔에만 에러(기능 영향 없음)
    step: new Audio('assets/audio/step.mp3'),
    open: new Audio('assets/audio/open.mp3'),
  };
  audio.bgm.loop = true;
  audio.bgm.volume = 0.18;
  audio.step.volume = 0.25;
  audio.open.volume = 0.40;

  function armAudio(){
    if (audio.armed) return;
    audio.armed = true;
    audio.bgm.play().catch(()=>{});
  }
  function playStep(){
    audio.step.currentTime = 0;
    audio.step.play().catch(()=>{});
  }
  function playOpen(){
    audio.open.currentTime = 0;
    audio.open.play().catch(()=>{});
  }

  // ===== player =====
  const player = { x: 40, y: 88, w: 12, h: 12, vx: 0, vy: 0, speed: 1.25 };

  // draw size (캐릭터 화면 표시 크기)
  const DRAW_W = 32, DRAW_H = 32;

  let facing = 'right';
  let walkFrame = 0;
  let walkTimer = 0;
  const WALK_INTERVAL = 140;

  // =========================================
  // ✅ 연출 1) 먼지 파티클
  // =========================================
  const dust = []; // {x,y,vx,vy,life}

  function spawnDust(){
    dust.push({
      x: player.x + player.w / 2,
      y: player.y + player.h,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random()) * 0.2,
      life: 18 + Math.random() * 10
    });
  }

  function drawDust(){
    for (let i = dust.length - 1; i >= 0; i--){
      const p = dust[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 1;

      const a = Math.max(0, p.life / 28);
      ctx.fillStyle = `rgba(255,255,255,${0.35 * a})`;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);

      if (p.life <= 0) dust.splice(i, 1);
    }
  }

  // =========================================
  // ✅ 연출 3) 화면 흔들림(Shake)
  // =========================================
  let shake = 0;

  // =========================================
  // ✅ Timeline 색상 분류 (4번 요청)
  // - HTML 안 바꿔도, 텍스트 기반으로 자동 분류 class 부여
  // =========================================
  function classifyTimeline(){
    if (!timelineBody) return;

    const items = [...timelineBody.querySelectorAll('.tl-item')];
    items.forEach(item => {
      const t = item.textContent || '';

      // 초기화
      item.classList.remove('tl-edu','tl-cert','tl-career','tl-award','tl-test','tl-train');

      // 학력
      if (t.includes('고등학교') || t.includes('대학교')){
        item.classList.add('tl-edu');
        return;
      }

      // 자격증
      if (t.includes('워드프로세서') || t.includes('GTQ') || t.includes('컴퓨터활용능력') ||
          t.includes('SQL 개발자') || t.includes('데이터 분석 준전문가') || t.includes('SQLD')){
        item.classList.add('tl-cert');
        return;
      }

      // 수상
      if (t.includes('수상') || t.includes('특별상') || t.includes('경진대회')){
        item.classList.add('tl-award');
        return;
      }

      // 교육/훈련
      if (t.includes('과정') || t.includes('산학협력단') || t.includes('협회')){
        item.classList.add('tl-train');
        return;
      }

      // 어학(시험)
      if (t.includes('TOEIC') || t.includes('Speaking')){
        item.classList.add('tl-test');
        return;
      }

      // 경력
      if (t.includes('천재교과서') || t.includes('EBS')){
        item.classList.add('tl-career');
        return;
      }
    });
  }
  classifyTimeline();

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
    shake = 8;
    playOpen();
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

  // ===== Timeline modal =====
  function openTimeline(){
    if (!timelineModal) return;
    shake = 8;
    playOpen();
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

  // ===== popups -> timeline style =====
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
  // ✅ objects (좌->우)
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
  // ✅ icon images
  // =========================================
  const ICON_BASE_CANDIDATES = [
    'assets/css/images/',
    'assets/images/',
    'images/',
    './assets/css/images/',
    './images/',
  ];

  const icons = {
    popupTrigger1: new Image(),
    popupTrigger2: new Image(),
    popupTrigger3: new Image(),
    popupTrigger4: new Image(),
    popupTrigger5: new Image(),
    popupTrigger6: new Image(),
    timeline:      new Image(),
  };
  const iconReady = {
    popupTrigger1:false, popupTrigger2:false, popupTrigger3:false,
    popupTrigger4:false, popupTrigger5:false, popupTrigger6:false,
    timeline:false,
  };

  // ⚠️ 네 실제 파일명으로 맞춰줘!
  const ICON_FILES = {
    popupTrigger1: 'icon_school.png',
    popupTrigger2: 'icon_training.png',
    popupTrigger3: 'icon_company.png',
    popupTrigger4: 'icon_award.png',
    popupTrigger5: 'icon_cert.png',
    popupTrigger6: 'icon_lang.png',
    timeline:      'icon_timeline.png',
  };

  function tryLoadFromBases(img, key, bases, filename){
    let i = 0;
    const attempt = () => {
      if (i >= bases.length){
        iconReady[key] = false;
        return;
      }
      const base = bases[i++];
      const url = new URL(base + filename, document.baseURI).href;
      img.onload = () => { iconReady[key] = true; };
      img.onerror = () => attempt();
      img.src = url;
    };
    attempt();
  }

  Object.keys(icons).forEach(k => {
    tryLoadFromBases(icons[k], k, ICON_BASE_CANDIDATES, ICON_FILES[k]);
  });

  const iconOk = (k) => iconReady[k] && icons[k].complete && icons[k].naturalWidth > 0;

  // =========================================
  // ✅ sprites (캐릭터)
  // =========================================
  const sprites = {
    front: new Image(),
    back:  new Image(),
    side1: new Image(),
    side2: new Image(),
  };
  const spriteReady = { front:false, back:false, side1:false, side2:false };

  const SPRITE_BASE_CANDIDATES = ICON_BASE_CANDIDATES;
  const FILE_CANDIDATES = {
    front: ['dot_front.png'],
    back:  ['dot_back.png'],
    side1: ['dot_side_1.png', 'dot_side(1).png'],
    side2: ['dot_side_2.png', 'dot_side(2).png'],
  };

  function tryLoadSprite(img, key, baseIdx, fileIdx){
    const base = SPRITE_BASE_CANDIDATES[baseIdx];
    const file = FILE_CANDIDATES[key][fileIdx];
    const url = new URL(base + file, document.baseURI).href;

    img.onload = () => { spriteReady[key] = true; };
    img.onerror = () => {
      const nf = fileIdx + 1;
      if (nf < FILE_CANDIDATES[key].length) return tryLoadSprite(img, key, baseIdx, nf);
      const nb = baseIdx + 1;
      if (nb < SPRITE_BASE_CANDIDATES.length) return tryLoadSprite(img, key, nb, 0);
      spriteReady[key] = false;
    };

    img.src = url;
  }

  tryLoadSprite(sprites.front, 'front', 0, 0);
  tryLoadSprite(sprites.back,  'back',  0, 0);
  tryLoadSprite(sprites.side1, 'side1', 0, 0);
  tryLoadSprite(sprites.side2, 'side2', 0, 0);

  const ok = (k) => spriteReady[k] === true;

  // =========================================
  // ✅ interaction
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
  // ✅ render helpers
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

    // scan line
    const scanY = Math.floor((t * 24) % H);
    ctx.fillStyle = 'rgba(122,162,247,0.06)';
    ctx.fillRect(0, scanY, W, 2);
  }

  function drawObjects(ts){
    const near = nearestInteractable();
    const t = ts / 1000;

    for (const o of objects){
      const bob = Math.sin(t * 3 + o.x * 0.05 + o.y * 0.08) * 2;
      const isNear = near && near.id === o.id;

      // 가까우면 링 반짝
      if (isNear){
        ctx.strokeStyle = 'rgba(255,255,255,0.55)';
        ctx.lineWidth = 1;
        ctx.strokeRect(o.x - 3, o.y - 3, o.w + 6, o.h + 6);

        ctx.strokeStyle = 'rgba(122,162,247,0.35)';
        ctx.strokeRect(o.x - 6, o.y - 6, o.w + 12, o.h + 12);
      }

      const size = 22;
      const scale = isNear ? 1.12 : 1.0;
      const dw = size * scale;
      const dh = size * scale;
      const dx = o.x + o.w/2 - dw/2;
      const dy = o.y + o.h/2 - dh/2 + bob;

      if (iconOk(o.id)){
        ctx.drawImage(icons[o.id], Math.round(dx), Math.round(dy), Math.round(dw), Math.round(dh));
      } else {
        ctx.fillStyle = (o.type === 'timeline') ? '#9ece6a' : '#7aa2f7';
        ctx.fillRect(o.x, o.y, o.w, o.h);
      }

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

  // 크롭 없이 이미지 전체 그리기
  function drawPlayerSprite(){
    // fallback box
    ctx.fillStyle = '#f7768e';
    ctx.fillRect(Math.round(player.x), Math.round(player.y), player.w, player.h);

    const dx = Math.round(player.x - (DRAW_W - player.w) / 2);
    const dy = Math.round(player.y - (DRAW_H - player.h) / 2);

    let img = null;

    if (facing === 'up' && ok('back')) img = sprites.back;
    else if (facing === 'down' && ok('front')) img = sprites.front;
    else {
      const sideKey = (walkFrame === 0) ? 'side1' : 'side2';
      if (facing === 'left' && ok(sideKey)) img = (walkFrame === 0) ? sprites.side1 : sprites.side2;
      if (facing === 'right' && ok(sideKey)) img = (walkFrame === 0) ? sprites.side1 : sprites.side2;
      if (!img && ok('front')) img = sprites.front;
    }

    if (!img) return;

    if (facing === 'right'){
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(img, -(dx + DRAW_W), dy, DRAW_W, DRAW_H);
      ctx.restore();
    } else {
      ctx.drawImage(img, dx, dy, DRAW_W, DRAW_H);
    }
  }

  function render(ts){
    let sx = 0, sy = 0;
    if (shake > 0){
      sx = (Math.random() - 0.5) * 2;
      sy = (Math.random() - 0.5) * 2;
      shake -= 1;
    }

    ctx.save();
    ctx.translate(sx, sy);

    ctx.clearRect(0,0,W,H);
    drawBG(ts);
    drawObjects(ts);

    drawDust();
    drawPlayerSprite();
    drawPressSpaceBubble();

    ctx.restore();
  }

  // =========================================
  // ✅ update loop
  // =========================================
  let lastTs = performance.now();
  let stepCooldown = 0;

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

    // 이동 중 먼지
    if (isMoving && Math.random() < 0.25){
      spawnDust();
    }

    // ✅ 발걸음 효과음: 너무 자주 안 나오게 쿨다운
    if (stepCooldown > 0) stepCooldown -= dt;
    if (isMoving && stepCooldown <= 0){
      playStep();
      stepCooldown = 180;
    }

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
    // ✅ 오디오 정책 때문에: 첫 키 입력에서 활성화
    armAudio();

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
