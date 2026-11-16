/* Memory Match — game logic */
(function () {
  'use strict';

  const $ = (sel, root) => (root || document).querySelector(sel);
  const THEMES = window.MM_THEMES;
  const MATH = window.MM_MATH;
  const PLAYER_COLORS = ['#ff7a7a', '#3fd4cf', '#ffc247', '#b197fc'];
  // Computer players: how likely each face-up card is to be remembered, and how many cards it can hold in memory.
  const SKILLS = {
    easy: { name: 'Easy', recall: 0.4, memory: 6 },
    medium: { name: 'Medium', recall: 0.7, memory: 12 },
    hard: { name: 'Hard', recall: 0.9, memory: Infinity }
  };
  const CPU_PAUSE = 900;   // ms a computer waits between its moves so people can follow along
  const LEVELS = [
    { id: 'easy', name: 'Easy', cards: 16, grid: [4, 4] },
    { id: 'medium', name: 'Medium', cards: 24, grid: [6, 4] },
    { id: 'hard', name: 'Hard', cards: 36, grid: [6, 6] },
    { id: 'expert', name: 'Expert', cards: 48, grid: [8, 6] },
    { id: 'master', name: 'Master', cards: 64, grid: [8, 8] }
  ];
  // Thinking time (ms) after the second math card is turned over, before answers are shown.
  const MATH_THINK_MS = { add: 1000, addsub: 1000, mult: 1500, div: 1500, mixed: 2000 };
  const STORE_KEY = 'memory-match-settings-v1';

  /* ---------- settings ---------- */
  const settings = {
    players: 2, names: ['', '', '', ''], types: ['human', 'human', 'human', 'human'], skills: ['medium', 'medium', 'medium', 'medium'],
    level: 'easy', theme: 'animals', mathLevel: 'add', sound: true
  };
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    if (saved && typeof saved === 'object') {
      if ([2, 3, 4].includes(saved.players)) settings.players = saved.players;
      if (Array.isArray(saved.names)) saved.names.slice(0, 4).forEach((n, i) => { settings.names[i] = String(n || '').slice(0, 14); });
      if (Array.isArray(saved.types)) saved.types.slice(0, 4).forEach((t, i) => { settings.types[i] = t === 'cpu' ? 'cpu' : 'human'; });
      if (Array.isArray(saved.skills)) saved.skills.slice(0, 4).forEach((s, i) => { if (SKILLS[s]) settings.skills[i] = s; });
      if (LEVELS.some((l) => l.id === saved.level)) settings.level = saved.level;
      if (THEMES.some((t) => t.id === saved.theme)) settings.theme = saved.theme;
      if (MATH.LEVELS.some((m) => m.id === saved.mathLevel)) settings.mathLevel = saved.mathLevel;
      if (typeof saved.sound === 'boolean') settings.sound = saved.sound;
    }
  } catch (e) { /* storage unavailable: defaults are fine */ }
  const save = () => { try { localStorage.setItem(STORE_KEY, JSON.stringify(settings)); } catch (e) { /* ignore */ } };

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const shuffle = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };
  const levelById = (id) => LEVELS.find((l) => l.id === id);
  const themeById = (id) => THEMES.find((t) => t.id === id);
  const mathLevelById = (id) => MATH.LEVELS.find((m) => m.id === id);

  /* ---------- card faces ---------- */
  function faceHTML(theme, item) {
    const label = theme.labels ? '<span class="label' + (item.kind === 'medal' ? ' serif' : '') + '">' + esc(item.name) + '</span>' : '';
    switch (item.kind) {
      case 'shape':
        return '<svg class="shape" viewBox="0 0 100 100" fill="' + item.color + '" aria-hidden="true">' + item.svg + '</svg>';
      case 'math': {
        // Shrink long problems so they always fit the card width.
        const size = Math.min(0.3, 0.95 / (item.text.length * 0.52)).toFixed(3);
        return '<span class="expr" style="font-size:calc(var(--cs) * ' + size + ')">' + esc(item.text) + '</span>' +
          '<span class="ans">= ' + item.value + '</span>';
      }
      case 'medal':
        return '<span class="medal" style="--c:' + item.color + '"><span class="glyph">' + item.glyph + '</span></span>' + label;
      default:
        return '<span class="glyph">' + item.glyph + '</span>' + label;
    }
  }

  /* ---------- sound (synthesised, no audio files) ---------- */
  const Sound = {
    ctx: null,
    ensure() {
      if (!settings.sound) return null;
      // iPhone and iPad: "playback" lets sounds play even when the side switch is set to silent.
      try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* not supported */ }
      try {
        if (!this.ctx) {
          const AC = window.AudioContext || window.webkitAudioContext;
          if (!AC) return null;
          this.ctx = new AC();
        }
        if (this.ctx.state === 'suspended') this.ctx.resume();
        return this.ctx;
      } catch (e) { return null; }
    },
    tone(freq, start, dur, type, vol, slideTo) {
      const ctx = this.ensure();
      if (!ctx) return;
      const t = ctx.currentTime + start;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, t);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(vol || 0.12, t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + dur + 0.03);
    },
    flip() { this.tone(620, 0, 0.09, 'triangle', 0.1, 380); },
    match() { [659, 880, 1319].forEach((f, i) => this.tone(f, i * 0.09, 0.28, 'sine', 0.13)); },
    miss() { this.tone(240, 0, 0.16, 'sine', 0.12, 190); this.tone(190, 0.14, 0.22, 'sine', 0.12, 150); },
    turn() { this.tone(520, 0, 0.12, 'sine', 0.06); },
    win() { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => this.tone(f, i * 0.13, 0.4, 'triangle', 0.13)); }
  };

  /* ============================================================
     SETUP SCREEN
     ============================================================ */
  const elCount = $('#player-count');
  const elSeats = $('#seats');
  const elLevels = $('#levels');
  const elThemes = $('#themes');
  const elSummary = $('#summary');
  const elMathPanel = $('#panel-math');
  const elMathLevels = $('#math-levels');

  function buildSetup() {
    elCount.innerHTML = [2, 3, 4].map((n) =>
      '<button type="button" class="seg" role="radio" data-n="' + n + '" aria-label="' + n + ' players">' + n + '</button>').join('');

    elSeats.innerHTML = PLAYER_COLORS.map((c, i) =>
      '<div class="seat" style="--pc:' + c + '" data-i="' + i + '">' +
      '<span class="avatar"></span>' +
      '<input type="text" maxlength="14" autocomplete="off" autocapitalize="words" spellcheck="false" enterkeyhint="done" aria-label="Player ' + (i + 1) + ' name">' +
      '<div class="seat-opts">' +
      '<div class="segmented small" role="radiogroup" aria-label="Who plays player ' + (i + 1) + '">' +
      '<button type="button" class="seg" role="radio" data-type="human">Person</button>' +
      '<button type="button" class="seg" role="radio" data-type="cpu">Computer</button></div>' +
      '<div class="segmented small skill" role="radiogroup" aria-label="Computer skill for player ' + (i + 1) + '">' +
      Object.keys(SKILLS).map((k) => '<button type="button" class="seg" role="radio" data-skill="' + k + '">' + SKILLS[k].name + '</button>').join('') +
      '</div></div></div>').join('');
    elSeats.querySelectorAll('.seat input').forEach((input, i) => { input.value = settings.names[i]; });

    elLevels.innerHTML = LEVELS.map((l) => {
      const [c, r] = l.grid;
      const d = Math.floor((50 - (r - 1) * 3) / r);
      return '<button type="button" class="tile level" role="radio" data-level="' + l.id + '">' +
        '<span class="check">✓</span>' +
        '<span class="mini-grid" style="--d:' + d + 'px;grid-template-columns:repeat(' + c + ',' + d + 'px)">' + '<i></i>'.repeat(l.cards) + '</span>' +
        '<span><span class="tile-name">' + l.name + '</span><br><span class="tile-sub">' + l.cards + ' cards</span></span>' +
        '</button>';
    }).join('');

    elThemes.innerHTML = THEMES.map((t) => {
      const idx = t.preview || [0, 1, 2, 3];
      return '<button type="button" class="tile" role="radio" data-theme="' + t.id + '">' +
        '<span class="check">✓</span>' +
        '<span class="theme-preview">' + idx.map((i) => '<span class="mini-card">' + faceHTML(t, t.items[i]) + '</span>').join('') + '</span>' +
        '<span class="tile-name">' + esc(t.name) + '</span><br><span class="tile-sub">' + esc(t.blurb) + '</span>' +
        '</button>';
    }).join('');

    elMathLevels.innerHTML = MATH.LEVELS.map((m) =>
      '<button type="button" class="tile level" role="radio" data-math="' + m.id + '">' +
      '<span class="check">✓</span><span class="math-sym">' + m.symbol + '</span>' +
      '<span><span class="tile-name">' + m.name + '</span><br><span class="tile-sub">' + m.label + '</span></span>' +
      '</button>').join('');
    elMathLevels.addEventListener('click', (e) => {
      const b = e.target.closest('.tile');
      if (!b) return;
      settings.mathLevel = b.dataset.math;
      Sound.flip(); refreshSetup(); save();
    });

    elCount.addEventListener('click', (e) => {
      const b = e.target.closest('.seg');
      if (!b) return;
      settings.players = Number(b.dataset.n);
      Sound.flip(); refreshSetup(); save();
    });
    elLevels.addEventListener('click', (e) => {
      const b = e.target.closest('.tile');
      if (!b) return;
      settings.level = b.dataset.level;
      Sound.flip(); refreshSetup(); save();
    });
    elThemes.addEventListener('click', (e) => {
      const b = e.target.closest('.tile');
      if (!b) return;
      settings.theme = b.dataset.theme;
      Sound.flip(); refreshSetup(); save();
      if (settings.theme === 'math') elMathPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
    elSeats.addEventListener('click', (e) => {
      const seat = e.target.closest('.seat');
      if (!seat) return;
      const i = Number(seat.dataset.i);
      const type = e.target.closest('[data-type]'), skill = e.target.closest('[data-skill]');
      if (type) settings.types[i] = type.dataset.type;
      else if (skill) settings.skills[i] = skill.dataset.skill;
      else return;
      Sound.flip(); refreshSetup(); save();
    });
    elSeats.addEventListener('input', (e) => {
      const seat = e.target.closest('.seat');
      if (!seat) return;
      const i = Number(seat.dataset.i);
      settings.names[i] = e.target.value;
      $('.avatar', seat).textContent = avatarText(i);
      resetSeries();
      save();
    });
    elSeats.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      const inputs = [...elSeats.querySelectorAll('.seat:not([hidden]) input')];
      const next = inputs[inputs.indexOf(e.target) + 1];
      if (next) next.focus(); else e.target.blur();
    });
    $('#start-btn').addEventListener('click', () => { startIndex = 0; startGame(); });
    refreshSetup();
  }

  function initial(name, i) {
    const n = String(name || '').trim();
    return n ? Array.from(n)[0].toUpperCase() : String(i + 1);
  }
  const isCpu = (i) => settings.types[i] === 'cpu';
  const avatarText = (i) => (isCpu(i) ? '🤖' : initial(settings.names[i], i));

  // Names for the players in this game. Blank computer seats become "Computer", or "Computer 1", "Computer 2"...
  function seatNames() {
    let blankCpu = 0;
    for (let i = 0; i < settings.players; i++) if (isCpu(i) && !settings.names[i].trim()) blankCpu++;
    let k = 0;
    const out = [];
    for (let i = 0; i < settings.players; i++) {
      const nm = settings.names[i].trim();
      if (nm) out.push(nm);
      else if (isCpu(i)) { k++; out.push(blankCpu > 1 ? 'Computer ' + k : 'Computer'); }
      else out.push('Player ' + (i + 1));
    }
    return out;
  }

  function refreshSetup() {
    resetSeries();   // any change on the settings screen starts a fresh run of games
    elCount.querySelectorAll('.seg').forEach((b) => {
      const on = Number(b.dataset.n) === settings.players;
      b.classList.toggle('selected', on); b.setAttribute('aria-checked', on);
    });
    elSeats.querySelectorAll('.seat').forEach((row, i) => {
      row.hidden = i >= settings.players;
      const input = $('input', row);
      input.placeholder = isCpu(i) ? 'Computer' : 'Player ' + (i + 1);
      if (input.value !== settings.names[i]) input.value = settings.names[i];
      $('.avatar', row).textContent = avatarText(i);
      row.querySelectorAll('[data-type]').forEach((b) => {
        const on = b.dataset.type === settings.types[i];
        b.classList.toggle('selected', on); b.setAttribute('aria-checked', on);
      });
      const skill = $('.skill', row);
      skill.hidden = !isCpu(i);
      skill.querySelectorAll('[data-skill]').forEach((b) => {
        const on = b.dataset.skill === settings.skills[i];
        b.classList.toggle('selected', on); b.setAttribute('aria-checked', on);
      });
    });
    elLevels.querySelectorAll('.tile').forEach((b) => {
      const on = b.dataset.level === settings.level;
      b.classList.toggle('selected', on); b.setAttribute('aria-checked', on);
    });
    elThemes.querySelectorAll('.tile').forEach((b) => {
      const on = b.dataset.theme === settings.theme;
      b.classList.toggle('selected', on); b.setAttribute('aria-checked', on);
    });
    const isMath = settings.theme === 'math';
    const m = mathLevelById(settings.mathLevel);
    elMathPanel.hidden = !isMath;
    elMathLevels.querySelectorAll('.tile').forEach((b) => {
      const on = b.dataset.math === settings.mathLevel;
      b.classList.toggle('selected', on); b.setAttribute('aria-checked', on);
    });
    $('#math-hint').textContent = 'Example match: ' + m.example + '. Bigger boards use bigger numbers.';
    const l = levelById(settings.level);
    let cpus = 0;
    for (let i = 0; i < settings.players; i++) if (isCpu(i)) cpus++;
    const who = settings.players + ' players' + (cpus ? ' (' + cpus + (cpus === 1 ? ' computer' : ' computers') + ')' : '');
    elSummary.innerHTML = '<b>' + who + '</b> · <b>' + l.name + '</b> (' + l.cards + ' cards) · <b>' + esc(themeById(settings.theme).name) +
      (isMath ? ' ' + m.name + '</b> (' + m.label + ')' : '</b>');
  }

  /* ============================================================
     GAME
     ============================================================ */
  const elBoard = $('#board');
  const elWrap = $('#board-wrap');
  const elPlayers = $('#players');
  const elToast = $('#toast');
  const elFill = $('#progress-fill');
  const elProgress = $('#progress-label');

  let players = [];
  let deck = [];
  let cardEls = [];
  let current = 0;
  let open = [];        // indices of face-up, unresolved cards
  let locked = false;
  let found = 0;
  let totalPairs = 0;
  let token = 0;        // invalidates pending timers when a game is restarted
  let startIndex = 0;   // rotates who goes first on "Play again"
  let playing = false;
  let mathGame = false; // math cards stay up longer on a miss and show their answers
  // Wins across a run of games. Kept while players press "Next game"; cleared whenever
  // the settings screen is shown or a setting changes. Not saved between visits.
  let series = { wins: [0, 0, 0, 0], games: 0 };
  const resetSeries = () => { series = { wins: [0, 0, 0, 0], games: 0 }; };
  const winsText = (n) => n + (n === 1 ? ' win' : ' wins');

  const later = (fn, ms) => { const t = token; setTimeout(() => { if (t === token) fn(); }, ms); };

  function show(id) {
    document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === id));
  }

  function pickItems(theme, n) {
    const items = theme.items;
    if (theme.tiered) {
      // Keep small boards to the 16 most distinct faces; larger boards add the trickier ones.
      const core = items.slice(0, 16), extra = items.slice(16);
      if (n <= 16) return shuffle(core.slice()).slice(0, n);
      return core.concat(shuffle(extra.slice()).slice(0, n - 16));
    }
    return shuffle(items.slice()).slice(0, n);
  }

  function startGame() {
    token++;
    closeModal();
    stopConfetti();
    const level = levelById(settings.level);
    const theme = themeById(settings.theme);
    totalPairs = level.cards / 2;
    found = 0; open = []; locked = false; playing = true;

    const names = seatNames();
    players = Array.from({ length: settings.players }, (_, i) => ({
      name: names[i],
      initial: avatarText(i),
      color: PLAYER_COLORS[i], score: 0, attempts: 0,
      cpu: isCpu(i), skill: settings.skills[i],
      seen: new Set()     // cards a computer player has noticed and can still remember
    }));
    current = startIndex % players.length;

    deck = [];
    mathGame = theme.id === 'math';
    if (mathGame) {
      MATH.generate(settings.mathLevel, totalPairs).forEach(([a, b], pair) => { deck.push({ pair, item: a }, { pair, item: b }); });
    } else {
      pickItems(theme, totalPairs).forEach((item, pair) => { deck.push({ pair, item }, { pair, item }); });
    }
    shuffle(deck);
    deck.forEach((c) => { c.matched = false; c.up = false; });

    $('#level-label').textContent = level.name + ' · ' + theme.name + (mathGame ? ' ' + mathLevelById(settings.mathLevel).name : '');
    renderPlayers();
    renderBoard(theme);
    updateProgress();
    show('game');
    layoutBoard();
    later(() => toast(players[current].name + ' goes first', players[current].color), 350);
    if (players[current].cpu) cpuSoon(1400);
  }

  function renderPlayers() {
    elPlayers.style.setProperty('--n', players.length);
    elPlayers.innerHTML = players.map((p, i) =>
      '<div class="player" data-i="' + i + '" style="--pc:' + p.color + '">' +
      '<span class="avatar">' + esc(p.initial) + '</span>' +
      '<div class="pinfo"><div class="pname"><span class="pn">' + esc(p.name) + '</span><span class="crown" hidden>👑</span></div><div class="pturn"></div><div class="pwins"></div></div>' +
      '<div class="pscore"><span class="num">0</span><span class="unit">pairs</span></div>' +
      '</div>').join('');
    updatePlayers();
  }

  function updatePlayers(bumped) {
    const top = Math.max(...players.map((p) => p.score));
    const leaders = players.filter((p) => p.score === top).length;
    elPlayers.querySelectorAll('.player').forEach((el, i) => {
      const p = players[i];
      const active = playing && i === current;
      el.classList.toggle('active', active);
      $('.pturn', el).textContent = active ? (p.cpu ? 'Thinking…' : 'Your turn') : (p.cpu ? 'Computer · ' + SKILLS[p.skill].name : '');
      const num = $('.num', el);
      num.textContent = p.score;
      $('.unit', el).textContent = p.score === 1 ? 'pair' : 'pairs';
      $('.crown', el).hidden = !(top > 0 && p.score === top && leaders === 1);
      $('.pwins', el).textContent = winsText(series.wins[i]);
      el.setAttribute('aria-label', p.name + ': ' + p.score + (p.score === 1 ? ' pair' : ' pairs') + (active ? ', current turn' : ''));
      if (bumped === i) { num.classList.remove('bump'); void num.offsetWidth; num.classList.add('bump'); }
    });
  }

  function updateProgress() {
    elProgress.textContent = found + ' of ' + totalPairs + ' pairs found';
    elFill.style.width = (found / totalPairs) * 100 + '%';
  }

  function renderBoard(theme) {
    elBoard.className = 'board theme-' + theme.id;
    elBoard.innerHTML = deck.map((c, i) =>
      '<button type="button" class="card dealing" data-i="' + i + '" style="animation-delay:' + Math.min(i * 16, 900) + 'ms" aria-label="Card ' + (i + 1) + ', face down">' +
      '<span class="card-inner"><span class="card-face card-back"></span><span class="card-face card-front">' + faceHTML(theme, c.item) + '</span></span>' +
      '</button>').join('');
    cardEls = [...elBoard.children];
  }

  /* Pick the rows x columns arrangement that gives the largest cards for the space available. */
  function layoutBoard() {
    const n = deck.length;
    const W = elWrap.clientWidth, H = elWrap.clientHeight;
    if (!n || !W || !H) return;
    const gap = Math.max(5, Math.min(14, Math.round(Math.min(W, H) / 64)));
    let best = null;
    for (let cols = 3; cols <= n / 3; cols++) {
      if (n % cols) continue;
      const rows = n / cols;
      let cw = (W - gap * (cols - 1)) / cols;
      let ch = (H - gap * (rows - 1)) / rows;
      if (cw > ch) cw = ch;                       // never wider than tall
      else if (cw / ch < 0.74) ch = cw / 0.74;    // never too skinny
      // Picture size follows card width, so favour the widest cards; break ties on area.
      const area = cw * ch;
      if (!best || cw > best.cw + 0.5 || (Math.abs(cw - best.cw) <= 0.5 && area > best.area)) best = { cols, cw, ch, area };
    }
    const cw = Math.floor(best.cw), ch = Math.floor(best.ch);
    elBoard.style.gridTemplateColumns = 'repeat(' + best.cols + ', ' + cw + 'px)';
    elBoard.style.gridAutoRows = ch + 'px';
    elBoard.style.gap = gap + 'px';
    elBoard.style.setProperty('--cs', cw + 'px');
    elBoard.style.setProperty('--r', Math.max(6, Math.round(cw * 0.1)) + 'px');
    elBoard.classList.toggle('tiny', cw < 66);
  }

  function setFace(i, up) {
    const c = deck[i], el = cardEls[i];
    c.up = up;
    el.classList.toggle('flipped', up);
    el.setAttribute('aria-label', 'Card ' + (i + 1) + (up ? ': ' + c.item.name : ', face down'));
    if (up) players.forEach((p) => {
      if (!p.cpu || Math.random() > SKILLS[p.skill].recall) return;
      p.seen.delete(i); p.seen.add(i);
      while (p.seen.size > SKILLS[p.skill].memory) p.seen.delete(p.seen.values().next().value);
    });
  }

  /* ---------- computer players ---------- */
  const partnerOf = (i) => deck.findIndex((c, j) => j !== i && c.pair === deck[i].pair);
  const isHidden = (i) => !deck[i].matched && !deck[i].up;

  // Choose the next card for a computer player: use what it remembers, otherwise explore.
  function cpuChoose(p) {
    const hidden = [];
    deck.forEach((c, i) => { if (isHidden(i)) hidden.push(i); });
    if (!hidden.length) return null;
    const pick = (list) => list[Math.floor(Math.random() * list.length)];
    const remembered = (i) => i >= 0 && p.seen.has(i) && isHidden(i);

    if (open.length === 1) {
      const mate = partnerOf(open[0]);
      if (remembered(mate)) return mate;
      return pick(hidden);
    }
    const known = hidden.find((i) => remembered(i) && remembered(partnerOf(i)));
    if (known !== undefined) return known;
    const unseen = hidden.filter((i) => !p.seen.has(i));   // new cards give the most information
    return pick(unseen.length ? unseen : hidden);
  }

  function cpuSoon(ms) {
    const t = token;
    setTimeout(() => { if (t === token) cpuStep(); }, ms);
  }

  function cpuStep() {
    const p = players[current];
    if (!playing || locked || !p || !p.cpu) return;
    if (!elLayer.hidden) { cpuSoon(400); return; }     // wait while a box is open on screen
    const card = cpuChoose(p);
    if (card == null) return;
    onCard(card);
    if (open.length === 1) cpuSoon(CPU_PAUSE);         // second card follows a moment later
  }

  function onCard(i) {
    const c = deck[i];
    if (!playing || locked || !c || c.up || c.matched) return;
    cardEls[i].classList.remove('dealing');
    setFace(i, true);
    Sound.flip();
    open.push(i);
    if (open.length < 2) return;

    locked = true;
    const [a, b] = open;
    // Math cards: give players time to work out the second card before the answers appear,
    // then a moment to see the answers before the pair is judged.
    const reveal = mathGame ? 450 + (MATH_THINK_MS[settings.mathLevel] || 1000) : 0;
    const judge = mathGame ? reveal + 650 : 0;
    if (mathGame) later(() => { cardEls[a].classList.add('solved'); cardEls[b].classList.add('solved'); }, reveal);
    const p = players[current];
    p.attempts++;

    if (deck[a].pair === deck[b].pair) {
      later(() => {
        [a, b].forEach((k) => {
          deck[k].matched = true;
          const el = cardEls[k];
          el.style.setProperty('--oc', p.color);
          el.classList.add('matched');
          el.setAttribute('aria-label', 'Card ' + (k + 1) + ': ' + deck[k].item.name + ', matched by ' + p.name);
          const badge = document.createElement('span');
          badge.className = 'owner';
          badge.textContent = p.initial;
          $('.card-front', el).appendChild(badge);
        });
        players.forEach((q) => { q.seen.delete(a); q.seen.delete(b); });
        p.score++; found++;
        open = []; locked = false;
        Sound.match();
        updatePlayers(current);
        updateProgress();
        if (found === totalPairs) {
          playing = false; locked = true;
          updatePlayers();
          later(endGame, 900);
        } else {
          toast('Match! ' + p.name + ' goes again', p.color, 1100);
          if (p.cpu) cpuSoon(CPU_PAUSE);
        }
      }, judge || 520);
    } else {
      later(() => {
        Sound.miss();
        cardEls[a].classList.add('miss'); cardEls[b].classList.add('miss');
      }, judge || 560);
      later(() => {
        [a, b].forEach((k) => { cardEls[k].classList.remove('miss', 'solved'); setFace(k, false); });
        open = []; locked = false;
        current = (current + 1) % players.length;
        updatePlayers();
        Sound.turn();
        toast(players[current].name + '’s turn', players[current].color, 1000);
        if (players[current].cpu) cpuSoon(CPU_PAUSE);
      }, mathGame ? judge + 4400 : 3500);
    }
  }

  elBoard.addEventListener('click', (e) => {
    const el = e.target.closest('.card');
    if (!el || (players[current] && players[current].cpu)) return;   // a computer's turn: cards are not for people to touch
    onCard(Number(el.dataset.i));
  });
  elBoard.addEventListener('contextmenu', (e) => e.preventDefault());
  elBoard.addEventListener('animationend', (e) => {
    if (e.animationName === 'deal') { e.target.classList.remove('dealing'); e.target.style.animationDelay = ''; }
  });

  // Arrow keys move between cards for keyboard players.
  elBoard.addEventListener('keydown', (e) => {
    const el = e.target.closest('.card');
    if (!el || !e.key.startsWith('Arrow')) return;
    const cols = getComputedStyle(elBoard).gridTemplateColumns.split(' ').length;
    const i = Number(el.dataset.i);
    const j = i + ({ ArrowLeft: -1, ArrowRight: 1, ArrowUp: -cols, ArrowDown: cols }[e.key] || 0);
    if (j >= 0 && j < cardEls.length) { cardEls[j].focus(); e.preventDefault(); }
  });

  /* ---------- toast ---------- */
  let toastTimer = 0;
  function toast(text, color, ms) {
    clearTimeout(toastTimer);
    elToast.textContent = text;
    elToast.style.setProperty('--tc', color || '#fff');
    elToast.classList.add('show');
    toastTimer = setTimeout(() => elToast.classList.remove('show'), ms || 1300);
  }

  /* ---------- end of game ---------- */
  function endGame() {
    const top = Math.max(...players.map((p) => p.score));
    const winners = players.filter((p) => p.score === top);
    const ranked = players.slice().sort((a, b) => b.score - a.score);
    // A tie is not a win: only a single winner adds to the run's tally.
    series.games++;
    if (winners.length === 1) series.wins[players.indexOf(winners[0])]++;
    updatePlayers();
    const title = winners.length === 1
      ? esc(winners[0].name) + ' wins!'
      : 'It’s a tie!';
    const standings = players.map((p, i) => esc(p.name) + ' ' + series.wins[i]).join(' · ');
    const sub = winners.length === 1
      ? 'With ' + top + ' of ' + totalPairs + ' pairs. Well played, everyone.'
      : winners.map((w) => esc(w.name)).join(winners.length === 2 ? ' and ' : ', ') + ' share the win with ' + top + ' pairs each.';
    let place = 0, prev = null;
    const rows = ranked.map((p, i) => {
      if (p.score !== prev) { place = i + 1; prev = p.score; }
      const acc = p.attempts ? Math.round((p.score / p.attempts) * 100) : 0;
      return '<div class="rank' + (p.score === top ? ' win' : '') + '" style="--pc:' + p.color + '">' +
        '<span class="place">' + (['🥇', '🥈', '🥉'][place - 1] || place) + '</span>' +
        '<span class="avatar">' + esc(p.initial) + '</span>' +
        '<span class="rname">' + esc(p.name) + '<small>' + p.attempts + (p.attempts === 1 ? ' turn' : ' turns') + ' · ' + acc + '% accuracy</small></span>' +
        '<span class="rscore">' + p.score + '<small>' + (p.score === 1 ? 'pair' : 'pairs') + '</small></span>' +
        '</div>';
    }).join('');

    Sound.win();
    startConfetti(winners.map((w) => w.color));
    openModal(
      '<div class="trophy">🏆</div><h2 id="modal-title">' + title + '</h2><p class="sub">' + sub + '</p>' +
        '<p class="series">Wins in this run (' + series.games + (series.games === 1 ? ' game' : ' games') + '): ' + standings + '</p>' +
        '<div class="ranks">' + rows + '</div>',
      [
        { label: 'Next game', primary: true, run: () => { startIndex++; startGame(); } },
        { label: 'Change settings', run: toSetup }
      ]
    );
  }

  function toSetup() {
    token++;
    playing = false;
    resetSeries();
    closeModal();
    stopConfetti();
    elToast.classList.remove('show');
    refreshSetup();
    show('setup');
  }

  /* ---------- modal ---------- */
  const elLayer = $('#modal-layer');
  const elModal = $('#modal');
  function openModal(html, actions) {
    elModal.innerHTML = html + '<div class="modal-actions"></div>';
    const bar = $('.modal-actions', elModal);
    actions.forEach((a) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn ' + (a.primary ? 'primary' : 'ghost');
      b.textContent = a.label;
      b.addEventListener('click', a.run);
      bar.appendChild(b);
    });
    elLayer.hidden = false;
    const first = $('.btn', bar);
    if (first) first.focus({ preventScroll: true });
  }
  function closeModal() { elLayer.hidden = true; elModal.innerHTML = ''; }
  function confirmModal(title, text, yesLabel, onYes) {
    openModal('<h2 id="modal-title">' + title + '</h2><p class="sub">' + text + '</p>', [
      { label: yesLabel, primary: true, run: onYes },
      { label: 'Keep playing', run: closeModal }
    ]);
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !elLayer.hidden && playing) closeModal();
  });

  const inProgress = () => playing && (found > 0 || open.length > 0 || players.some((p) => p.attempts > 0));

  $('#restart-btn').addEventListener('click', () => {
    if (inProgress()) confirmModal('Restart this game?', 'The cards will be reshuffled and all scores reset.', 'Restart', startGame);
    else startGame();
  });
  $('#menu-btn').addEventListener('click', () => {
    if (inProgress()) confirmModal('Leave this game?', 'Your current game will end so you can change players, difficulty or card style.', 'Go to settings', toSetup);
    else toSetup();
  });

  /* ---------- sound + fullscreen buttons ---------- */
  const soundBtn = $('#sound-btn');
  function refreshSound() {
    soundBtn.classList.toggle('off', !settings.sound);
    soundBtn.setAttribute('aria-label', settings.sound ? 'Sound on' : 'Sound off');
  }
  soundBtn.addEventListener('click', () => {
    settings.sound = !settings.sound;
    refreshSound(); save();
    if (settings.sound) Sound.match();
  });
  refreshSound();

  const fsBtn = $('#fs-btn');
  const root = document.documentElement;
  const fsRequest = root.requestFullscreen || root.webkitRequestFullscreen;
  if (!fsRequest) fsBtn.hidden = true;
  fsBtn.addEventListener('click', () => {
    const active = document.fullscreenElement || document.webkitFullscreenElement;
    try {
      if (active) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      else { const r = fsRequest.call(root); if (r && r.catch) r.catch(() => {}); }
    } catch (e) { /* not allowed here */ }
  });

  /* ---------- confetti ---------- */
  const canvas = $('#confetti');
  const cx = canvas.getContext('2d');
  let confetti = [], confettiRaf = 0;
  function startConfetti(colors) {
    stopConfetti();
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = canvas.width = innerWidth * dpr, H = canvas.height = innerHeight * dpr;
    const palette = colors.concat(['#f6c453', '#ffffff', '#8fd3ff']);
    confetti = Array.from({ length: 180 }, (_, i) => ({
      x: Math.random() * W, y: -Math.random() * H * 0.9 - 20,
      w: (6 + Math.random() * 8) * dpr, h: (8 + Math.random() * 10) * dpr,
      vx: (Math.random() - 0.5) * 3 * dpr, vy: (2 + Math.random() * 4) * dpr,
      rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.3,
      color: palette[i % palette.length], round: i % 5 === 0
    }));
    const began = performance.now();
    const frame = (now) => {
      cx.clearRect(0, 0, W, H);
      let alive = false;
      const fading = now - began > 5000;
      for (const p of confetti) {
        p.x += p.vx + Math.sin((now / 400) + p.rot) * dpr; p.y += p.vy; p.rot += p.vr;
        if (p.y > H + 30) { if (fading) continue; p.y = -30; p.x = Math.random() * W; }
        alive = true;
        cx.save();
        cx.translate(p.x, p.y); cx.rotate(p.rot);
        cx.scale(1, Math.cos(p.rot * 2));
        cx.fillStyle = p.color;
        if (p.round) { cx.beginPath(); cx.arc(0, 0, p.w / 2, 0, 6.28); cx.fill(); }
        else cx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        cx.restore();
      }
      confettiRaf = alive ? requestAnimationFrame(frame) : 0;
      if (!alive) cx.clearRect(0, 0, W, H);
    };
    confettiRaf = requestAnimationFrame(frame);
  }
  function stopConfetti() {
    if (confettiRaf) cancelAnimationFrame(confettiRaf);
    confettiRaf = 0; confetti = [];
    cx.clearRect(0, 0, canvas.width, canvas.height);
  }

  /* ---------- window plumbing ---------- */
  if (window.ResizeObserver) new ResizeObserver(layoutBoard).observe(elWrap);
  window.addEventListener('resize', layoutBoard);
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('dblclick', (e) => e.preventDefault());

  buildSetup();
})();
