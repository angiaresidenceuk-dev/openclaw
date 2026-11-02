// Âm thanh tổng hợp bằng Web Audio: không dùng file ghi âm, không tụng kinh
// có bản quyền. Đại hồng chung, chuông gia trì, mõ gỗ và tiếng gió/chim/dế nền.

/** Tạo bộ âm thanh. Phải gọi trong một thao tác chạm của người dùng. */
export function createAudio() {
  const Ctx = globalThis.AudioContext ?? globalThis.webkitAudioContext;
  if (!Ctx) return silentAudio();
  const ctx = new Ctx();
  const master = ctx.createGain();
  master.gain.value = 0.8;
  master.connect(ctx.destination);
  let ambience = null;
  let enabled = true;

  // Short reverb-ish tail: a feedback delay through a lowpass, cheap on phones.
  const send = ctx.createGain();
  send.gain.value = 0.28;
  const delay = ctx.createDelay(1);
  delay.delayTime.value = 0.19;
  const fb = ctx.createGain();
  fb.gain.value = 0.42;
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 1800;
  send.connect(delay);
  delay.connect(lp);
  lp.connect(fb);
  fb.connect(delay);
  lp.connect(master);

  function partial(freq, gain, decay, at, dest = master) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(gain, at + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, at + decay);
    o.connect(g);
    g.connect(dest);
    g.connect(send);
    o.start(at);
    o.stop(at + decay + 0.05);
  }

  function noiseBuffer(seconds) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      // brown-ish noise: smoother than white, closer to wind
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      data[i] = last * 3.5;
    }
    return buf;
  }

  /** Đại hồng chung: các hoạ âm không điều hoà, tắt dần rất lâu, có độ "đập". */
  function bigBell(delaySec = 0) {
    if (!enabled) return;
    const at = ctx.currentTime + delaySec;
    const f = 98;
    const parts = [
      [0.5, 0.32, 11],
      [1, 0.28, 9],
      [1.004, 0.2, 9], // beating partner
      [1.19, 0.12, 6],
      [1.56, 0.1, 5],
      [2, 0.09, 4.5],
      [2.51, 0.06, 3.2],
      [2.66, 0.05, 2.8],
      [3.01, 0.04, 2.2],
    ];
    for (const [ratio, gain, decay] of parts) partial(f * ratio, gain * 0.5, decay, at);
    // the wooden striker hitting bronze
    const thump = ctx.createBufferSource();
    thump.buffer = noiseBuffer(0.12);
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 260;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.5, at);
    g.gain.exponentialRampToValueAtTime(0.001, at + 0.12);
    thump.connect(bp);
    bp.connect(g);
    g.connect(master);
    thump.start(at);
  }

  /** Chuông gia trì nhỏ: báo bắt đầu/kết thúc tĩnh tâm. */
  function smallBell(delaySec = 0) {
    if (!enabled) return;
    const at = ctx.currentTime + delaySec;
    const f = 523;
    partial(f, 0.18, 5, at);
    partial(f * 2.76, 0.06, 2.6, at);
    partial(f * 5.4, 0.025, 1.2, at);
    partial(f * 1.002, 0.1, 4.5, at);
  }

  /** Mõ gỗ: tiếng gõ khô, rỗng, rất ngắn. */
  function mo() {
    if (!enabled) return;
    const at = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(720, at);
    o.frequency.exponentialRampToValueAtTime(430, at + 0.09);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(0.5, at + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.16);
    o.connect(g);
    g.connect(master);
    o.start(at);
    o.stop(at + 0.2);
    partial(1240, 0.08, 0.06, at);
  }

  /** Hạt chuỗi chạm nhau: tiếng lách cách rất nhỏ. */
  function bead() {
    if (!enabled) return;
    partial(2300 + Math.random() * 300, 0.03, 0.05, ctx.currentTime);
  }

  /** Nền: gió qua núi (+ chim ban ngày, dế ban đêm). */
  function startAmbience(isNight) {
    stopAmbience();
    if (!enabled) return;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(4);
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 420;
    const g = ctx.createGain();
    g.gain.value = 0.12;
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.07;
    lfoGain.gain.value = 0.06;
    lfo.connect(lfoGain);
    lfoGain.connect(g.gain);
    src.connect(filter);
    filter.connect(g);
    g.connect(master);
    src.start();
    lfo.start();
    const timer = setInterval(() => (isNight ? cricket() : bird()), 2600);
    ambience = { src, lfo, timer };
  }

  function stopAmbience() {
    if (!ambience) return;
    ambience.src.stop();
    ambience.lfo.stop();
    clearInterval(ambience.timer);
    ambience = null;
  }

  function bird() {
    if (Math.random() < 0.55) return;
    const at = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const base = 2600 + Math.random() * 1400;
    o.frequency.setValueAtTime(base, at);
    o.frequency.exponentialRampToValueAtTime(base * 1.35, at + 0.08);
    o.frequency.exponentialRampToValueAtTime(base * 0.9, at + 0.16);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(0.025, at + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.18);
    o.connect(g);
    g.connect(master);
    o.start(at);
    o.stop(at + 0.2);
  }

  function cricket() {
    const at = ctx.currentTime;
    for (let i = 0; i < 3; i++) partial(4400, 0.008, 0.04, at + i * 0.07);
  }

  return {
    get enabled() {
      return enabled;
    },
    setEnabled(on, isNight) {
      enabled = on;
      master.gain.setTargetAtTime(on ? 0.8 : 0, ctx.currentTime, 0.1);
      if (on) {
        ctx.resume?.();
        startAmbience(isNight);
      } else {
        stopAmbience();
      }
    },
    resume: () => ctx.resume?.(),
    bigBell,
    smallBell,
    mo,
    bead,
    startAmbience,
    stopAmbience,
  };
}

function silentAudio() {
  const noop = () => {};
  return {
    enabled: false,
    setEnabled: noop,
    resume: noop,
    bigBell: noop,
    smallBell: noop,
    mo: noop,
    bead: noop,
    startAmbience: noop,
    stopAmbience: noop,
  };
}
