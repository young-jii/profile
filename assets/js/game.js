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
  const player = { x: 40, y: 40, w: 12, h: 12, vx: 0, vy: 0, speed: 1.2 };

  // sprite draw size (2x)
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
    return Object.values(sprites).every(
      img => img.complete && img.naturalWidth > 0
    );
  }

  let facing = 'down';
  let walkFrame = 0;
  let walkTimer = 0;
  const WALK_INTERVAL = 140;

  /* ===============================
     INTERACTABLE OBJECTS
  =============================== */
  const objects = [
    { type:'popup', id:'popupTrigger1', label:'School',   x: 80,  y: 60,  w: 18, h: 18 },
    { type:'popup', id:'popupTrigger2', label:'Training', x: 130, y: 90,  w: 18, h: 18 },
    { type:'popup', id:'popupTrigger3', label:'Company',  x: 190, y: 60,  w: 18, h: 18 },
    { type:'popup', id:'popupTrigger4', label:'Award',    x: 240, y: 95,  w: 18, h: 18 },
    { type:'popup', id:'popupTrigger5', label:'Cert',     x: 105, y: 125, w: 18, h: 18 },
    { type:'popup', id:'popupTrigger6', label:'Lang',     x: 210, y: 130, w: 18, h: 18 },

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
    timelineModal.classList.add('on');
  }
  function closeTimeline(){
    paused = false;
    timelineModal.classList.remove('on');
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
    const zone = {
      x: player.x - 6,
      y: player.y - 6,
      w: player.w + 12,
      h: player.h + 12
    };
    return objects.find(o => rectsOverlap(zone, o)) || null;
  }

  /* ===============================
     RENDER
  =============================== */
  function drawTileBG(){
    for (let y=0; y<H; y+=TILE){
      for (let x=0; x<W; x+=TILE){
        ctx.fillStyle = ((x+y)/TILE)%2 ? '#18202b' : '#1b2430';
        ctx.fillRect(x,y,TILE,TILE);
      }
    }
  }

  function drawObjects(){
    for (const o of objects){
      ctx.fillStyle = o.type === 'timeline' ? '#9ece6a' : '#7aa2f7';
      ctx.fillRect(o.x,o.y,o.w,o.h);
      ctx.fillStyle = '#fff';
      ctx.font = '10px monospace';
      ctx.fillText(o.label, o.x-2, o.y-4);
    }
  }

  function drawPressSpaceBubble(){
    const o = nearestInteractable();
    if (!o) return;
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(player.x-6, player.y-20, 70, 16);
    ctx.fillStyle = '#fff';
    ctx.font = '10px monospace';
    ctx.fillText('Press Space', player.x, player.y-8);
  }

  function drawPlayerSprite(){
    if (!allSpritesReady()){
      ctx.fillStyle = '#f7768e';
      ctx.fillRect(player.x, player.y, player.w, player.h);
      return;
    }

    const dx = player.x - (DRAW_W - player.w)/2;
    const dy = player.y - (DRAW_H - player.h)/2;

    if (facing === 'up')    return ctx.drawImage(sprites.back,  dx, dy, DRAW_W, DRAW_H);
    if (facing === 'down')  return ctx.drawImage(sprites.front, dx, dy, DRAW_W, DRAW_H);

    const img = walkFrame === 0 ? sprites.side1 : sprites.side2;

    if (facing === 'left'){
      ctx.drawImage(img, dx, dy, DRAW_W, DRAW_H);
    } else {
      ctx.save();
      ctx.scale(-1,1);
      ctx.drawImage(img, -(dx+DRAW_W), dy, DRAW_W, DRAW_H);
      ctx.restore();
    }
  }

  function render(){
    ctx.clearRect(0,0,W,H);
    drawTileBG();
    drawObjects();
    drawPlayerSprite();
    drawPressSpaceBubble();
  }

  /* ===============================
     UPDATE
  =============================== */
  let lastTs = performance.now();
  function update(ts){
    const dt = ts-lastTs; lastTs = ts;

    if (paused) return;

    player.vx = player.vy = 0;

    if (keys.has('ArrowLeft'))  player.vx = -player.speed;
    if (keys.has('ArrowRight')) player.vx =  player.speed;
    if (keys.has('ArrowUp'))    player.vy = -player.speed;
    if (keys.has('ArrowDown'))  player.vy =  player.speed;

    if (player.vx<0) facing='left';
    else if (player.vx>0) facing='right';
    else if (player.vy<0) facing='up';
    else if (player.vy>0) facing='down';

    if (player.vx||player.vy){
      walkTimer+=dt;
      if (walkTimer>WALK_INTERVAL){
        walkTimer=0;
        walkFrame^=1;
      }
    } else {
      walkFrame=0;
    }

    player.x+=player.vx;
    player.y+=player.vy;

    player.x=Math.max(0,Math.min(W-player.w,player.x));
    player.y=Math.max(0,Math.min(H-player.h,player.y));
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
    layer.classList.toggle('on', toggle.checked);
    document.body.classList.toggle('game-on', toggle.checked);
    if (toggle.checked){
      paused=false;
      lastTs=performance.now();
      requestAnimationFrame(loop);
    }
  });

  exitBtn?.addEventListener('click', exitGame);

  window.addEventListener('keydown', e => {
    keys.add(e.key);
    if (!layer.classList.contains('on')) return;

    if (e.key===' '){
      e.preventDefault();
      const o=nearestInteractable();
      if (!o) return;
      o.type==='timeline' ? openTimeline() : openPopupInGame(o.id);
    }
    if (e.key==='Escape'){
      paused=false;
      exitGame();
    }
  });

  window.addEventListener('keyup', e => keys.delete(e.key));

  /* ===============================
     AUTO START
  =============================== */
  enterGame();
});
