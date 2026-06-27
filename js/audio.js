let ctx = null;
let musicGain = null;
let sfxGain = null;
let musicOsc = null;
let musicInterval = null;
let musicOn = false;

function ensureCtx() {
  if (!ctx) {
    ctx = new AudioContext();
    musicGain = ctx.createGain();
    sfxGain = ctx.createGain();
    musicGain.gain.value = 0.06;
    sfxGain.gain.value = 0.14;
    musicGain.connect(ctx.destination);
    sfxGain.connect(ctx.destination);
  }
  if (ctx.state === "suspended") ctx.resume();
}

function tone(freq, dur, type = "sine", gain = 0.08, dest = sfxGain) {
  ensureCtx();
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(gain, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
  osc.connect(g);
  g.connect(dest);
  osc.start();
  osc.stop(ctx.currentTime + dur);
}

export const audio = {
  playHit() {
    tone(180, 0.08, "square", 0.05);
    tone(90, 0.1, "triangle", 0.04);
  },
  playCrit() {
    tone(320, 0.06, "sawtooth", 0.07);
    tone(480, 0.1, "square", 0.05);
  },
  playDodge() {
    tone(520, 0.05, "sine", 0.03);
  },
  playLoot() {
    tone(440, 0.08, "triangle", 0.06);
    tone(660, 0.12, "triangle", 0.05);
  },
  playEvent() {
    tone(220, 0.15, "sine", 0.05);
    tone(330, 0.2, "sine", 0.04);
  },
  playBoss() {
    tone(80, 0.35, "sawtooth", 0.08);
    tone(55, 0.4, "triangle", 0.06);
  },
  playStar() {
    tone(520, 0.1, "sine", 0.07);
    tone(780, 0.15, "sine", 0.05);
  },
  playMilestone() {
    tone(392, 0.12, "triangle", 0.06);
    tone(523, 0.18, "triangle", 0.05);
    tone(659, 0.22, "triangle", 0.04);
  },
  playHeal() {
    tone(280, 0.1, "sine", 0.04);
    tone(350, 0.14, "sine", 0.03);
  },

  async forcePlay(htmlAudio, button) {
    ensureCtx();
    if (htmlAudio && htmlAudio.paused) {
      try {
        await htmlAudio.play();
        button?.classList.add("active");
        this.stopAmbient();
        musicOn = true;
      } catch (e) {
        console.warn("MP3 play failed, falling back to ambient.", e);
        this.startAmbient();
        button?.classList.add("active");
        musicOn = true;
      }
    } else if (!htmlAudio && !musicOn) {
      this.startAmbient();
      button?.classList.add("active");
      musicOn = true;
    }
  },

  async toggleMusic(htmlAudio, button) {
    ensureCtx();
    if (htmlAudio) {
      try {
        if (htmlAudio.paused) {
          await htmlAudio.play();
          button?.classList.add("active");
          this.stopAmbient();
          musicOn = true;
          return;
        }
        htmlAudio.pause();
        button?.classList.remove("active");
        musicOn = false;
        return;
      } catch (e) {
        console.warn("MP3 toggle failed, falling back to ambient.", e);
        // If it failed to play, fall through to ambient toggle
      }
    }
    if (musicOn) {
      this.stopAmbient();
      button?.classList.remove("active");
      musicOn = false;
    } else {
      this.startAmbient();
      button?.classList.add("active");
      musicOn = true;
    }
  },

  startAmbient() {
    ensureCtx();
    this.stopAmbient();
    musicOsc = ctx.createOscillator();
    const g = ctx.createGain();
    musicOsc.type = "triangle"; // richer sound than sine
    musicOsc.frequency.value = 55;
    g.gain.value = 0.08; // twice as loud
    musicOsc.connect(g);
    g.connect(musicGain);
    musicOsc.start();
    let step = 0;
    const notes = [55, 65, 73, 82, 73, 65, 55, 49]; // slightly longer progression
    musicInterval = setInterval(() => {
      if (!musicOsc) return;
      musicOsc.frequency.setTargetAtTime(notes[step % notes.length], ctx.currentTime, 0.5); // smoother glide
      step += 1;
    }, 2800);
  },

  stopAmbient() {
    if (musicInterval) clearInterval(musicInterval);
    musicInterval = null;
    if (musicOsc) {
      try {
        musicOsc.stop();
      } catch {
        /* already stopped */
      }
      musicOsc = null;
    }
  },
};
