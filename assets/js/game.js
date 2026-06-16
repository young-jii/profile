/* ============================================================
   지영's 포트폴리오 게임 v2
   - 카메라 + 640×360 월드 (탐험형 맵)
   - 노드 → 픽셀 건물 / 충돌 / Y-소팅
   - 모바일 가상 D-pad + A버튼 + 노드 탭
   - 퀘스트 체크리스트 / 엔딩 스탯창
   - 콘텐츠는 assets/js/content.js 로 분리 (window.CONTENT)
============================================================ */
window.addEventListener('load', () => {
  const layer  = document.getElementById('gameLayer');
  const canvas = document.getElementById('gameCanvas');
  const exitBtn = document.getElementById('exitGameBtn');
  const careerHUD = document.getElementById('careerHUD');
  const questBar = document.getElementById('questBar');

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

  const touchControls = document.getElementById('touchControls');
  const actBtn = document.getElementById('actBtn');

  const dialogueBar = document.getElementById('dialogueBar');
  const dlgName = document.getElementById('dlgName');
  const dlgText = document.getElementById('dlgText');
  const dlgCta = document.getElementById('dlgCta');

  const npcDialogue = document.getElementById('npcDialogue');
  const npcNameEl = document.getElementById('npcName');
  const npcTextEl = document.getElementById('npcText');
  const npcCtaEl = document.getElementById('npcCta');
  const npcChoicesEl = document.getElementById('npcChoices');
  const questCount = document.getElementById('questCount');

  // === Footstep Sound (file) ===
  const footstepAudio = new Audio('./assets/sounds/footstep.mp3');
  footstepAudio.volume = 0.35;

  let lastStepTime = 0;
  const STEP_INTERVAL = 260; // ms

  if (!layer || !canvas) return;

  // === show game immediately (no gap) ===
  layer.classList.add('on');
  layer.setAttribute('aria-hidden', 'false');
  document.body.classList.add('game-on');

  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  // ✅ 뷰포트(캔버스)는 화면 비율에 맞춰 동적으로 / 월드는 고정
  const WORLD_W = 640;
  const WORLD_H = 360;
  let VIEW_W = 320;
  let VIEW_H = 180;

  function fitCanvas(){
    const aspect = Math.max(0.25, Math.min(4, window.innerWidth / Math.max(1, window.innerHeight)));
    // ✅ PC는 시야를 넓게(픽셀 작게), 모바일은 픽셀 큼직하게
    const TARGET = window.innerWidth >= 1100 ? 480 : 320;
    if (aspect >= 1){
      VIEW_W = TARGET;
      VIEW_H = Math.round(TARGET / aspect);
    } else {
      VIEW_H = TARGET;
      VIEW_W = Math.round(TARGET * aspect);
    }
    VIEW_W = Math.max(120, Math.min(VIEW_W, WORLD_W));
    VIEW_H = Math.max(100, Math.min(VIEW_H, WORLD_H));
    VIEW_W -= VIEW_W % 2;
    VIEW_H -= VIEW_H % 2;
    canvas.width = VIEW_W;
    canvas.height = VIEW_H;
    ctx.imageSmoothingEnabled = false;
  }
  fitCanvas();
  window.addEventListener('resize', fitCanvas);
  window.addEventListener('orientationchange', () => setTimeout(fitCanvas, 80));

  const keys = new Set();
  let paused = true; // intro until start

  /* =========================
     Web Audio (SFX + BGM)
  ========================= */
  let audioCtx = null;

  function ensureAudio(){
    if (!audioCtx){
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      audioCtx = new AC();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  function playTone({ type='sine', freq=440, dur=0.12, gain=0.12, attack=0.005, release=0.06, filter=null }){
    const ac = ensureAudio();
    if (!ac) return;

    const t0 = ac.currentTime;

    const o = ac.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);

    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + release);

    let lastNode = o;

    if (filter){
      const f = ac.createBiquadFilter();
      f.type = filter.type || 'lowpass';
      f.frequency.setValueAtTime(filter.freq || 1200, t0);
      f.Q.setValueAtTime(filter.q ?? 0.7, t0);
      lastNode.connect(f);
      lastNode = f;
    }

    lastNode.connect(g);
    g.connect(ac.destination);

    o.start(t0);
    o.stop(t0 + dur + release + 0.02);
  }

  function playSfxForKey(key){
    switch (key){
      case 'school':
        playTone({ type:'triangle', freq: 440, dur:0.10, gain:0.10, filter:{type:'lowpass', freq:1200, q:0.8} });
        playTone({ type:'sine', freq: 660, dur:0.08, gain:0.07, filter:{type:'lowpass', freq:1400, q:0.6} });
        break;
      case 'training':
        playTone({ type:'sine', freq: 523.25, dur:0.12, gain:0.09, filter:{type:'lowpass', freq:1800, q:0.7} });
        break;
      case 'company':
        playTone({ type:'square', freq: 110, dur:0.10, gain:0.12, filter:{type:'lowpass', freq:600, q:1.0} });
        playTone({ type:'triangle', freq: 150, dur:0.08, gain:0.07, filter:{type:'lowpass', freq:700, q:0.9} });
        break;
      case 'award':
        playTone({ type:'sine', freq: 880, dur:0.06, gain:0.08, filter:{type:'highpass', freq:600, q:0.8} });
        playTone({ type:'sine', freq: 1320, dur:0.06, gain:0.06, filter:{type:'highpass', freq:700, q:0.9} });
        break;
      case 'cert':
        playTone({ type:'square', freq: 740, dur:0.05, gain:0.06, filter:{type:'highpass', freq:800, q:0.7} });
        break;
      case 'lang':
        playTone({ type:'sine', freq: 392, dur:0.10, gain:0.07, filter:{type:'bandpass', freq:900, q:0.8} });
        break;
      case 'timeline':
        playTone({ type:'triangle', freq: 587.33, dur:0.10, gain:0.09 });
        playTone({ type:'triangle', freq: 783.99, dur:0.10, gain:0.07 });
        break;
      default:
        playTone({ type:'sine', freq: 600, dur:0.08, gain:0.06 });
        break;
    }
  }

  // ✅ ALL CLEAR / 완료 효과음(뵤로롱)
  function playClearSfx(){
    const seq = [880, 990, 1180, 1320, 1760];
    seq.forEach((f, i) => {
      setTimeout(() => {
        playTone({ type:'triangle', freq:f, dur:0.06, gain:0.07, filter:{type:'highpass', freq:600, q:0.8} });
      }, i * 60);
    });
    setTimeout(() => {
      playTone({ type:'sine', freq: 660, dur:0.10, gain:0.07 });
      playTone({ type:'sine', freq: 880, dur:0.10, gain:0.06 });
    }, 320);
  }

  /* =========================
     BGM (Synth loop) + Ducking + Fadeout + Pitch Up
  ========================= */
  let bgmGain = null;
  let bgmMaster = 0.12;
  let bgmDucked = 0.055;
  let bgmIsRunning = false;
  let bgmTimer = null;

  let bgmTranspose = 0; // ✅ ALL CLEAR 후 +2 semitones

  function semitone(f, n){
    return f * Math.pow(2, n/12);
  }

  function setBgmVol(target, ramp=0.18){
    const ac = ensureAudio();
    if (!ac || !bgmGain) return;
    const t = ac.currentTime;
    bgmGain.gain.cancelScheduledValues(t);
    bgmGain.gain.linearRampToValueAtTime(Math.max(0.0001, target), t + ramp);
  }

  function startBgm(){
    const ac = ensureAudio();
    if (!ac) return;
    if (bgmIsRunning) return;

    bgmGain = ac.createGain();
    bgmGain.gain.value = 0.0001;
    bgmGain.connect(ac.destination);

    bgmIsRunning = true;
    setBgmVol(bgmMaster, 0.35);

    const base = 220;
    const pattern = [
      0,  7,  12, 7,
      2,  9,  14, 9,
      0,  7,  12, 7,
      -3, 4,  9,  4
    ];

    let idx = 0;

    function tick(){
      if (!bgmIsRunning) return;

      const step = pattern[idx % pattern.length];
      idx++;

      const freq = semitone(base, step + bgmTranspose);

      const o = ac.createOscillator();
      o.type = 'triangle';
      o.frequency.value = freq;

      const g = ac.createGain();
      const t0 = ac.currentTime;

      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(0.08, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22);

      const f = ac.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.setValueAtTime(900, t0);
      f.Q.setValueAtTime(0.7, t0);

      o.connect(f);
      f.connect(g);
      g.connect(bgmGain);

      o.start(t0);
      o.stop(t0 + 0.24);

      bgmTimer = setTimeout(tick, 250);
    }

    tick();
  }

  function stopBgmFadeOut(){
    if (!bgmIsRunning) return;
    setBgmVol(0.0001, 0.9);
    setTimeout(() => {
      bgmIsRunning = false;
      if (bgmTimer) clearTimeout(bgmTimer);
      bgmTimer = null;
      if (bgmGain){
        try { bgmGain.disconnect(); } catch(e){}
      }
      bgmGain = null;
    }, 950);
  }

  function duckBgm(on){
    if (!bgmIsRunning) return;
    setBgmVol(on ? bgmDucked : bgmMaster, 0.18);
  }

  /* =========================
     Player / Sprites
     ✅ 새 캐릭터: 4방향 × 4프레임 걷기 사이클 (char_sheet.png)
     - 행: 0=정면(down) 1=측면(left) 2=뒷면(up) / right는 left 미러
     - 열: 0=서기 1=걸음A 2=서기(눈 깜빡) 3=걸음B
  ========================= */
  const player = { x: 72, y: 176, w: 12, h: 12, vx: 0, vy: 0, speed: 1.35 };

  const FRAME_W = 16, FRAME_H = 20;
  const SHEET_ROW = { down: 0, left: 1, up: 2, right: 1 };
  const charSheet = new Image();
  charSheet.src = 'assets/css/images/char_sheet.png?v=1';
  function sheetReady(){ return charSheet.complete && charSheet.naturalWidth > 0; }

  let facing = 'down';
  let walkFrame = 0;          // 0..3 사이클
  let walkTimer = 0;
  const WALK_INTERVAL = 130;  // 프레임 전환 간격(ms)

  // ✅ NPC 스프라이트 시트 (6명 × 2프레임: 일반/눈깜빡)
  const npcSheet = new Image();
  npcSheet.src = 'assets/css/images/npc_sheet.png?v=1';
  function npcSheetReady(){ return npcSheet.complete && npcSheet.naturalWidth > 0; }
  const NPC_COL = { school:0, company:1, training:2, award:3, cert:4, lang:5 };

  /* =========================
     ✅ Scene 상태머신: 'town' ↔ 'interior'
  ========================= */
  let scene = 'town';
  let interiorKey = null;     // 현재 들어간 건물 key
  let transition = null;      // {phase:'out'|'in', t, dur, next}

  // 인테리어 내부 좌표계 (각 방은 독립 200×150)
  const ROOM_W = 200, ROOM_H = 150;
  const roomPlayer = { x: 92, y: 120, w: 12, h: 12 };
  const npc = { x: 94, y: 60, w: 12, h: 12 };
  let npcBlink = 0;

  // NPC 대화 데이터: 방마다 인사 + 짧은 요약 + 이름/직함
  const NPC_DATA = {
    school: {
      name: '김 교수',
      hello: '어서 와요! 국어국문학과에 잘 왔어요.\n지영 씨는 글로 구조를 만드는 데 재능이 있었죠.',
      short: '경희대 국어국문학과 졸업(학점 3.92/4.5).\n글의 뼈대를 세우는 힘이 여기서 시작됐어요.',
      bye: '언제든 또 들러요. 응원할게요!',
    },
    company: {
      name: '이 팀장',
      hello: '오, 지영 씨 왔구나!\n우리 팀에서 정말 많은 걸 해냈었지.',
      short: '천재교과서→EBS. 콘텐츠 기획부터\n문항코드 추출 자동화까지 직접 만들었어요.',
      bye: '다음 프로젝트도 기대할게. 수고했어!',
    },
    training: {
      name: '박 멘토',
      hello: '반가워요! 여기는 배움의 공간이에요.\n지영 씨는 늘 끝까지 파고드는 분이었죠.',
      short: 'AI 추천 시스템 과정 + 데이터 비즈니스\n분석가 과정. 두 번의 집중 훈련 기록이에요.',
      bye: '계속 성장하는 모습, 멋져요!',
    },
    award: {
      name: '심사위원',
      hello: '아, 그때 그 수상자시군요!\n인상 깊은 결과물이었습니다.',
      short: 'K-디지털플랫폼 AI 경진대회 특별상 수상.\n문제 정의부터 구현까지 인정받았어요.',
      bye: '앞으로의 도전도 응원합니다!',
    },
    cert: {
      name: '자격 사서',
      hello: '어서 오세요. 이곳은 자격의 전당이에요.\n차근차근 쌓아온 게 보이네요.',
      short: 'SQLD · ADsP · 컴활 1급 · GTQ 1급 등.\n도구를 제대로 다룰 줄 안다는 증명이에요.',
      bye: '필요한 자격은 또 찾아오면 돼요!',
    },
    lang: {
      name: 'Jamie',
      hello: 'Hi! Welcome :)\n글로벌 협업도 문제없이 준비된 분이에요.',
      short: 'TOEIC 785 · Speaking IH(150).\n읽고 말하는 것 모두 준비되어 있어요.',
      bye: 'See you again! 다음에 또 봐요!',
    },
  };

  // 방 테마 색 (벽/바닥) — nodeColor는 아래에서 함수 선언(호이스팅)됨
  function roomTheme(key){
    return nodeColor(key);
  }

  /* =========================
     Map: Roads / Nodes(건물) / Monument
     - 북쪽 길 + 남쪽 길 + 양옆 세로길 = 한 바퀴 도는 루프
     - 동쪽 끝 샛길에 '연혁' 기념비(골인 지점)
  ========================= */
  const roadRects = [
    { x: 70,  y: 120, w: 500, h: 14 },  // 북쪽 길
    { x: 70,  y: 260, w: 500, h: 14 },  // 남쪽 길
    { x: 70,  y: 120, w: 14,  h: 154 }, // 서쪽 세로길
    { x: 556, y: 120, w: 14,  h: 154 }, // 동쪽 세로길
    { x: 570, y: 182, w: 50,  h: 14 },  // 연혁 기념비로 가는 샛길
  ];

  // ✅ 마을 연못 (스타듀밸리 무드 + 충돌 장애물)
  const pond = { x: 200, y: 160, w: 84, h: 52 };

  function inPond(x, y, pad = 0){
    return x >= pond.x - pad && x <= pond.x + pond.w + pad &&
           y >= pond.y - pad && y <= pond.y + pond.h + pad;
  }

  // node.x / node.y = 상호작용 지점(건물 문 앞)
  const nodes = [
    { key:'school',   label:'학교',   x: 140, y: 126, building:{ cx:140, bottom:120 } },
    { key:'company',  label:'경력',   x: 300, y: 126, building:{ cx:300, bottom:120 } },
    { key:'lang',     label:'언어',   x: 460, y: 126, building:{ cx:460, bottom:120 } },
    { key:'training', label:'교육',   x: 140, y: 266, building:{ cx:140, bottom:260 } },
    { key:'award',    label:'수상',   x: 300, y: 266, building:{ cx:300, bottom:260 } },
    { key:'cert',     label:'자격증', x: 460, y: 266, building:{ cx:460, bottom:260 } },
    { key:'timeline', label:'연혁',   x: 604, y: 189, building:null }, // 황금 기념비
  ];

  const VISIT_KEYS = ['school','training','company','award','cert','lang'];
  const visited = new Set();
  let clearPlayed = false;

  /* =========================
     ✅ RPG 대화창: 건물 앞 1차 인터랙션
     - 첫 번째 Space/A: 한 줄 소개 대화창
     - 두 번째 Space/A (또는 대화창 탭): 상세 시트 열기
  ========================= */
  const NODE_SUMMARY = {
    school:   '국어국문학을 전공했어요. 글로 구조를 만드는 힘은 여기서 시작됐습니다.',
    training: 'AI 추천 시스템부터 데이터 비즈니스 분석까지, 두 번의 집중 훈련 기록이에요.',
    company:  '천재교과서에서 EBS까지 — 콘텐츠 기획과 자동화의 실전 기록입니다.',
    award:    'K-디지털플랫폼 AI 경진대회 특별상, 그 뒷이야기를 들려드릴게요.',
    cert:     'SQLD, ADsP, 컴활 1급… 도구를 다룰 줄 안다는 증명들이에요.',
    lang:     'TOEIC 785 · Speaking IH — 글로벌 협업도 준비되어 있습니다.',
    timeline: '2012년부터 지금까지, 걸어온 길을 한눈에 볼 수 있어요.',
  };

  let dlgNodeKey = null;

  function showDialogue(n){
    if (!dialogueBar) return;
    dlgNodeKey = n.key;
    if (dlgName) dlgName.textContent = n.label;
    if (dlgText) dlgText.textContent = NODE_SUMMARY[n.key] || '';
    if (dlgCta){
      const isTouch = touchControls && getComputedStyle(touchControls).display !== 'none';
      dlgCta.textContent = isTouch ? '▼ 들어가기 (A)' : '▼ 들어가기 (Space)';
    }
    dialogueBar.classList.add('on');
    dialogueBar.setAttribute('aria-hidden', 'false');
  }

  function hideDialogue(){
    if (!dialogueBar) return;
    dlgNodeKey = null;
    dialogueBar.classList.remove('on');
    dialogueBar.setAttribute('aria-hidden', 'true');
  }

  /* =========================
     Quest Bar (HTML 체크리스트)
  ========================= */
  function buildQuestBar(){
    if (!questBar) return;
    questBar.innerHTML = nodes
      .filter(n => VISIT_KEYS.includes(n.key))
      .map(n => `<span class="q-chip" data-k="${n.key}">${n.label}</span>`)
      .join('');
  }
  function updateQuestBar(){
    if (questBar){
      questBar.querySelectorAll('.q-chip').forEach(chip => {
        const k = chip.getAttribute('data-k');
        if (visited.has(k)) chip.classList.add('done');
      });
      questBar.classList.toggle('all-done', visited.size === VISIT_KEYS.length);
    }
    if (questCount){
      questCount.textContent = `★ ${visited.size}/${VISIT_KEYS.length}`;
      questCount.style.color = (visited.size === VISIT_KEYS.length) ? '#f3d795' : '';
    }
  }
  buildQuestBar();
  updateQuestBar();

  /* =========================
     ALL CLEAR Banner (screen space)
  ========================= */
  let allClearBanner = { active:false, t:0, dur:1400 };

  function drawAllClear(){
    if (!allClearBanner.active) return;

    const k = allClearBanner.t / allClearBanner.dur;
    const easeOut = 1 - Math.pow(1 - Math.min(k,1), 3);

    const text = 'ALL CLEAR!';
    ctx.font = '14px monospace';
    const padX = 12;
    const tw = ctx.measureText(text).width;
    const bw = tw + padX * 2;
    const bh = 26;

    const x = Math.round(VIEW_W / 2 - bw / 2);
    const yBase = 18;

    let y;
    if (k < 0.18){
      y = Math.round(-bh + easeOut * (yBase + bh));
    } else if (k > 0.82){
      const kk = (k - 0.82) / 0.18;
      const e2 = 1 - Math.pow(1 - Math.min(kk,1), 3);
      y = Math.round(yBase - e2 * 18);
    } else {
      y = yBase;
    }

    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(x + 2, y + 2, bw, bh);

    ctx.fillStyle = 'rgba(20,20,20,0.95)';
    ctx.fillRect(x, y, bw, bh);

    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.strokeRect(x + 0.5, y + 0.5, bw - 1, bh - 1);

    ctx.fillStyle = '#f6d365';
    ctx.fillText(text, x + padX, y + 18);
  }

  function markVisited(key){
    if (!VISIT_KEYS.includes(key)) return;

    const before = visited.size;
    visited.add(key);
    updateQuestBar();

    if (!clearPlayed && before !== visited.size && visited.size === VISIT_KEYS.length){
      clearPlayed = true;
      playClearSfx();
      allClearBanner.active = true;
      allClearBanner.t = 0;
      bgmTranspose = 2;
    }
  }

  /* =========================
     Content (assets/js/content.js 에서 로드)
  ========================= */
  const CONTENT = window.CONTENT || {};

  /* =========================
     Modal helpers + ducking
  ========================= */
  const MODAL_OPEN_ANIM_MS = 220;

  function openModal(modal, opts = {}){
    if (!modal) return Promise.resolve();

    const openAnimMs = Number.isFinite(opts.openAnimMs)
      ? opts.openAnimMs
      : MODAL_OPEN_ANIM_MS;

    paused = true;
    keys.clear(); // ✅ 모달 열릴 때 키 stuck 방지
    hideDialogue();
    document.body.classList.add('sheet-open'); // ✅ 시트 열림: D-pad/대화창 숨김
    modal.classList.add('on');
    modal.setAttribute('aria-hidden', 'false');
    duckBgm(true);

    return new Promise((resolve) => {
      if (openAnimMs <= 0) { resolve(); return; }
      setTimeout(resolve, openAnimMs);
    });
  }

  function closeModal(modal){
    if (!modal) return;
    modal.classList.remove('on');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('sheet-open');
    paused = false;
    keys.clear(); // ✅ 닫을 때도 한번 초기화
    duckBgm(false);
  }

  function getOutroBody(){
    if (!outroModal) return null;
    return outroModal.querySelector('.game-modal-body');
  }

  function formatMs(ms){
    const s = Math.max(0, Math.floor(ms / 1000));
    const mm = Math.floor(s / 60);
    const ss = s % 60;
    return `${mm}분 ${String(ss).padStart(2,'0')}초`;
  }

  /* =========================
     Outro: 플레이 통계 + RPG 스탯창
  ========================= */
  const SKILL_STATS = [
    { name: '콘텐츠 기획',     lv: 5 },
    { name: '프로세스 설계',   lv: 5 },
    { name: '커뮤니케이션',    lv: 5 },
    { name: '데이터 분석',     lv: 4 },
    { name: '자동화 (Python)', lv: 4 },
  ];

  function statBlocks(lv, max = 5){
    let s = '';
    for (let i = 0; i < max; i++){
      s += `<i class="sq ${i < lv ? 'fill' : ''}"></i>`;
    }
    return s;
  }

  function fillOutroStats(){
    const body = getOutroBody();
    if (!body) return;

    const playMs = (playStartTs && playEndTs) ? (playEndTs - playStartTs) :
                   (playStartTs ? (performance.now() - playStartTs) : 0);

    const visitedCount = visited.size;
    const totalCount = VISIT_KEYS.length;
    const cleared = visitedCount === totalCount;

    let box = body.querySelector('.outro-stats');
    if (!box){
      box = document.createElement('div');
      box.className = 'outro-stats';
      body.appendChild(box);
    }

    box.innerHTML = `
      <div class="outro-play">
        ${cleared ? '<div class="clear-badge">★ ALL CLEAR ★</div>' : ''}
        <div>플레이 시간: <b>${formatMs(playMs)}</b></div>
        <div>방문 노드: <b>${visitedCount}/${totalCount}</b></div>
      </div>
      <div class="stat-window">
        <div class="stat-title">CHARACTER STATUS — 박지영</div>
        ${SKILL_STATS.map(s => `
          <div class="stat-row">
            <span class="stat-name">${s.name}</span>
            <span class="stat-sq">${statBlocks(s.lv)}</span>
            <span class="stat-lv">Lv.${s.lv}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  async function openInfo(key){
    const data = CONTENT[key];
    if (!data) return;

    infoModalTitle.textContent = data.title;
    infoModalBody.innerHTML = data.body; // ✅ 타자기 연출 제거: 내용 바로 표시
    infoModalBody.scrollTop = 0;

    playSfxForKey(key);
    markVisited(key);

    openModal(infoModal);
  }

  /* =========================
     Intro / Close / Exit buttons
  ========================= */
  function startGame(){
    ensureAudio();
    if (!bgmIsRunning) startBgm();
    introModal.classList.remove('on');
    introModal.setAttribute('aria-hidden','true');
    paused = false;
    duckBgm(false);
    if (playStartTs === null) playStartTs = performance.now();
  }

  if (introCloseBtn) introCloseBtn.addEventListener('click', startGame);
  if (startGameBtn) startGameBtn.addEventListener('click', startGame);

  if (infoCloseBtn) infoCloseBtn.addEventListener('click', () => closeModal(infoModal));
  if (timelineCloseBtn) timelineCloseBtn.addEventListener('click', () => closeModal(timelineModal));

  if (outroCloseBtn) outroCloseBtn.addEventListener('click', () => {
    closeModal(outroModal);
    duckBgm(false);
  });

  [infoModal, timelineModal, outroModal].forEach(m => {
    if (!m) return;
    m.addEventListener('click', (e) => {
      if (e.target === m){
        closeModal(m);
        duckBgm(false);
      }
    });
  });

  // ✅ 마우스/터치로도 오디오 정책 해제 + BGM 시작
  [layer, canvas].forEach(el => {
    if (!el) return;
    el.addEventListener('pointerdown', () => {
      ensureAudio();
      if (!bgmIsRunning) startBgm();
    }, { passive:true });
  });

  // ✅ 플레이 시간 측정
  let playStartTs = null;
  let playEndTs = null;

  function openOutro(){
    paused = true;
    keys.clear();
    playEndTs = performance.now();
    fillOutroStats();
    stopBgmFadeOut();
    openModal(outroModal);
  }

  if (exitBtn){
    exitBtn.addEventListener('click', () => {
      if (scene === 'interior'){ exitInterior(); return; }
      openOutro();
    });
  }

  /* =========================
     Career HUD (months-based)
  ========================= */
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
      careerHUD.innerHTML =
        `총 경력 <span class="hl">${formatYM(total)}</span> (천재 ${formatYM(chunjae)} + EBS ${formatYM(ebs)})`;
    }
  }
  updateCareerHUD();

  /* =========================
     Interaction helper
  ========================= */
  function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh){
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  function nearestNode(){
    const cx = player.x + player.w / 2;
    const cy = player.y + player.h / 2;
    let best = null;
    let bestD = 26; // 상호작용 반경
    for (const n of nodes){
      const d = Math.hypot(n.x - cx, n.y - cy);
      if (d < bestD){ bestD = d; best = n; }
    }
    return best;
  }

  /* =========================================================
     Retro props: grass/rocks/trees/lamps (random but fixed)
  ========================================================= */
  function mulberry32(seed){
    return function(){
      let t = seed += 0x6D2B79F5;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const props = [];       // 평면(잔디/자갈) - 바닥에 그려짐
  const solidsProps = []; // 입체(바위/나무/가로등) - Y소팅 + 충돌
  const rng = mulberry32(20251214);

  function inRoad(x, y, pad = 0){
    for (const r of roadRects){
      if (x >= r.x - pad && x <= r.x + r.w + pad && y >= r.y - pad && y <= r.y + r.h + pad) return true;
    }
    return false;
  }

  function nearNode(x, y, dist = 34){
    for (const n of nodes){
      if (Math.hypot(x - n.x, y - n.y) < dist) return true;
    }
    return false;
  }

  function inBuilding(x, y){
    for (const n of nodes){
      const b = n.building;
      if (!b) continue;
      if (x >= b.cx - 30 && x <= b.cx + 30 && y >= b.bottom - 46 && y <= b.bottom + 8) return true;
    }
    return false;
  }

  function snap16(v){ return Math.round(v / 16) * 16; }

  function initProps(){
    props.length = 0;
    solidsProps.length = 0;

    // 가로등: 북쪽/남쪽 길을 따라 배치
    const lampXs = [95, 220, 380, 520];
    lampXs.forEach((x) => {
      solidsProps.push({ type:'lamp', x: x, y: 106 });        // 북쪽 길 위
      solidsProps.push({ type:'lamp', x: x + 8, y: 278 });    // 남쪽 길 아래
    });
    solidsProps.push({ type:'lamp', x: 588, y: 168 });        // 기념비 샛길

    // 잔디/바위/나무 랜덤 배치 (길/건물/노드 주변 제외)
    const attempts = 320;
    for (let i = 0; i < attempts; i++){
      const x = snap16(16 + rng() * (WORLD_W - 48));
      const y = snap16(16 + rng() * (WORLD_H - 48));

      if (inRoad(x, y, 6)) continue;
      if (nearNode(x, y)) continue;
      if (inBuilding(x, y)) continue;
      if (inPond(x, y, 14)) continue;

      const roll = rng();
      if (roll < 0.58){
        props.push({ type:'grass', x, y, v: (rng()*3)|0 });
      } else if (roll < 0.68){
        solidsProps.push({ type:'rock', x, y, v: (rng()*3)|0 });
      } else if (roll < 0.90){
        solidsProps.push({ type:'tree', x, y, v: (rng()*3)|0 });
      }
    }

    // 길 위 자갈 디테일
    for (const r of roadRects){
      if (r.w >= r.h){
        for (let x = r.x + 4; x <= r.x + r.w - 8; x += 16){
          props.push({ type:'pebble', x, y: r.y + 2 });
          props.push({ type:'pebble', x: x + 8, y: r.y + r.h - 6 });
        }
      } else {
        for (let y = r.y + 4; y <= r.y + r.h - 8; y += 16){
          props.push({ type:'pebble', x: r.x + 2, y });
        }
      }
    }
  }
  initProps();

  /* =========================
     Collision solids
  ========================= */
  const solids = [];

  function buildSolids(){
    solids.length = 0;

    // 건물 베이스 (아래쪽만 막아서 지붕 뒤로는 걸어다닐 수 있게)
    for (const n of nodes){
      const b = n.building;
      if (!b) continue;
      solids.push({ x: b.cx - 22, y: b.bottom - 14, w: 44, h: 14 });
    }

    // 기념비 받침
    solids.push({ x: 598, y: 184, w: 14, h: 8 });

    // ✅ 연못 (모래 테두리 포함)
    solids.push({ x: pond.x - 3, y: pond.y - 3, w: pond.w + 6, h: pond.h + 6 });

    // 입체 소품
    for (const p of solidsProps){
      if (p.type === 'rock') solids.push({ x: p.x + 5, y: p.y + 11, w: 9, h: 5 });
      else if (p.type === 'tree') solids.push({ x: p.x + 6, y: p.y + 13, w: 7, h: 5 });
      else if (p.type === 'lamp') solids.push({ x: p.x, y: p.y + 6, w: 3, h: 5 });
    }
  }
  buildSolids();

  function collides(px, py){
    // 발밑 박스 기준 충돌 (자연스러운 겹침)
    const bx = px + 1, by = py + 6, bw = 10, bh = 6;
    for (const s of solids){
      if (rectsOverlap(bx, by, bw, bh, s.x, s.y, s.w, s.h)) return true;
    }
    return false;
  }

  /* =========================
     Pixel draw helpers
  ========================= */
  function drawPixelRect(x, y, w, h, fill, stroke){
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);
    if (stroke){
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    }
  }

  function drawGrass(p, t){
    const ox = p.x + 4;
    const oy = p.y + 8;
    const sway = Math.round(Math.sin(t*2 + (p.x+p.y)*0.02) * 1);

    ctx.fillStyle = '#4e8a3c';
    ctx.fillRect(ox+1, oy+1+sway, 1, 5);
    ctx.fillRect(ox+4, oy+0+sway, 1, 6);
    ctx.fillRect(ox+7, oy+2+sway, 1, 4);

    ctx.fillStyle = '#9ed47a';
    ctx.fillRect(ox+4, oy+0+sway, 1, 1);
    ctx.fillRect(ox+1, oy+1+sway, 1, 1);
  }

  function drawRock(p){
    const ox = p.x + 4;
    const oy = p.y + 8;

    ctx.fillStyle = 'rgba(50, 70, 35, 0.20)';
    ctx.fillRect(ox, oy+6, 11, 2);

    drawPixelRect(ox, oy, 10, 7, '#9b9486', 'rgba(70,62,50,0.65)');
    ctx.fillStyle = '#bdb6a6';
    ctx.fillRect(ox+2, oy+1, 4, 2);
    ctx.fillStyle = '#7e786c';
    ctx.fillRect(ox+1, oy+5, 8, 2);
    // 이끼
    ctx.fillStyle = '#6fa653';
    ctx.fillRect(ox+7, oy+1, 3, 1);
  }

  function drawTree(p, t){
    const x = p.x, y = p.y;
    const sway = Math.round(Math.sin(t*1.6 + x*0.05) * 1);

    // 그림자
    ctx.fillStyle = 'rgba(50, 70, 35, 0.22)';
    ctx.fillRect(x+3, y+16, 14, 3);

    // 기둥
    drawPixelRect(x+7, y+8, 5, 9, '#7a4f2a', 'rgba(60,38,18,0.7)');
    ctx.fillStyle = '#94653a';
    ctx.fillRect(x+8, y+9, 1, 7);

    // 잎 (3톤 풍성하게)
    drawPixelRect(x+1+sway, y+1, 17, 10, '#2f7d3a', 'rgba(25,60,28,0.55)');
    drawPixelRect(x+3+sway, y-3, 13, 7, '#3e9a4a', 'rgba(25,60,28,0.45)');
    ctx.fillStyle = '#62c46c';
    ctx.fillRect(x+5+sway, y-2, 6, 3);
    ctx.fillRect(x+4+sway, y+2, 3, 2);
    // 잎 아래 음영
    ctx.fillStyle = 'rgba(20, 50, 25, 0.22)';
    ctx.fillRect(x+2+sway, y+8, 15, 3);
  }

  function drawPebble(p){
    ctx.fillStyle = '#bb8f57';
    ctx.fillRect(p.x + 6, p.y + 2, 2, 2);
    ctx.fillStyle = '#e2c084';
    ctx.fillRect(p.x + 6, p.y + 2, 1, 1);
  }

  function drawLamp(p, t){
    const x = Math.round(p.x);
    const y = Math.round(p.y);

    // 나무 기둥
    drawPixelRect(x, y, 3, 11, '#8a5a32', 'rgba(60,38,18,0.7)');
    // 등롱
    drawPixelRect(x-1, y-4, 5, 5, '#f4c75c', '#8a5a32');
    ctx.fillStyle = '#fff3c4';
    ctx.fillRect(x, y-3, 2, 2);
    drawPixelRect(x-2, y-6, 7, 2, '#6b4a2a', 'rgba(0,0,0,0.3)');

    // 은은한 낮 글로우
    const glow = 0.05 + (Math.sin(t*3 + x*0.1) * 0.02);
    ctx.fillStyle = `rgba(255, 235, 170, ${glow})`;
    ctx.fillRect(x-6, y-6, 15, 12);
  }

  /* =========================================================
     Buildings + Monument + Signboard
  ========================================================= */
  function nodeColor(key){
    switch(key){
      case 'school': return { main:'#e0b86a', edge:'#8c6a2b' };
      case 'training': return { main:'#bb9af7', edge:'#6f50b4' };
      case 'company': return { main:'#7aa2f7', edge:'#3b5fb3' };
      case 'award': return { main:'#f7768e', edge:'#a73d52' };
      case 'cert': return { main:'#7dcfff', edge:'#3b7f95' };
      case 'lang': return { main:'#9ece6a', edge:'#4f7a2f' };
      case 'timeline': return { main:'#f6d365', edge:'#a8842b' };
      default: return { main:'#7aa2f7', edge:'#3b5fb3' };
    }
  }

  function drawBuilding(n, t, isNear){
    const b = n.building;
    if (!b) return;

    const c = nodeColor(n.key);
    const w = 44, hWall = 20, hRoof = 14;
    const x = Math.round(b.cx - w/2);
    const yBottom = b.bottom;
    const yWall = yBottom - hWall;
    const yRoof = yWall - hRoof;

    // 그림자 (낮이라 연하게)
    ctx.fillStyle = 'rgba(50, 70, 35, 0.22)';
    ctx.fillRect(x + 3, yBottom - 2, w, 4);

    // 벽
    drawPixelRect(x, yWall, w, hWall, 'rgba(244, 234, 210, 0.98)', 'rgba(90, 70, 45, 0.75)');
    ctx.fillStyle = 'rgba(90, 70, 45, 0.14)';
    ctx.fillRect(x + 1, yBottom - 4, w - 2, 3);

    // 지붕 (노드 색)
    drawPixelRect(x - 3, yRoof, w + 6, hRoof, c.main, c.edge);
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.fillRect(x - 1, yRoof + 2, w + 2, 2);
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(x - 3, yRoof + hRoof - 3, w + 6, 3);

    // ✅ 지붕 명판 (건물 이름 — 별도 표지판 대신)
    ctx.font = '10px monospace';
    const plateTw = Math.ceil(ctx.measureText(n.label).width);
    const pw = plateTw + 10, ph = 12;
    const plx = Math.round(b.cx - pw / 2);
    const ply = yRoof + Math.round((hRoof - ph) / 2);
    drawPixelRect(plx, ply, pw, ph, 'rgba(64, 45, 26, 0.94)', 'rgba(0,0,0,0.35)');
    ctx.fillStyle = isNear ? '#ffe9b3' : '#fff7e6';
    ctx.fillText(n.label, plx + 5, ply + 9);

    // 창문 (따뜻한 불빛 깜빡임)
    const glow = 0.55 + Math.sin(t * 2.4 + b.cx * 0.1) * 0.15;
    ctx.fillStyle = `rgba(255,226,150,${glow})`;
    ctx.fillRect(x + 7, yWall + 5, 7, 7);
    ctx.fillRect(x + w - 14, yWall + 5, 7, 7);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.strokeRect(x + 7.5, yWall + 5.5, 6, 6);
    ctx.strokeRect(x + w - 13.5, yWall + 5.5, 6, 6);

    // 문 (가까우면 하이라이트)
    const dw = 10, dh = 13;
    const doorX = Math.round(b.cx - dw/2);
    drawPixelRect(doorX, yBottom - dh, dw, dh,
      isNear ? 'rgba(126,92,50,1)' : 'rgba(96,70,40,1)', 'rgba(0,0,0,0.40)');
    ctx.fillStyle = 'rgba(255,235,170,0.9)';
    ctx.fillRect(doorX + dw - 3, yBottom - 7, 1, 2);

    if (isNear){
      ctx.strokeStyle = 'rgba(255,255,255,0.45)';
      ctx.strokeRect(doorX - 1.5, yBottom - dh - 1.5, dw + 3, dh + 3);
    }
  }

  function drawMonument(n, t, isNear){
    const x = Math.round(n.x);
    const yBase = Math.round(n.y + 3);
    const c = nodeColor('timeline');

    // ALL CLEAR 후 황금빛 글로우
    if (clearPlayed){
      const glowA = 0.10 + (Math.sin(t * 6.0) * 0.06);
      ctx.fillStyle = `rgba(246, 211, 101, ${glowA})`;
      ctx.fillRect(x - 18, yBase - 36, 36, 44);
      ctx.strokeStyle = `rgba(246, 211, 101, ${0.45 + glowA})`;
      ctx.strokeRect(x - 14.5, yBase - 32.5, 29, 38);
    } else if (isNear){
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(x - 14, yBase - 32, 28, 38);
    }

    // 그림자 + 받침
    ctx.fillStyle = 'rgba(0,0,0,0.30)';
    ctx.fillRect(x - 7, yBase + 2, 18, 3);
    drawPixelRect(x - 7, yBase - 4, 14, 7, 'rgba(170,180,195,0.85)', 'rgba(0,0,0,0.35)');

    // 깃대
    drawPixelRect(x - 1, yBase - 28, 2, 24, 'rgba(200,200,210,0.85)', 'rgba(0,0,0,0.30)');

    // 황금 깃발 (펄럭임)
    const wave = Math.round(Math.sin(t * 4) * 1);
    drawPixelRect(x + 1, yBase - 28 + wave, 13, 9, c.main, c.edge);
    ctx.fillStyle = 'rgba(255,255,255,0.30)';
    ctx.fillRect(x + 2, yBase - 27 + wave, 11, 2);

    // 별 장식
    ctx.fillStyle = '#fff';
    ctx.fillRect(x + 6, yBase - 25 + wave, 2, 2);
  }

  function drawSignboard(n, t, isNear){
    ctx.font = '10px monospace';
    const label = n.label;
    const padX = 8;
    const textW = Math.ceil(ctx.measureText(label).width);
    const boardW = Math.max(34, textW + padX * 2);
    const boardH = 14;

    const baseX = Math.round(n.x - boardW / 2);
    const baseY = Math.round(n.y + 14);

    const postH = 10;
    const postW = 4;
    const postX = Math.round(n.x - postW/2);
    const postY = baseY - postH + 1;

    const bob = Math.round(Math.sin(t * 2.0 + n.x * 0.05 + n.y * 0.03) * 1.0);

    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(baseX + 2, baseY + 2 + bob, boardW, boardH);
    ctx.fillRect(postX + 1, postY + 2 + bob, postW, postH);

    const c = nodeColor(n.key);

    drawPixelRect(postX, postY + bob, postW, postH, 'rgba(140,106,43,0.75)', 'rgba(0,0,0,0.35)');
    drawPixelRect(baseX, baseY + bob, boardW, boardH, 'rgba(224,184,106,0.35)', 'rgba(0,0,0,0.35)');

    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.fillRect(baseX + 2, baseY + 2 + bob, boardW - 4, 2);

    ctx.fillStyle = c.main;
    ctx.fillRect(baseX + 2, baseY + 2 + bob, 4, boardH - 4);

    ctx.fillStyle = isNear ? 'rgba(255,255,255,0.98)' : 'rgba(255,255,255,0.90)';
    ctx.fillText(label, baseX + padX, baseY + 10 + bob);

    if (isNear){
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.strokeRect(baseX + 0.5, baseY + 0.5 + bob, boardW - 1, boardH - 1);
    }
  }

  /* =========================================================
     "!" Pop
  ========================================================= */
  const pops = [];
  function spawnPop(n){
    pops.push({ x: n.x, y: n.y - 18, t: 0, dur: 520 });

    playTone({ type:'square', freq: 1200, dur:0.035, gain:0.05, filter:{type:'highpass', freq:900, q:0.7} });
    playTone({ type:'sine', freq: 1600, dur:0.035, gain:0.04, filter:{type:'highpass', freq:900, q:0.8} });
  }

  function updatePops(dt){
    for (let i=pops.length-1; i>=0; i--){
      pops[i].t += dt;
      if (pops[i].t >= pops[i].dur) pops.splice(i, 1);
    }
  }

  function drawPops(){
    for (const p of pops){
      const k = Math.min(1, p.t / p.dur);
      const rise = (1 - (1-k)*(1-k)) * 10;
      const alpha = k < 0.7 ? 1 : (1 - (k-0.7)/0.3);

      const x = Math.round(p.x);
      const y = Math.round(p.y - rise);

      ctx.fillStyle = `rgba(0,0,0,${0.55*alpha})`;
      ctx.fillRect(x-6, y-10, 12, 12);

      ctx.fillStyle = `rgba(255,255,255,${0.95*alpha})`;
      ctx.fillRect(x-5, y-9, 10, 10);

      ctx.fillStyle = `rgba(20,20,20,${0.95*alpha})`;
      ctx.fillRect(x-1, y-7, 2, 6);
      ctx.fillRect(x-1, y, 2, 2);
    }
  }

  /* =========================
     Camera
  ========================= */
  function getCamera(){
    const cx = Math.round(player.x + player.w/2 - VIEW_W/2);
    const cy = Math.round(player.y + player.h/2 - VIEW_H/2);
    return {
      x: Math.max(0, Math.min(WORLD_W - VIEW_W, cx)),
      y: Math.max(0, Math.min(WORLD_H - VIEW_H, cy)),
    };
  }

  /* =========================
     Render
  ========================= */
  // 결정적 해시 (타일별 고정 랜덤)
  function tileHash(x, y, salt = 0){
    let h = (x * 374761393 + y * 668265263 + salt * 144665) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  const GRASS_TONES = ['#94cf63', '#8fc95d', '#9bd56a'];
  const FLOWER_TONES = ['#ffffff', '#ffd95e', '#f49ac1', '#9db8ff'];

  function drawBG(cam, t){
    const x0 = Math.floor(cam.x / 16) * 16;
    const y0 = Math.floor(cam.y / 16) * 16;

    // ----- 잔디: 톤 변화 + 풀결 + 들꽃 -----
    for (let y = y0; y < cam.y + VIEW_H + 16; y += 16){
      for (let x = x0; x < cam.x + VIEW_W + 16; x += 16){
        const h1 = tileHash(x, y, 1);
        ctx.fillStyle = GRASS_TONES[(h1 * GRASS_TONES.length) | 0];
        ctx.fillRect(x, y, 16, 16);

        const h2 = tileHash(x, y, 2);
        if (h2 > 0.55){
          // 풀결 (짙은 초록 점 두어 개)
          ctx.fillStyle = '#7ab84f';
          const gx = x + 3 + ((h2 * 9) | 0);
          const gy = y + 3 + ((tileHash(x, y, 3) * 9) | 0);
          ctx.fillRect(gx, gy, 2, 1);
          ctx.fillRect(gx + 4, gy + 5, 1, 2);
        }
        if (h2 > 0.955){
          // 들꽃
          const fx = x + 4 + ((tileHash(x, y, 4) * 8) | 0);
          const fy = y + 4 + ((tileHash(x, y, 5) * 8) | 0);
          ctx.fillStyle = FLOWER_TONES[(tileHash(x, y, 6) * FLOWER_TONES.length) | 0];
          ctx.fillRect(fx - 1, fy, 3, 1);
          ctx.fillRect(fx, fy - 1, 1, 3);
          ctx.fillStyle = '#e8b832';
          ctx.fillRect(fx, fy, 1, 1);
        }
      }
    }

    // ----- 흙길 -----
    for (const r of roadRects){
      ctx.fillStyle = '#e6c68a';
      ctx.fillRect(r.x, r.y, r.w, r.h);

      // 가장자리: 짙은 테두리 + 밝은 윗단 (입체감)
      ctx.fillStyle = '#c8a060';
      if (r.w >= r.h){
        ctx.fillRect(r.x, r.y, r.w, 1);
        ctx.fillRect(r.x, r.y + r.h - 1, r.w, 1);
        ctx.fillStyle = '#f3dca8';
        ctx.fillRect(r.x, r.y + 1, r.w, 1);
      } else {
        ctx.fillRect(r.x, r.y, 1, r.h);
        ctx.fillRect(r.x + r.w - 1, r.y, 1, r.h);
        ctx.fillStyle = '#f3dca8';
        ctx.fillRect(r.x + 1, r.y, 1, r.h);
      }

      // 흙 얼룩/돌멩이 (해시 기반, 보이는 영역만)
      const sx0 = Math.max(r.x, Math.floor(cam.x / 8) * 8);
      const sx1 = Math.min(r.x + r.w, cam.x + VIEW_W + 8);
      const sy0 = Math.max(r.y, Math.floor(cam.y / 8) * 8);
      const sy1 = Math.min(r.y + r.h, cam.y + VIEW_H + 8);
      for (let sy = sy0; sy < sy1; sy += 8){
        for (let sx = sx0; sx < sx1; sx += 8){
          const hh = tileHash(sx, sy, 7);
          if (hh > 0.62){
            ctx.fillStyle = '#d8b878';
            ctx.fillRect(sx + ((hh * 5) | 0), sy + 2 + ((tileHash(sx, sy, 8) * 4) | 0), 2, 1);
          }
          if (hh > 0.93){
            ctx.fillStyle = '#cba968';
            ctx.fillRect(sx + 3, sy + 4, 2, 2);
          }
        }
      }
    }

    // ----- 연못 -----
    drawPond(t);
  }

  function drawPond(t){
    const p = pond;

    // 모래 테두리
    ctx.fillStyle = '#dfc98e';
    ctx.fillRect(p.x - 3, p.y - 3, p.w + 6, p.h + 6);
    ctx.fillStyle = '#c9ad6e';
    ctx.fillRect(p.x - 3, p.y - 3, p.w + 6, 1);
    ctx.fillRect(p.x - 3, p.y + p.h + 2, p.w + 6, 1);

    // 물
    ctx.fillStyle = '#4a92c8';
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = '#3a7cb0';
    ctx.fillRect(p.x, p.y, p.w, 2);
    ctx.fillRect(p.x, p.y, 2, p.h);
    ctx.fillStyle = '#5ea4d6';
    ctx.fillRect(p.x + 2, p.y + p.h - 3, p.w - 4, 2);

    // 물결 반짝임 (천천히 흐르는 애니메이션)
    const phase = (t * 10) | 0;
    for (let i = 0; i < 7; i++){
      const hx = tileHash(i, phase % 4, 9);
      const hy = tileHash(i, 11, 10);
      const wx = p.x + 6 + ((hx * (p.w - 16)) | 0);
      const wy = p.y + 5 + ((hy * (p.h - 12)) | 0);
      const shimmer = Math.sin(t * 2.2 + i * 1.7) * 0.5 + 0.5;
      ctx.fillStyle = `rgba(214, 238, 255, ${0.25 + shimmer * 0.35})`;
      ctx.fillRect(wx, wy, 5, 1);
    }

    // 연잎 + 연꽃
    const bobL = Math.round(Math.sin(t * 1.4) * 1);
    ctx.fillStyle = '#4e9a44';
    ctx.fillRect(p.x + 14, p.y + 34 + bobL, 9, 6);
    ctx.fillStyle = '#67b85a';
    ctx.fillRect(p.x + 15, p.y + 35 + bobL, 7, 4);
    ctx.fillStyle = '#f7b8d4';
    ctx.fillRect(p.x + 60, p.y + 14 - bobL, 4, 3);
    ctx.fillStyle = '#fff';
    ctx.fillRect(p.x + 61, p.y + 15 - bobL, 2, 1);
  }

  function drawPressSpace(cam){
    const n = nearestNode();
    if (!n) return;
    if (dlgNodeKey === n.key) return; // ✅ HTML 대화창이 떠 있으면 말풍선 생략

    const isTouch = touchControls && getComputedStyle(touchControls).display !== 'none';
    const text = isTouch ? 'Tap A' : 'Press Space';
    ctx.font = '10px monospace';
    const pad = 6;
    const tw = ctx.measureText(text).width;
    const bw = tw + pad * 2;
    const bh = 16;

    // 화면 안에 머물도록 카메라 기준 클램프
    const bx = Math.max(cam.x + 4, Math.min(cam.x + VIEW_W - bw - 4, player.x + player.w/2 - bw/2));
    const by = Math.max(cam.y + 4, player.y - 22);

    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillRect(Math.floor(bx + bw/2) - 2, by + bh, 4, 3);

    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.fillText(text, bx + pad, by + 11);
  }

  function drawPlayer(t){
    const footX = player.x + player.w / 2;
    const footY = player.y + player.h;

    // 그림자
    ctx.fillStyle = 'rgba(40, 60, 30, 0.28)';
    ctx.fillRect(Math.round(footX - 6), footY - 2, 12, 3);

    const dx = Math.round(footX - FRAME_W / 2);
    const dy = Math.round(footY - FRAME_H);

    if (!sheetReady()){
      // 시트 로딩 전 임시 도트 인형 (네모 방지)
      drawPixelRect(dx + 4, dy + 1, 8, 8, '#4a3322', 'rgba(0,0,0,0.3)');
      drawPixelRect(dx + 5, dy + 9, 6, 5, '#f06a85', 'rgba(0,0,0,0.3)');
      drawPixelRect(dx + 5, dy + 14, 6, 5, '#344058', 'rgba(0,0,0,0.3)');
      return;
    }

    const row = SHEET_ROW[facing] ?? 0;
    const sx = walkFrame * FRAME_W;
    const sy = row * FRAME_H;

    // 가만히 있을 때 숨쉬기 들썩임
    const idleBob = (walkFrame === 0 && Math.sin(t * 2.2) > 0.55) ? -1 : 0;

    if (facing === 'right'){
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(charSheet, sx, sy, FRAME_W, FRAME_H, -(dx + FRAME_W), dy + idleBob, FRAME_W, FRAME_H);
      ctx.restore();
    } else {
      ctx.drawImage(charSheet, sx, sy, FRAME_W, FRAME_H, dx, dy + idleBob, FRAME_W, FRAME_H);
    }
  }

  let lastRenderTs = performance.now();
  function render(){
    const now = performance.now();
    const dt = now - lastRenderTs;
    lastRenderTs = now;
    const t = now / 1000;

    if (scene === 'interior'){
      renderInterior(t);
    } else {
      renderTown(t, dt);
    }

    // ✅ 씬 전환 페이드
    if (transition){
      let a = 0;
      if (transition.phase === 'out') a = Math.min(1, transition.t / transition.dur);
      else a = 1 - Math.min(1, transition.t / transition.dur);
      ctx.fillStyle = `rgba(8, 10, 14, ${a})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }

    drawAllClear();
    updatePops(dt);
  }

  function renderTown(t, dt){
    const cam = getCamera();
    const near = nearestNode();

    ctx.clearRect(0, 0, VIEW_W, VIEW_H);

    ctx.save();
    ctx.translate(-cam.x, -cam.y);

    // 1) 바닥
    drawBG(cam, t);

    // 2) 평면 소품 (잔디/자갈)
    for (const p of props){
      if (p.type === 'grass') drawGrass(p, t);
      else if (p.type === 'pebble') drawPebble(p);
    }

    // 3) 입체 오브젝트 Y-소팅 (바위/나무/가로등/건물/기념비/플레이어)
    const drawables = [];

    for (const p of solidsProps){
      const sortY =
        p.type === 'tree' ? p.y + 18 :
        p.type === 'rock' ? p.y + 15 :
        p.y + 10; // lamp
      drawables.push({ sortY, draw: () => {
        if (p.type === 'rock') drawRock(p);
        else if (p.type === 'tree') drawTree(p, t);
        else if (p.type === 'lamp') drawLamp(p, t);
      }});
    }

    for (const n of nodes){
      const isNear = !!near && near.key === n.key;
      if (n.building){
        drawables.push({ sortY: n.building.bottom, draw: () => drawBuilding(n, t, isNear) });
      } else {
        drawables.push({ sortY: n.y + 5, draw: () => drawMonument(n, t, isNear) });
      }
    }

    drawables.push({ sortY: player.y + player.h, draw: () => drawPlayer(t) });

    drawables.sort((a, b) => a.sortY - b.sortY);
    for (const d of drawables) d.draw();

    // 4) 표지판(기념비 전용) + 팝 + 말풍선 (오브젝트 위에)
    for (const n of nodes){
      if (n.building) continue; // 건물은 지붕 명판으로 대체
      const isNear = !!near && near.key === n.key;
      drawSignboard(n, t, isNear);
    }
    drawPops();
    drawPressSpace(cam);

    ctx.restore();
  }

  /* =========================
     Update loop
  ========================= */
  let lastTs = performance.now();

  function update(ts){
    const dt = ts - lastTs;
    lastTs = ts;

    if (allClearBanner.active){
      allClearBanner.t += dt;
      if (allClearBanner.t >= allClearBanner.dur){
        allClearBanner.active = false;
      }
    }

    // ✅ 씬 전환 진행
    if (transition){
      transition.t += dt;
      if (transition.t >= transition.dur){
        const next = transition.next;
        transition = null;
        if (next) next();
      }
      // 전환 중엔 입력 무시
      footstepAudio.pause();
      return;
    }

    // ✅ 인테리어 씬
    if (scene === 'interior'){
      if (paused) return;
      updateInterior(dt, ts);
      return;
    }

    if (paused){
      player.vx = 0; player.vy = 0;
      walkTimer = 0; walkFrame = 0;

      footstepAudio.pause();
      footstepAudio.currentTime = 0;
      return;
    }

    player.vx = 0; player.vy = 0;

    const left  = keys.has('ArrowLeft');
    const right = keys.has('ArrowRight');
    const up    = keys.has('ArrowUp');
    const down  = keys.has('ArrowDown');

    if (left)  player.vx = -1;
    if (right) player.vx =  1;
    if (up)    player.vy = -1;
    if (down)  player.vy =  1;

    // ✅ 대각선 이동 속도 보정 (자연스러운 움직임)
    if (player.vx !== 0 && player.vy !== 0){
      player.vx *= 0.7071;
      player.vy *= 0.7071;
    }
    player.vx *= player.speed;
    player.vy *= player.speed;

    if (player.vx < 0) facing = 'left';
    else if (player.vx > 0) facing = 'right';
    else if (player.vy < 0) facing = 'up';
    else if (player.vy > 0) facing = 'down';

    const oldX = player.x;
    const oldY = player.y;

    // ✅ 축 분리 이동 + 충돌 체크 (벽에 비비면서 미끄러지게)
    const nx = Math.max(0, Math.min(WORLD_W - player.w, player.x + player.vx));
    if (!collides(nx, player.y)) player.x = nx;

    const ny = Math.max(0, Math.min(WORLD_H - player.h, player.y + player.vy));
    if (!collides(player.x, ny)) player.y = ny;

    const moved = (player.x !== oldX || player.y !== oldY);

    // ✅ 노드에서 멀어지면 대화창 자동 닫기
    if (dlgNodeKey){
      const nn = nearestNode();
      if (!nn || nn.key !== dlgNodeKey) hideDialogue();
    }

    // ✅ 발소리: 실제 이동일 때만
    if (moved){
      if (ts - lastStepTime >= STEP_INTERVAL) {
        try {
          footstepAudio.currentTime = 0;
          footstepAudio.play();
        } catch (e) {}
        lastStepTime = ts;
      }
    } else {
      footstepAudio.pause();
      footstepAudio.currentTime = 0;
    }

    // ✅ 걷기 사이클: 모든 방향에서 4프레임 애니메이션
    if (moved){
      walkTimer += dt;
      if (walkTimer >= WALK_INTERVAL){
        walkTimer = 0;
        walkFrame = (walkFrame + 1) % 4;
      }
    } else {
      walkTimer = 0;
      walkFrame = 0;
    }
  }

  function loop(ts){
    update(ts);
    render();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  /* =========================================================
     ✅ 건물 내부(Interior) 씬 + NPC 대화 시스템
  ========================================================= */
  let npcState = 'idle';   // 'idle' | 'hello' | 'menu' | 'short' | 'bye'
  let npcLine = '';

  function enterInterior(key){
    interiorKey = key;
    hideDialogue();
    spawnPop({ x: player.x, y: player.y }); // 입장 팝
    playSfxForKey(key);

    transition = { phase:'out', t:0, dur:260, next:() => {
      scene = 'interior';
      // 방 입구(아래 문) 앞에 배치
      roomPlayer.x = ROOM_W/2 - roomPlayer.w/2;
      roomPlayer.y = ROOM_H - 30;
      facing = 'up';
      npcState = 'idle';
      markVisited(key);
      transition = { phase:'in', t:0, dur:260, next:null };
    }};
  }

  function exitInterior(){
    hideNpcDialogue();
    transition = { phase:'out', t:0, dur:260, next:() => {
      scene = 'town';
      const wasKey = interiorKey;
      interiorKey = null;
      npcState = 'idle';
      // 마을의 해당 건물 문 앞으로 복귀
      const n = nodes.find(nn => nn.key === wasKey);
      if (n){ player.x = n.x - player.w/2; player.y = n.y + 6; facing = 'down'; }
      transition = { phase:'in', t:0, dur:260, next:null };
    }};
  }

  function nearNpc(){
    const cx = roomPlayer.x + roomPlayer.w/2;
    const cy = roomPlayer.y + roomPlayer.h/2;
    return Math.hypot((npc.x+npc.w/2) - cx, (npc.y+npc.h/2) - cy) < 30;
  }

  function showNpcDialogue(name, text, cta='▼'){
    if (!npcDialogue) return;
    npcLine = text;
    if (npcNameEl) npcNameEl.textContent = name;
    if (npcTextEl) npcTextEl.textContent = text;
    if (npcCtaEl) npcCtaEl.textContent = cta;
    npcDialogue.classList.add('on');
    npcDialogue.setAttribute('aria-hidden','false');
  }

  function hideNpcDialogue(){
    if (!npcDialogue) return;
    npcDialogue.classList.remove('on');
    npcDialogue.classList.remove('menu-on');
    npcDialogue.setAttribute('aria-hidden','true');
    if (npcChoicesEl) npcChoicesEl.innerHTML = '';
  }

  function showNpcMenu(){
    if (!npcChoicesEl) return;
    const choices = [
      { label:'📖 자세한 이야기', act:'detail' },
      { label:'💬 핵심만 짧게',   act:'short' },
      { label:'👋 다음에 올게요',  act:'bye' },
    ];
    npcChoicesEl.innerHTML = choices.map((c,i) =>
      `<button type="button" class="npc-choice" data-act="${c.act}" data-i="${i}">${c.label}</button>`
    ).join('');
    npcChoicesEl.querySelectorAll('.npc-choice').forEach(btn => {
      btn.addEventListener('click', () => chooseNpc(btn.getAttribute('data-act')));
    });
    npcDialogue.classList.add('menu-on');
    npcMenuIdx = 0;
    highlightChoice();
  }

  let npcMenuIdx = 0;
  function highlightChoice(){
    if (!npcChoicesEl) return;
    npcChoicesEl.querySelectorAll('.npc-choice').forEach((b,i) => {
      b.classList.toggle('sel', i === npcMenuIdx);
    });
  }

  function chooseNpc(act){
    const d = NPC_DATA[interiorKey];
    if (!d) return;
    if (act === 'detail'){
      hideNpcDialogue();
      npcState = 'idle';
      playSfxForKey(interiorKey);
      openInfo(interiorKey);  // 기존 상세 패널 재사용
    } else if (act === 'short'){
      npcState = 'short';
      npcDialogue.classList.remove('menu-on');
      if (npcChoicesEl) npcChoicesEl.innerHTML = '';
      showNpcDialogue(d.name, d.short, '▼ 더 듣기');
      playTone({ type:'sine', freq: 640, dur:0.05, gain:0.05 });
    } else if (act === 'bye'){
      npcState = 'bye';
      npcDialogue.classList.remove('menu-on');
      if (npcChoicesEl) npcChoicesEl.innerHTML = '';
      showNpcDialogue(d.name, d.bye, '▼ 닫기');
      playTone({ type:'sine', freq: 560, dur:0.06, gain:0.05 });
    }
  }

  // NPC와 상호작용 (Space/A/탭) — 대화 진행
  function talkNpc(){
    const d = NPC_DATA[interiorKey];
    if (!d) return;

    if (npcState === 'idle'){
      npcState = 'hello';
      showNpcDialogue(d.name, d.hello, '▼');
      playTone({ type:'triangle', freq: 720, dur:0.05, gain:0.06 });
    } else if (npcState === 'hello'){
      npcState = 'menu';
      showNpcDialogue(d.name, '무엇이 궁금하세요?', '');
      showNpcMenu();
    } else if (npcState === 'short'){
      // 짧게 듣고 다시 메뉴로
      npcState = 'menu';
      showNpcDialogue(d.name, '또 궁금한 게 있나요?', '');
      showNpcMenu();
    } else if (npcState === 'bye'){
      hideNpcDialogue();
      npcState = 'idle';
    }
  }

  /* =========================================================
     인테리어 렌더링
  ========================================================= */
  function interiorCam(){
    // 방이 화면보다 작으면 가운데 정렬
    return {
      x: Math.round(ROOM_W/2 - VIEW_W/2),
      y: Math.round(ROOM_H/2 - VIEW_H/2),
    };
  }

  function roomFurniture(key){
    // 방마다 다른 소품 (테이블/책장/액자 등) — [x,y,w,h,fill,edge]
    const c = nodeColor(key);
    switch(key){
      case 'school': return [
        [24,40,30,16,'#caa15e','#8c6a2b'],   // 교탁
        [150,36,26,22,'#3a5a3a','#244024'],  // 칠판
      ];
      case 'company': return [
        [30,44,40,18,'#8a8f98','#5a5f68'],   // 책상
        [140,40,30,20,'#7aa2f7','#3b5fb3'],  // 모니터 보드
      ];
      case 'training': return [
        [28,42,34,18,'#a98ed6','#6f50b4'],   // 강의 테이블
        [146,38,28,20,'#bb9af7','#6f50b4'],  // 화이트보드
      ];
      case 'award': return [
        [150,40,26,22,'#f7d24a','#a8842b'],  // 트로피 진열장
        [28,44,30,16,'#c4504f','#7a2e2d'],   // 레드 카펫 단상
      ];
      case 'cert': return [
        [22,30,22,32,'#8a6a44','#5a432a'],   // 책장
        [150,30,22,32,'#8a6a44','#5a432a'],  // 책장
      ];
      case 'lang': return [
        [30,42,34,18,'#7fbf8f','#4f7a2f'],   // 테이블
        [144,36,30,22,'#9ece6a','#4f7a2f'],  // 세계지도 보드
      ];
      default: return [];
    }
  }

  function drawNpc(t){
    const footX = npc.x + npc.w/2;
    const footY = npc.y + npc.h;

    // 그림자
    ctx.fillStyle = 'rgba(40,40,40,0.22)';
    ctx.fillRect(Math.round(footX-6), footY-2, 12, 3);

    const dx = Math.round(footX - 8);
    const dy = Math.round(footY - 20);
    const col = NPC_COL[interiorKey] ?? 0;
    const blink = (Math.sin(t*1.3) > 0.92) ? 1 : 0;

    if (npcSheetReady()){
      ctx.drawImage(npcSheet, col*16, blink*20, 16, 20, dx, dy, 16, 20);
    } else {
      drawPixelRect(dx+4, dy+1, 8, 8, '#5a4030', 'rgba(0,0,0,0.3)');
      drawPixelRect(dx+4, dy+9, 8, 6, nodeColor(interiorKey).main, 'rgba(0,0,0,0.3)');
    }

    // 머리 위 느낌표/말풍선 (대화 전)
    if (npcState === 'idle'){
      const bob = Math.round(Math.sin(t*3)*1);
      const ix = Math.round(footX);
      const iy = dy - 8 + bob;
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.fillRect(ix-4, iy-7, 9, 9);
      ctx.fillStyle = '#3a8a4a';
      ctx.fillRect(ix-1, iy-6, 2, 5);
      ctx.fillRect(ix-1, iy, 2, 2);
    }
  }

  function drawInteriorPlayer(t){
    const footX = roomPlayer.x + roomPlayer.w/2;
    const footY = roomPlayer.y + roomPlayer.h;

    ctx.fillStyle = 'rgba(40,40,40,0.22)';
    ctx.fillRect(Math.round(footX-6), footY-2, 12, 3);

    const dx = Math.round(footX - FRAME_W/2);
    const dy = Math.round(footY - FRAME_H);
    if (!sheetReady()){
      drawPixelRect(dx+4, dy+1, 8, 8, '#4a3322', null);
      return;
    }
    const row = SHEET_ROW[facing] ?? 0;
    const sx = walkFrame * FRAME_W;
    const sy = row * FRAME_H;
    if (facing === 'right'){
      ctx.save(); ctx.scale(-1,1);
      ctx.drawImage(charSheet, sx, sy, FRAME_W, FRAME_H, -(dx+FRAME_W), dy, FRAME_W, FRAME_H);
      ctx.restore();
    } else {
      ctx.drawImage(charSheet, sx, sy, FRAME_W, FRAME_H, dx, dy, FRAME_W, FRAME_H);
    }
  }

  function renderInterior(t){
    if (!interiorKey){ ctx.fillStyle = '#1a1410'; ctx.fillRect(0,0,VIEW_W,VIEW_H); return; }
    const cam = interiorCam();
    const c = nodeColor(interiorKey);

    // 방 밖 여백 (PC 넓은 화면): 어두운 배경 + 비네트
    ctx.fillStyle = '#1a1410';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    ctx.save();
    ctx.translate(-cam.x, -cam.y);

    // 방 바깥 테두리 그림자 (입체감)
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(-6, -6, ROOM_W + 12, ROOM_H + 12);

    // 바닥 (나무마루 — 따뜻한 톤)
    for (let y = 28; y < ROOM_H; y += 8){
      for (let x = 0; x < ROOM_W; x += 16){
        const odd = ((x + y) / 8) % 2 === 0;
        ctx.fillStyle = odd ? '#caa770' : '#c09f66';
        ctx.fillRect(x, y, 16, 8);
        ctx.fillStyle = 'rgba(120,90,50,0.18)';
        ctx.fillRect(x, y, 16, 1);
      }
    }
    // 윗벽 (테마색)
    ctx.fillStyle = c.main;
    ctx.fillRect(0, 0, ROOM_W, 28);
    ctx.fillStyle = c.edge;
    ctx.fillRect(0, 26, ROOM_W, 4);
    // 벽지 무늬
    for (let x = 8; x < ROOM_W; x += 24){
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(x, 8, 2, 2);
      ctx.fillRect(x+10, 16, 2, 2);
    }
    // 창문 2개
    for (const wx of [40, 130]){
      drawPixelRect(wx, 6, 26, 16, '#bfe3f2', 'rgba(0,0,0,0.3)');
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillRect(wx+2, 8, 4, 12);
      ctx.fillStyle = c.edge;
      ctx.fillRect(wx+12, 6, 2, 16);
    }

    // 가구
    for (const f of roomFurniture(interiorKey)){
      drawPixelRect(f[0], f[1], f[2], f[3], f[4], f[5]);
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fillRect(f[0], f[1], f[2], 2);
    }

    // 출구 매트 (아래 중앙)
    drawPixelRect(ROOM_W/2 - 14, ROOM_H - 10, 28, 8, '#b5a06a', '#8a7a48');
    ctx.fillStyle = '#7a6a40';
    ctx.font = '7px monospace';
    ctx.fillText('EXIT', ROOM_W/2 - 9, ROOM_H - 4);

    // Y-소팅: NPC vs 플레이어
    const order = [
      { y: npc.y + npc.h, draw: () => drawNpc(t) },
      { y: roomPlayer.y + roomPlayer.h, draw: () => drawInteriorPlayer(t) },
    ].sort((a,b) => a.y - b.y);
    order.forEach(o => o.draw());

    // 상호작용 힌트
    if (npcState === 'idle' && nearNpc()){
      const isTouch = touchControls && getComputedStyle(touchControls).display !== 'none';
      const txt = isTouch ? 'Tap A' : 'Space';
      ctx.font = '8px monospace';
      const tw = ctx.measureText(txt).width;
      const bx = npc.x + npc.w/2 - tw/2 - 4;
      const by = npc.y - 16;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(bx, by, tw + 8, 12);
      ctx.fillStyle = '#fff';
      ctx.fillText(txt, bx + 4, by + 9);
    }

    ctx.restore();
  }

  function updateInterior(dt, ts){
    // 대화/메뉴 중엔 이동 금지
    if (npcState !== 'idle'){
      walkFrame = 0; walkTimer = 0;
      return;
    }

    let vx = 0, vy = 0;
    if (keys.has('ArrowLeft')) vx = -1;
    if (keys.has('ArrowRight')) vx = 1;
    if (keys.has('ArrowUp')) vy = -1;
    if (keys.has('ArrowDown')) vy = 1;
    if (vx && vy){ vx *= 0.7071; vy *= 0.7071; }
    vx *= 1.2; vy *= 1.2;

    if (vx < 0) facing = 'left';
    else if (vx > 0) facing = 'right';
    else if (vy < 0) facing = 'up';
    else if (vy > 0) facing = 'down';

    const oldX = roomPlayer.x, oldY = roomPlayer.y;
    roomPlayer.x = Math.max(6, Math.min(ROOM_W - roomPlayer.w - 6, roomPlayer.x + vx));
    roomPlayer.y = Math.max(30, Math.min(ROOM_H - roomPlayer.h - 4, roomPlayer.y + vy));

    // NPC 충돌(밀어내기)
    if (rectsOverlap(roomPlayer.x, roomPlayer.y, roomPlayer.w, roomPlayer.h, npc.x-2, npc.y-2, npc.w+4, npc.h+6)){
      roomPlayer.x = oldX; roomPlayer.y = oldY;
    }

    const moved = (roomPlayer.x !== oldX || roomPlayer.y !== oldY);

    // 출구 도달 → 마을로
    if (roomPlayer.y >= ROOM_H - roomPlayer.h - 5 &&
        Math.abs((roomPlayer.x + roomPlayer.w/2) - ROOM_W/2) < 16 &&
        keys.has('ArrowDown')){
      exitInterior();
      return;
    }

    if (moved){
      if (ts - lastStepTime >= STEP_INTERVAL){
        try { footstepAudio.currentTime = 0; footstepAudio.play(); } catch(e){}
        lastStepTime = ts;
      }
      walkTimer += dt;
      if (walkTimer >= WALK_INTERVAL){ walkTimer = 0; walkFrame = (walkFrame+1)%4; }
    } else {
      walkTimer = 0; walkFrame = 0;
    }
  }

  /* =========================
     Interact (Space / A버튼 / 탭 공용)
  ========================= */
  function interactNearest(){
    if (!layer.classList.contains('on')) return;

    // 인트로가 떠 있으면 = 게임 시작
    if (introModal && introModal.classList.contains('on')){
      startGame();
      playTone({ type:'sine', freq: 660, dur:0.06, gain:0.07 });
      return;
    }
    if (transition) return;

    // ✅ 건물 내부: NPC와 대화
    if (scene === 'interior'){
      if (npcState !== 'idle' || nearNpc()){
        talkNpc();
      }
      return;
    }

    if (paused) return;

    const n = nearestNode();
    if (!n){ hideDialogue(); return; }

    const dx = n.x - player.x;
    const dy = n.y - player.y;
    if (Math.abs(dx) > Math.abs(dy)) facing = dx > 0 ? 'right' : 'left';
    else facing = dy > 0 ? 'down' : 'up';

    // 연혁 기념비는 바로 패널 (내부 없음)
    if (n.key === 'timeline'){
      if (dlgNodeKey !== n.key){
        showDialogue(n);
        playTone({ type:'square', freq: 980, dur:0.04, gain:0.05, filter:{type:'highpass', freq:700, q:0.7} });
        return;
      }
      hideDialogue();
      spawnPop(n);
      paused = true;
      keys.clear();
      playSfxForKey('timeline');
      openModal(timelineModal);
      return;
    }

    // ✅ 1차: 대화창으로 한 줄 소개 / 2차: 건물 내부 입장
    if (dlgNodeKey !== n.key){
      showDialogue(n);
      playTone({ type:'square', freq: 980, dur:0.04, gain:0.05, filter:{type:'highpass', freq:700, q:0.7} });
      return;
    }

    enterInterior(n.key);
  }

  /* =========================
     Keys
  ========================= */
  const ARROWS = ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'];

  window.addEventListener('keydown', (e) => {
    ensureAudio();

    // 게임 중 화살표/스페이스로 페이지가 스크롤되지 않게
    if (ARROWS.includes(e.key) || e.key === ' '){
      if (layer.classList.contains('on')) e.preventDefault();
    }

    keys.add(e.key);

    if (!bgmIsRunning) startBgm();

    if (playStartTs === null && !paused){
      playStartTs = performance.now();
    }

    if (e.key === ' '){
      // ✅ NPC 메뉴가 떠 있으면 선택
      if (scene === 'interior' && npcState === 'menu'){
        const sel = npcChoicesEl?.querySelector('.npc-choice.sel');
        if (sel){ chooseNpc(sel.getAttribute('data-act')); return; }
      }
      interactNearest();
      return;
    }

    if (e.key === 'Enter'){
      if (scene === 'interior' && npcState === 'menu'){
        const sel = npcChoicesEl?.querySelector('.npc-choice.sel');
        if (sel){ chooseNpc(sel.getAttribute('data-act')); return; }
      }
    }

    // ✅ NPC 메뉴 위/아래 탐색
    if (scene === 'interior' && npcState === 'menu' && (e.key === 'ArrowUp' || e.key === 'ArrowDown')){
      const n = npcChoicesEl ? npcChoicesEl.querySelectorAll('.npc-choice').length : 0;
      if (n > 0){
        npcMenuIdx = (npcMenuIdx + (e.key === 'ArrowDown' ? 1 : -1) + n) % n;
        highlightChoice();
        playTone({ type:'square', freq: 880, dur:0.03, gain:0.04 });
      }
      return;
    }

    if (e.key === 'Escape'){
      if (scene === 'interior'){
        if (npcState !== 'idle'){ hideNpcDialogue(); npcState = 'idle'; return; }
        exitInterior(); return;
      }
      if (dlgNodeKey){ hideDialogue(); return; }
      if (infoModal?.classList.contains('on')) { closeModal(infoModal); playTone({type:'sine', freq:520, dur:0.05, gain:0.06}); return; }
      if (timelineModal?.classList.contains('on')) { closeModal(timelineModal); playTone({type:'sine', freq:520, dur:0.05, gain:0.06}); return; }
      if (outroModal?.classList.contains('on')) { closeModal(outroModal); playTone({type:'sine', freq:520, dur:0.05, gain:0.06}); return; }
      if (introModal?.classList.contains('on')) return;

      openOutro();
    }
  });

  window.addEventListener('keyup', (e) => keys.delete(e.key));

  /* =========================
     ✅ Mobile: 가상 D-pad + A버튼 + 캔버스 탭
  ========================= */
  function bindHoldButton(el, key){
    if (!el) return;
    const down = (e) => {
      e.preventDefault();
      ensureAudio();
      if (!bgmIsRunning) startBgm();
      keys.add(key);
      el.classList.add('pressed');
      if (playStartTs === null && !paused) playStartTs = performance.now();
    };
    const up = (e) => {
      if (e) e.preventDefault();
      keys.delete(key);
      el.classList.remove('pressed');
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointerleave', () => up());
    el.addEventListener('pointercancel', () => up());
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  if (touchControls){
    touchControls.querySelectorAll('[data-dir]').forEach(btn => {
      bindHoldButton(btn, btn.getAttribute('data-dir'));
    });
  }

  if (actBtn){
    actBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      ensureAudio();
      if (!bgmIsRunning) startBgm();
      interactNearest();
    });
    actBtn.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  // 캔버스 탭/클릭: 마을=노드 상호작용 / 내부=NPC 대화
  canvas.addEventListener('click', (e) => {
    if (transition) return;

    if (scene === 'interior'){
      if (npcState === 'menu') return; // 메뉴는 버튼 탭으로
      if (npcState !== 'idle' || nearNpc()) talkNpc();
      return;
    }

    if (paused) return;
    const rect = canvas.getBoundingClientRect();
    const cam = getCamera();
    const wx = (e.clientX - rect.left) * (VIEW_W / rect.width) + cam.x;
    const wy = (e.clientY - rect.top) * (VIEW_H / rect.height) + cam.y;

    const n = nearestNode();
    if (!n) return;
    if (Math.hypot(wx - n.x, wy - n.y) < 30){
      interactNearest();
    }
  });

  // ✅ 대화창 자체를 탭/클릭해도 들어가기
  if (dialogueBar){
    dialogueBar.addEventListener('click', (e) => {
      e.preventDefault();
      if (dlgNodeKey) interactNearest();
    });
  }
});
