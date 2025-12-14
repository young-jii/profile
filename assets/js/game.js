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

  const W = canvas.width;
  const H = canvas.height;

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
  const player = { x: 60, y: 92, w: 12, h: 12, vx: 0, vy: 0, speed: 1.35 };
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
     Map Nodes
  ========================= */
  const nodes = [
    { key:'school',   label:'학교',   x: 55,  y: 55  },
    { key:'training', label:'교육',   x: 55,  y: 125 },
    { key:'award',    label:'수상',   x: 110, y: 125 },
    { key:'company',  label:'경력',   x: 160, y: 90  },
    { key:'lang',     label:'언어',   x: 250, y: 55  },
    { key:'cert',     label:'자격증', x: 250, y: 125 },
    { key:'timeline', label:'연혁',   x: 295, y: 90  },
  ];

  const VISIT_KEYS = ['school','training','company','award','cert','lang'];
  const visited = new Set();
  let clearPlayed = false;

  /* =========================
     ALL CLEAR Banner (canvas)
  ========================= */
  let allClearBanner = { active:false, t:0, dur:1000 };

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

    const x = Math.round(W / 2 - bw / 2);
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

    if (!clearPlayed && before !== visited.size && visited.size === VISIT_KEYS.length){
      clearPlayed = true;
      playClearSfx();
      allClearBanner.active = true;
      allClearBanner.t = 0;
      bgmTranspose = 2;
    }
  }

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

  /* =========================
     Content (모달 내용)
  ========================= */
  const CONTENT = {
    school: {
      title: '학교',
      body: `
      <div class="k-card">
        <p><b>한 줄 요약</b> </br>국어국문학 전공으로 ‘이야기/문장’을 다루는 힘을 키우고, 이를 ‘서비스/데이터’로 확장할 기반을 만들었습니다.</p>
      </div>

      <div class="k-card">
        <p><b>학력</b></p>
        <ul>
          <li><b>경희대학교 국어국문학과</b> (GPA 3.92/4.5)</li>
          <li>텍스트와 정보의 ‘기준’을 정의하고, 그 기준에 따라 품질을 관리하는 사고 방식을 학문적으로 훈련</li>
        </ul>
      </div>

      <div class="k-card">
        <p><b>이 시기에 길러진 역량</b></p>
        <ul>
          <li><b>기획 역량</b>: 전달 목적과 핵심 메시지를 먼저 설정한 뒤, 전체 구조를 설계하는 방식 훈련</li>
          <li><b>구조화 능력</b>: 복잡하고 산발적인 정보를 기준·정의·목차 체계로 정리해 이해도를 높이도록 학습</li>
          <li><b>사용자 관점</b>: 읽는 사람과 사용하는 사람의 흐름을 고려해, 혼란 지점을 사전에 줄이려는 접근 방식 훈련</li>
        </ul>
      </div>

      <div class="k-card">
        <p><b>업무 관점으로의 확장</b></p>
        <p>
          이 시기의 경험을 통해, 좋은 콘텐츠와 서비스는 항상
          ‘만드는 사람’이 아닌 ‘사용하는 사람’을 기준으로 설계되어야 한다는 관점을 갖게 되었습니다.<br/><br/>
          이후의 커리어에서도 저는
          <b>기준을 정의하고</b> → <b>업무와 정보의 흐름을 구조화하며</b> → <b>오류와 불확실성을 줄이는 방식</b>으로
          일관되게 업무를 수행해 왔습니다.
        </p>
      </div>
      `
    },

    training: {
      title: '교육',
      body: `
      <div class="k-card">
        <p>
        <b>한 줄 요약</b>  
        </br>이론 중심의 학습을 넘어, 데이터를 통해 문제를 정의하고 근거를 만드는 업무 방식으로 확장한 시기였습니다.
        </p>
      </div>

      <div class="k-card">
        <p><b>주요 과정</b></p>
        <ul>
          <li><b>협업 필터링/자연어처리 기반 추천 분석 시스템 제작</b> (2023.06~2023.12)</li>
          <li><b>고객경험 데이터 기반 데이터 비즈니스 분석</b> (2024.02~2024.07)</li>
        </ul>
      </div>

      <div class="k-card">
        <p><b>이 과정을 통해 강화한 역량</b></p>
        <ul>
          <li>
            <b>데이터 전처리·가공</b>:
            Python(Pandas)을 활용해 불완전한 원천 데이터를 분석 가능한 형태로 정제
          </li>
          <li>
            <b>지표 해석</b>:
            수치를 나열하는 데 그치지 않고, 맥락과 원인을 설명할 수 있는 해석 중심의 분석
          </li>
          <li>
            <b>업무 자동화</b>:
            반복 작업을 코드로 정리해 효율을 높이고, 재사용 가능한 방식으로 개선
          </li>
          <li>
            <b>협업 경험</b>:
            기획·개발·분석 역할이 다른 구성원들과 목표와 기준을 맞추며 결과를 도출
          </li>
        </ul>
      </div>

      <div class="k-card">
        <p><b>업무 관점의 변화</b></p>
        <p>
          이 교육을 통해 실무에서 중요한 것은 ‘기술 자체’보다
          <b>문제를 어떻게 정의하는지</b>,
          <b>현실의 데이터를 어떻게 다루는지</b>,
          그리고 <b>팀이 바로 활용할 수 있는 형태로 결과를 전달하는지</b>라는 점을 체감했습니다.<br/><br/>
          이후 저는 데이터 기반의 설득력 있는 기획과,
          현장에서 즉시 활용 가능한 자동화와 개선 작업을 선호하게 되었습니다.
        </p>
      </div>
      `
    },

    company: {
      title: '경력',
      body: `
      <div class="k-card">
        <p><b>한 줄 요약</b>  </br>      교육 콘텐츠 기획에서 출발해 플랫폼 운영·기획까지 확장하며,
      기준 설정·프로세스 정비·자동화를 통해 운영 품질과 효율을 개선해 왔습니다.</p>
      </div>

      <div class="k-card">
        <p><b>대표 성과: 문항 코드 추출 자동화 프로그램 개발</b></p>
        <div class="video-frame">
          <video controls playsinline preload="metadata">
            <source src="./vidieos/questions_program.mp4" type="video/mp4" />
            브라우저가 동영상을 지원하지 않습니다.
          </video>
        </div>
        <ul style="margin-top:10px;">
          <li>
            <b>문제 정의</b>:
            문항 코드 확인·추출을 수작업에 의존해 시간 소요와 오류가 반복 발생
          </li>
          <li>
            <b>개선 방식</b>:
            업무 흐름을 단계별로 분해하고 규칙을 정의한 뒤,
            자동 추출·정리 프로그램을 직접 구현
          </li>
          <li>
            <b>성과</b>:
            작업 시간 <b>1시간 이상 → 20분 내</b>로 단축,
            반복 작업 감소 및 정확도·일관성 향상
          </li>
        </ul>
        <p style="margin-top:10px;">
        이 경험을 통해, 작은 자동화라도 현업에 적용될 때
        팀 전체의 시간과 품질을 동시에 개선할 수 있다는 확신을 갖게 되었습니다.
        </p>
      </div>

      <div class="k-card">
        <p><b>천재교과서 (2021.08~2023.06)</b></p>
        <p style="margin:6px 0 10px;">
          <b>역할</b> 교재 개발 PM / 국어 교육 콘텐츠 기획·개발
        </p>
        <ul>
          <li>
            <b>교재 개발 PM</b>:
            기획·집필·편집·검수 전 과정을 관리하며 일정·품질·커뮤니케이션 총괄
          </li>
          <li>
            <b>커리큘럼 및 기준 설계</b>:
            학습 목표와 난이도 기준을 구조화해 콘텐츠 일관성 확보
          </li>
          <li>
            <b>외부 협업 관리</b>:
            집필진·프리랜서·디자이너와 협업하며 산출물 품질 관리
          </li>
          <li>
            <b>문항 데이터 구조 개선</b>:
            오류 유형을 체계화하고, 개발·운영에 활용 가능한 기준 정립
          </li>
          <li>
            <b>디지털 연계</b>:
            밀크티(초등 학습 플랫폼) 국어 콘텐츠 검수 및 연계 콘텐츠 제작
          </li>
        </ul>
        <p style="margin-top:10px;">
          <b>업무 인식</b>:
          콘텐츠 기획은 결과물을 만드는 일이 아니라,
          사용자가 막히는 지점을 기준과 구조로 해결하는 과정임을 체득했습니다.
        </p>
      </div>
    
      <div class="k-card">
        <p><b>EBS (2024.07~현재)</b></p>
        <p style="margin:6px 0 10px;">
          <b>역할</b> 중학프리미엄 플랫폼 운영·기획 / 강좌 데이터 및 프로세스 관리
        </p>
        <ul>
          <li>
            <b>플랫폼 운영</b>:
            강좌 데이터 관리, 서비스 개편 대응, 페이지 구조 개선
          </li>
          <li>
            <b>분류체계 재설계</b>:
            2015 → 2022 개정 교육과정 기준으로 강좌 분류 체계 전면 재정비
          </li>
          <li>
            <b>데이터 기반 개선</b>:
            학습 이력·조회·완강·설문 데이터를 가공·분석해 운영 개선안 도출
          </li>
          <li>
            <b>운영 프로세스 정비</b>:
            검수 권한·업무 흐름·이슈 대응 기준을 정리해 운영 오류 감소
          </li>
        </ul>
        <p style="margin-top:10px;">
          <b>업무 인식</b>:
          운영의 완성은 문제를 처리하는 데서 끝나는 것이 아니라,
          같은 문제가 반복되지 않도록 구조를 만드는 것이라는 관점을 갖게 되었습니다.
        </p>
      </div>
      `
    },

    award: {
      title: '수상',
      body: `
      <div class="k-card">
        <p><b>한 줄 요약</b>  </br>
        제한된 기간 안에서 아이디어를 서비스 형태로 구현하고,
        실제 시연 가능한 결과물로 완주해 성과를 만든 경험입니다.
        </p>
      </div>

      <div class="k-card">
        <p>
          <b>2023 제1회 K-디지털플랫폼 AI 경진대회</b> 특별상
          <span style="font-size:13px;">(2023.12.13)</span>
        </p>
        <div class="video-frame">
          <video controls playsinline preload="metadata">
            <source src="./vidieos/jingum_test.mp4" type="video/mp4" />
            브라우저가 동영상을 지원하지 않습니다.
          </video>
        </div>
        <ul style="margin-top:10px;">
          <li><b>형태</b>: 4인 팀 프로젝트</li>
          <li>
            <b>주제</b>:
            가이드 문서를 기반으로 질의에 응답하는
            <b>RAG 기반 질의응답 서비스(답파고)</b> 구현
          </li>
          <li>
            <b>성과</b>:
            기획 아이디어를 실제 동작 가능한 서비스로 구현해
            <b>특별상 수상</b>
          </li>
        </ul>
      </div>
    
      <div class="k-card">
        <p><b>담당 역할 및 기여</b></p>
        <ul>
          <li>
            <b>가이드 DB 설계</b>:
            예시 가이드 문서를 구조화해,
            질의응답에 활용 가능한 기준 데이터로 정리
          </li>
          <li>
            <b>서비스 구현</b>:
            Django를 활용해 문답 형태의 웹 서비스 프로토타입 제작
          </li>
          <li>
            <b>유사도 기반 응답 로직</b>:
            가이드 자료를 임베딩하고,
            질문 문장과의 유사도를 계산해 적절한 답변을 반환하는 흐름 구성
          </li>
        </ul>
      </div>
    
      <div class="k-card">
        <p><b>업무 방식에서의 강점</b></p>
        <ul>
          <li>
            제한된 시간 내 완성을 위해,
            기능을 ‘시연 가능 여부’ 기준으로 우선순위화
          </li>
          <li>
            심사자가 이해하기 쉽도록,
            서비스 흐름과 사용 시나리오를 중심으로 결과물 정리
          </li>
          <li>
            협업 과정에서 화면·데이터·시나리오 기준을 명확히 해
            속도와 품질을 동시에 확보
          </li>
        </ul>
      </div>
    
      <div class="k-card">
        <p><b>업무 인식</b></p>
        <p>
          이 경험을 통해 성과는 아이디어 자체보다
          <b>끝까지 구현해 실제로 보여주는 실행력</b>에서 나온다는 점을 체감했습니다.<br/><br/>
          이후 저는 프로젝트를 시작할 때
          <b>완료 가능한 범위를 명확히 설정하고</b>,
          빠르게 결과를 만든 뒤 개선해 나가는 방식을 선호하게 되었습니다.
        </p>
      </div>
      `
    },

    cert: {
      title: '자격증',
      body: `
      <div class="k-card">
        <p><b>한 줄 요약</b> </br> “필요하면 배워서 갖추는 사람”이라는 신뢰를 만들기 위해 꾸준히 기반 역량을 쌓았습니다.</p>
      </div>

      <div class="k-card">
        <p><b>업무 기반 자격</b></p>
        <ul>
          <li>
            <b>워드프로세서</b> (2019.09.13):
            문서 구조화, 기준 정리, 명확한 전달을 위한 작성 역량
          </li>
          <li>
            <b>GTQ 1급</b> (2020.02.07):
            이미지 편집 및 시각 자료 품질 개선
          </li>
          <li>
            <b>컴퓨터활용능력 1급</b> (2020.08.28):
            데이터 정리, 검증, 기본 분석을 통한 업무 효율화
          </li>
          <li>
            <b>SQLD</b> (2024.04.05):
            데이터 조회, 정합성 확인, 운영·분석 업무 연계
          </li>
          <li>
            <b>ADsP</b> (2025.09.05):
            지표 설정, 가설 수립, 데이터 기반 의사결정 관점 강화
          </li>
        </ul>
      </div>
    
      <div class="k-card">
        <p><b>업무 인식</b></p>
        <p>
          자격증은 취득 자체가 목표가 아니라,
          실무에서 바로 꺼내 쓸 수 있는 도구를 하나씩 늘리는 과정이라고 생각합니다.<br/><br/>
          저는 필요한 역량을 선제적으로 학습하고,
          이를 실제 업무에 적용한 뒤 문서화해 재사용 가능한 형태로 남기는 방식을 선호합니다.
        </p>
      </div>
      `
    },

    lang: {
      title: '언어',
      body: `
      <div class="k-card">
        <p><b>한 줄 요약</b> </br> 언어는 소통 도구이자 업무의 ‘품질’을 만드는 도구로 활용해 왔습니다.</p>
      </div>

      <div class="k-card">
        <p><b>한국어</b></p>
        <ul>
          <li>국어국문학 전공 + 교재 기획/교정/교열/편집 실무 경험</li>
          <li>복잡한 내용을 “짧고 정확하게” 정리해 문서로 남기는 역량</li>
          <li>기획서/가이드/프로세스 문서로 팀 협업 효율을 높이는 방식</li>
        </ul>
      </div>

      <div class="k-card">
        <p><b>영어</b></p>
        <ul>
          <li>TOEIC 785 (2024.06.30)</li>
          <li>TOEIC Speaking IH 150 (2025.09.13)</li>
          <li>해외 자료·기술 문서·리서치 자료 이해 가능, 기본적인 업무 커뮤니케이션 수행</li>
        </ul>
      </div>

      <div class="k-card">
        <p><b>일본어</b></p>
        <ul>
          <li>일상 회화 학습 및 여행 환경에서의 실사용 경험</li>
          <li>콘텐츠 및 문화적 맥락을 이해하는 데 활용 가능</li>
        </ul>
      </div>

      <div class="k-card">
        <p><b>깨달음</b></p>
        <p>
          팀에서 신뢰를 얻는 사람은 말을 많이 하는 사람이 아니라,
          <b>오해가 생기지 않도록 정리하는 사람</b>이라고 생각합니다.<br/><br/>
          저는 말과 글을 통해 문제를 구조화하고,
          구성원 모두가 합의할 수 있는 형태로 전달하는 역할에 강점이 있습니다.
        </p>
      </div>
      `
    }
  };

  /* =========================
     Modal helpers + ducking
  ========================= */
  function openModal(modal){
    if (!modal) return;
    paused = true;
    keys.clear(); // ✅ 모달 열릴 때 키 stuck 방지
    modal.classList.add('on');
    modal.setAttribute('aria-hidden', 'false');
    duckBgm(true);
  }

  function closeModal(modal){
    if (!modal) return;
    modal.classList.remove('on');
    modal.setAttribute('aria-hidden', 'true');
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

  function fillOutroStats(){
    const body = getOutroBody();
    if (!body) return;

    const playMs = (playStartTs && playEndTs) ? (playEndTs - playStartTs) :
                   (playStartTs ? (performance.now() - playStartTs) : 0);

    const visitedCount = visited.size;
    const totalCount = VISIT_KEYS.length;

    let box = body.querySelector('.outro-stats');
    if (!box){
      box = document.createElement('div');
      box.className = 'outro-stats';
      body.appendChild(box);
    }

    box.innerHTML = `
      <div>플레이 시간: <b>${formatMs(playMs)}</b></div>
      <div>방문 노드: <b>${visitedCount}/${totalCount}</b></div>
    `;
  }

  function openInfo(key){
    const data = CONTENT[key];
    if (!data) return;

    infoModalTitle.textContent = data.title;

    const html = data.body;
    infoModalBody.innerHTML = `<div class="typewrap"><div id="typeTarget"></div></div>`;
    const target = infoModalBody.querySelector('#typeTarget');

    openModal(infoModal);
    playSfxForKey(key);
    markVisited(key);

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
        infoModalBody.innerHTML = html;
      }
    }, 12);
  }

  // close buttons
  if (introCloseBtn) introCloseBtn.addEventListener('click', () => {
    ensureAudio();
    if (!bgmIsRunning) startBgm(); // ✅ 클릭으로 시작해도 BGM 켜지게
    introModal.classList.remove('on');
    introModal.setAttribute('aria-hidden','true');
    paused = false;
    duckBgm(false);
  });

  if (startGameBtn) startGameBtn.addEventListener('click', () => {
    ensureAudio();
    if (!bgmIsRunning) startBgm(); // ✅ 클릭으로 시작해도 BGM 켜지게
    introModal.classList.remove('on');
    introModal.setAttribute('aria-hidden','true');
    paused = false;
    duckBgm(false);

    if (playStartTs === null) playStartTs = performance.now();
  });

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

  // ✅ 2) 플레이 시간 측정
  let playStartTs = null;
  let playEndTs = null;

  if (exitBtn){
    exitBtn.addEventListener('click', () => {
      paused = true;
      keys.clear();

      playEndTs = performance.now();
      fillOutroStats();
      stopBgmFadeOut();
      openModal(outroModal);
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
    const zone = { x: player.x - 8, y: player.y - 8, w: player.w + 16, h: player.h + 16 };
    for (const n of nodes){
      const bw = 18, bh = 18;
      const bx = n.x - bw/2;
      const by = n.y - bh/2;
      if (rectsOverlap(zone.x, zone.y, zone.w, zone.h, bx, by, bw, bh)) return n;
    }
    return null;
  }

  /* =========================================================
     Retro props: grass/rocks/lamps (random but fixed)
  ========================================================= */
  function mulberry32(seed){
    return function(){
      let t = seed += 0x6D2B79F5;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const props = [];
  const rng = mulberry32(20251214);

  const roadRects = [
    { x:55, y:86,  w:240, h:12 },
    { x:49, y:55,  w:12,  h:70 },
    { x:244,y:55,  w:12,  h:70 },
    { x:55, y:121, w:55,  h:12 },
  ];

  function inRoad(x,y){
    for (const r of roadRects){
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return true;
    }
    return false;
  }

  function nearNode(x,y){
    for (const n of nodes){
      const dx = x - n.x;
      const dy = y - n.y;
      if (Math.sqrt(dx*dx + dy*dy) < 22) return true;
    }
    return false;
  }

  function snap16(v){ return Math.round(v / 16) * 16; }

  function initProps(){
    props.length = 0;

    const lampXs = [80, 120, 200, 235, 275];
    lampXs.forEach((x, idx) => {
      const yTop = 74 + (idx % 2 === 0 ? -2 : 2);
      const yBot = 110 + (idx % 2 === 1 ? -2 : 2);

      props.push({ type:'lamp', x: x, y: yTop });
      props.push({ type:'lamp', x: x + 6, y: yBot });
    });

    const attempts = 120;
    for (let i=0; i<attempts; i++){
      const x = snap16(16 + rng() * (W - 32));
      const y = snap16(16 + rng() * (H - 32));

      if (inRoad(x,y)) continue;
      if (nearNode(x,y)) continue;

      const roll = rng();
      if (roll < 0.70){
        props.push({ type:'grass', x, y, v: (rng()*3)|0 });
      } else if (roll < 0.95){
        props.push({ type:'rock', x, y, v: (rng()*3)|0 });
      }
    }

    for (let x=55; x<=295; x+=16){
      props.push({ type:'pebble', x, y: 82 });
      props.push({ type:'pebble', x, y: 100 });
    }
  }
  initProps();

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
    const sway = Math.sin(t*2 + (p.x+p.y)*0.02) * 1;

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

  function drawProps(t){
    for (const p of props){
      if (p.type === 'grass') drawGrass(p, t);
      else if (p.type === 'rock') drawRock(p);
      else if (p.type === 'lamp') drawLamp(p, t);
      else if (p.type === 'pebble') drawPebble(p);
    }
  }

  /* =========================================================
     Signboard + Node Animation
  ========================================================= */
  function nodeColor(key){
    switch(key){
      case 'school': return { main:'#e0b86a', edge:'#8c6a2b' };
      case 'training': return { main:'#bb9af7', edge:'#6f50b4' };
      case 'company': return { main:'#7aa2f7', edge:'#3b5fb3' };
      case 'award': return { main:'#f7768e', edge:'#a73d52' };
      case 'cert': return { main:'#7dcfff', edge:'#3b7f95' };
      case 'lang': return { main:'#9ece6a', edge:'#4f7a2f' };
      case 'timeline': return { main:'#9ece6a', edge:'#4f7a2f' };
      default: return { main:'#7aa2f7', edge:'#3b5fb3' };
    }
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

  function drawNodeIcon(n, t, isNear){
    const baseSize = 18;
    const phase = (n.x * 0.07 + n.y * 0.05);
    const pulse = 1 + (Math.sin(t * 3.0 + phase) * 0.03) + (isNear ? 0.05 : 0);
    const bounce = Math.sin(t * 2.2 + phase) * (isNear ? 1.8 : 1.0);

    if (clearPlayed && n.key === 'timeline'){
      const glowA = 0.10 + (Math.sin(t * 6.0) * 0.06);
      ctx.fillStyle = `rgba(246, 211, 101, ${glowA})`;
      ctx.fillRect(Math.round(n.x - baseSize/2) - 10, Math.round(n.y - baseSize/2 + bounce) - 10, baseSize + 20, baseSize + 20);

      ctx.strokeStyle = `rgba(246, 211, 101, ${0.45 + glowA})`;
      ctx.strokeRect(
        Math.round(n.x - baseSize/2) - 7 + 0.5,
        Math.round(n.y - baseSize/2 + bounce) - 7 + 0.5,
        baseSize + 14,
        baseSize + 14
      );
    } else if (isNear){
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(Math.round(n.x - baseSize/2) - 6, Math.round(n.y - baseSize/2 + bounce) - 6, baseSize + 12, baseSize + 12);
    }

    ctx.save();
    ctx.translate(Math.round(n.x), Math.round(n.y + bounce));
    ctx.scale(pulse, pulse);
    ctx.translate(-Math.round(n.x), -Math.round(n.y + bounce));

    if (iconReady(n.key)){
      ctx.drawImage(icons[n.key], Math.round(n.x - baseSize/2), Math.round(n.y - baseSize/2 + bounce), baseSize, baseSize);
    } else {
      const c = nodeColor(n.key);
      drawPixelRect(
        Math.round(n.x - baseSize/2),
        Math.round(n.y - baseSize/2 + bounce),
        baseSize, baseSize,
        c.main, c.edge
      );
    }
    ctx.restore();

    const sx = n.x + Math.cos(t * 2 + n.x) * 8;
    const sy = (n.y + bounce) + Math.sin(t * 2 + n.y) * 6;
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillRect(Math.round(sx), Math.round(sy), 2, 2);
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
     Render
  ========================= */
  function drawBG(){
    for (let y=0; y<H; y+=16){
      for (let x=0; x<W; x+=16){
        const even = ((x+y)/16) % 2 === 0;
        ctx.fillStyle = even ? '#0f1a14' : '#0d1712';
        ctx.fillRect(x, y, 16, 16);
      }
    }

    ctx.fillStyle = '#2a3646';
    ctx.fillRect(55, 86, 240, 12);
    ctx.fillRect(49, 55, 12, 70);
    ctx.fillRect(244, 55, 12, 70);
    ctx.fillRect(55, 121, 55, 12);

    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.fillRect(55, 85, 240, 1);
    ctx.fillRect(55, 98, 240, 1);
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

  let lastRenderTs = performance.now();
  function render(){
    const now = performance.now();
    const dt = now - lastRenderTs;
    lastRenderTs = now;

    ctx.clearRect(0,0,W,H);
    drawBG();

    const t = now / 1000;
    drawProps(t);

    const near = nearestNode();
    for (const n of nodes){
      const isNear = !!near && near.key === n.key;
      drawNodeIcon(n, t, isNear);
      drawSignboard(n, t, isNear);
    }

    drawPops();
    drawPlayer();
    drawPressSpace();

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

    // ✅ 실제로 "움직였는지" 기준으로 발소리/애니메이션 처리
    const oldX = player.x;
    const oldY = player.y;

    player.x += player.vx;
    player.y += player.vy;

    player.x = Math.max(0, Math.min(W - player.w, player.x));
    player.y = Math.max(0, Math.min(H - player.h, player.y));

    const moved = (player.x !== oldX || player.y !== oldY);

    // ✅ 발소리: 키 입력이 아니라 "실제 이동"일 때만
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
     Keys
  ========================= */
  window.addEventListener('keydown', (e) => {
    ensureAudio();
    keys.add(e.key);

    if (!bgmIsRunning) startBgm();

    if (playStartTs === null && !paused){
      playStartTs = performance.now();
    }

    if (introModal && introModal.classList.contains('on') && e.key === ' '){
      e.preventDefault();
      introModal.classList.remove('on');
      introModal.setAttribute('aria-hidden','true');
      paused = false;

      if (playStartTs === null) playStartTs = performance.now();

      playTone({ type:'sine', freq: 660, dur:0.06, gain:0.07 });
      duckBgm(false);
      return;
    }

    if (e.key === ' '){
      e.preventDefault();
      if (!layer.classList.contains('on')) return;

      const n = nearestNode();
      if (!n) return;

      const dx = n.x - player.x;
      const dy = n.y - player.y;
      if (Math.abs(dx) > Math.abs(dy)) facing = dx > 0 ? 'right' : 'left';
      else facing = dy > 0 ? 'down' : 'up';

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

    if (e.key === 'Escape'){
      if (infoModal?.classList.contains('on')) { closeModal(infoModal); playTone({type:'sine', freq:520, dur:0.05, gain:0.06}); return; }
      if (timelineModal?.classList.contains('on')) { closeModal(timelineModal); playTone({type:'sine', freq:520, dur:0.05, gain:0.06}); return; }
      if (outroModal?.classList.contains('on')) { closeModal(outroModal); playTone({type:'sine', freq:520, dur:0.05, gain:0.06}); return; }

      playEndTs = performance.now();
      fillOutroStats();
      stopBgmFadeOut();
      openModal(outroModal);
    }
  });

  window.addEventListener('keyup', (e) => keys.delete(e.key));
});
