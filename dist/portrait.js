/* ═══════════════════════════════════════════════════════════════════════════
   Interactive portrait
   ───────────────────────────────────────────────────────────────────────────
   The portrait is not a picture. It is ~1,700 individual characters, and every
   one of them is a real particle that can be pushed.

   The grid is generated offline by work/make-portrait.py: the source artwork is
   reduced to 92x61 cells, and each cell is turned into one glyph.

   The technique is the reference's, and it took a while to see it. heyamit.dev
   draws EVERY glyph in ONE colour (`text { fill: #e6d2a8 }` — the file contains
   exactly one `fill:`), and gets all of its tone from glyph *density*: a cell's
   tone picks how much ink its glyph covers, nothing else. Reproducing the
   artwork's per-cell colour with a palette instead — the obvious approach —
   makes the portrait read as a washed-out photo, because a photo's cell colours
   are mostly dark and the whole thing sinks into mud. One bright ink on a dark
   ground is what makes it read as a graphic.

   Rendering notes that matter:
     • The backing store is a fixed cols*4 px square and CSS scales it down, so
       the glyphs are the same quality on a 1x screen as on a 3x one. Sizing the
       backing store from devicePixelRatio instead would make the portrait go
       faint on 1x displays, where a 2px glyph is mostly antialiasing.
     • font-size is ~2.1x the column pitch, so glyphs overlap and pile ink on
       ink; that overlap is what turns density into brightness, and it is why a
       dense run reads as solid while an isolated glyph stays a dot. The ratio
       and the weight here must match make-portrait.py's, because the generator
       measures the coverage ramp with this exact font — a mismatch makes the
       tone mapping chase coverage the render cannot deliver.
     • The loop stops as soon as nothing is moving, so a portrait nobody is
       touching costs no CPU. Anything that wants to wake it must say so.

   With no JS, no canvas, or a failed decode, the CSS still (a single-channel
   alpha PNG painted in the theme's ink colour) stands in unchanged.
   ═══════════════════════════════════════════════════════════════════════════ */
