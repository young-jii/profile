(() => {
  // ✅ DOMContentLoaded로 더 빠르게 시작 (깜빡임 줄임)
  document.addEventListener('DOMContentLoaded', () => {
    const layer  = document.getElementById('gameLayer');
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    const exitBtn = document.getElementById('exitGameBtn');
    const gameHint = document.getElementById('gameHint');
    const careerHUD = document.getElementById('careerHUD');

    const timelineModal = document.getElementById('timelineModal');
    const timelineCloseBtn = document.getElementById('timelineCloseBtn');

    const infoModal = document.getElementById('infoModal');
    const infoCloseBtn = document.getElementById('infoCloseBtn');
    const infoModalTitle = document.getElementById('infoModalTitle');
    const infoModalBody = document.getElementById('infoModalBody');

    const thanksModal = document.getElementById('thanksModal');
    const thanksCloseBtn = document.getElementById('thanksCloseBtn');

    if (!layer || !canvas) return;

    // ===== Canvas size =====
    const W = canvas.width;
    const H = canvas.height;
    const TILE = 16;

    // ===== Input =====
    const keys = new Set();
    let paused = false;

    // ===== Player (충돌박스는 작게, 스프라이트는 크게) =====
    const player = { x: 60, y: 170, w: 14, h: 14, vx: 0, vy: 0, speed: 1.6 };
    const SRC_W = 16, SRC_H = 16;
    const DRAW_W = 40, DRAW_H = 40; // 캐릭터 크기

    let facing = 'right';  // down | up | left | right
    let walkFrame = 0;
    let walkTimer = 0;
    const WALK_INTERVAL = 140;

    // ===== Sprites =====
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

    // ===== Icons (파일명은 아래 그대로 두고, 실제 파일명이 다르면 여기만 맞춰줘) =====
    const icons = {
      school: new Image(),
      training: new Image(),
      company: new Image(),
      award: new Image(),
      certificate: new Image(),
      language: new Image(),
      timeline: new Image(),
    };
    icons.school.src      = SPRITE_BASE + 'icon_school.png';
    icons.training.src    = SPRITE_BASE + 'icon_training.png';
    icons.company.src     = SPRITE_BASE + 'icon_company.png';
    icons.award.src       = SPRITE_BASE + 'icon_award.png';
    icons.certificate.src = SPRITE_BASE + 'icon_certificate.png';
    icons.language.src    = SPRITE_BASE + 'icon_language.png';
    icons.timeline.src    = SPRITE_BASE + 'icon_timeline.png';

    function iconReady(img){ return img && img.complete && img.naturalWidth > 0; }

    // ===== Map (가로 진행) =====
    // 길(road)과 각 스팟 위치(좌→우)
    const spots = [
      { key:'school',      type:'info',     labelKo:'학력',       x: 110, y: 180, w: 22, h: 22, sound:'warm' },
      { key:'training',    type:'info',     labelKo:'교육',       x: 220, y: 150, w: 22, h: 22, sound:'soft' },
      { key:'company',     type:'info',     labelKo:'경력',       x: 340, y: 180, w: 22, h: 22, sound:'thud' },
      { key:'award',       type:'info',     labelKo:'수상',       x: 460, y: 150, w: 22, h: 22, sound:'sparkle' },
      { key:'certificate', type:'info',     labelKo:'자격',       x: 520, y: 210, w: 22, h: 22, sound:'clear' },
      { key:'language',    type:'info',     labelKo:'언어',       x: 590, y: 170, w: 22, h: 22, sound:'clear' },
      { key:'timeline',    type:'timeline', labelKo:'연혁',       x: 70,  y: 220, w: 22, h: 22, sound:'soft' },
    ];

    // ===== Popup content (제목은 모달 헤더에서만) =====
    const POPUP_HTML = {
      school: `
        <div class="kv">
          <div class="pill-row">
            <span class="pill">문학 기반 기획</span>
            <span class="pill">콘텐츠 구조화</span>
            <span class="pill">스토리텔링</span>
          </div>
          <div class="small typewrite" data-text="국어국문학 전공을 바탕으로 ‘읽히는 문장’과 ‘정리되는 구조’를 함께 설계합니다."></div>
        </div>
        <div class="grid2">
          <div class="card">
            <h4>학력</h4>
            <ul>
              <li>은광여자고등학교 (2012.03 ~ 2015.02)</li>
              <li>경희대학교 국어국문학과 (2016.03 ~ 2022.02)</li>
              <li><span class="hl">GPA 3.92 / 4.5</span></li>
            </ul>
          </div>
          <div class="card">
            <h4>강점</h4>
            <ul>
              <li>복잡한 정보를 <span class="hl">빠르게 요약/구조화</span></li>
              <li>콘텐츠 품질 기준을 <span class="hl">문장 단위까지 정교하게</span> 관리</li>
              <li>사용자가 이해하기 쉬운 <span class="hl">UX 문장 설계</span></li>
            </ul>
          </div>
        </div>
      `,

      training: `
        <div class="kv">
          <div class="pill-row">
            <span class="pill">추천 시스템</span>
            <span class="pill">NLP</span>
            <span class="pill">데이터 분석</span>
            <span class="pill">백엔드 이해</span>
          </div>
          <div class="small typewrite" data-text="비전공에서 시작해 ‘프로젝트를 끝까지 구현하는 학습 방식’을 몸에 익혔습니다."></div>
        </div>
        <div class="grid2">
          <div class="card">
            <h4>과정</h4>
            <ul>
              <li>협업 필터링 및 자연어 처리 기반 AI 추천 분석 (2023.06 ~ 2023.12)</li>
              <li>고객경험 데이터 기반 데이터 비즈니스 분석 (2024.02 ~ 2024.07)</li>
            </ul>
          </div>
          <div class="card">
            <h4>바로 쓰는 능력</h4>
            <ul>
              <li>Python/Pandas로 데이터 가공·분석</li>
              <li>SQL로 조회/집계/지표 추출</li>
              <li>실무 프로세스를 <span class="hl">자동화</span> 관점으로 재구성</li>
            </ul>
          </div>
        </div>
      `,

      company: `
        <div class="kv">
          <div class="pill-row">
            <span class="pill">서비스 운영·기획</span>
            <span class="pill">콘텐츠/데이터 구조화</span>
            <span class="pill">프로세스 설계·개선</span>
            <span class="pill">협업/조율</span>
            <span class="pill">자동화</span>
          </div>
          <div class="small typewrite" data-text="운영 이슈를 ‘기준/데이터/흐름’으로 분해해 해결하고, 다시 재발하지 않도록 프로세스로 고정합니다."></div>
        </div>

        <div class="grid2">
          <div class="card">
            <h4>천재교과서 (2021.08 ~ 2023.06)</h4>
            <ul>
              <li><span class="hl">국어과 교재 개발 PM</span>으로 기획·집필·편집·검수 전 과정 총괄</li>
              <li>초·중등 국어 커리큘럼 구성, 학습 목표 설정, 일정/리스크 관리</li>
              <li>삽화 발주 및 <span class="hl">외부 작업자(프리랜서/디자이너/집필진) 커뮤니케이션</span> 총괄</li>
              <li>밀크티 국어 콘텐츠 검수 및 디지털 연계 콘텐츠 제작</li>
              <li>수능 기출 문항 DB 재정비(문항 양식/기준 정리)</li>
            </ul>
          </div>

          <div class="card">
            <h4>핵심 성과/역량</h4>
            <ul>
              <li>문항 DB 검수에서 <span class="hl">교육과정-문항 기준 재정의</span> → 오류 정비 체계화</li>
              <li>개정(독해/글쓰기)에서 <span class="hl">난이도 기준·학습목표 구조 재설계</span></li>
              <li>대규모 텍스트/문항을 <span class="hl">‘데이터처럼 구조화’</span>하고 기준을 설계</li>
            </ul>
          </div>
        </div>

        <div class="grid2" style="margin-top:12px;">
          <div class="card">
            <h4>EBS 중학프리미엄 (2024.07 ~ 현재)</h4>
            <ul>
              <li><span class="hl">플랫폼 운영 총괄</span>: 강좌 데이터 관리, 서비스 개편, 페이지 구조 개선</li>
              <li><span class="hl">강좌 분류 체계 재설계</span>: 2015 → 2022 교육과정 기준 전면 재정비</li>
              <li>통계/학습 데이터 기반 운영: 이용량·학습패턴·조회수 기반 개선안 도출</li>
              <li>신규 서비스 오픈/운영: 진로진학, 영어 직독직해 등</li>
              <li>검수/권한/외부 PD·개발·기획 부서 간 <span class="hl">조율 및 프로세스 정비</span></li>
            </ul>
          </div>

          <div class="card">
            <h4>데이터 기반 개선 경험</h4>
            <ul>
              <li>학습 이력 + 만족도 설문 데이터를 <span class="hl">Python</span>으로 가공/매칭</li>
              <li>학년·지역·수강·완강률 등 행동 패턴 추출 → 만족도와 관계 도출</li>
              <li>반복 업무(단축URL/권한/오류 탐지 등) 정리·자동화로 운영 효율 개선</li>
            </ul>
          </div>
        </div>

        <div class="card" style="margin-top:12px;">
          <h4>바로 활용 가능한 스택</h4>
          <div class="pill-row">
            <span class="pill">Python</span>
            <span class="pill">Pandas</span>
            <span class="pill">SQL</span>
            <span class="pill">Selenium/BS4</span>
            <span class="pill">HTML/CSS</span>
            <span class="pill">기획/운영 문서화</span>
            <span class="pill">협업 커뮤니케이션</span>
          </div>
        </div>

        <div class="card" style="margin-top:12px;">
          <h4>한 줄 요약</h4>
          <div class="small">“콘텐츠/데이터/프로세스”를 한 덩어리로 보고, 운영 문제를 구조화해 개선합니다.</div>
        </div>
      `,

      award: `
        <div class="kv">
          <div class="pill-row">
            <span class="pill">해커톤</span>
            <span class="pill">빠른 구현</span>
            <span class="pill">팀 협업</span>
          </div>
          <div class="small typewrite" data-text="짧은 시간 안에 ‘완성’까지 끌고 가는 집중력과 실행력을 증명했습니다."></div>
        </div>
        <div class="card">
          <h4>수상</h4>
          <ul>
            <li>2023 제 1회 K-디지털플랫폼 AI 경진대회 <span class="hl">특별상</span> (2023.12.13)</li>
          </ul>
        </div>
      `,

      certificate: `
        <div class="kv">
          <div class="pill-row">
            <span class="pill">실무 기반 역량</span>
            <span class="pill">데이터/문서</span>
            <span class="pill">자기주도</span>
          </div>
          <div class="small typewrite" data-text="필요한 능력을 ‘자격 + 실무’로 동시에 갖추는 방향으로 성장해왔습니다."></div>
        </div>
        <div class="card">
          <h4>자격</h4>
          <ul>
            <li>워드프로세서 (2019.09.13)</li>
            <li>GTQ 1급 (2020.02.07)</li>
            <li>컴퓨터활용능력 1급 (2020.08.28)</li>
            <li>SQLD (2024.04.05)</li>
            <li>데이터분석 준전문가 (2025.09.05)</li>
          </ul>
        </div>
      `,

      language: `
        <div class="kv">
          <div class="pill-row">
            <span class="pill">KR</span>
            <span class="pill">EN</span>
            <span class="pill">JP</span>
          </div>
          <div class="small typewrite" data-text="문장 감각(국어) + 실무 소통(영어)을 바탕으로 협업 커뮤니케이션을 안정적으로 수행합니다."></div>
        </div>
        <div class="grid2">
          <div class="card">
            <h4>영어</h4>
            <ul>
              <li>TOEIC 785 (2024.06.30)</li>
              <li>TOEIC Speaking IH / 150 (2025.09.13)</li>
            </ul>
          </div>
          <div class="card">
            <h4>일본어</h4>
            <ul>
              <li>회화 수료 경험</li>
              <li>여행 수준 의사소통 가능</li>
            </ul>
          </div>
        </div>
      `,
    };

    // ===== Modal open/close =====
    function lockScroll(){
      document.body.style.overflow = 'hidden';
    }
    function unlockScroll(){
      document.body.style.overflow = '';
    }

    function openTimeline(){
      paused = true;
      timelineModal.classList.add('on');
      timelineModal.setAttribute('aria-hidden', 'false');
      lockScroll();
      playUISound('soft');
    }
    function closeTimeline(){
      timelineModal.classList.remove('on');
      timelineModal.setAttribute('aria-hidden', 'true');
      paused = false;
      unlockScroll();
    }

    function openInfo(key, titleKo){
      paused = true;
      infoModalTitle.textContent = titleKo;
      infoModalBody.innerHTML = POPUP_HTML[key] || `<p>준비중입니다.</p>`;
      infoModal.classList.add('on');
      infoModal.setAttribute('aria-hidden', 'false');
      lockScroll();
      runTypewriter(infoModalBody);
    }
    function closeInfo(){
      infoModal.classList.remove('on');
      infoModal.setAttribute('aria-hidden', 'true');
      paused = false;
      unlockScroll();
    }

    function openThanks(){
      paused = true;
      thanksModal.classList.add('on');
      thanksModal.setAttribute('aria-hidden', 'false');
      lockScroll();
      runTypewriter(thanksModal);
      playUISound('sparkle');
    }
    function closeThanks(){
      thanksModal.classList.remove('on');
      thanksModal.setAttribute('aria-hidden', 'true');
      paused = false;
      unlockScroll();
    }

    // click close
    if (timelineCloseBtn) timelineCloseBtn.addEventListener('click', closeTimeline);
    if (infoCloseBtn) infoCloseBtn.addEventListener('click', closeInfo);
    if (thanksCloseBtn) thanksCloseBtn.addEventListener('click', closeThanks);

    // overlay click close
    [timelineModal, infoModal, thanksModal].forEach(modal => {
      if (!modal) return;
      modal.addEventListener('click', (e) => {
        if (e.target === modal){
          if (modal === timelineModal) closeTimeline();
          if (modal === infoModal) closeInfo();
          if (modal === thanksModal) closeThanks();
        }
      });
    });

    // ===== Typewriter =====
    function runTypewriter(root){
      const targets = root.querySelectorAll('.typewrite[data-text]');
      targets.forEach(el => {
        const full = el.getAttribute('data-text') || '';
        el.textContent = '';
        let i = 0;
        const timer = setInterval(() => {
          i++;
          el.textContent = full.slice(0, i);
          if (i >= full.length) clearInterval(timer);
        }, 16);
      });
    }

    // ===== WebAudio (파일 없이) =====
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    let audioCtx = null;

    function ensureAudio(){
      if (!audioCtx) audioCtx = new AudioCtx();
      if (audioCtx.state === 'suspended') audioCtx.resume();
    }

    function tone({freq=440, type='sine', dur=0.09, gain=0.08, glideTo=null}){
      ensureAudio();
      const t0 = audioCtx.currentTime;

      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();

      o.type = type;
      o.frequency.setValueAtTime(freq, t0);
      if (glideTo){
        o.frequency.exponentialRampToValueAtTime(glideTo, t0 + dur);
      }

      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

      o.connect(g).connect(audioCtx.destination);
      o.start(t0);
      o.stop(t0 + dur + 0.02);
    }

    function playUISound(kind){
      // 아이콘마다 음색 다르게
      if (kind === 'warm'){
        tone({freq: 392, type:'sine', dur:0.10, gain:0.08, glideTo:440});
        return;
      }
      if (kind === 'thud'){
        tone({freq: 110, type:'triangle', dur:0.12, gain:0.10, glideTo:90});
        return;
      }
      if (kind === 'sparkle'){
        tone({freq: 880, type:'square', dur:0.06, gain:0.06, glideTo:1320});
        tone({freq: 1320, type:'sine', dur:0.05, gain:0.05, glideTo:1760});
        return;
      }
      if (kind === 'clear'){
        tone({freq: 660, type:'sine', dur:0.08, gain:0.06, glideTo:880});
        return;
      }
      // soft default
      tone({freq: 520, type:'sine', dur:0.08, gain:0.06, glideTo:600});
    }

    // 사용자 첫 입력 시 오디오 활성화
    window.addEventListener('keydown', () => { ensureAudio(); }, { once:true });

    // ===== Career months HUD =====
    function monthsInclusive(startY, startM, endY, endM){
      // startM/endM: 1~12
      const a = startY * 12 + (startM - 1);
      const b = endY * 12 + (endM - 1);
      return Math.max(0, (b - a) + 1);
    }

    function nowYM(){
      const d = new Date();
      return { y: d.getFullYear(), m: d.getMonth() + 1 };
    }

    function fmtYM(totalMonths){
      const y = Math.floor(totalMonths / 12);
      const m = totalMonths % 12;
      return `${y}년 ${m}개월`;
    }

    function updateCareerHUD(){
      const cheonjae = monthsInclusive(2021, 8, 2023, 6);
      const now = nowYM();
      const ebs = monthsInclusive(2024, 7, now.y, now.m);
      const total = cheonjae + ebs;
      careerHUD.textContent = `경력: 총 ${fmtYM(total)} (천재교과서 ${fmtYM(cheonjae)} + EBS ${fmtYM(ebs)})`;
    }
    updateCareerHUD();

    // ===== Collision / interact =====
    function rectsOverlap(a,b){
      return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    }

    function nearestSpot(){
      const zone = { x: player.x - 8, y: player.y - 8, w: player.w + 16, h: player.h + 16 };
      for (const s of spots){
        if (rectsOverlap(zone, s)) return s;
      }
      return null;
    }

    // ===== Facing look-at effect =====
    let lookLock = 0; // ms
    function faceToward(s){
      const cx = player.x + player.w/2;
      const cy = player.y + player.h/2;
      const tx = s.x + s.w/2;
      const ty = s.y + s.h/2;
      const dx = tx - cx;
      const dy = ty - cy;
      if (Math.abs(dx) > Math.abs(dy)){
        facing = dx >= 0 ? 'right' : 'left';
      } else {
        facing = dy >= 0 ? 'down' : 'up';
      }
      lookLock = 220;
    }

    // ===== Particles (sparkles near icons) =====
    const particles = [];
    function spawnSparkle(x, y){
      particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 0.25,
        vy: -0.35 - Math.random()*0.2,
        life: 600 + Math.random()*500,
        t: 0,
      });
      if (particles.length > 240) particles.splice(0, 80);
    }

    function updateParticles(dt){
      for (let i=particles.length-1; i>=0; i--){
        const p = particles[i];
        p.t += dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.t > p.life) particles.splice(i,1);
      }
    }

    function drawParticles(){
      for (const p of particles){
        const a = 1 - (p.t / p.life);
        ctx.fillStyle = `rgba(255, 240, 180, ${0.55 * a})`;
        ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 2);
      }
    }

    // ===== Render =====
    function drawBG(){
      // 타일 느낌
      for (let y=0; y<H; y+=TILE){
        for (let x=0; x<W; x+=TILE){
          const even = ((x/TILE + y/TILE) % 2 === 0);
          ctx.fillStyle = even ? '#111a26' : '#0f1722';
          ctx.fillRect(x, y, TILE, TILE);
        }
      }

      // 길 (가로 진행)
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(40, 190, 560, 18);
      ctx.fillRect(55, 224, 40, 12); // timeline 쪽 작은 길
      ctx.fillRect(90, 205, 18, 32); // 연결
    }

    function drawSpots(){
      for (const s of spots){
        // sparkle spawn
        if (Math.random() < 0.02){
          spawnSparkle(s.x + s.w/2 + (Math.random()-0.5)*18, s.y - 6 + (Math.random()-0.5)*8);
        }

        // icon draw
        const iconImg = icons[s.key];
        if (iconReady(iconImg)){
          ctx.drawImage(iconImg, s.x - 6, s.y - 6, s.w + 12, s.h + 12);
        } else {
          // fallback
          ctx.fillStyle = s.type === 'timeline' ? '#9ece6a' : '#7aa2f7';
          ctx.fillRect(s.x, s.y, s.w, s.h);
        }

        // label (한글)
        ctx.font = '12px ui-monospace, Menlo, Consolas, monospace';
        ctx.fillStyle = 'rgba(255,255,255,0.92)';
        ctx.fillText(s.labelKo, s.x - 2, s.y - 10);
      }
    }

    function drawPressSpace(){
      const s = nearestSpot();
      if (!s || paused) return;

      const text = 'Press Space';
      ctx.font = '12px ui-monospace, Menlo, Consolas, monospace';

      const pad = 7;
      const tw = ctx.measureText(text).width;
      const bw = tw + pad * 2;
      const bh = 18;

      const bx = Math.max(10, Math.min(W - bw - 10, player.x + player.w/2 - bw/2));
      const by = Math.max(10, player.y - 28);

      ctx.fillStyle = 'rgba(0,0,0,0.62)';
      ctx.fillRect(bx, by, bw, bh);
      ctx.fillRect(Math.floor(bx + bw/2) - 2, by + bh, 4, 4);

      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.fillText(text, bx + pad, by + 13);
    }

    function drawPlayer(){
      if (!allSpritesReady()){
        ctx.fillStyle = '#f7768e';
        ctx.fillRect(player.x, player.y, player.w, player.h);
        return;
      }

      const dx = Math.round(player.x - (DRAW_W - player.w)/2);
      const dy = Math.round(player.y - (DRAW_H - player.h)/2);

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

      // right: flip
      if (facing === 'right'){
        ctx.save();
        ctx.scale(-1, 1);
        ctx.drawImage(sideImg, 0, 0, SRC_W, SRC_H, -(dx + DRAW_W), dy, DRAW_W, DRAW_H);
        ctx.restore();
      }
    }

    function render(){
      ctx.clearRect(0,0,W,H);
      drawBG();
      drawSpots();
      drawParticles();
      drawPlayer();
      drawPressSpace();
    }

    // ===== Update =====
    let lastTs = performance.now();

    function update(ts){
      const dt = ts - lastTs;
      lastTs = ts;

      updateParticles(dt);

      if (paused){
        player.vx = 0; player.vy = 0;
        walkTimer = 0; walkFrame = 0;
        return;
      }

      if (lookLock > 0){
        lookLock -= dt;
      }

      player.vx = 0; player.vy = 0;

      const left  = keys.has('ArrowLeft');
      const right = keys.has('ArrowRight');
      const up    = keys.has('ArrowUp');
      const down  = keys.has('ArrowDown');

      if (lookLock <= 0){
        if (left)  player.vx = -player.speed;
        if (right) player.vx =  player.speed;
        if (up)    player.vy = -player.speed;
        if (down)  player.vy =  player.speed;

        if (player.vx < 0) facing = 'left';
        else if (player.vx > 0) facing = 'right';
        else if (player.vy < 0) facing = 'up';
        else if (player.vy > 0) facing = 'down';
      }

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

    // ===== Exit behavior =====
    // ✅ Exit Game 눌렀을 때만 Thanks modal
    if (exitBtn){
      exitBtn.addEventListener('click', () => {
        paused = true;
        openThanks();
      });
    }

    // ===== Key events =====
    window.addEventListener('keydown', (e) => {
      keys.add(e.key);

      if (!layer.classList.contains('on')) return;

      if (e.key === ' '){
        e.preventDefault();
        if (paused) return;

        const s = nearestSpot();
        if (!s) return;

        // ✅ Space 누르면 캐릭터가 아이콘을 바라봄
        faceToward(s);

        // ✅ 아이콘별 소리
        playUISound(s.sound || 'soft');

        // ✅ 모달 열기
        if (s.type === 'timeline'){
          openTimeline();
        } else if (s.type === 'info'){
          openInfo(s.key, s.labelKo);
        }
      }

      // ESC: 모달 닫기 (게임을 종료하지 않음)
      if (e.key === 'Escape'){
        e.preventDefault();
        if (timelineModal.classList.contains('on')) closeTimeline();
        else if (infoModal.classList.contains('on')) closeInfo();
        else if (thanksModal.classList.contains('on')) closeThanks();
      }
    });

    window.addEventListener('keyup', (e) => keys.delete(e.key));

    // ===== Start =====
    layer.classList.add('on');
    layer.setAttribute('aria-hidden', 'false');
    lastTs = performance.now();
    requestAnimationFrame(loop);
  });
})();
