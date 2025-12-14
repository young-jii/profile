window.addEventListener('load', () => {
  const layer  = document.getElementById('gameLayer');
  const canvas = document.getElementById('gameCanvas');
  const exitBtn = document.getElementById('exitGameBtn');
  const careerHUD = document.getElementById('careerHUD');

  const introModal = document.getElementById('introModal');
  const introCloseBtn = document.getElementById('introCloseBtn');
  const startGameBtn = document.getElementById('startGameBtn');

  const outroModal = document.getElementById('outroModal');
  const outroCloseBtn = document.getElementById('outroCloseBtn');

  const infoModal = document.getElementById('infoModal');
  const infoCloseBtn = document.getElementById('infoCloseBtn');
  const infoModalTitle = document.getElementById('infoModalTitle');
  const infoModalBody = document.getElementById('infoModalBody');

  const timelineModal = document.getElementById('timelineModal');
  const timelineCloseBtn = document.getElementById('timelineCloseBtn');

  if (!layer || !canvas) return;

  // === show game immediately (no gap) ===
  layer.classList.add('on');
  layer.setAttribute('aria-hidden', 'false');
  document.body.classList.add('game-on');

  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const W = canvas.width;
  const H = canvas.height;

  const keys = new Set();
  let paused = true; // intro until start

  // === Player collision box (small) ===
  const player = { x: 34, y: 80, w: 12, h: 12, vx: 0, vy: 0, speed: 1.35 };

  // === Draw size (bigger on canvas) ===
  const DRAW_W = 32, DRAW_H = 32;

  const SPRITE_BASE = 'assets/css/images/';
  const sprites = {
    front: new Image(),
    back: new Image(),
    side1: new Image(),
    side2: new Image(),
  };

  // 괄호 파일명 안정 로딩
  sprites.front.src = encodeURI(SPRITE_BASE + 'dot_front.png');
  sprites.back.src  = encodeURI(SPRITE_BASE + 'dot_back.png');
  sprites.side1.src = encodeURI(SPRITE_BASE + 'dot_side(1).png');
  sprites.side2.src = encodeURI(SPRITE_BASE + 'dot_side(2).png');

  function allSpritesReady(){
    return Object.values(sprites).every(img => img.complete && img.naturalWidth > 0);
  }

  let facing = 'right';
  let walkFrame = 0;
  let walkTimer = 0;
  const WALK_INTERVAL = 140;

  // === Fixed map: path -> branches (left->right) ===
  const nodes = [
    { key:'school',    label:'학교',    x: 70,  y: 90 },
    { key:'training',  label:'교육',    x: 125, y: 90 },
    { key:'company',   label:'경력',    x: 185, y: 90 },
    { key:'award',     label:'수상',    x: 230, y: 55 },   // branch up
    { key:'cert',      label:'자격증',  x: 230, y: 125 },  // branch down
    { key:'lang',      label:'언어',    x: 275, y: 125 },
    { key:'timeline',  label:'연혁',    x: 295, y: 90 },
  ];

  // === Optional icons (없어도 동작) ===
  const iconBase = 'assets/css/images/';
  const iconFiles = {
    school:   'icon_school.png',
    training: 'icon_training.png',
    company:  'icon_company.png',
    award:    'icon_award.png',
    cert:     'icon_cert.png',
    lang:     'icon_lang.png',
    timeline: 'icon_timeline.png',
  };

  const icons = {};
  Object.keys(iconFiles).forEach(k => {
    const img = new Image();
    img.src = encodeURI(iconBase + iconFiles[k]);
    icons[k] = img;
  });

  function iconReady(k){
    const img = icons[k];
    return img && img.complete && img.naturalWidth > 0;
  }

  // === Content: 모달에 들어갈 내용 ===
  // ✅ 경력/수상에는 영상 포함
  // ✅ 비디오 경로는 profile 루트 기준: ./questions_program.mp4, ./jingum_test.mp4
  const CONTENT = {
    school: {
      title: '학교',
      body: `
        <div class="k-card">
          <p><b>핵심 키워드</b> 문학 기반 기획력 · 구조화 · 사용자 관점</p>
          <ul>
            <li>경희대학교 국어국문학과 (GPA 3.92/4.5)</li>
            <li>텍스트를 “기준”으로 만들고, 기준으로 품질을 관리하는 습관</li>
            <li>콘텐츠를 보는 사람(학습자/독자) 중심으로 기획하는 사고</li>
          </ul>
        </div>
      `
    },
    training: {
      title: '교육',
      body: `
        <div class="k-card">
          <p><b>핵심 키워드</b> AI/데이터 · 분석 · 자동화</p>
          <ul>
            <li>협업 필터링/자연어처리 기반 추천 분석 시스템 제작 (2023.06~2023.12)</li>
            <li>고객경험 데이터 기반 데이터 비즈니스 분석 (2024.02~2024.07)</li>
            <li>Python/SQL 기반 데이터 가공·인사이트 도출 경험</li>
          </ul>
        </div>
      `
    },
    company: {
      title: '경력',
      body: `
        <div class="k-card">
          <p><b>대표 성과: 문항 코드 추출 자동화 프로그램</b></p>
          <video class="modal-video" controls playsinline preload="metadata">
            <source src="./questions_program.mp4" type="video/mp4" />
            브라우저가 동영상을 지원하지 않습니다.
          </video>
          <p style="margin-top:10px;">
            제가 기획부터 개발·배포까지 직접 진행한 자동화 도구입니다.<br/>
            <b>1시간 이상 걸리던 업무가 20분 안쪽</b>으로 단축되면서,
            반복 작업을 줄이고 검수 정확도를 높였습니다.
          </p>
        </div>

        <div class="k-card">
          <p><b>천재교과서 (2021.08~2023.06)</b></p>
          <ul>
            <li>교재 개발 PM: 기획·집필·편집·검수 전 과정 운영</li>
            <li>커리큘럼/학습목표 설계, 외부 집필진·디자이너 커뮤니케이션 총괄</li>
            <li>문항 DB 재정비/기준 정립 → 개발 활용 가능한 구조 기준 마련</li>
          </ul>
        </div>

        <div class="k-card">
          <p><b>EBS (2024.07~현재)</b></p>
          <ul>
            <li>중학프리미엄 운영/기획: 강좌 데이터 관리, 서비스 개편, 페이지 구조 개선</li>
            <li>2015→2022 교육과정 기준 분류체계 재설계 및 운영 프로세스 정비</li>
            <li>학습 이력/설문 데이터 분석(Python)로 개선안 도출 및 근거 자료화</li>
          </ul>
        </div>
      `
    },
    award: {
      title: '수상',
      body: `
        <div class="k-card">
          <p><b>2023 제1회 K-디지털플랫폼 AI 경진대회</b> 특별상 (2023.12.13)</p>
          <video class="modal-video" controls playsinline preload="metadata">
            <source src="./jingum_test.mp4" type="video/mp4" />
            브라우저가 동영상을 지원하지 않습니다.
          </video>
          <p style="margin-top:10px;">
            4인 팀 프로젝트로 진행한 <b>RAG 기반 질의응답(답파고)</b> 시연 영상입니다.<br/>
            제한된 시간 내에 아이디어 → 구현 → 시연까지 완주해 <b>특별상</b>을 수상했습니다.
          </p>
        </div>
      `
    },
    cert: {
      title: '자격증',
      body: `
        <div class="k-card">
          <ul>
            <li>워드프로세서 (2019.09.13)</li>
            <li>GTQ 1급 (2020.02.07)</li>
            <li>컴퓨터활용능력 1급 (2020.08.28)</li>
            <li>SQLD (2024.04.05)</li>
            <li>ADsP (2025.09.05)</li>
          </ul>
        </div>
      `
    },
    lang: {
      title: '언어',
      body: `
        <div class="k-card">
          <ul>
            <li>한국어: 교정/교열/편집 실무 경험</li>
            <li>영어: TOEIC 785 (2024.06.30) / TOEIC Speaking IH 150 (2025.09.13)</li>
            <li>일본어: 회화 학습 경험, 여행 실사용 가능</li>
          </ul>
        </div>
      `
    }
  };

  // === Modal helpers ===
  function openModal(modal){
    if (!modal) return;
    paused = true;
    modal.classList.add('on');
    modal.setAttribute('aria-hidden', 'false');
  }
  function closeModal(modal){
    if (!modal) return;
    modal.classList.remove('on');
    modal.setAttribute('aria-hidden', 'true');
    paused = false;
  }

  // Typewriter: 텍스트 먼저 보여주고, 끝나면 HTML로 교체(영상 포함 가능)
  function openInfo(key){
    const data = CONTENT[key];
    if (!data) return;

    infoModalTitle.textContent = data.title;

    const html = data.body;
    infoModalBody.innerHTML = `<div class="typewrap"><div id="typeTarget"></div></div>`;
    const target = infoModalBody.querySelector('#typeTarget');

    openModal(infoModal);

    if (!target){
      infoModalBody.innerHTML = html;
      return;
    }

    const plain = html.replace(/<[^>]*>/g, '').replace(/\s+\n/g,'\n');
    let i = 0;
    target.textContent = '';

    const timer = setInterval(() => {
      if (!infoModal.classList.contains('on')) { clearInterval(timer); return; }
      i += 2;
      target.textContent = plain.slice(0, i);

      if (i >= plain.length){
        clearInterval(timer);
        infoModalBody.innerHTML = html; // ✅ 영상 포함 HTML로 최종 교체
      }
    }, 12);
  }

  // close buttons
  if (introCloseBtn) introCloseBtn.addEventListener('click', () => {
    introModal.classList.remove('on');
    introModal.setAttribute('aria-hidden','true');
    paused = false;
  });
  if (startGameBtn) startGameBtn.addEventListener('click', () => {
    introModal.classList.remove('on');
    introModal.setAttribute('aria-hidden','true');
    paused = false;
  });

  if (infoCloseBtn) infoCloseBtn.addEventListener('click', () => closeModal(infoModal));
  if (timelineCloseBtn) timelineCloseBtn.addEventListener('click', () => closeModal(timelineModal));
  if (outroCloseBtn) outroCloseBtn.addEventListener('click', () => closeModal(outroModal));

  // click outside to close
  [infoModal, timelineModal, outroModal].forEach(m => {
    if (!m) return;
    m.addEventListener('click', (e) => {
      if (e.target === m) closeModal(m);
    });
  });

  // exit -> outro
  if (exitBtn){
    exitBtn.addEventListener('click', () => {
      paused = true;
      openModal(outroModal);
    });
  }

  // === Career HUD (months-based) ===
  function monthDiffInclusive(startY, startM, endY, endM){
    const a = startY * 12 + (startM - 1);
    const b = endY * 12 + (endM - 1);
    return Math.max(0, b - a + 1);
  }
  function formatYM(totalMonths){
    const y = Math.floor(totalMonths / 12);
    const m = totalMonths % 12;
    return `${y}년 ${m}개월`;
  }
  function updateCareerHUD(){
    const chunjae = monthDiffInclusive(2021, 8, 2023, 6);
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const ebs = monthDiffInclusive(2024, 7, y, m);

    const total = chunjae + ebs;
    if (careerHUD){
      careerHUD.textContent = `총 경력 ${formatYM(total)} (천재 ${formatYM(chunjae)} · EBS ${formatYM(ebs)})`;
    }
  }
  updateCareerHUD();

  // === Interaction helper ===
  function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh){
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  function nearestNode(){
    const zone = { x: player.x - 8, y: player.y - 8, w: player.w + 16, h: player.h + 16 };
    for (const n of nodes){
      const bw = 18, bh = 18;
      const bx = n.x - bw/2;
      const by = n.y - bh/2;
      if (rectsOverlap(zone.x, zone.y, zone.w, zone.h, bx, by, bw, bh)) return n;
    }
    return null;
  }

  // === Render: background + path + nodes + player ===
  function drawBG(){
    for (let y=0; y<H; y+=16){
      for (let x=0; x<W; x+=16){
        const even = ((x+y)/16) % 2 === 0;
        ctx.fillStyle = even ? '#0f1a14' : '#0d1712';
        ctx.fillRect(x, y, 16, 16);
      }
    }

    // main road
    ctx.fillStyle = '#2a3646';
    ctx.fillRect(30, 86, 270, 12);

    // branches
    ctx.fillRect(222, 58, 12, 76);

    // subtle edges
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.fillRect(30, 85, 270, 1);
    ctx.fillRect(30, 98, 270, 1);
  }

  function drawNode(n){
    const size = 18;
    const x = Math.round(n.x - size/2);
    const y = Math.round(n.y - size/2);

    if (iconReady(n.key)){
      ctx.drawImage(icons[n.key], x, y, size, size);
    } else {
      ctx.fillStyle = (n.key === 'timeline') ? '#9ece6a' : '#7aa2f7';
      ctx.fillRect(x, y, size, size);
    }

    ctx.font = '10px monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.fillText(n.label, x - 2, y - 4);

    // sparkle
    const t = performance.now() / 1000;
    const sx = n.x + Math.cos(t * 2 + n.x) * 8;
    const sy = n.y + Math.sin(t * 2 + n.y) * 6;
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.fillRect(Math.round(sx), Math.round(sy), 2, 2);
  }

  function drawPressSpace(){
    const n = nearestNode();
    if (!n) return;

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

  // ✅ 캐릭터 안 보임 해결 버전:
  // - 16x16 크롭을 없애고, 이미지 전체를 DRAW_W/DRAW_H로 그린다.
  function drawPlayer(){
    if (!allSpritesReady()){
      ctx.fillStyle = '#f7768e';
      ctx.fillRect(player.x, player.y, player.w, player.h);
      return;
    }

    const dx = Math.round(player.x - (DRAW_W - player.w)/2);
    const dy = Math.round(player.y - (DRAW_H - player.h)/2);

    const sideImg = (walkFrame === 0) ? sprites.side1 : sprites.side2;

    if (facing === 'up'){
      ctx.drawImage(sprites.back, dx, dy, DRAW_W, DRAW_H);
      return;
    }
    if (facing === 'down'){
      ctx.drawImage(sprites.front, dx, dy, DRAW_W, DRAW_H);
      return;
    }

    if (facing === 'left'){
      ctx.drawImage(sideImg, dx, dy, DRAW_W, DRAW_H);
      return;
    }

    if (facing === 'right'){
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(sideImg, -(dx + DRAW_W), dy, DRAW_W, DRAW_H);
      ctx.restore();
      return;
    }
  }

  function render(){
    ctx.clearRect(0,0,W,H);
    drawBG();
    nodes.forEach(drawNode);
    drawPlayer();
    drawPressSpace();
  }

  // === Update loop ===
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
    update(ts);
    render();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // === Keys ===
  window.addEventListener('keydown', (e) => {
    keys.add(e.key);

    // Space starts game in intro
    if (introModal && introModal.classList.contains('on') && e.key === ' '){
      e.preventDefault();
      introModal.classList.remove('on');
      introModal.setAttribute('aria-hidden','true');
      paused = false;
      return;
    }

    if (e.key === ' '){
      e.preventDefault();
      if (!layer.classList.contains('on')) return;

      const n = nearestNode();
      if (!n) return;

      // face toward node briefly
      const dx = n.x - player.x;
      const dy = n.y - player.y;
      if (Math.abs(dx) > Math.abs(dy)) facing = dx > 0 ? 'right' : 'left';
      else facing = dy > 0 ? 'down' : 'up';

      paused = true;

      if (n.key === 'timeline'){
        openModal(timelineModal);
      } else {
        openInfo(n.key);
      }
    }

    if (e.key === 'Escape'){
      // close open modal
      if (infoModal?.classList.contains('on')) { closeModal(infoModal); return; }
      if (timelineModal?.classList.contains('on')) { closeModal(timelineModal); return; }
      if (outroModal?.classList.contains('on')) { closeModal(outroModal); return; }
      openModal(outroModal);
    }
  });

  window.addEventListener('keyup', (e) => keys.delete(e.key));
});
