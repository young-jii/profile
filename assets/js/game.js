(() => {
  const toggle = document.getElementById('contentToggle');
  const layer  = document.getElementById('gameLayer');
  const canvas = document.getElementById('gameCanvas');
  if (!toggle || !layer || !canvas) return;

  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const main = document.getElementById('main');
  const header = document.getElementById('header');

  const W = canvas.width, H = canvas.height;
  const TILE = 16;

  const keys = new Set();

  const player = { x: 40, y: 40, w: 10, h: 12, vx: 0, vy: 0, speed: 1.2 };

  // 기존 팝업 트리거 id와 연결 (index.html에 이미 존재)
  const objects = [
    { id: 'popupTrigger1', label: 'School',   x: 80,  y: 60,  w: 18, h: 18 },
    { id: 'popupTrigger2', label: 'Training', x: 130, y: 90,  w: 18, h: 18 },
    { id: 'popupTrigger3', label: 'Company',  x: 190, y: 60,  w: 18, h: 18 },
    { id: 'popupTrigger4', label: 'Award',    x: 240, y: 95,  w: 18, h: 18 },
    { id: 'popupTrigger5', label: 'Cert',     x: 105, y: 125, w: 18, h: 18 },
    { id: 'popupTrigger6', label: 'Lang',     x: 210, y: 130, w: 18, h: 18 },
  ];

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

  function drawTileBG(){
    for (let y=0; y<H; y+=TILE){
      for (let x=0; x<W; x+=TILE){
        const even = ((x/TILE + y/TILE) % 2 === 0);
        ctx.fillStyle = even ? '#1b2430' : '#18202b';
        ctx.fillRect(x, y, TILE, TILE);
      }
    }

    // 간단한 길
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

  function drawPlayer(){
    ctx.fillStyle = '#f7768e';
    ctx.fillRect(player.x, player.y, player.w, player.h);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(player.x + 2, player.y + 3, 2, 2);
  }

  function drawUI(){
    const o = nearestInteractable();
    if (!o) return;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(8, H-26, 200, 18);
    ctx.fillStyle = '#fff';
    ctx.font = '10px monospace';
    ctx.fillText(`Space: Open ${o.label}`, 14, H-13);
  }

  function update(){
    player.vx = 0; player.vy = 0;

    if (keys.has('ArrowLeft') || keys.has('a')) player.vx = -player.speed;
    if (keys.has('ArrowRight')|| keys.has('d')) player.vx =  player.speed;
    if (keys.has('ArrowUp')   || keys.has('w')) player.vy = -player.speed;
    if (keys.has('ArrowDown') || keys.has('s')) player.vy =  player.speed;

    player.x += player.vx;
    player.y += player.vy;

    player.x = Math.max(0, Math.min(W - player.w, player.x));
    player.y = Math.max(0, Math.min(H - player.h, player.y));
  }

  function render(){
    ctx.clearRect(0,0,W,H);
    drawTileBG();
    drawObjects();
    drawPlayer();
    drawUI();
  }

  function loop(){
    if (!layer.classList.contains('on')) return;
    update();
    render();
    requestAnimationFrame(loop);
  }

  function openLinkedPopup(obj){
    const el = document.getElementById(obj.id);
    if (el) el.click();
  }

  toggle.addEventListener('change', () => {
    const on = toggle.checked;
    layer.classList.toggle('on', on);
    layer.setAttribute('aria-hidden', (!on).toString());

    if (main) main.style.visibility = on ? 'hidden' : 'visible';
    if (header) header.style.visibility = on ? 'hidden' : 'visible';

    if (on) requestAnimationFrame(loop);
  });

  window.addEventListener('keydown', (e) => {
    keys.add(e.key);

    if (!layer.classList.contains('on')) return;

    if (e.key === ' '){
      e.preventDefault();
      const o = nearestInteractable();
      if (o) openLinkedPopup(o);
    }

    if (e.key === 'Escape'){
      toggle.checked = false;
      toggle.dispatchEvent(new Event('change'));
    }
  });

  window.addEventListener('keyup', (e) => keys.delete(e.key));
})();
