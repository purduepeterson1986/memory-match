/* Math card type for Memory Match.
   Two cards match when they have the same answer, e.g. "1 + 4" and "2 + 3".
   Every answer is used by exactly one pair on the board, so a match is never ambiguous. */
(function () {
  'use strict';

  const shuffle = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const coin = () => Math.random() < 0.5;
  const range = (lo, hi) => { const out = []; for (let v = lo; v <= hi; v++) out.push(v); return out; };

  /* ---- every way of writing a value with one operation. `k` is the kind of problem. ---- */
  function adds(v, minPart) {
    const out = [];
    for (let a = minPart || 1; a <= v / 2; a++) out.push({ k: '+', t: coin() ? a + ' + ' + (v - a) : (v - a) + ' + ' + a });
    return out;
  }
  function subs(v) {
    const out = [];
    for (let b = 1; b <= 12; b++) out.push({ k: '−', t: (v + b) + ' − ' + b });
    return out;
  }
  function mults(v) {
    const out = [];
    for (let a = 2; a * a <= v; a++) {
      const b = v / a;
      if (v % a === 0 && b <= 12) out.push({ k: '×', t: coin() ? a + ' × ' + b : b + ' × ' + a });
    }
    return out;
  }
  function divs(v) {
    const out = [];
    for (let d = 2; d <= 10 && v * d <= 120; d++) out.push({ k: '÷', t: (v * d) + ' ÷ ' + d });
    return out;
  }

  /* ---- every way of writing a value with two operations (× and ÷ always come first, or brackets are shown) ---- */
  function twoStep(v) {
    const out = [];
    for (let a = 2; a <= 9; a++) {
      for (let b = a; b <= 9; b++) {
        const p = a * b;
        const left = coin() ? a + ' × ' + b : b + ' × ' + a;
        if (p < v && v - p <= 12) out.push({ k: '×+', t: left + ' + ' + (v - p) });
        if (p > v && p - v <= 12) out.push({ k: '×−', t: left + ' − ' + (p - v) });
      }
    }
    for (let q = 2; q <= 12; q++) {
      for (let d = 2; d <= 9; d++) {
        if (q * d > 100) continue;
        const left = (q * d) + ' ÷ ' + d;
        if (q < v && v - q <= 12) out.push({ k: '÷+', t: left + ' + ' + (v - q) });
        if (q > v && q - v <= 10) out.push({ k: '÷−', t: left + ' − ' + (q - v) });
      }
    }
    for (let c = 2; c <= 9; c++) {
      const s = v / c;
      if (v % c || s < 3 || s > 20) continue;
      for (let a = 1; a <= s / 2; a++) out.push({ k: '()', t: '(' + a + ' + ' + (s - a) + ') × ' + c });
    }
    return out;
  }

  /* Choose two different problems, from two different kinds when possible. */
  function twoOf(first, rest) {
    if (!first.length) return null;
    const a = pick(first);
    const others = rest.filter((e) => e.t !== a.t);
    if (!others.length) return null;
    const different = others.filter((e) => e.k !== a.k);
    return [a, pick(different.length ? different : others)];
  }

  const need = (pairs, factor, extra) => Math.ceil(pairs * factor) + (extra || 0);
  const products = (maxFactor) => {
    const set = new Set();
    for (let a = 2; a <= maxFactor; a++) for (let b = a; b <= maxFactor; b++) set.add(a * b);
    return [...set].sort((x, y) => x - y);
  };

  /* Each level: which answers may appear (grows with the board), and how to write a pair for an answer. */
  const LEVELS = [
    {
      id: 'add', name: 'Level 1', label: 'Addition', symbol: '+', example: '1 + 4  and  2 + 3',
      pool: (pairs, grow) => range(4, Math.max(10, need(pairs, 1.25, 3)) + grow),
      make: (v) => { const all = shuffle(adds(v)); return all.length >= 2 ? [all[0], all[1]] : null; }
    },
    {
      id: 'addsub', name: 'Level 2', label: 'Add & subtract', symbol: '+ −', example: '9 + 6  and  18 − 3',
      pool: (pairs, grow) => range(1, Math.max(20, need(pairs, 1.25)) + grow),
      make: (v) => { const a = adds(v), s = subs(v); return a.length ? twoOf(coin() ? a : s, a.concat(s)) : twoOf(s, s); }
    },
    {
      id: 'mult', name: 'Level 3', label: 'Multiplication', symbol: '×', example: '3 × 8  and  30 − 6',
      pool: (pairs, grow) => products(grow ? 12 : 10).slice(0, Math.max(14, need(pairs, 1.15)) + grow * 4),
      make: (v) => { const m = mults(v); return twoOf(m, m.concat(adds(v, 2), subs(v))); }
    },
    {
      id: 'div', name: 'Level 4', label: 'Division', symbol: '÷', example: '36 ÷ 4  and  3 × 3',
      pool: (pairs, grow) => range(2, Math.max(20, need(pairs, 1.3, 2)) + grow),
      make: (v) => {
        const d = divs(v), m = mults(v);
        // Favour a times-table partner when there is one, so the pair is ÷ against ×.
        const partner = m.length && Math.random() < 0.6 ? m : d.concat(m, adds(v, 2), subs(v));
        return twoOf(d, partner);
      }
    },
    {
      id: 'mixed', name: 'Level 5', label: 'Two steps', symbol: '( )', example: '2 × 5 + 4  and  (3 + 4) × 2',
      pool: (pairs, grow) => range(2, Math.max(30, need(pairs, 1.4)) + grow),
      make: (v) => { const all = twoStep(v); return twoOf(all, all); }
    }
  ];

  /* Returns `pairs` pairs of cards: [[cardA, cardB], ...]. */
  function generate(levelId, pairs) {
    const level = LEVELS.find((l) => l.id === levelId) || LEVELS[0];
    for (let grow = 0; grow < 60; grow += 3) {
      const out = [];
      for (const v of shuffle(level.pool(pairs, grow))) {
        const made = level.make(v);
        if (!made) continue;
        out.push(made.map((e) => ({ kind: 'math', text: e.t, value: v, name: e.t })));
        if (out.length === pairs) return out;
      }
    }
    throw new Error('Could not build a math board');
  }

  window.MM_MATH = { LEVELS, generate };
})();
