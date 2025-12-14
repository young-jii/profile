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

  /* =========================
     Web Audio (BGM + SFX)
  ========================= */
  let audioCtx = null;
  let audioUnlocked = false;

  let musicGain = null;
  let musicTimer = null;
  let musicStep = 0;

  const MUSIC_BASE_VOL = 0.10;  // 기본 BGM 볼륨
  const MUSIC_DUCK_VOL = 0.035; // 모달 열릴 때 덕킹 볼륨

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

  function startBGM(){
    if (musicTimer) return;
    const ac = ensureAudio();
    if (!ac) return;

    musicGain = ac.createGain();
    musicGain.gain.value = MUSIC_BASE_VOL;
    musicGain.connect(ac.destination);

    // 레트로 RPG 느낌(가볍고 거슬리지 않게): 단순 아르페지오 루프
    const scale = [261.63, 329.63, 392.00, 523.25, 392.00, 329.63]; // C E G C G E
    const bass  = [130.81, 146.83, 164.81, 130.81]; // C D E C

    function tick(){
      if (!audioUnlocked) return;

      const t0 = ac.currentTime;

      // pad
      const o1 = ac.createOscillator();
      const o2 = ac.createOscillator();
      const g  = ac.createGain();

      o1.type = 'triangle';
      o2.type = 'sine';

      const f = scale[musicStep % scale.length];
      const b = bass[Math.floor((musicStep % 8) / 2) % bass.length];

      o1.frequency.setValueAtTime(f, t0);
      o2.frequency.setValueAtTime(b, t0);

      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(0.06, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18);

      o1.connect(g);
      o2.connect(g);

      // 살짝 어둡게(거슬림 방지)
      const lp = ac.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(900, t0);
      lp.Q.setValueAtTime(0.7, t0);

      g.connect(lp);
      lp.connect(musicGain);

      o1.start(t0);
      o2.start(t0);
      o1.stop(t0 + 0.2);
      o2.stop(t0 + 0.2);

      musicStep++;
    }

    musicTimer = setInterval(tick, 220);
  }

  function setMusicVolume(target, ms = 160){
    const ac = ensureAudio();
    if (!ac || !musicGain) return;

    const t = ac.currentTime;
    const cur = musicGain.gain.value;

    musicGain.gain.cancelScheduledValues(t);
    musicGain.gain.setValueAtTime(cur, t);
    musicGain.gain.linearRampToValueAtTime(target, t + ms/1000);
  }

  function duckMusic(on){
    if (!audioUnlocked) return;
    setMusicVolume(on ? MUSIC_DUCK_VOL : MUSIC_BASE_VOL, 180);
  }

  function fadeOutBGM(ms = 900){
    if (!audioUnlocked) return;
    setMusicVolume(0.0001, ms);
  }

  function playSfxForKey(key){
    switch (key){
      case 'school':   // 따뜻한
        playTone({ type:'triangle', freq: 440, dur:0.10, gain:0.10, filter:{type:'lowpass', freq:1200, q:0.8} });
        playTone({ type:'sine',     freq: 660, dur:0.08, gain:0.07, filter:{type:'lowpass', freq:1400, q:0.6} });
        break;
      case 'training':
        playTone({ type:'sine', freq: 523.25, dur:0.12, gain:0.09, filter:{type:'lowpass', freq:1800, q:0.7} });
        break;
      case 'company':  // 쿵
        playTone({ type:'square',  freq: 110, dur:0.10, gain:0.12, filter:{type:'lowpass', freq:600, q:1.0} });
        playTone({ type:'triangle',freq: 150, dur:0.08, gain:0.07, filter:{type:'lowpass', freq:700, q:0.9} });
        break;
      case 'award':    // 반짝
        playTone({ type:'sine', freq: 880,  dur:0.06, gain:0.08, filter:{type:'highpass', freq:600, q:0.8} });
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

  // 발소리(Synth) - 파일 없이도 작동
  let lastStepTime = 0;
  const STEP_INTERVAL = 240;

  function playFootstep(){
    // 낮고 짧은 "턱" 느낌
    playTone({ type:'square', freq: 160, dur:0.03, gain:0.05, filter:{type:'lowpass', freq:500, q:0.8} });
    playTone({ type:'triangle', freq: 90, dur:0.05, gain:0.04, filter:{type:'lowpass', freq:350, q:0.9} });
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
     Map Nodes [to-be]
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

  // === Optional icons ===
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
          <p><b>한 줄 요약</b> 문학 전공으로 ‘이야기/문장’을 다루는 힘을 키우고, 이를 ‘서비스/데이터’로 확장할 기반을 만들었습니다.</p>
        </div>

        <div class="k-card">
          <p><b>학력</b></p>
          <ul>
            <li><b>경희대학교 국어국문학과</b> (GPA 3.92/4.5)</li>
            <li>텍스트를 “기준”으로 만들고, 그 기준으로 품질을 관리하는 습관을 체득</li>
          </ul>
        </div>

        <div class="k-card">
          <p><b>이 시기에 길러진 역량</b></p>
          <ul>
            <li><b>기획력</b>: 핵심 메시지를 먼저 잡고 구조를 설계</li>
            <li><b>구조화</b>: 산만한 정보를 목차·정의·규칙으로 정리</li>
            <li><b>사용자 관점</b>: 읽는 사람이 어디서 막히는지 먼저 상상하는 습관</li>
          </ul>
        </div>

        <div class="k-card">
          <p><b>깨달음</b></p>
          <p>
            좋은 콘텐츠와 좋은 서비스는 결국 “사용하는 사람”을 먼저 생각할 때 만들어진다고 믿게 됐습니다.<br/>
            이후 커리어에서도 <b>기준(정의)</b> → <b>구조(흐름)</b> → <b>품질(오류 감소)</b> 순서로 문제를 해결해 왔습니다.
          </p>
        </div>
      `
    },

    training: {
      title: '교육',
      body: `
        <div class="k-card">
          <p><b>한 줄 요약</b> “비전공자”에서 “데이터로 근거를 만드는 사람”으로 전환한 시기였습니다.</p>
        </div>

        <div class="k-card">
          <p><b>주요 과정</b></p>
          <ul>
            <li><b>협업 필터링/자연어처리 기반 추천 분석 시스템 제작</b> (2023.06~2023.12)</li>
            <li><b>고객경험 데이터 기반 데이터 비즈니스 분석</b> (2024.02~2024.07)</li>
          </ul>
        </div>

        <div class="k-card">
          <p><b>내가 얻은 ‘실전 감각’</b></p>
          <ul>
            <li><b>전처리/가공</b>: Python(Pandas)로 데이터를 “쓸 수 있는 형태”로 변환</li>
            <li><b>지표/해석</b>: 숫자를 ‘설명 가능한 근거’로 연결</li>
            <li><b>자동화</b>: 반복 업무를 코드로 줄여 팀 시간을 되돌려줌</li>
            <li><b>협업</b>: 역할이 다른 구성원과 합의점을 만들며 완주</li>
          </ul>
        </div>

        <div class="k-card">
          <p><b>깨달음</b></p>
          <p>
            실무에선 “멋진 모델”보다 <b>문제 정의</b>와 <b>현실 데이터 다루기</b>,
            그리고 <b>팀이 바로 쓸 수 있게 전달</b>하는 능력이 더 중요하다는 걸 배웠습니다.
          </p>
        </div>
      `
    },

    company: {
      title: '경력',
      body: `
        <div class="k-card">
          <p><b>한 줄 요약</b> 교육 콘텐츠 PM → 플랫폼 운영/기획으로 확장하며, “기준·프로세스·자동화”로 운영 품질을 올렸습니다.</p>
        </div>

        <div class="k-card">
          <p><b>대표 성과: 문항 코드 추출 자동화 프로그램</b></p>
          <div class="video-frame">
            <video controls playsinline preload="metadata">
              <source src="./vidieos/questions_program.mp4" type="video/mp4" />
              브라우저가 동영상을 지원하지 않습니다.
            </video>
          </div>
          <ul style="margin-top:10px;">
            <li><b>문제</b>: 수동 확인/추출 → 시간 과다 + 실수 발생</li>
            <li><b>해결</b>: 규칙을 정의하고 자동 추출·정리 도구를 개발</li>
            <li><b>결과</b>: <b>1시간+ → 20분 내</b> 단축, 정확도/일관성 향상</li>
          </ul>
          <p style="margin-top:10px;">
            이 경험으로 “작은 자동화가 팀 전체의 시간을 되돌려준다”는 확신을 갖게 됐습니다.
          </p>
        </div>

        <div class="k-card">
          <p><b>천재교과서 (2021.08~2023.06)</b></p>
          <p style="margin:6px 0 10px;"><b>역할</b> 교재 개발 PM / 국어 교육 콘텐츠 기획·개발</p>
          <ul>
            <li><b>PM</b>: 기획·집필·편집·검수 전 과정 운영 (일정/품질/커뮤니케이션 총괄)</li>
            <li><b>학습 목표/난이도 기준</b> 정리로 결과물 흔들림 최소화</li>
            <li><b>문항 DB 재정비</b>: 개발이 활용 가능한 구조 기준 마련</li>
            <li><b>디지털 연계</b>: 밀크티 국어 콘텐츠 검수 및 연계 제작</li>
          </ul>
          <p style="margin-top:10px;">
            <b>깨달음</b>: 콘텐츠 제작은 “막히는 지점”을 찾아 기준과 구조로 해결하는 일이라는 걸 배웠습니다.
          </p>
        </div>

        <div class="k-card">
          <p><b>EBS (2024.07~현재)</b></p>
          <p style="margin:6px 0 10px;"><b>역할</b> 중학프리미엄 플랫폼 운영/기획, 강좌 데이터·프로세스 관리</p>
          <ul>
            <li><b>운영 총괄</b>: 강좌 데이터 관리, 서비스 개편, 페이지 구조 개선</li>
            <li><b>분류체계 재설계</b>: 2015 → 2022 교육과정 기준 전면 재정비</li>
            <li><b>데이터 기반 운영</b>: 학습 이력/설문 데이터 가공 → 개선안 도출</li>
            <li><b>프로세스 정비</b>: 검수 권한/흐름 정리로 운영 오류 감소</li>
          </ul>
          <p style="margin-top:10px;">
            <b>깨달음</b>: 운영은 “문제 발견”이 아니라 <b>재발 방지 구조</b>를 만드는 것까지가 완성입니다.
          </p>
        </div>
      `
    },

    award: {
      title: '수상',
      body: `
        <div class="k-card">
          <p><b>한 줄 요약</b> 제한된 시간에서도 “아이디어 → 구현 → 시연”을 완주해 성과로 증명한 경험입니다.</p>
        </div>

        <div class="k-card">
          <p><b>2023 제1회 K-디지털플랫폼 AI 경진대회</b> 특별상 (2023.12.13)</p>
          <div class="video-frame">
            <video controls playsinline preload="metadata">
              <source src="./vidieos/jingum_test.mp4" type="video/mp4" />
              브라우저가 동영상을 지원하지 않습니다.
            </video>
          </div>
          <ul style="margin-top:10px;">
            <li><b>형태</b>: 4인 팀 프로젝트 / MVP 완성</li>
            <li><b>핵심</b>: <b>RAG 기반 질의응답(답파고)</b>를 실제 동작 수준으로 구현</li>
            <li><b>성과</b>: “보여줄 수 있게” 만든 실행력으로 <b>특별상 수상</b></li>
          </ul>
        </div>

        <div class="k-card">
          <p><b>깨달음</b></p>
          <p>
            성과는 아이디어 자체보다 “끝까지 만들어서 보여주는 힘”에서 나온다는 걸 배웠습니다.<br/>
            이후 어떤 프로젝트든 <b>완료 가능한 범위를 정확히 잡고</b> 빠르게 결과를 만들며 개선하는 방식을 선호합니다.
          </p>
        </div>
      `
    },

    cert: {
      title: '자격증',
      body: `
        <div class="k-card">
          <p><b>한 줄 요약</b> “필요하면 배워서 갖추는 사람”이라는 신뢰를 만들기 위해 꾸준히 기반 역량을 쌓았습니다.</p>
        </div>

        <div class="k-card">
          <ul>
            <li><b>워드프로세서</b> (2019.09.13)</li>
            <li><b>GTQ 1급</b> (2020.02.07)</li>
            <li><b>컴퓨터활용능력 1급</b> (2020.08.28)</li>
            <li><b>SQLD</b> (2024.04.05)</li>
            <li><b>ADsP</b> (2025.09.05)</li>
          </ul>
        </div>

        <div class="k-card">
          <p><b>깨달음</b></p>
          <p>
            자격증은 “끝”이 아니라 “실무에서 꺼내 쓰는 도구상자”라고 생각합니다.<br/>
            저는 필요한 순간에 빠르게 학습해 적용하고, 다시 문서화해 재사용 가능한 형태로 남깁니다.
          </p>
        </div>
      `
    },

    lang: {
      title: '언어',
      body: `
        <div class="k-card">
          <p><b>한 줄 요약</b> 언어는 소통 도구이자 ‘품질’을 만드는 기술이라고 생각합니다.</p>
        </div>

        <div class="k-card">
          <p><b>한국어</b></p>
          <ul>
            <li>국어국문학 전공 + 교재 기획/교정/교열/편집 실무 경험</li>
            <li>복잡한 내용을 “짧고 정확하게” 정리해 문서로 남기는 역량</li>
          </ul>
        </div>

        <div class="k-card">
          <p><b>영어</b></p>
          <ul>
            <li>TOEIC 785 (2024.06.30)</li>
            <li>TOEIC Speaking IH 150 (2025.09.13)</li>
          </ul>
        </div>

        <div class="k-card">
          <p><b>일본어</b></p>
          <ul>
            <li>회화 학습 경험, 여행 실사용 가능</li>
          </ul>
        </div>

        <div class="k-card">
          <p><b>깨달음</b></p>
          <p>
            팀에서 인정받는 사람은 “말이 많은 사람”이 아니라 <b>오해가 없게 정리하는 사람</b>이라고 느꼈습니다.<br/>
            저는 말과 글로 문제를 정리하고, 합의 가능한 형태로 바꾸는 역할을 잘합니다.
          </p>
        </div>
      `
    }
  };

  /* =========================
     Modal completion tracking
  ========================= */
  const VISIT_KEYS = ['school','training','award','company','lang','cert','timeline'];
  const visited = new Set();
  let clearPlayed = false;

  function playClearSfx(){
    const seq = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    let i = 0;

    const timer = setInterval(() => {
      if (i >= seq.length){ clearInterval(timer); return; }
      playTone({ type:'triangle', freq: seq[i], dur:0.07, gain:0.08, filter:{type:'lowpass', freq:1600, q:0.8} });
      i++;
    }, 70);

    setTimeout(() => {
      playTone({ type:'sine', freq: 1760, dur:0.06, gain:0.05, filter:{type:'highpass', freq:700, q:0.8} });
    }, 380);
  }

  function markVisited(key){
    if (!VISIT_KEYS.includes(key)) return;
    const before = visited.size;
    visited.add(key);

    if (!clearPlayed && before !== visited.size && visited.size === VISIT_KEYS.length){
      clearPlayed = true;
      playClearSfx(); // ✅ 올클리어 “뵤로롱”
    }
  }

  /* =========================
     Modal helpers
  ========================= */
  function openModal(modal){
    if (!modal) return;
    paused = true;
    duckMusic(true); // ✅ 모달 열릴 때 BGM 덕킹
    modal.classList.add('on');
    modal.setAttribute('aria-hidden', 'false');
  }

  function closeModal(modal){
    if (!modal) return;
    modal.classList.remove('on');
    modal.setAttribute('aria-hidden', 'true');
    paused = false;

    const anyOpen =
      (infoModal && infoModal.classList.contains('on')) ||
      (timelineModal && timelineModal.classList.contains('on')) ||
      (outroModal && outroModal.classList.contains('on')) ||
      (introModal && introModal.classList.contains('on'));

    if (!anyOpen) duckMusic(false); // ✅ 모달 다 닫히면 BGM 복귀
  }

  function openInfo(key){
    const data = CONTENT[key];
    if (!data) return;

    if (infoModalTitle) infoModalTitle.textContent = data.title;

    const html = data.body;

    // 타이핑용 임시 텍스트
    if (infoModalBody){
      infoModalBody.innerHTML = `<div class="typewrap"><div id="typeTarget"></div></div>`;
    }
    const target = infoModalBody ? infoModalBody.querySelector('#typeTarget') : null;

    openModal(infoModal);
    playSfxForKey(key);

    if (!target){
      if (infoModalBody) infoModalBody.innerHTML = html;
      return;
    }

    const plain = html.replace(/<[^>]*>/g, '').replace(/\s+\n/g,'\n');
    let i = 0;
    target.textContent = '';

    const timer = setInterval(() => {
      if (!infoModal || !infoModal.classList.contains('on')) { clearInterval(timer); return; }
      i += 2;
      target.textContent = plain.slice(0, i);

      if (i >= plain.length){
        clearInterval(timer);
        if (infoModalBody) infoModalBody.innerHTML = html; // ✅ 영상 포함 최종 HTML로 교체
      }
    }, 12);
  }

  // close buttons
  if (introCloseBtn) introCloseBtn.addEventListener('click', () => {
    if (introModal){
      introModal.classList.remove('on');
      introModal.setAttribute('aria-hidden','true');
    }
    paused = false;
    duckMusic(false);
  });

  if (startGameBtn) startGameBtn.addEventListener('click', () => {
    if (introModal){
      introModal.classList.remove('on');
      introModal.setAttribute('aria-hidden','true');
    }
    paused = false;
    duckMusic(false);
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

  // exit -> outro + BGM fadeout
  if (exitBtn){
    exitBtn.addEventListener('click', () => {
      paused = true;
      fadeOutBGM(1100); // ✅ Exit 시 BGM 페이드아웃
      playTone({ type:'triangle', freq: 220, dur:0.08, gain:0.08 });
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
        `<span class="career-total">총 경력 ${formatYM(total)}</span> ` +
        `(천재 ${formatYM(chunjae)} · EBS ${formatYM(ebs)})`;
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
     ✨ Retro props: grass/rocks/lamps (random but fixed)
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
      if (roll < 0.70) props.push({ type:'grass', x, y });
      else if (roll < 0.95) props.push({ type:'rock', x, y });
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
     ✨ Signboard + Node Animation
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

    if (isNear){
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
     ✨ "!" Pop (Space pressed)
  ========================================================= */
  const pops = [];

  function spawnPop(n){
    pops.push({ x: n.x, y: n.y - 18, t: 0, dur: 520 });
    playTone({ type:'square', freq: 1200, dur:0.035, gain:0.05, filter:{type:'highpass', freq:900, q:0.7} });
    playTone({ type:'sine',   freq: 1600, dur:0.035, gain:0.04, filter:{type:'highpass', freq:900, q:0.8} });
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
    ctx.fillRect(55, 86, 240, 12);     // main
    ctx.fillRect(49, 55, 12, 70);      // left connector
    ctx.fillRect(244, 55, 12, 70);     // right connector
    ctx.fillRect(55, 121, 55, 12);     // education -> award

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

    updatePops(dt);
  }

  /* =========================
     Update loop
  ========================= */
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

    // ✅ 발소리: 이동 중, 일정 간격으로
    if (isMoving && audioUnlocked){
      if (ts - lastStepTime >= STEP_INTERVAL){
        playFootstep();
        lastStepTime = ts;
      }
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

    // 첫 사용자 입력에서 오디오 unlock + bgm start
    if (!audioUnlocked){
      audioUnlocked = true;
      startBGM();
    }

    keys.add(e.key);

    // Intro에서 Space로 시작
    if (introModal && introModal.classList.contains('on') && e.key === ' '){
      e.preventDefault();
      introModal.classList.remove('on');
      introModal.setAttribute('aria-hidden','true');
      paused = false;
      duckMusic(false);
      playTone({ type:'sine', freq: 660, dur:0.06, gain:0.07 });
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

      // "!" 팝
      spawnPop(n);

      // 방문 체크 (올클리어 SFX 트리거)
      markVisited(n.key);

      paused = true;

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
      playTone({ type:'triangle', freq: 220, dur:0.08, gain:0.08 });
      openModal(outroModal);
    }
  });

  window.addEventListener('keyup', (e) => keys.delete(e.key));
});
