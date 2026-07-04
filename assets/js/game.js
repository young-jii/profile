/* ============================================================
   ISO ENGINE (v2.1)
   - 문 위치 수정: 모든 건물 입장은 오른쪽 벽(동쪽 면)의 문 앞 타일에서
   - NPC 대화 시스템: 하단 대화창 + 타자 효과 + 선택지 분기
     (문서형 패널 → 지영 NPC가 직접 이야기하는 형식)
============================================================ */
(function () {
  'use strict';

  const D = window.PORTFOLIO_DATA;

  /* ---------------- 저장 상태 (localStorage) ----------------
     위치·방문 기록·좋아요를 브라우저에 저장 → 새로고침/문서 이동 후에도 이어짐 */
  const STORE_KEY = 'jy_village_v1';
  function loadState() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch (e) { return {}; }
  }
  function saveState() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({
        pos: { col: player.col, row: player.row },
        visited: [...visited], likes: likes, cleared: cleared,
        sound: (typeof SND !== 'undefined') ? SND.enabled : true
      }));
    } catch (e) { /* 저장 불가 환경은 무시 */ }
  }
  const saved = loadState();
  const visited = new Set(saved.visited || []);
  let likes = saved.likes || 0;
  let cleared = !!saved.cleared;

  /* ---------------- 사운드 (Web Audio 칩튠 — 파일 없이 코드로 생성) ---------------- */
  const SND = {
    enabled: saved.sound !== false,   // 기본 ON (브라우저 정책상 첫 입력 후 재생 시작)
    ctx: null, bgmOn: false, bgmTimer: null, nextLoop: 0, stepAlt: 0,

    ensure() {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) { this.enabled = false; return false; }
        this.ctx = new AC();
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return true;
    },
    note(freq, when, dur, type, vol) {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(0, when);
      g.gain.linearRampToValueAtTime(vol, when + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0008, when + dur);
      o.connect(g); g.connect(this.ctx.destination);
      o.start(when); o.stop(when + dur + 0.03);
    },
    blip(freq, dur, type, vol) {
      if (!this.enabled || !this.ensure()) return;
      this.note(freq, this.ctx.currentTime, dur, type, vol);
    },
    foot()  { this.blip(this.stepAlt++ % 2 ? 196 : 174, 0.055, 'triangle', 0.05); },
    chime() {
      if (!this.enabled || !this.ensure()) return;
      const t = this.ctx.currentTime;
      this.note(659, t, 0.1, 'triangle', 0.06);
      this.note(880, t + 0.09, 0.16, 'triangle', 0.06);
    },
    jingle() {
      if (!this.enabled || !this.ensure()) return;
      const t = this.ctx.currentTime;
      [523, 659, 784, 1047].forEach((f, i) => this.note(f, t + i * 0.07, 0.12, 'square', 0.035));
    },

    /* 아늑한 8비트 마을 BGM — C 펜타토닉, 16스텝 루프 (멜로디 + 베이스) */
    MELODY: [659, 784, 880, 784, 659, 587, 523, 587, 659, 784, 659, 587, 523, 440, 523, 0],
    BASS:   [131, 131, 131, 131, 110, 110, 110, 110, 175, 175, 175, 175, 196, 196, 196, 196],
    STEP: 0.28,
    startBgm() {
      if (!this.enabled || this.bgmOn || !this.ensure()) return;
      this.bgmOn = true;
      this.nextLoop = this.ctx.currentTime + 0.1;
      this.scheduleLoop();
    },
    scheduleLoop() {
      if (!this.bgmOn) return;
      const t0 = this.nextLoop;
      for (let i = 0; i < 16; i++) {
        const when = t0 + i * this.STEP;
        if (this.MELODY[i]) this.note(this.MELODY[i], when, this.STEP * 0.85, 'triangle', 0.022);
        if (i % 2 === 0) this.note(this.BASS[i], when, this.STEP * 1.6, 'sine', 0.035);
      }
      this.nextLoop = t0 + 16 * this.STEP;
      this.bgmTimer = setTimeout(() => this.scheduleLoop(),
        Math.max(50, (this.nextLoop - this.ctx.currentTime - 0.2) * 1000));
    },
    stopBgm() { this.bgmOn = false; clearTimeout(this.bgmTimer); },
    toggle() {
      this.enabled = !this.enabled;
      if (this.enabled) { this.ensure(); this.startBgm(); this.chime(); }
      else this.stopBgm();
      saveState();
      return this.enabled;
    }
  };
  /* 브라우저 자동재생 정책: 첫 입력(키/터치)에서 오디오 시작 */
  function bootAudio() {
    if (SND.enabled) { SND.ensure(); SND.startBgm(); }
    window.removeEventListener('keydown', bootAudio);
    window.removeEventListener('pointerdown', bootAudio);
  }
  window.addEventListener('keydown', bootAudio);
  window.addEventListener('pointerdown', bootAudio);
  const TILE_W = 128, TILE_H = 64;
  const MOVE_MS = 200;
  const ASSET_DIR = './images/game/';

  /* ---------------- 맵 ---------------- */
  const COLS = 16, ROWS = 16;
  const PATH = 1;
  const MAP = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  function carve(c1, r1, c2, r2) {
    for (let c = Math.min(c1, c2); c <= Math.max(c1, c2); c++)
      for (let r = Math.min(r1, r2); r <= Math.max(r1, r2); r++) MAP[r][c] = PATH;
  }
  carve(7, 3, 8, 11);    // 세로 큰길
  carve(1, 7, 14, 8);    // 가로 큰길
  carve(3, 4, 3, 7);     // 천재교과서 진입로
  carve(8, 2, 8, 2);     // EBS 문 앞
  carve(14, 3, 14, 7);   // 작업실 진입로
  carve(13, 6, 13, 7);   // 성장 기록관 진입로
  carve(4, 9, 4, 12);    // 지영의 집 진입로
  carve(14, 9, 14, 12);  // 학교 진입로
  carve(9, 9, 9, 13);    // 우체국 진입로

  /* 문(door)은 항상 발자국 동쪽(오른쪽 벽) 앞 타일 — 스프라이트의 문 위치와 일치 */
  const BUILDINGS = [
    { key: 'house',   img: 'bld_house',   col: 2,  row: 11, door: [4, 12],  icon: '🏠', label: '지영의 집',    script: 'about' },
    { key: 'chunjae', img: 'bld_chunjae', col: 1,  row: 3,  door: [3, 4],   icon: '🏫', label: '천재교과서',   script: 'career0' },
    { key: 'ebs',     img: 'bld_ebs',     col: 6,  row: 1,  door: [8, 2],   icon: '📺', label: 'EBS',         script: 'career1' },
    { key: 'studio',  img: 'bld_studio',  col: 12, row: 2,  door: [14, 3],  icon: '⚒️', label: '작업실',      script: 'projects' },
    { key: 'archive', img: 'bld_archive', col: 11, row: 5,  door: [13, 6],  icon: '📚', label: '성장 기록관', script: 'growth' },
    { key: 'school',  img: 'bld_school',  col: 12, row: 11, door: [14, 12], icon: '🎓', label: '학교',        script: 'education' },
    { key: 'post',    img: 'bld_post',    col: 7,  row: 12, door: [9, 13],  icon: '📮', label: '우체국',      script: 'contact' }
  ];

  const PROPS = [
    ...[[0,1],[4,0],[10,0],[15,1],[0,9],[1,14],[5,14],[11,14],[15,14],[10,10],[5,5],[15,10]].map(([c, r]) => ({ type: 'tree', col: c, row: r })),
    ...[[5,10],[10,4],[2,9]].map(([c, r]) => ({ type: 'rock', col: c, row: r }))
  ];

  /* ---------------- 충돌 ---------------- */
  const blocked = new Set();
  BUILDINGS.forEach(b => {
    for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++)
      blocked.add((b.row + r) + ',' + (b.col + c));
  });
  PROPS.forEach(p => blocked.add(p.row + ',' + p.col));
  const walkable = (col, row) =>
    col >= 0 && row >= 0 && col < COLS && row < ROWS && !blocked.has(row + ',' + col);

  /* ---------------- 좌표 / 에셋 ---------------- */
  const gridToScreen = (col, row) => ({ x: (col - row) * TILE_W / 2, y: (col + row) * TILE_H / 2 });

  const IMAGES = {};
  const MANIFEST = {
    grass_a: 'tile_grass_a.png', grass_b: 'tile_grass_b.png', path: 'tile_path.png',
    tree: 'tree.png', rock: 'rock.png', character: 'character.png'
  };
  BUILDINGS.forEach(b => { MANIFEST[b.img] = b.img + '.png'; });
  const loadAssets = () => Promise.all(Object.keys(MANIFEST).map(k => new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => { IMAGES[k] = img; res(); };
    img.onerror = () => rej(new Error('이미지 로드 실패: ' + MANIFEST[k]));
    img.src = ASSET_DIR + MANIFEST[k];
  })));

  /* ---------------- 플레이어 ---------------- */
  const startPos = (saved.pos && walkable(saved.pos.col, saved.pos.row)) ? saved.pos : { col: 4, row: 10 };
  const player = { col: startPos.col, row: startPos.row, fromCol: startPos.col, fromRow: startPos.row, moving: false, moveStart: 0, dir: 'down' };
  const DIR_DELTA = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const DIR_ROW = { down: 0, left: 1, right: 2, up: 3 };

  function tryMove(dir) {
    if (player.moving || dlg.open) return;
    player.dir = dir;
    const [dc, dr] = DIR_DELTA[dir];
    const nc = player.col + dc, nr = player.row + dr;
    if (!walkable(nc, nr)) return;
    player.fromCol = player.col; player.fromRow = player.row;
    player.col = nc; player.row = nr;
    player.moving = true;
    player.moveStart = performance.now();
    SND.foot();
    saveState();
  }
  const doorBuilding = () =>
    BUILDINGS.find(b => b.door[0] === player.col && b.door[1] === player.row) || null;

  /* ---------------- 입력 ---------------- */
  const held = new Set();
  const KEYMAP = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right'
  };
  window.addEventListener('keydown', e => {
    if (dlg.open) {
      if (e.key === 'Escape') { closeDialog(); e.preventDefault(); }
      else if (e.key === ' ' || e.key === 'Enter') { advanceDialog(); e.preventDefault(); }
      return;
    }
    const dir = KEYMAP[e.key];
    if (dir) { held.add(dir); e.preventDefault(); return; }
    if (e.key === ' ' || e.key === 'Enter') {
      const b = doorBuilding();
      if (b) { startDialog(b); e.preventDefault(); }
    }
  });
  window.addEventListener('keyup', e => { const d_ = KEYMAP[e.key]; if (d_) held.delete(d_); });

  document.querySelectorAll('[data-dir]').forEach(btn => {
    const dir = btn.dataset.dir;
    btn.addEventListener('pointerdown', e => { e.preventDefault(); held.add(dir); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev =>
      btn.addEventListener(ev, e => { e.preventDefault(); held.delete(dir); }));
  });
  const aBtn = document.getElementById('action-btn');
  aBtn.addEventListener('pointerdown', e => {
    e.preventDefault();
    if (dlg.open) { advanceDialog(); return; }
    const b = doorBuilding();
    if (b) startDialog(b);
  });

  /* ---------------- 캔버스 / 카메라 ---------------- */
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  let scale = 1, originX = 0, originY = 0;
  function resize() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    const minX = gridToScreen(0, ROWS - 1).x - TILE_W / 2;
    const maxX = gridToScreen(COLS - 1, 0).x + TILE_W / 2;
    const minY = -TILE_H / 2 - 190;
    const maxY = gridToScreen(COLS - 1, ROWS - 1).y + TILE_H / 2 + 20;
    scale = Math.min(canvas.width / (maxX - minX + 40), canvas.height / (maxY - minY + 60));
    originX = canvas.width / 2 - ((minX + maxX) / 2) * scale;
    originY = canvas.height / 2 - ((minY + maxY) / 2) * scale;
  }
  window.addEventListener('resize', resize);

  /* ---------------- 렌더링 ---------------- */
  function drawImageAt(img, sx, sy, ox, oy) {
    ctx.drawImage(img,
      originX + (sx - ox) * scale, originY + (sy - oy) * scale,
      img.width * scale, img.height * scale);
  }
  function playerScreenPos(now) {
    let col = player.col, row = player.row;
    if (player.moving) {
      let t = (now - player.moveStart) / MOVE_MS;
      if (t >= 1) { player.moving = false; t = 1; }
      col = player.fromCol + (player.col - player.fromCol) * t;
      row = player.fromRow + (player.row - player.fromRow) * t;
    }
    return { ...gridToScreen(col, row), depth: col + row };
  }
  function roundedRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  const isTouch = window.matchMedia('(pointer: coarse)').matches;

  function render(now) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const img = MAP[r][c] === PATH ? IMAGES.path : ((r + c) % 2 ? IMAGES.grass_a : IMAGES.grass_b);
      const p = gridToScreen(c, r);
      drawImageAt(img, p.x, p.y, TILE_W / 2, TILE_H / 2);
    }

    const pp = playerScreenPos(now);
    const drawables = [];
    BUILDINGS.forEach(b => {
      const fc = b.col + 1, fr = b.row + 1;
      const bx = gridToScreen((b.col + fc) / 2, (b.row + fr) / 2).x;
      const fy = gridToScreen(fc, fr).y;
      const img = IMAGES[b.img];
      drawables.push({ depth: fc + fr, draw: () => drawImageAt(img, bx, fy, img.width / 2, img.height - TILE_H / 2 - 6) });
    });
    PROPS.forEach(o => {
      const p = gridToScreen(o.col, o.row);
      const img = IMAGES[o.type];
      drawables.push({ depth: o.col + o.row, draw: () => drawImageAt(img, p.x, p.y, img.width / 2, img.height - TILE_H / 2 - 6) });
    });
    const charImg = IMAGES.character;
    const CW = charImg.width / 3, CH = charImg.height / 4;
    let frameCol = 0;
    if (player.moving) frameCol = ((now - player.moveStart) / MOVE_MS) < 0.5 ? 1 : 2;
    drawables.push({
      depth: pp.depth + 0.01,
      draw: () => ctx.drawImage(charImg,
        frameCol * CW, DIR_ROW[player.dir] * CH, CW, CH,
        originX + (pp.x - CW / 2) * scale, originY + (pp.y - (CH - 14)) * scale,
        CW * scale, CH * scale)
    });
    drawables.sort((a, b) => a.depth - b.depth);
    drawables.forEach(d => d.draw());

    // 건물 이름표
    const fontPx = Math.max(10, 11.5 * (window.devicePixelRatio || 1));
    ctx.font = "700 " + fontPx + "px 'SUITE', sans-serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    BUILDINGS.forEach(b => {
      const fc = b.col + 1, fr = b.row + 1;
      const bx = gridToScreen((b.col + fc) / 2, (b.row + fr) / 2).x;
      const fy = gridToScreen(fc, fr).y;
      const img = IMAGES[b.img];
      const sx = originX + bx * scale;
      const sy = originY + (fy - (img.height - TILE_H / 2 - 6) - 16) * scale;
      const text = b.icon + ' ' + b.label + (visited.has(b.key) ? ' ✓' : '');
      const tw = ctx.measureText(text).width;
      ctx.fillStyle = visited.has(b.key) ? 'rgba(234,242,236,0.92)' : 'rgba(255,255,255,0.88)';
      roundedRect(sx - tw / 2 - 10, sy - fontPx * 0.85, tw + 20, fontPx * 1.7, 8);
      ctx.fill();
      ctx.strokeStyle = 'rgba(34,48,31,0.18)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = visited.has(b.key) ? '#2F6B45' : '#22301F';
      ctx.fillText(text, sx, sy);
    });

    // 문 앞 힌트
    const b = doorBuilding();
    if (b && !dlg.open && !player.moving) {
      const sx = originX + pp.x * scale;
      const sy = originY + (pp.y - (CH - 8)) * scale - fontPx * 2.2;
      const text = isTouch ? 'Ⓐ ' + b.label + ' 들어가기' : 'Space — ' + b.label + ' 들어가기';
      const tw = ctx.measureText(text).width;
      ctx.fillStyle = 'rgba(47,107,69,0.95)';
      roundedRect(sx - tw / 2 - 12, sy - fontPx, tw + 24, fontPx * 2, 10);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.fillText(text, sx, sy);
    }
    aBtn.classList.toggle('show', (!!b && !dlg.open) || dlg.open);
  }

  /* ============================================================
     대화 시스템
     script: { nodeId: { lines: [문자열 | {t, card}], choices?: [{label, next|href}] } }
     - lines를 한 줄씩 타자 효과로 출력, 마지막 줄 뒤 choices 표시 (없으면 종료)
     - card: 해당 줄이 표시되는 동안 대화창 위에 뜨는 카드 (스탯/배지/미디어)
  ============================================================ */
  const dlgEl = document.getElementById('dialog');
  const dlgCard = document.getElementById('dlg-card');
  const dlgText = document.getElementById('dlg-text');
  const dlgNext = document.getElementById('dlg-next');
  const dlgChoices = document.getElementById('dlg-choices');
  const dlgBuilding = document.getElementById('dlg-building');

  const dlg = { open: false, script: null, node: null, lineIdx: 0, typing: false, typeTimer: null, fullText: '' };

  function startDialog(b) {
    dlg.open = true;
    held.clear();
    SND.chime();
    dlg.script = SCRIPTS[b.script]();
    dlgBuilding.textContent = b.icon + ' ' + b.label;
    dlgEl.classList.add('open');
    if (!visited.has(b.key)) {
      visited.add(b.key);
      saveState();
      updateProgress();
    }
    gotoNode('start');
  }
  function closeDialog() {
    dlg.open = false;
    clearInterval(dlg.typeTimer);
    dlgEl.classList.remove('open');
    dlgCard.innerHTML = '';
    dlgCard.classList.remove('show');
    if (visited.size === BUILDINGS.length && !cleared) showClear();
  }
  function gotoNode(id) {
    if (id === 'end') { closeDialog(); return; }
    const raw = dlg.script[id];
    dlg.node = { lines: expandLines(raw.lines), choices: raw.choices, next: raw.next };
    dlg.lineIdx = -1;
    dlgChoices.innerHTML = '';
    nextLine();
  }

  /* 긴 대사를 대화창(3줄)에 맞게 문장 단위로 분할 — 스크롤 방지 */
  const MAX_CHARS = 78;
  function splitText(text) {
    if (text.length <= MAX_CHARS) return [text];
    const sentences = text.split(/(?<=[.!?…])\s+/u);
    const out = [];
    let buf = '';
    sentences.forEach(s => {
      // 한 문장이 그 자체로 너무 길면 쉼표/공백에서 추가 분할
      while (s.length > MAX_CHARS) {
        let cut = Math.max(s.lastIndexOf(', ', MAX_CHARS), s.lastIndexOf(' ', MAX_CHARS));
        if (cut < MAX_CHARS * 0.4) cut = MAX_CHARS;
        const head = s.slice(0, cut + 1).trim();
        if (buf) { out.push(buf); buf = ''; }
        out.push(head);
        s = s.slice(cut + 1).trim();
      }
      if ((buf + ' ' + s).trim().length > MAX_CHARS) { out.push(buf); buf = s; }
      else buf = (buf ? buf + ' ' : '') + s;
    });
    if (buf) out.push(buf);
    return out;
  }
  function expandLines(lines) {
    const out = [];
    lines.forEach(l => {
      const e = typeof l === 'string' ? { t: l } : l;
      splitText(e.t).forEach((part, i) => {
        out.push(i === 0 ? Object.assign({}, e, { t: part }) : { t: part });
      });
    });
    return out;
  }
  function lineEntry(i) {
    const l = dlg.node.lines[i];
    return typeof l === 'string' ? { t: l } : l;
  }
  function nextLine() {
    dlg.lineIdx++;
    if (dlg.lineIdx >= dlg.node.lines.length) { showChoices(); return; }
    const entry = lineEntry(dlg.lineIdx);
    if (entry.card !== undefined) {
      dlgCard.innerHTML = entry.card || '';
      dlgCard.classList.toggle('show', !!entry.card);
      dlgCard.scrollTop = 0;
    }
    typeText(entry.t);
  }
  function typeText(text) {
    clearInterval(dlg.typeTimer);
    dlg.fullText = text;
    dlg.typing = true;
    dlgNext.style.visibility = 'hidden';
    let i = 0;
    dlgText.textContent = '';
    dlg.typeTimer = setInterval(() => {
      i += 2;                                  // 2글자씩 (한글 속도감)
      dlgText.textContent = text.slice(0, i);
      if (i >= text.length) finishTyping();
    }, 24);
  }
  function finishTyping() {
    clearInterval(dlg.typeTimer);
    dlg.typing = false;
    dlgText.textContent = dlg.fullText;
    const last = dlg.lineIdx >= dlg.node.lines.length - 1;
    dlgNext.style.visibility = (last && dlg.node.choices) ? 'hidden' : 'visible';
    if (last && dlg.node.choices) showChoiceButtons();
  }
  function advanceDialog() {
    if (!dlg.open) return;
    if (dlg.typing) { finishTyping(); return; }
    if (dlg.lineIdx >= dlg.node.lines.length - 1) {
      if (dlg.node.choices) return;            // 선택지 대기 중
      gotoNode(dlg.node.next || 'end');
      return;
    }
    nextLine();
  }
  function showChoices() { showChoiceButtons(); }
  function showChoiceButtons() {
    if (!dlg.node.choices) return;
    dlgChoices.innerHTML = '';
    dlg.node.choices.forEach(c => {
      const btn = document.createElement('button');
      btn.textContent = c.label;
      btn.addEventListener('click', e => {
        e.stopPropagation();
        if (c.action) c.action();
        if (c.href) { window.open(c.href, c.self ? '_self' : '_blank'); return; }
        dlgChoices.innerHTML = '';
        gotoNode(c.next);
      });
      dlgChoices.appendChild(btn);
    });
  }
  dlgEl.querySelector('.dlg-box').addEventListener('click', advanceDialog);
  document.getElementById('dlg-close').addEventListener('click', e => { e.stopPropagation(); closeDialog(); });

  /* PC에서 선택지 줄 가로 드래그 스크롤 + 마우스 휠 스크롤 */
  (function enableDragScroll(el) {
    let isDown = false, startX = 0, startLeft = 0, dragged = false;
    el.addEventListener('pointerdown', e => {
      isDown = true; dragged = false;
      startX = e.clientX; startLeft = el.scrollLeft;
    });
    el.addEventListener('pointermove', e => {
      if (!isDown) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 5) dragged = true;
      if (dragged) { el.scrollLeft = startLeft - dx; e.preventDefault(); }
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev =>
      el.addEventListener(ev, () => { isDown = false; }));
    // 드래그였다면 버튼 클릭으로 이어지지 않게 차단
    el.addEventListener('click', e => {
      if (dragged) { e.stopPropagation(); e.preventDefault(); dragged = false; }
    }, true);
    // 세로 휠로도 가로 스크롤
    el.addEventListener('wheel', e => {
      if (el.scrollWidth > el.clientWidth) {
        el.scrollLeft += (e.deltaY || e.deltaX);
        e.preventDefault();
      }
    }, { passive: false });
  })(dlgChoices);

  /* ---------------- 카드 빌더 (data.js 기반) ---------------- */
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  function careerMonths(period) {
    const m = period.match(/(\d{4})\.(\d{2})\.(\d{2})\s*~\s*(\d{4})\.(\d{2})\.(\d{2})/);
    if (!m) return 0;
    const s = new Date(+m[1], +m[2] - 1, +m[3]);
    const e = new Date(+m[4], +m[5] - 1, +m[6] + 1);
    let months = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
    if (e.getDate() < s.getDate()) months--;
    return Math.max(0, months);
  }
  const fmtM = m => (Math.floor(m / 12) ? Math.floor(m / 12) + '년' : '') + (Math.floor(m / 12) && m % 12 ? ' ' : '') + (m % 12 ? m % 12 + '개월' : '');

  const statsCard = () =>
    '<div class="p-sub" style="margin-top:0;">역량 스탯 — 클래스: ' + esc(D.meta.className) + '</div>' +
    D.about.stats.map(s => '<div class="p-stat"><span>' + esc(s.label) + '</span><i><b style="width:' + s.value * 20 + '%"></b></i></div>').join('');
  const badgesCard = () =>
    '<div class="p-badges">' + D.about.achievements.map(b =>
      '<div class="p-badge">' + b.icon + ' <b>' + esc(b.title) + '</b><span>' + esc(b.desc) + '</span></div>').join('') + '</div>';
  const mediaCard = m => {
    if (!m) return '';
    const inner = m.type === 'video'
      ? '<video class="p-img" controls playsinline preload="metadata"><source src="' + m.src + '" type="video/mp4"/></video>'
      : '<img class="p-img" src="' + m.src + '" alt=""/>';
    return inner + (m.caption ? '<div class="p-cap">' + esc(m.caption) + '</div>' : '');
  };
  const tagsHtml = tags => '<div class="p-tags">' + tags.map(t => '<em>' + esc(t) + '</em>').join('') + '</div>';
  const listCard = items => '<ul class="p-list">' + items.map(i =>
    '<li>' + (i.b ? '<b>' + esc(i.b) + '</b><span>' + esc(i.s) + '</span>' : esc(i)) + '</li>').join('') + '</ul>';

  /* ---------------- 대화 스크립트 ----------------
     대사 원문은 data.js의 dialogue 섹션 (설명 톤, 해요체)
     구조·수치가 필요한 부분은 카드로 보여주고, 대사는 이야기를 담당 */
  const T = D.dialogue;
  const docLink = tab => ({ label: '\ud83d\udcc4 문서로 자세히 보기', href: './text.html#' + tab });
  const withCard = (lines, card) => lines.map((t, i) => i === 0 ? { t: t, card: card } : t);

  /* '{period}' 토큰 → "2021년 8월부터 2023년 6월까지, 1년 10개월 동안 일했어요." */
  function periodTalk(c) {
    const m = c.period.match(/(\d{4})\.(\d{2})\.\d{2}\s*~\s*(\d{4})\.(\d{2})\.\d{2}/);
    if (!m) return c.period;
    return m[1] + '년 ' + (+m[2]) + '월부터 ' + m[3] + '년 ' + (+m[4]) + '월까지, ' +
      fmtM(careerMonths(c.period)) + ' 동안 일했어요.';
  }
  const fillPeriod = (lines, c) => lines.map(t => t === '{period}' ? periodTalk(c) : t);

  const SCRIPTS = {

    about() {
      const a = D.about;
      const menu = [
        { label: '스탯 보여주세요 \ud83d\udcca', next: 'stats' },
        { label: '업적이 궁금해요 \ud83c\udfc5', next: 'badges' },
        { label: '어떤 사람이에요?', next: 'intro' },
        docLink('about'),
        { label: '다음에 올게요 \ud83d\udc4b', next: 'bye' }
      ];
      return {
        start:  { lines: T.about.greet, choices: menu },
        stats:  { lines: withCard(T.about.stats, statsCard()), choices: menu },
        badges: { lines: withCard(T.about.badges, badgesCard()), choices: menu },
        intro:  { lines: withCard(T.about.intro, null), choices: menu },
        bye:    { lines: T.about.bye }
      };
    },

    career0() { return careerScript(D.careers[0], T.chunjae); },
    career1() { return careerScript(D.careers[1], T.ebs); },

    projects() {
      const menuChoices = D.projects.map((p, i) => ({ label: (i + 1) + '. ' + p.title, next: 'proj' + i }));
      menuChoices.push(docLink('projects'), { label: '그만 볼게요 \ud83d\udc4b', next: 'bye' });
      const script = {
        start: { lines: T.projects.greet, choices: menuChoices },
        menu:  { lines: T.projects.menuMore, choices: menuChoices },
        bye:   { lines: T.projects.bye }
      };
      D.projects.forEach((p, i) => {
        const talk = T.projects.items[p.id] || ['\u300c' + p.title + '\u300d 이야기예요.'];
        script['proj' + i] = {
          lines: withCard(talk, tagsHtml(p.tags) + mediaCard(p.media)),
          choices: [
            { label: '다른 작업물 보기', next: 'menu' },
            docLink('projects'),
            { label: '그만 볼게요 \ud83d\udc4b', next: 'bye' }
          ]
        };
      });
      return script;
    },

    education() {
      const e = D.education;
      const menu = [
        { label: '전공에서 뭘 배웠어요?', next: 'points' },
        { label: '수료한 교육도 있어요? \ud83c\udf92', next: 'training' },
        docLink('edu'),
        { label: '그만 볼게요 \ud83d\udc4b', next: 'bye' }
      ];
      return {
        start: { lines: T.education.greet, choices: menu },
        points: {
          lines: withCard(T.education.points, listCard(e.school.points.map(p => ({ b: p.title, s: p.desc })))),
          choices: menu
        },
        training: {
          lines: withCard(T.education.training, listCard(e.trainings.map(t => ({ b: t.name, s: t.period })))),
          choices: menu
        },
        bye: { lines: T.education.bye }
      };
    },

    growth() {
      const g = D.growth;
      const menu = [
        { label: '스킬 서가 \ud83d\udcd6', next: 'skills' },
        { label: '자격증 진열장 \ud83d\udcdc', next: 'certs' },
        { label: '언어 코너 \ud83d\udde3\ufe0f', next: 'langs' },
        { label: '트로피 \ud83c\udfc6', next: 'awards' },
        docLink('growth'),
        { label: '그만 볼게요 \ud83d\udc4b', next: 'bye' }
      ];
      return {
        start: { lines: T.growth.greet, choices: menu },
        skills: {
          lines: withCard(T.growth.skills,
            g.skills.groups.map(gr => '<div class="p-sub">' + esc(gr.name) + '</div>' + listCard(gr.items)).join('')),
          choices: menu
        },
        certs: {
          lines: withCard(T.growth.certs, listCard(g.certifications.items.map(c => ({ b: c.name, s: c.date })))),
          choices: menu
        },
        langs: {
          lines: withCard(T.growth.langs, listCard(g.languages.items.map(l => ({ b: l.name, s: l.points[0] })))),
          choices: menu
        },
        awards: {
          lines: withCard(T.growth.awards, listCard(g.awards.items.map(a => ({ b: a.name, s: a.date })))),
          choices: menu
        },
        bye: { lines: T.growth.bye }
      };
    },

    contact() {
      const c = D.contact;
      return {
        start: {
          lines: T.contact.greet,
          choices: [
            { label: '\ud83d\udc9a 좋아요 남기기', action: () => addLike(), next: 'liked' },
            { label: '\u2709\ufe0f 이메일 보내기', href: 'mailto:' + c.email, self: true },
            { label: '\ud83d\udcbb GitHub 구경하기', href: c.github },
            docLink('contact'),
            { label: '다음에 보낼게요 \ud83d\udc4b', next: 'bye' }
          ]
        },
        liked: { lines: T.contact.liked },
        bye: { lines: T.contact.bye }
      };
    }
  };

  function careerScript(c, talk) {
    const menu = [
      { label: '무슨 일을 했어요? \ud83d\udcbc', next: 'tasks' },
      { label: '배운 게 있다면?', next: 'insight' },
      docLink('career'),
      { label: '그만 볼게요 \ud83d\udc4b', next: 'bye' }
    ];
    return {
      start:   { lines: fillPeriod(talk.greet, c), choices: menu },
      tasks:   { lines: withCard(talk.tasks, listCard(c.tasks.map(t => ({ b: t.title, s: t.desc })))), choices: menu },
      insight: { lines: withCard(talk.insight, null), choices: menu },
      bye:     { lines: talk.bye }
    };
  }

  /* ---------------- 진행도 / 좋아요 / GAME CLEAR ---------------- */
  const progressEl = document.getElementById('progress');
  const likeBtn = document.getElementById('like-btn');
  const likeCountEl = document.getElementById('like-count');
  const clearEl = document.getElementById('clear');

  function updateProgress() {
    progressEl.textContent = (cleared ? '👑' : '🗺️') + ' ' + visited.size + '/' + BUILDINGS.length;
  }
  function updateLikes() { likeCountEl.textContent = likes; }

  function addLike() {
    likes++;
    saveState();
    updateLikes();
    burstHearts();
    SND.jingle();
  }
  function burstHearts() {
    const rect = likeBtn.getBoundingClientRect();
    for (let i = 0; i < 7; i++) {
      const h = document.createElement('span');
      h.className = 'heart-fx';
      h.textContent = ['💚', '❤️', '💛', '🧡'][i % 4];
      h.style.left = (rect.left + rect.width / 2 + (Math.random() * 70 - 35)) + 'px';
      h.style.top = (rect.top + rect.height / 2) + 'px';
      h.style.animationDelay = (i * 70) + 'ms';
      document.body.appendChild(h);
      h.addEventListener('animationend', () => h.remove());
    }
  }
  likeBtn.addEventListener('click', addLike);

  const soundBtn = document.getElementById('sound-btn');
  function renderSoundBtn() { soundBtn.textContent = SND.enabled ? '🔊' : '🔇'; }
  soundBtn.addEventListener('click', () => { SND.toggle(); renderSoundBtn(); });
  renderSoundBtn();

  function showClear() {
    cleared = true;
    saveState();
    updateProgress();
    clearEl.classList.add('open');
  }
  document.getElementById('clear-continue').addEventListener('click', () => clearEl.classList.remove('open'));
  document.getElementById('clear-like').addEventListener('click', addLike);

  updateProgress();
  updateLikes();

  /* ---------------- 루프 / 시작 ---------------- */
  function loop(now) {
    if (!player.moving && held.size && !dlg.open) tryMove([...held][held.size - 1]);
    render(now);
    requestAnimationFrame(loop);
  }
  loadAssets().then(() => {
    document.getElementById('loading').style.display = 'none';
    resize();
    requestAnimationFrame(loop);
  }).catch(err => {
    document.getElementById('loading').textContent = err.message;
  });
})();
