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
  let paused = false;

  /* ===============================
     PLAYER
  =============================== */
  const player = { x: 20, y: 84, w: 12, h: 12, vx: 0, vy: 0, speed: 1.2 };

  const DRAW_W = 32;
  const DRAW_H = 32;

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

  let facing = 'right'; // 시작은 오른쪽 바라보는 느낌
  let walkFrame = 0;
  let walkTimer = 0;
  const WALK_INTERVAL = 140;

  /* ===============================
     ICONS (fallback: box)
  =============================== */
  const icons = {
    school:   new Image(),
    training: new Image(),
    company:  new Image(),
    award:    new Image(),
    cert:     new Image(),
    lang:     new Image(),
    timeline: new Image(),
  };

  icons.school.src   = SPRITE_BASE + 'icon_school.png';
  icons.training.src = SPRITE_BASE + 'icon_training.png';
  icons.company.src  = SPRITE_BASE + 'icon_company.png';
  icons.award.src    = SPRITE_BASE + 'icon_award.png';
  icons.cert.src     = SPRITE_BASE + 'icon_cert.png';
  icons.lang.src     = SPRITE_BASE + 'icon_lang.png';
  icons.timeline.src = SPRITE_BASE + 'icon_timeline.png';

  function iconReady(img){
    return img && img.complete && img.naturalWidth > 0;
  }

  /* ===============================
     MAP (Horizontal main road + vertical branches)
     - main road: left -> right
     - branches: up/down
  =============================== */
  const ROAD = {
    y: 88,       // main road y
    h: 12,
    left: 16,
    right: 304,  // 조금 여유 두고 끝
    // branch x positions
    branches: [
      { key: 'school',   x: 64,  dir: 'up',   len: 52 },
      { key: 'training', x: 104, dir: 'down', len: 52 },
      { key: 'company',  x: 150, dir: 'up',   len: 60 },
      { key: 'award',    x: 196, dir: 'down', len: 44 },
      { key: 'cert',     x: 232, dir: 'up',   len: 40 },
      { key: 'lang',     x: 268, dir: 'down', len: 40 },
    ]
  };

  function branchEndY(branch){
    if (branch.dir === 'up') return ROAD.y - branch.len - 18;
    return ROAD.y + ROAD.h + branch.len - 18;
  }

  const objects = [
    { type:'popup', id:'popupTrigger1', key:'school',   label:'School',   x: ROAD.branches[0].x - 9, y: branchEndY(ROAD.branches[0]), w: 18, h: 18 },
    { type:'popup', id:'popupTrigger2', key:'training', label:'Training', x: ROAD.branches[1].x - 9, y: branchEndY(ROAD.branches[1]), w: 18, h: 18 },
    { type:'popup', id:'popupTrigger3', key:'company',  label:'Company',  x: ROAD.branches[2].x - 9, y: branchEndY(ROAD.branches[2]), w: 18, h: 18 },
    { type:'popup', id:'popupTrigger4', key:'award',    label:'Award',    x: ROAD.branches[3].x - 9, y: branchEndY(ROAD.branches[3]), w: 18, h: 18 },
    { type:'popup', id:'popupTrigger5', key:'cert',     label:'Cert',     x: ROAD.branches[4].x - 9, y: branchEndY(ROAD.branches[4]), w: 18, h: 18 },
    { type:'popup', id:'popupTrigger6', key:'lang',     label:'Lang',     x: ROAD.branches[5].x - 9, y: branchEndY(ROAD.branches[5]), w: 18, h: 18 },

    // timeline at the end of main road (ending gate)
    { type:'timeline', id:'timeline', key:'timeline', label:'Timeline', x: ROAD.right - 6, y: ROAD.y - 18, w: 18, h: 18 },
  ];

  const triggerToPopup = {
    popupTrigger1: 'popup1',
    popupTrigger2: 'popup2',
    popupTrigger3: 'popup3',
    popupTrigger4: 'popup4',
    popupTrigger5: 'popup5',
    popupTrigger6: 'popup6',
  };

  /* ===============================
     GAME STATE
  =============================== */
  function enterGame(){
    toggle.checked = true;
    toggle.dispatchEvent(new Event('change'));
  }
  function exitGame(){
    toggle.checked = false;
    toggle.dispatchEvent(new Event('change'));
  }

  /* ===============================
     POPUP / MODAL CONTROL
  =============================== */
  function openTimeline(){
    paused = true;
    timelineModal?.classList.add('on');
  }
  function closeTimeline(){
    paused = false;
    timelineModal?.classList.remove('on');
  }

  timelineCloseBtn?.addEventListener('click', closeTimeline);
  timelineModal?.addEventListener('click', e => {
    if (e.target === timelineModal) closeTimeline();
  });

  function openPopupInGame(triggerId){
    paused = true;
    document.getElementById(triggerId)?.click();
  }

  Object.entries(triggerToPopup).forEach(([_, popupId]) => {
    const overlay = document.getElementById(popupId);
    if (!overlay) return;

    overlay.querySelector('.close-popup')?.addEventListener('click', () => {
      paused = false;
    });

    overlay.addEventListener('click', e => {
      if (e.target === overlay) paused = false;
    });
  });

  /* ===============================
     COLLISION
  =============================== */
  function rectsOverlap(a, b){
    return (
      a.x < b.x + b.w &&
      a.x + a.w > b.x &&
      a.y < b.y + b.h &&
      a.y + a.h > b.y
    );
  }

  function nearestInteractable(){
    const zone = { x: player.x - 6, y: player.y - 6, w: player.w + 12, h: player.h + 12 };
    return objects.find(o => rectsOverlap(zone, o)) || null;
  }

  /* ===============================
     VISUAL FX: particles + bounce
  =============================== */
  const particles = [];
  function spawnParticles(x, y){
    for (let i=0; i<6; i++){
      particles.push({
        x, y,
        vx: (Math.random()*2 - 1) * 0.6,
        vy: -Math.random()*1.2 - 0.2,
        life: 18 + Math.floor(Math.random()*10),
      });
    }
  }

  let bounce = 0;
  function doBounce(){ bounce = 4; }

  function updateParticles(){
    for (let i=particles.length-1; i>=0; i--){
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.06;
      p.life -= 1;
      if (p.life <= 0) particles.splice(i,1);
    }
    if (bounce > 0) bounce -= 1;
  }

  function drawParticles(){
    for (const p of particles){
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 2);
    }
  }

  /* ===============================
     RENDER: background + road
  =============================== */
  function drawTileBG(){
    for (let y=0; y<H; y+=TILE){
      for (let x=0; x<W; x+=TILE){
        const even = ((x/TILE + y/TILE) % 2 === 0);
        ctx.fillStyle = even ? '#1b2430' : '#18202b';
        ctx.fillRect(x,y,TILE,TILE);
      }
    }
  }

  function drawRoad(){
    // main road
    ctx.fillStyle = '#2a3646';
    ctx.fillRect(ROAD.left, ROAD.y, ROAD.right - ROAD.left, ROAD.h);

    // dashed line
    ctx.fillStyle = 'rgba(255,255,255,0.20)';
    for (let x = ROAD.left; x < ROAD.right; x += 14){
      ctx.fillRect(x, ROAD.y + 5, 6, 2);
    }

    // branches
    for (const b of ROAD.branches){
      const bx = b.x;
      const by = (b.dir === 'up') ? (ROAD.y - b.len) : (ROAD.y + ROAD.h);
      const bh = b.len;

      ctx.fillStyle = '#2a3646';
      ctx.fillRect(bx, by, 10, bh);

      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      for (let y = by + 4; y < by + bh - 4; y += 12){
        ctx.fillRect(bx + 4, y, 2, 6);
      }
    }

    // markers
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = '10px monospace';
    ctx.fillText('START', ROAD.left - 2, ROAD.y - 6);
    ctx.fillText('END', ROAD.right - 10, ROAD.y + 24);
  }

  function drawObjects(){
    for (const o of objects){
      const img = icons[o.key];
      if (iconReady(img)){
        ctx.drawImage(img, o.x, o.y, o.w, o.h);
      } else {
        ctx.fillStyle = o.type === 'timeline' ? '#9ece6a' : '#7aa2f7';
        ctx.fillRect(o.x,o.y,o.w,o.h);
      }

      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.font = '10px monospace';
      ctx.fillText(o.label, o.x - 2, o.y - 4);
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
    const dx = Math.round(player.x - (DRAW_W - player.w) / 2);
    const dy = Math.round(player.y - (DRAW_H - player.h) / 2) - bounce;

    if (!allSpritesReady()){
      ctx.fillStyle = '#f7768e';
      ctx.fillRect(player.x, player.y - bounce, player.w, player.h);
      return;
    }

    if (facing === 'up'){
      ctx.drawImage(sprites.back, dx, dy, DRAW_W, DRAW_H);
      return;
    }
    if (facing === 'down'){
      ctx.drawImage(sprites.front, dx, dy, DRAW_W, DRAW_H);
      return;
    }

    const img = (walkFrame === 0) ? sprites.side1 : sprites.side2;

    if (facing === 'left'){
      ctx.drawImage(img, dx, dy, DRAW_W, DRAW_H);
    } else {
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(img, -(dx + DRAW_W), dy, DRAW_W, DRAW_H);
      ctx.restore();
    }
  }

  function render(){
    ctx.clearRect(0,0,W,H);
    drawTileBG();
    drawRoad();
    drawObjects();
    drawParticles();
    drawPlayerSprite();
    drawPressSpaceBubble();
  }

  /* ===============================
     UPDATE
  =============================== */
  let lastTs = performance.now();

  function update(ts){
    const dt = ts - lastTs;
    lastTs = ts;

    if (paused){
      player.vx = 0; player.vy = 0;
      walkTimer = 0; walkFrame = 0;
      updateParticles();
      return;
    }

    player.vx = 0; player.vy = 0;

    if (keys.has('ArrowLeft'))  player.vx = -player.speed;
    if (keys.has('ArrowRight')) player.vx =  player.speed;
    if (keys.has('ArrowUp'))    player.vy = -player.speed;
    if (keys.has('ArrowDown'))  player.vy =  player.speed;

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

    updateParticles();
  }

  function loop(ts){
    if (!layer.classList.contains('on')) return;
    update(ts);
    render();
    requestAnimationFrame(loop);
  }

  /* ===============================
     EVENTS
  =============================== */
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

  exitBtn?.addEventListener('click', () => {
    paused = false;
    toggle.checked = false;
    toggle.dispatchEvent(new Event('change'));
  });

  window.addEventListener('keydown', (e) => {
    keys.add(e.key);
    if (!layer.classList.contains('on')) return;

    if (e.key === ' '){
      e.preventDefault();
      const o = nearestInteractable();
      if (!o) return;

      doBounce();
      spawnParticles(player.x + 8, player.y);

      if (o.type === 'timeline') openTimeline();
      else openPopupInGame(o.id);
    }

    if (e.key === 'Escape'){
      e.preventDefault();
      paused = false;
      toggle.checked = false;
      toggle.dispatchEvent(new Event('change'));
    }
  });

  window.addEventListener('keyup', (e) => keys.delete(e.key));

  /* ===============================
     AUTO START
  =============================== */
  enterGame();
});
