import bgmMp3 from "@/assets/mp3/tank/background.mp3";
import bonusMp3 from "@/assets/mp3/tank/bonus.mp3";
import deathMp3 from "@/assets/mp3/tank/death.mp3";
import enemyDeathMp3 from "@/assets/mp3/tank/enemy-death.mp3";
import shotMp3 from "@/assets/mp3/tank/shot.mp3";

// ====================== 音频 ======================
window.audioCtx = null;

window.sfxEnabled = false;

export function toggleSfx() {
  window.sfxEnabled = !window.sfxEnabled;
  if (!window.sfxEnabled) stopBgm();
  else if (state !== "playing") playBgm();
  const btn = document.getElementById("btn-sfx");
  if (btn) {
    btn.classList.toggle("active", window.sfxEnabled);
    const icon = window.sfxEnabled ? "🔊" : "🔇";
    btn.textContent = btn.textContent.includes("音效") ? icon + " 音效" : icon;
  }
  return window.sfxEnabled;
}

const MP3_SFX = {
  shoot: shotMp3,
  pickup: bonusMp3,
  over: deathMp3,
  enemyDeath: enemyDeathMp3,
};

export function playMp3(url) {
  try {
    const a = new Audio(url);
    a.volume = 0.6;
    a.play().catch(() => {});
    return a;
  } catch (e) {}
}

let bgmAudio = null;
let bgmTimer = null;
let deathSoundTimer = null;
export function playBgm() {
  if (!window.sfxEnabled) return;
  if (deathSoundTimer) return;
  try {
    if (!bgmAudio) {
      bgmAudio = new Audio(bgmMp3);
      bgmAudio.volume = 0.35;
    }
    bgmAudio.currentTime = 0;
    bgmAudio.play().catch(() => {});
    if (!bgmTimer) {
      bgmTimer = setInterval(() => {
        if (!window.sfxEnabled || state === "playing" || deathSoundTimer) return;
        const a = new Audio(bgmMp3);
        a.volume = 0.35;
        a.play().catch(() => {});
      }, 5000);
    }
  } catch (e) {}
}
export function stopBgm() {
  try {
    if (bgmTimer) {
      clearInterval(bgmTimer);
      bgmTimer = null;
    }
    if (bgmAudio) {
      bgmAudio.pause();
      bgmAudio.currentTime = 0;
    }
  } catch (e) {}
}

export function sfx(type) {
  if (!window.sfxEnabled) return;
  try {
    if (MP3_SFX[type]) {
      playMp3(MP3_SFX[type]);
      return;
    }
    audioCtx =
      audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
    const t = audioCtx.currentTime;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.connect(g);
    g.connect(audioCtx.destination);
    const tones = {
      enemy: [220, 0.08, "sawtooth", 0.05],
      hit: [180, 0.12, "sawtooth", 0.08],
      boom: [90, 0.35, "sawtooth", 0.12],
      tp: [880, 0.12, "sine", 0.06],
      bounce: [700, 0.04, "triangle", 0.04],
    };
    const p = tones[type] || tones.hit;
    o.type = p[2];
    o.frequency.setValueAtTime(p[0], t);
    if (type === "boom") o.frequency.exponentialRampToValueAtTime(30, t + p[1]);
    g.gain.setValueAtTime(p[3], t);
    g.gain.exponentialRampToValueAtTime(0.001, t + p[1]);
    o.start(t);
    o.stop(t + p[1]);
  } catch (e) {}
}

export function getDeathSoundTimer() {
  return deathSoundTimer;
}
export function setDeathSoundTimer(v) {
  deathSoundTimer = v;
}
