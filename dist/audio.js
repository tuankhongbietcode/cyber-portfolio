/* ═══════════════════════════════════════════════════════════════════════════
   Ambient audio — synthesised in the browser, not streamed.

   Why there is no .mp3 here:
     • A music file would roughly double the weight of the whole site, and it
       would be the only asset on the page nobody can read.
     • Licensing. Anything I did not write is a liability on a page I am using
       to argue that I am careful.
     • A generative pad never loops, so it does not become irritating the way a
       two-minute track does on the fourth repeat.
   So the sound is code: five detuned drone voices through a slow-swept lowpass,
   a reverb whose impulse response is built from decaying noise, and bell notes
   picked at random from a scale where nothing can clash.

   Two rules it follows strictly:
     1. It NEVER autoplays. Browsers block it, and more importantly a portfolio
        that makes noise at you is worse than a silent one. It starts only from
        a click or a typed command.
     2. When it is off, nothing is left running — the whole graph is torn down
        and the AudioContext closed, so an idle tab costs nothing.

   Exposed as window.vlat273Sound so the shell's `music` command drives the same
   engine as the button, rather than a second implementation of it.
   ═══════════════════════════════════════════════════════════════════════════ */
(() => {
  'use strict';

  const btn = document.getElementById('soundToggle');
  if (!btn) return;

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) { btn.hidden = true; return; }   // no Web Audio → no button

  const LEVEL = 0.14;      // master, when on. Ambient: present, never foreground.
  const FADE_IN = 2.6;     // seconds
  const FADE_OUT = 1.4;

  /* A minor pentatonic across two octaves. Every pair of notes in it is
     consonant, so the generator can pick at random forever and never land on a
     clash — which is the whole trick to generative music that stays listenable. */
  const ROOT = 110;                            // A2
  const DEGREES = [0, 3, 5, 7, 10, 12, 15, 17, 19];
  const hz = (semi) => ROOT * Math.pow(2, semi / 12);

  let ctx = null;
  let master = null;
  let dry = null;
  let verb = null;
  let timer = null;
  let nodes = [];
  let on = false;

  /* ── reverb: a decaying noise burst used as an impulse response ─────────── */
  function impulse(seconds, decay) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
    }
    return buf;
  }

  function build() {
    ctx = new AudioCtx();

    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);

    verb = ctx.createConvolver();
    verb.buffer = impulse(4.5, 2.6);
    const wet = ctx.createGain();
    wet.gain.value = 0.55;
    verb.connect(wet).connect(master);

    dry = ctx.createGain();
    dry.gain.value = 0.5;
    dry.connect(master);

    /* the pad bus: everything tonal goes through one slow-swept lowpass */
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 480;
    lp.Q.value = 0.7;
    lp.connect(dry);
    lp.connect(verb);

    /* 0.035 Hz is a 28-second sweep — long enough that you never catch it moving */
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.035;
    const depth = ctx.createGain();
    depth.gain.value = 220;
    lfo.connect(depth).connect(lp.frequency);
    lfo.start();
    nodes.push(lfo);

    /* Detuned pairs. The beating between them is what stops the drone sounding
       like a held synth note and starts it sounding like a room. */
    const voices = [
      { semi: 0,  detune: -7, gain: 0.30, type: 'sawtooth' },
      { semi: 0,  detune: 6,  gain: 0.26, type: 'sawtooth' },
      { semi: 7,  detune: -4, gain: 0.20, type: 'triangle' },
      { semi: 12, detune: 5,  gain: 0.13, type: 'triangle' },
      { semi: 19, detune: -3, gain: 0.07, type: 'sine' },
    ];
    voices.forEach((v) => {
      const osc = ctx.createOscillator();
      osc.type = v.type;
      osc.frequency.value = hz(v.semi);
      osc.detune.value = v.detune;
      const g = ctx.createGain();
      g.gain.value = v.gain;
      osc.connect(g).connect(lp);
      osc.start();
      nodes.push(osc);
    });
  }

  /* ── a bell: fast attack, long exponential tail ─────────────────────────── */
  function bell(at) {
    const semi = DEGREES[Math.floor(Math.random() * DEGREES.length)];
    const octave = Math.random() < 0.45 ? 4 : 2;      // two or four octaves up
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = hz(semi) * octave;

    const g = ctx.createGain();
    const peak = 0.09 + Math.random() * 0.07;
    const life = 3.5 + Math.random() * 3;

    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(peak, at + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, at + life);

    osc.connect(g);
    g.connect(dry);
    g.connect(verb);
    osc.start(at);
    osc.stop(at + life + 0.1);
    osc.onended = () => { try { g.disconnect(); } catch { /* already gone */ } };
  }

  /* Irregular spacing, and not every tick fires — a steady pulse would read as
     a metronome within about twenty seconds. */
  function schedule() {
    const now = ctx.currentTime;
    if (Math.random() < 0.75) bell(now + Math.random() * 0.4);
    if (Math.random() < 0.22) bell(now + 1.2 + Math.random() * 2);
    timer = setTimeout(schedule, 3200 + Math.random() * 5200);
  }

  function sync() {
    btn.setAttribute('aria-pressed', String(on));
    btn.classList.toggle('is-on', on);
    btn.setAttribute('aria-label', on ? 'Turn ambient sound off' : 'Turn ambient sound on');
    btn.title = on ? 'Ambient sound — on' : 'Ambient sound — off';
    document.documentElement.dataset.sound = on ? 'on' : 'off';
  }

  function start() {
    if (on) return;
    if (!ctx) build();
    if (ctx.state === 'suspended') ctx.resume();

    const t = ctx.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(master.gain.value, t);
    master.gain.linearRampToValueAtTime(LEVEL, t + FADE_IN);

    schedule();
    on = true;
    sync();
  }

  function stop() {
    if (!on) return;
    on = false;
    clearTimeout(timer);
    sync();
    if (!ctx) return;

    const t = ctx.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(master.gain.value, t);
    master.gain.linearRampToValueAtTime(0, t + FADE_OUT);

    /* Tear the graph down once the tail is inaudible. If the user toggles back
       on inside the fade, `on` is true again and the teardown backs off. */
    setTimeout(() => {
      if (on || !ctx) return;
      nodes.forEach((n) => { try { n.stop(); } catch { /* already stopped */ } });
      nodes = [];
      try { ctx.close(); } catch { /* already closed */ }
      ctx = null;
      master = null;
      dry = null;
      verb = null;
    }, (FADE_OUT + 0.3) * 1000);
  }

  btn.addEventListener('click', () => { if (on) stop(); else start(); });

  window.vlat273Sound = {
    on: start,
    off: stop,
    toggle: () => { if (on) stop(); else start(); },
    isOn: () => on,
    available: true,
    /* Read-only diagnostics. The test suite uses these to prove the engine
       actually started — that the context is running and the gain ramped —
       rather than taking a flipped boolean as evidence of sound. */
    state: () => ({
      on,
      context: ctx ? ctx.state : 'none',
      gain: master ? Number(master.gain.value.toFixed(4)) : 0,
      voices: nodes.length,
    }),
  };

  sync();
})();