(() => {
  'use strict';

  const host = document.querySelector('.avatar');
  const canvas = host && host.querySelector('.avatar__canvas');
  if (!host || !canvas || !window.PORTRAIT_DATA) return;

  /* jsdom, and browsers with canvas disabled, hand back null here. */
  const ctx = typeof canvas.getContext === 'function' ? canvas.getContext('2d') : null;
  if (!ctx) return;

  /* ── Tuning ──────────────────────────────────────────────────────────── */
  const PITCH = 5;          // backing px per glyph column. The reference's
                            // canvas is 480px for its 92 columns, i.e. 5.2 — at
                            // 4 the backing store lands below the device
                            // resolution of a 240px tile on a 2x screen and the
                            // whole portrait reads soft. The ramp is measured in
                            // fractions of a cell, so this is scale-free: it
                            // changes only how sharply the same grid is drawn.
  const FONT_RATIO = 2.1;   // font-size / column pitch — must match
                            // make-portrait.py's FONT_RATIO, because the
                            // generator measures the coverage ramp with it.
  const FONT_WEIGHT = 700;  // likewise. The self-hosted JetBrains Mono is
                            // variable (Weight 100-800); the densest glyph in
                            // the ramp covers only ~58% of its cell at regular
                            // weight, so a light face simply cannot reach the
                            // artwork's highlights — measured at 0.7x. 700 is
                            // the heaviest the subset carries, and it closes the
                            // gap without faux-bolding (a stroke, which turns
                            // the glyphs to mush).
  const RADIUS = 0.14;      // pointer radius, as a fraction of the portrait.
                            // Measured off the reference: its cleared disc
                            // spans ~0.09 of the tile (90th percentile of the
                            // cleared pixels) at its settled hover, which is
                            // what this reproduces.
  const STILL = 0.0015;     // total glyph movement per frame counted as "at
                            // rest". Must sit below SNAP * the slowest return
                            // rate, or the loop stops with a straggler still a
                            // few hundredths of a pixel off home.
  const SNAP = 0.05;        // displacement below which a glyph is put exactly
                            // home. The spring is asymptotic, so without this
                            // the portrait never quite returns to the artwork.
  const HOT = 2;            // displacement² past which a glyph lights up
  const HOT_MIX = 0.55;
  const HOT_INK = [246, 228, 192];
  const MONO = '"JetBrains Mono", ui-monospace, monospace';

  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  const state = {
    cols: 0,
    rows: 0,
    ramp: [],
    pal: [],
    points: [],
    width: 0,
    pitchX: PITCH,
    radius: 60,
    raf: 0,
    live: false,
    inView: true,
    moved: Infinity,
    pointer: { x: -1e4, y: -1e4, over: false },
    touch: false,
    active: false,
  };

  /* ── Decode ──────────────────────────────────────────────────────────────
     'APG1' | cols u16 | rows u16 | rampLen u16 | palLen u16
     ramp[rampLen] ascii | palette[palLen] rgb | cells cols*rows (charIdx, palIdx)
     charIdx 0 means "nothing here". */
  function decode(b64) {
    let bin;
    try { bin = atob(b64); } catch (e) { return null; }
    const buf = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    if (buf.length < 12) return null;
    if (buf[0] !== 65 || buf[1] !== 80 || buf[2] !== 71 || buf[3] !== 49) return null;

    const dv = new DataView(buf.buffer);
    const cols = dv.getUint16(4, true);
    const rows = dv.getUint16(6, true);
    const rampLen = dv.getUint16(8, true);
    const palLen = dv.getUint16(10, true);

    let o = 12;
    const ramp = [];
    for (let i = 0; i < rampLen; i++) ramp.push(String.fromCharCode(buf[o++]));
    const pal = [];
    const hot = [];
    for (let i = 0; i < palLen; i++) {
      const r = buf[o], g = buf[o + 1], b = buf[o + 2];
      o += 3;
      pal.push(`rgb(${r},${g},${b})`);
      /* the "touched" colour: the ink warmed toward cream, so glyphs you push
         around read as lit rather than just moved */
      hot.push(`rgb(${Math.round(r + (HOT_INK[0] - r) * HOT_MIX)},` +
               `${Math.round(g + (HOT_INK[1] - g) * HOT_MIX)},` +
               `${Math.round(b + (HOT_INK[2] - b) * HOT_MIX)})`);
    }
    return { cols, rows, ramp, pal, hot, cells: buf.subarray(o) };
  }

  /* Deterministic per-glyph jitter. Baked randomness would cost asset bytes and
     would make the portrait untestable. */
  function jitter(a, b) {
    let h = (a * 73856093) ^ (b * 19349663);
    h = (h ^ (h >>> 13)) >>> 0;
    h = Math.imul(h, 1274126177) >>> 0;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  /* ── Build ───────────────────────────────────────────────────────────── */
  function build() {
    const data = decode(window.PORTRAIT_DATA);
    if (!data) return false;

    const { cols, rows, ramp, pal, hot, cells } = data;
    const W = cols * PITCH;
    canvas.width = W;
    canvas.height = W;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const pitchX = W / cols;
    const pitchY = W / rows;
    const cx = W / 2;
    const cy = W / 2;
    const points = [];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = (r * cols + c) * 2;
        const ci = cells[i];
        if (!ci) continue;
        const pi = cells[i + 1] < pal.length ? cells[i + 1] : 0;

        const hx = (c + 0.5) * pitchX;
        const hy = (r + 0.5) * pitchY;

        /* Entrance: every glyph starts flung outward from the centre, at its
           own angle and distance, and springs home. Same idea as the reference
           portrait — the portrait assembles itself instead of just appearing. */
        const a = Math.atan2(hy - cy, hx - cx) + (jitter(r, c) - 0.5) * 2;
        const d = Math.hypot(hx - cx, hy - cy) + (0.31 + jitter(c, r) * 0.73) * W;

        /* Per-glyph weight and return rate. A heavy glyph is both pushed
           further and pulled back more slowly, so the field never moves as one
           piece — it is the single detail that makes this read as a material
           rather than an animation. Values match the reference portrait. */
        const density = 5 + jitter(r * 7 + 1, c * 13 + 5) * 15;

        /* How far past the rim this glyph lands. The spread is what gives the
           cleared hole a ring with thickness instead of a razor-thin circle —
           but only a little: too much and the disc's ink smears into a halo
           around the hole instead of a crisp edge. */
        const reach = 0.94 + jitter(c * 3 + 2, r * 5 + 7) * 0.12;

        points.push({
          ch: ramp[ci - 1] || '.',
          col: pal[pi],
          hot: hot[pi],
          hx,
          hy,
          x: cx + Math.cos(a) * d,
          y: cy + Math.sin(a) * d,
          density,
          reach,
          rate: 1 / (density * 0.85),
        });
      }
    }

    state.cols = cols;
    state.rows = rows;
    state.ramp = ramp;
    state.points = points;
    state.width = W;
    state.pitchX = pitchX;
    state.radius = W * RADIUS;
    state.moved = Infinity;

    /* the grid is the whole quality of the effect, so record it — a portrait
       at 30 columns is a smear, at 84 it reads */
    canvas.dataset.cols = String(cols);
    canvas.dataset.rows = String(rows);
    canvas.dataset.glyphs = String(points.length);
    canvas.classList.add('is-ready');
    host.classList.add('is-ready');
    return true;
  }

  /* ── Physics ─────────────────────────────────────────────────────────────
     A glyph's *target* moves; nothing carries momentum. Normally the target is
     home. While the pointer is over, any glyph whose HOME is inside the radius
     gets a target pushed radially out to the rim — which maps the whole disc
     onto its own circumference.

     The distinction from a per-frame push against a spring matters, and cost a
     rewrite to find. Pushing each glyph outward every frame settles every glyph
     at a *different* radius (its density decides where the push balances the
     spring), so the hole stays half full and no rim ever forms. Moving the
     target instead clears the disc completely and piles the ink into a bright
     ring at the edge — which is what the reference actually shows: a fully
     black hole with a dense cream ring around it, and everything outside the
     radius untouched. */
  function step() {
    const pts = state.points;
    const p = state.pointer;
    const R = state.radius;
    const R2 = R * R;
    const live = p.over;
    let moved = 0;

    for (let i = 0; i < pts.length; i++) {
      const pt = pts[i];
      const ox = pt.x;
      const oy = pt.y;

      let tx = pt.hx;
      let ty = pt.hy;
      if (live) {
        const dx = pt.hx - p.x;
        const dy = pt.hy - p.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < R2) {
          const d = Math.sqrt(d2);
          /* exactly at the pointer there is no radial direction to use; leave
             those couple of glyphs home rather than flinging them anywhere */
          if (d > 0.5) {
            const out = (R - d) * pt.reach;
            tx = pt.hx + (dx / d) * out;
            ty = pt.hy + (dy / d) * out;
          }
        }
      }

      const bx = tx - pt.x;
      const by = ty - pt.y;
      pt.x += bx * pt.rate;
      pt.y += by * pt.rate;

      /* Only ever land a glyph exactly home once the pointer has let go: while
         it is held out at the rim its target is not home, so pinning would
         fight the displacement. */
      if (!live) {
        const ex = pt.hx - pt.x;
        const ey = pt.hy - pt.y;
        if (ex * ex + ey * ey < SNAP * SNAP) { pt.x = pt.hx; pt.y = pt.hy; }
      }

      moved += (pt.x > ox ? pt.x - ox : ox - pt.x) + (pt.y > oy ? pt.y - oy : oy - pt.y);
    }

    state.moved = moved;
  }

  /* ── Draw ────────────────────────────────────────────────────────────── */
  function draw() {
    const pts = state.points;
    const W = state.width;
    const p = state.pointer;

    ctx.clearRect(0, 0, W, W);
    /* FONT_RATIO x the column pitch, so glyphs overlap horizontally and the
       field reads as a weave instead of a lattice of separate letters. */
    ctx.font = `${FONT_WEIGHT} ${(state.pitchX * FONT_RATIO).toFixed(2)}px ${MONO}`;

    let last = '';
    for (let i = 0; i < pts.length; i++) {
      const pt = pts[i];
      const dx = pt.x - pt.hx;
      const dy = pt.y - pt.hy;
      const moved = p.over && dx * dx + dy * dy > HOT;
      const col = moved ? pt.hot : pt.col;
      if (col !== last) { ctx.fillStyle = col; last = col; }
      ctx.fillText(pt.ch, pt.x, pt.y);
    }
  }

  /* How far the furthest glyph is from home, in thousandths of a pixel.
     Recorded whenever the loop settles: it is the assertion that the portrait
     has actually returned to being the artwork, rather than merely getting
     close to it. */
  function residual() {
    let worst = 0;
    const pts = state.points;
    for (let i = 0; i < pts.length; i++) {
      const dx = pts[i].x - pts[i].hx;
      const dy = pts[i].y - pts[i].hy;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > worst) worst = d;
    }
    return Math.round(worst * 1000);
  }

  function frame() {
    state.raf = 0;
    step();
    draw();
    if (state.moved < STILL) {
      state.live = false;
      canvas.dataset.residual = String(residual());
      return;
    }
    state.raf = requestAnimationFrame(frame);
  }

  function kick(force) {
    if (state.live || state.raf || reduced()) return;
    if (!state.inView || document.hidden) return;
    /* At rest nothing is moving, so anything that wants to wake the loop has
       to say so — otherwise a settled portrait ignores the pointer entirely. */
    if (!force && state.moved < STILL) return;
    state.live = true;
    state.raf = requestAnimationFrame(frame);
  }

  function stop() {
    if (state.raf) cancelAnimationFrame(state.raf);
    state.raf = 0;
    state.live = false;
  }

  function rest() {
    stop();
    state.points.forEach((pt) => {
      pt.x = pt.hx;
      pt.y = pt.hy;
    });
    state.moved = 0;
    draw();
  }

  /* ── Activation ──────────────────────────────────────────────────────── */
  function activate(on) {
    if (state.active === on) return;
    state.active = on;
    host.classList.toggle('is-active', on);
    if (!on) state.pointer.over = false;
    kick(true);
  }

  /* ── Pointer ─────────────────────────────────────────────────────────── */
  function locate(e) {
    const box = host.getBoundingClientRect();
    if (!box.width) return;
    const s = canvas.width / box.width;      // CSS px -> backing px
    state.pointer.x = (e.clientX - box.left) * s;
    state.pointer.y = (e.clientY - box.top) * s;
    state.pointer.over = true;
  }

  host.addEventListener('pointerenter', (e) => {
    if (e.pointerType === 'mouse') activate(true);
  });

  host.addEventListener('pointermove', (e) => {
    locate(e);
    if (e.pointerType === 'mouse') activate(true);
    kick(true);
  });

  host.addEventListener('pointerleave', () => {
    if (state.touch) return;
    state.pointer.over = false;
    activate(false);
  });

  host.addEventListener('pointercancel', () => {
    state.pointer.over = false;
    activate(false);
  });

  host.addEventListener('pointerdown', (e) => {
    locate(e);
    if (e.pointerType === 'mouse') {
      activate(true);
      kick(true);
    } else {
      /* no hover on touch, so a tap turns it on and a tap away turns it off */
      state.touch = true;
      activate(true);
    }
  });

  document.addEventListener('pointerdown', (e) => {
    if (!state.touch) return;
    if (host.contains(e.target)) return;
    state.touch = false;
    activate(false);
  });

  /* ── Hooks from the shell ────────────────────────────────────────────── */
  document.addEventListener('portrait:reveal', () => {
    host.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'center' });
    if (reduced()) return;
    /* let the scroll land, then bring the portrait up */
    setTimeout(() => {
      state.pointer.over = false;
      activate(true);
      /* nothing to point at after a shell command, so hand it back */
      setTimeout(() => activate(false), 2400);
    }, 420);
  });

  /* ── Lifecycle ───────────────────────────────────────────────────────── */
  if (typeof IntersectionObserver !== 'undefined') {
    new IntersectionObserver((entries) => {
      state.inView = entries[entries.length - 1].isIntersecting;
      if (state.inView) kick(true);
      else stop();
    }, { threshold: 0 }).observe(host);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else kick(true);
  });

  const fontsReady = (document.fonts && document.fonts.ready)
    ? document.fonts.ready.catch(() => {})
    : Promise.resolve();

  /* Wait for JetBrains Mono. Drawing the grid in a fallback face would give
     every glyph the wrong shape, and the entrance would play before the
     correction landed. */
  fontsReady.then(() => {
    if (!build()) return;
    if (reduced()) { rest(); return; }
    kick(true);
  });
})();
