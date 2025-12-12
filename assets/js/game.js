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

  const player = { x: 40, y: 40, w: 10, h: 12, vx: 0, vy: 0, speed: 1.2 };

  // 팝업 트리거와 연결
  const objects = [
    { id: 'popupTrigger1', label: 'School',   x: 80,  y: 60,  w: 18, h: 18 },
    { id: 'popupTrigger2', label: 'Training', x: 130, y: 90,  w: 18, h: 18 },
    { id: 'popupTrigger3', label: 'Company',  x: 190, y: 60,  w: 18, h: 18 },
    { id: 'popupTrigger4', label: 'Award',    x: 240, y: 95,  w: 18, h: 18 },
    { id: 'popupTrigger5', label: 'Cert',     x: 105, y: 125, w: 18, h: 18 },
    { id: 'popupTrigger6', label: 'Lang',     x: 210, y: 130, w: 18, h: 18 },
  ];

  // triggerId -> popup overlay id 매핑 (너 HTML 기준)
  const triggerToPopup = {
    popupTrigger1: 'popup1',
    popupTrigger2: 'popup2',
    popupTrigger3: 'popup3',
    popupTrigger4: 'popup4',
    popupTrigger5: 'popup5',
    popupTrigger6: 'popup6',
  };

  // 팝업이 닫히면 게임으로 자동 복귀할지 여부
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
    // 플레이어 주변 약간 확대된 상호작용 영역
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
    // 길
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
    // TODO: 여기서 스프라이트 이미지로 교체 가능 (이미지 파일명 알려주면 바로 바꿔줄게)
    ctx.fillStyle = '#f7768e';
    ctx.fillRect(player.x, player.y, player.w, player.h);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(player.x + 2, player.y + 3, 2, 2);
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

    // bubble
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(bx, by, bw, bh);

    // small tail
    ctx.fillRect(Math.floor(bx + bw/2) - 2, by + bh, 4, 3);

    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.fillText(text, bx + pad, by + 11);
  }

  function render(){
    ctx.clearRect(0,0,W,H);
    drawTileBG();
    drawObjects();
    drawPlayer();
    drawPressSpaceBubble();
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

  function loop(){
    if (!layer.classList.contains('on')) return;
    update();
    render();
    requestAnimationFrame(loop);
  }

  // (2) 팝업 열릴 때 fade 전환: 게임 -> 텍스트로 먼저 페이드아웃 후 팝업 오픈
  function openLinkedPopupFromGame(obj){
    // 팝업 닫으면 다시 게임으로 돌아오게
    resumeGameOnPopupClose = true;

    // 게임 종료(페이드 아웃 시작)
    exitGame();

    // 페이드가 끝난 다음 프레임쯤 팝업 오픈
    // (CSS transition 220ms이므로 여유 있게 240ms)
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
          // 팝업 닫힌 뒤 자연스럽게 복귀
          setTimeout(() => enterGame(), 120);
          resumeGameOnPopupClose = false;
        });
      }

      // 오버레이 바깥 클릭으로 닫는 로직이 있을 경우 대비
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

    // 텍스트 화면은 visibility로 토글
    if (main) main.style.visibility = on ? 'hidden' : 'visible';
    if (header) header.style.visibility = on ? 'hidden' : 'visible';

    if (on) requestAnimationFrame(loop);
  });

  // (4) ESC 없이도 Exit 버튼 제공
  if (exitBtn){
    exitBtn.addEventListener('click', () => {
      resumeGameOnPopupClose = false;
      exitGame();
    });
  }

  window.addEventListener('keydown', (e) => {
    keys.add(e.key);

    // 게임 켜져있을 때만 상호작용 처리
    if (!layer.classList.contains('on')) return;

    // Space: 가까운 오브젝트 팝업 열기
    if (e.key === ' '){
      e.preventDefault();
      const o = nearestInteractable();
      if (o) openLinkedPopupFromGame(o);
    }

    // ESC: 게임 종료 (팝업과 무관)
    if (e.key === 'Escape'){
      e.preventDefault();
      resumeGameOnPopupClose = false;
      exitGame();
    }
  });

  window.addEventListener('keyup', (e) => keys.delete(e.key));
});
