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
    const TARGET = 320; // 긴 쪽이 보여줄 월드 픽셀 수 (도트 크기 유지)
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
  ========================= */
  const player = { x: 72, y: 176, w: 12, h: 12, vx: 0, vy: 0, speed: 1.35 };
  const DRAW_W = 32, DRAW_H = 32;

  const SPRITE_BASE = 'assets/css/images/';
  const sprites = {
    front: new Image(),
    back: new Image(),
    side1: new Image(),
    side2: new Image(),
  };

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

  // =========================================================
  // ✅ Typewriter: 남은 시간(durationMs) 안에 항상 끝내기 (rAF 기반)
  // =========================================================
  function runTypewriter({ target, plain, durationMs = 2000, onDone, isAlive }){
    const text = plain || '';
    const total = text.length;

    if (!target || total === 0){
      onDone && onDone();
      return;
    }

    const start = performance.now();

    function frame(now){
      if (isAlive && !isAlive()) return;

      const t = Math.min(1, (now - start) / Math.max(1, durationMs));
      const count = Math.min(total, Math.max(1, Math.floor(total * t)));
      target.textContent = text.slice(0, count);

      if (t >= 1){
        target.textContent = text;
        onDone && onDone();
        return;
      }
      requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
  }

  function toPlainTextFromHtml(html){
    return (html || '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/br>/gi, '\n')
      .replace(/<[^>]*>/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]{2,}/g, ' ')
      .trim();
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

    const html = data.body;
    infoModalBody.innerHTML = `<div class="typewrap"><div id="typeTarget"></div></div>`;
    const target = infoModalBody.querySelector('#typeTarget');

    // ✅ 효과음/방문 처리 먼저
    playSfxForKey(key);
    markVisited(key);

    // ✅ "팝업 오픈 애니메이션 포함 2초" 만들기
    const TOTAL_MS = 2000;
    const openAnimMs = MODAL_OPEN_ANIM_MS;

    await openModal(infoModal, { openAnimMs });

    if (!infoModal.classList.contains('on')) return;

    if (!target){
      infoModalBody.innerHTML = html;
      return;
    }

    const typeMs = Math.max(120, TOTAL_MS - openAnimMs);

    const plain = toPlainTextFromHtml(html);
    target.textContent = '';

    runTypewriter({
      target,
      plain,
      durationMs: typeMs,
      isAlive: () => infoModal.classList.contains('on'),
      onDone: () => {
        if (!infoModal.classList.contains('on')) return;
        infoModalBody.innerHTML = html; // 완료 후 원본 HTML로 교체
      }
    });
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
    exitBtn.addEventListener('click', openOutro);
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

      const roll = rng();
      if (roll < 0.58){
        props.push({ type:'grass', x, y, v: (rng()*3)|0 });
      } else if (roll < 0.76){
        solidsProps.push({ type:'rock', x, y, v: (rng()*3)|0 });
      } else if (roll < 0.92){
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

    // 입체 소품
    for (const p of solidsProps){
      if (p.type === 'rock') solids.push({ x: p.x + 6, y: p.y + 10, w: 8, h: 5 });
      else if (p.type === 'tree') solids.push({ x: p.x + 4, y: p.y + 12, w: 8, h: 6 });
      else if (p.type === 'lamp') solids.push({ x: p.x - 1, y: p.y + 5, w: 4, h: 5 });
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

    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(ox, oy+4, 10, 2);

    ctx.fillStyle = 'rgba(158, 206, 106, 0.85)';
    ctx.fillRect(ox+1, oy+1+sway, 1, 5);
    ctx.fillRect(ox+4, oy-0+sway, 1, 6);
    ctx.fillRect(ox+7, oy+2+sway, 1, 4);

    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(ox+4, oy+0+sway, 1, 1);
  }

  function drawRock(p){
    const ox = p.x + 5;
    const oy = p.y + 9;

    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(ox, oy+4, 10, 2);

    drawPixelRect(ox+1, oy, 8, 6, 'rgba(200,210,220,0.75)', 'rgba(0,0,0,0.35)');
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.fillRect(ox+2, oy+1, 2, 1);
  }

  function drawTree(p, t){
    const x = p.x, y = p.y;
    const sway = Math.round(Math.sin(t*1.6 + x*0.05) * 1);

    // 그림자
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(x+3, y+16, 12, 3);

    // 기둥
    drawPixelRect(x+6, y+9, 4, 8, 'rgba(122,90,52,0.95)', 'rgba(0,0,0,0.35)');

    // 잎 (2단)
    drawPixelRect(x+1+sway, y+2, 14, 9, 'rgba(78,140,72,0.95)', 'rgba(0,0,0,0.35)');
    drawPixelRect(x+3+sway, y-2, 10, 6, 'rgba(98,170,86,0.95)', 'rgba(0,0,0,0.30)');
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.fillRect(x+4+sway, y-1, 3, 2);
  }

  function drawPebble(p){
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(p.x + 6, p.y + 2, 2, 2);
  }

  function drawLamp(p, t){
    const x = Math.round(p.x);
    const y = Math.round(p.y);

    drawPixelRect(x, y, 2, 10, 'rgba(180,170,140,0.55)', 'rgba(0,0,0,0.30)');
    drawPixelRect(x-1, y-2, 4, 3, 'rgba(200,190,160,0.55)', 'rgba(0,0,0,0.30)');

    const glow = 0.10 + (Math.sin(t*3 + x*0.1)*0.04);
    ctx.fillStyle = `rgba(255, 240, 180, ${glow})`;
    ctx.fillRect(x-6, y+1, 14, 10);

    ctx.fillStyle = 'rgba(255, 245, 210, 0.35)';
    ctx.fillRect(x, y-1, 2, 2);
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

    // 그림자
    ctx.fillStyle = 'rgba(0,0,0,0.30)';
    ctx.fillRect(x + 3, yBottom - 2, w, 4);

    // 벽
    drawPixelRect(x, yWall, w, hWall, 'rgba(214,203,180,0.96)', 'rgba(0,0,0,0.35)');
    ctx.fillStyle = 'rgba(0,0,0,0.10)';
    ctx.fillRect(x + 1, yBottom - 4, w - 2, 3);

    // 지붕 (노드 색)
    drawPixelRect(x - 3, yRoof, w + 6, hRoof, c.main, c.edge);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(x - 1, yRoof + 2, w + 2, 2);
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(x - 3, yRoof + hRoof - 3, w + 6, 3);

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
  function drawBG(cam){
    const x0 = Math.floor(cam.x / 16) * 16;
    const y0 = Math.floor(cam.y / 16) * 16;

    for (let y = y0; y < cam.y + VIEW_H + 16; y += 16){
      for (let x = x0; x < cam.x + VIEW_W + 16; x += 16){
        const even = ((x + y) / 16) % 2 === 0;
        ctx.fillStyle = even ? '#0f1a14' : '#0d1712';
        ctx.fillRect(x, y, 16, 16);
      }
    }

    // 길
    for (const r of roadRects){
      ctx.fillStyle = '#2a3646';
      ctx.fillRect(r.x, r.y, r.w, r.h);
    }
    // 길 가장자리 하이라이트
    for (const r of roadRects){
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      if (r.w >= r.h){
        ctx.fillRect(r.x, r.y, r.w, 1);
        ctx.fillRect(r.x, r.y + r.h - 1, r.w, 1);
      } else {
        ctx.fillRect(r.x, r.y, 1, r.h);
        ctx.fillRect(r.x + r.w - 1, r.y, 1, r.h);
      }
    }
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

  function drawPlayer(){
    if (!allSpritesReady()){
      ctx.fillStyle = '#f7768e';
      ctx.fillRect(player.x, player.y, player.w, player.h);
      return;
    }

    const dx = Math.round(player.x - (DRAW_W - player.w)/2);
    const dy = Math.round(player.y - (DRAW_H - player.h)/2 - 6); // 발 위치 보정

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

  let lastRenderTs = performance.now();
  function render(){
    const now = performance.now();
    const dt = now - lastRenderTs;
    lastRenderTs = now;

    const cam = getCamera();
    const t = now / 1000;
    const near = nearestNode();

    ctx.clearRect(0, 0, VIEW_W, VIEW_H);

    ctx.save();
    ctx.translate(-cam.x, -cam.y);

    // 1) 바닥
    drawBG(cam);

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

    drawables.push({ sortY: player.y + player.h, draw: drawPlayer });

    drawables.sort((a, b) => a.sortY - b.sortY);
    for (const d of drawables) d.draw();

    // 4) 표지판 + 팝 + 말풍선 (오브젝트 위에)
    for (const n of nodes){
      const isNear = !!near && near.key === n.key;
      drawSignboard(n, t, isNear);
    }
    drawPops();
    drawPressSpace(cam);

    ctx.restore();

    // 5) 스크린 고정 UI
    drawAllClear();
    updatePops(dt);
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

    if (left)  player.vx = -player.speed;
    if (right) player.vx =  player.speed;
    if (up)    player.vy = -player.speed;
    if (down)  player.vy =  player.speed;

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

    // ✅ 걷기 프레임도 실제 이동일 때만
    if (moved && (facing === 'left' || facing === 'right')){
      walkTimer += dt;
      if (walkTimer >= WALK_INTERVAL){
        walkTimer = 0;
        walkFrame = (walkFrame === 0) ? 1 : 0;
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
    if (paused) return;

    const n = nearestNode();
    if (!n){ hideDialogue(); return; }

    const dx = n.x - player.x;
    const dy = n.y - player.y;
    if (Math.abs(dx) > Math.abs(dy)) facing = dx > 0 ? 'right' : 'left';
    else facing = dy > 0 ? 'down' : 'up';

    // ✅ 1차: 대화창으로 한 줄 소개 / 2차: 상세 시트 진입
    if (dlgNodeKey !== n.key){
      showDialogue(n);
      playTone({ type:'square', freq: 980, dur:0.04, gain:0.05, filter:{type:'highpass', freq:700, q:0.7} });
      return;
    }

    hideDialogue();
    spawnPop(n);
    paused = true;
    keys.clear();

    if (n.key === 'timeline'){
      playSfxForKey('timeline');
      openModal(timelineModal);
    } else {
      openInfo(n.key);
    }
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
      interactNearest();
      return;
    }

    if (e.key === 'Escape'){
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

  // 캔버스 탭/클릭: 가까운 노드를 탭하면 상호작용
  canvas.addEventListener('click', (e) => {
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
