window.addEventListener('load', () => {
  const toggle = document.getElementById('contentToggle');
  const layer  = document.getElementById('gameLayer');
  const stage  = document.querySelector('.game-stage');
  const canvas = document.getElementById('gameCanvas');
  const exitBtn = document.getElementById('exitGameBtn');

  const timelineModal = document.getElementById('timelineModal');
  const timelineCloseBtn = document.getElementById('timelineCloseBtn');
  const timelineBody = document.getElementById('timelineBody');

  const careerBadge = document.getElementById('careerBadge');

  if (!toggle || !layer || !canvas || !stage) return;

  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const W = canvas.width, H = canvas.height;
  const keys = new Set();
  let paused = false;

  // =========================================================
  // ✅ Web Audio API (No files) + icon-specific sounds
  // =========================================================
  let audioCtx = null;
  function getAudioCtx(){
    if (!audioCtx){
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(()=>{});
    return audioCtx;
  }

  function playBeep({ freq=440, duration=0.08, type='square', volume=0.08, detune=0 } = {}){
    const a = getAudioCtx();
    const osc = a.createOscillator();
    const gain = a.createGain();

    osc.type = type;
    osc.frequency.value = freq;
    osc.detune.value = detune;

    const now = a.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.01);
    gain.gain.linearRampToValueAtTime(0, now + duration);

    osc.connect(gain);
    gain.connect(a.destination);

    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  function playStep(){
    playBeep({ freq: 180, duration: 0.06, type: 'square', volume: 0.05 });
  }

  // ✅ 아이콘별 “열림” 음색
  function playOpenBy(id){
    // school: warm
    if (id === 'popupTrigger1'){
      playBeep({ freq: 520, duration: 0.14, type: 'triangle', volume: 0.10 });
      playBeep({ freq: 660, duration: 0.10, type: 'triangle', volume: 0.07, detune: -6 });
      return;
    }
    // training: bright tech
    if (id === 'popupTrigger2'){
      playBeep({ freq: 760, duration: 0.11, type: 'sine', volume: 0.09 });
      playBeep({ freq: 980, duration: 0.09, type: 'sine', volume: 0.06, detune: 8 });
      return;
    }
    // company: "쿵"
    if (id === 'popupTrigger3'){
      playBeep({ freq: 120, duration: 0.16, type: 'square', volume: 0.12 });
      playBeep({ freq: 90,  duration: 0.12, type: 'square', volume: 0.08, detune: -10 });
      return;
    }
    // award: sparkle
    if (id === 'popupTrigger4'){
      playBeep({ freq: 1040, duration: 0.08, type: 'triangle', volume: 0.11 });
      playBeep({ freq: 1320, duration: 0.10, type: 'triangle', volume: 0.08, detune: 6 });
      playBeep({ freq: 1760, duration: 0.12, type: 'sine', volume: 0.06 });
      return;
    }
    // cert: clean click
    if (id === 'popupTrigger5'){
      playBeep({ freq: 680, duration: 0.09, type: 'square', volume: 0.08 });
      playBeep({ freq: 520, duration: 0.08, type: 'square', volume: 0.06 });
      return;
    }
    // lang: soft chime
    if (id === 'popupTrigger6'){
      playBeep({ freq: 600, duration: 0.12, type: 'sine', volume: 0.09 });
      playBeep({ freq: 740, duration: 0.10, type: 'sine', volume: 0.06 });
      return;
    }
    // timeline
    if (id === 'timeline'){
      playBeep({ freq: 880, duration: 0.12, type: 'triangle', volume: 0.10 });
      return;
    }
    // fallback
    playBeep({ freq: 880, duration: 0.12, type: 'triangle', volume: 0.10 });
  }

  // =========================================================
  // ✅ Career months calculation (천재 + EBS 합산)
  // =========================================================
  function monthDiffInclusive(startY, startM, endY, endM){
    // month is 1~12
    return (endY - startY) * 12 + (endM - startM) + 1;
  }

  function toYM(totalMonths){
    const years = Math.floor(totalMonths / 12);
    const months = totalMonths % 12;
    return { years, months };
  }

  function updateCareerBadge(){
    // 천재교과서: 2021.08 ~ 2023.06 (inclusive)
    const chunjae = monthDiffInclusive(2021, 8, 2023, 6);

    // EBS: 2024.07 ~ 현재 (inclusive)
    const now = new Date();
    const endY = now.getFullYear();
    const endM = now.getMonth() + 1;
    const ebs = monthDiffInclusive(2024, 7, endY, endM);

    const total = chunjae + ebs;
    const { years, months } = toYM(total);

    const text = `Career: ${years}년 ${months}개월`;
    if (careerBadge) careerBadge.textContent = text;
  }
  updateCareerBadge();

  // =========================================================
  // ✅ player + facing hold
  // =========================================================
  const player = { x: 40, y: 88, w: 12, h: 12, vx: 0, vy: 0, speed: 1.25 };
  const DRAW_W = 32, DRAW_H = 32;

  let facing = 'right';
  let walkFrame = 0;
  let walkTimer = 0;
  const WALK_INTERVAL = 140;

  let faceHoldUntil = 0;
  let faceHoldDir = null;
  const FACE_HOLD_MS = 420;

  function setFaceTowardObject(o){
    const ox = o.x + o.w / 2;
    const oy = o.y + o.h / 2;
    const px = player.x + player.w / 2;
    const py = player.y + player.h / 2;

    const dx = ox - px;
    const dy = oy - py;

    if (Math.abs(dx) > Math.abs(dy)) faceHoldDir = (dx >= 0) ? 'right' : 'left';
    else faceHoldDir = (dy >= 0) ? 'down' : 'up';

    faceHoldUntil = performance.now() + FACE_HOLD_MS;
  }

  // =========================================================
  // ✅ particles
  // =========================================================
  const dust = [];
  const stars = [];
  function spawnDust(){
    dust.push({
      x: player.x + player.w/2,
      y: player.y + player.h,
      vx: (Math.random()-0.5)*0.4,
      vy: Math.random()*0.2,
      life: 18 + Math.random()*10
    });
  }
  function spawnStarBurst(cx, cy){
    const n = 6 + Math.floor(Math.random()*4);
    for (let i=0;i<n;i++){
      stars.push({
        x: cx + (Math.random()-0.5)*6,
        y: cy + (Math.random()-0.5)*6,
        vx: (Math.random()-0.5)*0.7,
        vy: (Math.random()-0.9)*0.9,
        life: 16 + Math.random()*14,
        seed: Math.random()
      });
    }
  }
  function drawDust(){
    for (let i=dust.length-1;i>=0;i--){
      const p=dust[i];
      p.x+=p.vx; p.y+=p.vy; p.life-=1;
      const a=Math.max(0,p.life/28);
      ctx.fillStyle=`rgba(255,255,255,${0.35*a})`;
      ctx.fillRect(Math.round(p.x),Math.round(p.y),1,1);
      if (p.life<=0) dust.splice(i,1);
    }
  }
  function drawStars(){
    for (let i=stars.length-1;i>=0;i--){
      const s=stars[i];
      s.x+=s.vx; s.y+=s.vy; s.life-=1;
      const a=Math.max(0,s.life/30);
      const x=Math.round(s.x), y=Math.round(s.y);
      ctx.fillStyle=`rgba(255,255,255,${0.85*a})`;
      ctx.fillRect(x,y,1,1);
      ctx.fillRect(x-1,y,1,1);
      ctx.fillRect(x+1,y,1,1);
      ctx.fillRect(x,y-1,1,1);
      ctx.fillRect(x,y+1,1,1);
      ctx.fillStyle=`rgba(122,162,247,${0.35*a})`;
      if (s.seed>0.6) ctx.fillRect(x+2,y,1,1);
      if (s.seed<0.35) ctx.fillRect(x,y+2,1,1);
      if (s.life<=0) stars.splice(i,1);
    }
  }
  let shake = 0;

  // =========================================================
  // ✅ timeline classify
  // =========================================================
  function classifyTimeline(){
    if (!timelineBody) return;
    const items = [...timelineBody.querySelectorAll('.tl-item')];
    items.forEach(item => {
      const t = item.textContent || '';
      item.classList.remove('tl-edu','tl-cert','tl-career','tl-award','tl-test','tl-train');

      if (t.includes('고등학교') || t.includes('대학교')) { item.classList.add('tl-edu'); return; }
      if (t.includes('워드프로세서') || t.includes('GTQ') || t.includes('컴퓨터활용능력') ||
          t.includes('SQL 개발자') || t.includes('데이터 분석 준전문가') || t.includes('SQLD')) {
        item.classList.add('tl-cert'); return;
      }
      if (t.includes('수상') || t.includes('특별상') || t.includes('경진대회')) { item.classList.add('tl-award'); return; }
      if (t.includes('과정') || t.includes('산학협력단') || t.includes('협회')) { item.classList.add('tl-train'); return; }
      if (t.includes('TOEIC') || t.includes('Speaking')) { item.classList.add('tl-test'); return; }
      if (t.includes('천재교과서') || t.includes('EBS')) { item.classList.add('tl-career'); return; }
    });
  }
  classifyTimeline();

  // =========================================================
  // ✅ unified Info Modal (timeline style)
  // =========================================================
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
  stage.appendChild(infoModal);

  const infoModalTitle = infoModal.querySelector('#infoModalTitle');
  const infoModalBody  = infoModal.querySelector('#infoModalBody');
  const infoModalClose = infoModal.querySelector('#infoModalClose');

  let typingTimer = null;

  function typeWriter(el, fullText, speed=14){
    // speed: ms/char
    if (typingTimer) { clearInterval(typingTimer); typingTimer = null; }
    el.textContent = '';
    el.classList.add('typing');

    let i = 0;
    typingTimer = setInterval(() => {
      i++;
      el.textContent = fullText.slice(0, i);
      if (i >= fullText.length){
        clearInterval(typingTimer);
        typingTimer = null;
        // cursor 제거(원하면 유지해도 됨)
        el.classList.remove('typing');
      }
    }, speed);
  }

  function openInfoModal(title, html, soundId){
    shake = 8;
    playOpenBy(soundId || 'timeline');
    paused = true;

    infoModalTitle.textContent = title || 'Info';
    infoModalBody.innerHTML = html || '';

    // ✅ 타자기 효과: popup-text(있으면)만 적용
    const p = infoModalBody.querySelector('.popup-text');
    if (p){
      const text = (p.textContent || '').trim();
      p.textContent = '';
      typeWriter(p, text, 12);
    }

    infoModal.classList.add('on');
    infoModal.setAttribute('aria-hidden', 'false');
  }

  function closeInfoModal(){
    if (typingTimer) { clearInterval(typingTimer); typingTimer = null; }
    infoModal.classList.remove('on');
    infoModal.setAttribute('aria-hidden', 'true');
    paused = false;
  }

  infoModalClose.addEventListener('click', closeInfoModal);
  infoModal.addEventListener('click', (e) => {
    if (e.target === infoModal) closeInfoModal();
  });

  // ===== timeline modal =====
  function openTimeline(){
    if (!timelineModal) return;
    shake = 8;
    playOpenBy('timeline');
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

  // ===== original popups -> timeline style =====
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

    openInfoModal(title, clone.innerHTML, triggerId);
  }

  // =========================================================
  // ✅ objects (좌->우)
  // =========================================================
  const objects = [
    { type:'timeline', id:'timeline',      label:'Timeline', x: 28,  y: 82,  w: 18, h: 18 },

    { type:'popup', id:'popupTrigger1', label:'School',   x: 82,  y: 44,  w: 18, h: 18 },
    { type:'popup', id:'popupTrigger2', label:'Training', x: 120, y: 128, w: 18, h: 18 },

    { type:'popup', id:'popupTrigger3', label:'Company',  x: 180, y: 44,  w: 18, h: 18 },
    { type:'popup', id:'popupTrigger4', label:'Award',    x: 220, y: 128, w: 18, h: 18 },

    { type:'popup', id:'popupTrigger5', label:'Cert',     x: 268, y: 44,  w: 18, h: 18 },
    { type:'popup', id:'popupTrigger6', label:'Lang',     x: 296, y: 128, w: 18, h: 18 },
  ];

  // =========================================================
  // ✅ icons (keep your filenames in ICON_FILES)
  // =========================================================
  const BASES = ['assets/css/images/', 'assets/images/', 'images/', './assets/css/images/', './images/'];

  const icons = {
    popupTrigger1: new Image(),
    popupTrigger2: new Image(),
    popupTrigger3: new Image(),
    popupTrigger4: new Image(),
    popupTrigger5: new Image(),
    popupTrigger6: new Image(),
    timeline:      new Image(),
  };
  const iconReady = { popupTrigger1:false, popupTrigger2:false, popupTrigger3:false, popupTrigger4:false, popupTrigger5:false, popupTrigger6:false, timeline:false };

  const ICON_FILES = {
    popupTrigger1: 'icon_school.png',
    popupTrigger2: 'icon_training.png',
    popupTrigger3: 'icon_company.png',
    popupTrigger4: 'icon_award.png',
    popupTrigger5: 'icon_cert.png',
    popupTrigger6: 'icon_lang.png',
    timeline:      'icon_timeline.png',
  };

  function tryLoadFromBases(img, key, filename){
    let i = 0;
    const attempt = () => {
      if (i >= BASES.length){ iconReady[key] = false; return; }
      const url = new URL(BASES[i++] + filename, document.baseURI).href;
      img.onload = () => { iconReady[key] = true; };
      img.onerror = attempt;
      img.src = url;
    };
    attempt();
  }
  Object.keys(icons).forEach(k => tryLoadFromBases(icons[k], k, ICON_FILES[k]));
  const iconOk = (k) => iconReady[k] && icons[k].complete && icons[k].naturalWidth > 0;

  // =========================================================
  // ✅ sprites (캐릭터)
  // =========================================================
  const sprites = { front:new Image(), back:new Image(), side1:new Image(), side2:new Image() };
  const spriteReady = { front:false, back:false, side1:false, side2:false };
  const FILES = {
    front: ['dot_front.png'],
    back:  ['dot_back.png'],
    side1: ['dot_side_1.png','dot_side(1).png'],
    side2: ['dot_side_2.png','dot_side(2).png'],
  };

  function tryLoadSprite(img, key, baseIdx, fileIdx){
    const base = BASES[baseIdx];
    const file = FILES[key][fileIdx];
    const url = new URL(base + file, document.baseURI).href;

    img.onload = () => { spriteReady[key] = true; };
    img.onerror = () => {
      const nf = fileIdx + 1;
      if (nf < FILES[key].length) return tryLoadSprite(img, key, baseIdx, nf);
      const nb = baseIdx + 1;
      if (nb < BASES.length) return tryLoadSprite(img, key, nb, 0);
      spriteReady[key] = false;
    };
    img.src = url;
  }

  tryLoadSprite(sprites.front, 'front', 0, 0);
  tryLoadSprite(sprites.back,  'back',  0, 0);
  tryLoadSprite(sprites.side1, 'side1', 0, 0);
  tryLoadSprite(sprites.side2, 'side2', 0, 0);
  const ok = (k) => spriteReady[k] === true;

  // =========================================================
  // ✅ interaction helpers
  // =========================================================
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

  // =========================================================
  // ✅ render
  // =========================================================
  function drawBG(ts){
    const t = ts / 1000;
    ctx.fillStyle = '#0b0f16';
    ctx.fillRect(0,0,W,H);

    for (let y=0;y<H;y+=8){
      for (let x=0;x<W;x+=8){
        const a = ((x+y)/8)%2===0 ? 0.06 : 0.04;
        ctx.fillStyle = `rgba(255,255,255,${a})`;
        ctx.fillRect(x,y,1,1);
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

  function ambientStars(){
    if (Math.random() < 0.03){
      const o = objects[Math.floor(Math.random()*objects.length)];
      spawnStarBurst(o.x + o.w/2, o.y - 2);
    }
  }

  function drawObjects(ts){
    const near = nearestInteractable();
    const t = ts / 1000;

    for (const o of objects){
      const bob = Math.sin(t*3 + o.x*0.05 + o.y*0.08) * 2;
      const isNear = near && near.id === o.id;

      if (isNear){
        ctx.strokeStyle = 'rgba(255,255,255,0.55)';
        ctx.lineWidth = 1;
        ctx.strokeRect(o.x - 3, o.y - 3, o.w + 6, o.h + 6);
        ctx.strokeStyle = 'rgba(122,162,247,0.35)';
        ctx.strokeRect(o.x - 6, o.y - 6, o.w + 12, o.h + 12);

        if (Math.random() < 0.08) spawnStarBurst(o.x + o.w/2, o.y - 2);
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

  function drawPlayerSprite(ts){
    // fallback
    ctx.fillStyle = '#f7768e';
    ctx.fillRect(Math.round(player.x), Math.round(player.y), player.w, player.h);

    const dx = Math.round(player.x - (DRAW_W - player.w) / 2);
    const dy = Math.round(player.y - (DRAW_H - player.h) / 2);

    let drawFacing = facing;
    if (faceHoldUntil > ts && faceHoldDir) drawFacing = faceHoldDir;

    let img = null;
    if (drawFacing === 'up' && ok('back')) img = sprites.back;
    else if (drawFacing === 'down' && ok('front')) img = sprites.front;
    else {
      const sideImg = (walkFrame === 0) ? sprites.side1 : sprites.side2;
      if ((drawFacing === 'left' || drawFacing === 'right') && (ok('side1') || ok('side2'))) img = sideImg;
      if (!img && ok('front')) img = sprites.front;
    }
    if (!img) return;

    if (drawFacing === 'right'){
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(img, -(dx + DRAW_W), dy, DRAW_W, DRAW_H);
      ctx.restore();
    } else {
      ctx.drawImage(img, dx, dy, DRAW_W, DRAW_H);
    }
  }

  function render(ts){
    ambientStars();

    let sx=0, sy=0;
    if (shake > 0){
      sx = (Math.random()-0.5)*2;
      sy = (Math.random()-0.5)*2;
      shake -= 1;
    }

    ctx.save();
    ctx.translate(sx, sy);

    ctx.clearRect(0,0,W,H);
    drawBG(ts);
    drawObjects(ts);
    drawStars();
    drawDust();
    drawPlayerSprite(ts);
    drawPressSpaceBubble();

    ctx.restore();
  }

  // =========================================================
  // ✅ update loop
  // =========================================================
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

    if (isMoving && Math.random() < 0.25) spawnDust();

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

  // =========================================================
  // ✅ toggle -> game on/off (but we make game MAIN)
  // =========================================================
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

  if (exitBtn){
    exitBtn.addEventListener('click', () => {
      paused = false;
      toggle.checked = false;
      toggle.dispatchEvent(new Event('change'));
    });
  }

  // =========================================================
  // ✅ key controls
  // =========================================================
  window.addEventListener('keydown', (e) => {
    getAudioCtx(); // first user input unlock audio
    keys.add(e.key);

    if (!layer.classList.contains('on')) return;

    if (e.key === ' '){
      e.preventDefault();
      const o = nearestInteractable();
      if (!o) return;

      setFaceTowardObject(o);
      spawnStarBurst(o.x + o.w/2, o.y - 2);

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

  // ✅ first landing: always enter game
  toggle.checked = true;
  toggle.dispatchEvent(new Event('change'));
});
