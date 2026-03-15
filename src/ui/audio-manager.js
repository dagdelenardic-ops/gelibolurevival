// ══════════════════════════════════════════════════════════════
// Gelibolu Revival — Ses Yöneticisi
// Arka plan müziği (CVRTOON - Çanakkale loop) + Web Audio API SFX
// ══════════════════════════════════════════════════════════════

const MUSIC_TRACKS = [
    'assets/audio/canakkale-1.mp3',
    'assets/audio/canakkale-2.mp3',
];

let audioCtx = null;
let musicGain = null;
let sfxGain = null;
let currentTrackIndex = 0;
let currentAudio = null;
let musicEnabled = true;
let sfxEnabled = true;
let isPlaying = false;

/** Lazy AudioContext — kullanıcı etkileşimi gerektirir */
function ensureContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        musicGain = audioCtx.createGain();
        musicGain.gain.value = 0.25; // Arka plan müziği düşük ses
        musicGain.connect(audioCtx.destination);
        sfxGain = audioCtx.createGain();
        sfxGain.gain.value = 0.35;
        sfxGain.connect(audioCtx.destination);
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

// ═══════════════════════════════════════════════════════════
// ARKA PLAN MÜZİĞİ
// ═══════════════════════════════════════════════════════════

/** Müzik çalmaya başla — iki parça arası crossfade loop */
export function startMusic() {
    if (isPlaying || !musicEnabled) return;
    ensureContext();
    isPlaying = true;
    playTrack(currentTrackIndex);
}

function playTrack(index) {
    if (!musicEnabled || !isPlaying) return;
    currentTrackIndex = index % MUSIC_TRACKS.length;

    const audio = new Audio(MUSIC_TRACKS[currentTrackIndex]);
    audio.crossOrigin = 'anonymous';
    audio.loop = false;
    currentAudio = audio;

    // MediaElementSource ile AudioContext'e bağla
    try {
        const source = audioCtx.createMediaElementSource(audio);
        source.connect(musicGain);
    } catch (e) {
        // Fallback: direkt volume
        audio.volume = 0.25;
    }

    // Fade in
    audio.volume = 0;
    audio.play().catch(() => {});
    fadeAudio(audio, 0, 0.25, 2000);

    // Parça bitince sonraki parçaya geç (crossfade)
    audio.addEventListener('ended', () => {
        playTrack(currentTrackIndex + 1);
    });

    // Parça bitmeden 3 saniye önce fade-out başlat
    audio.addEventListener('timeupdate', () => {
        if (audio.duration && audio.currentTime > audio.duration - 3) {
            fadeAudio(audio, audio.volume, 0, 2500);
        }
    });
}

function fadeAudio(audio, from, to, durationMs) {
    const steps = 30;
    const stepMs = durationMs / steps;
    const delta = (to - from) / steps;
    let step = 0;
    const interval = setInterval(() => {
        step++;
        audio.volume = Math.max(0, Math.min(1, from + delta * step));
        if (step >= steps) clearInterval(interval);
    }, stepMs);
}

/** Müziği duraklat */
export function pauseMusic() {
    if (currentAudio) {
        fadeAudio(currentAudio, currentAudio.volume, 0, 800);
        setTimeout(() => {
            if (currentAudio) currentAudio.pause();
            isPlaying = false;
        }, 850);
    } else {
        isPlaying = false;
    }
}

/** Müziği aç/kapat */
export function toggleMusic() {
    musicEnabled = !musicEnabled;
    if (musicEnabled) {
        startMusic();
    } else {
        pauseMusic();
    }
    return musicEnabled;
}

/** Müzik açık mı? */
export function isMusicEnabled() { return musicEnabled; }

// ═══════════════════════════════════════════════════════════
// SES EFEKTLERİ (Web Audio API — %100 ücretsiz, dosya yok)
// ═══════════════════════════════════════════════════════════

/** Beyaz gürültü buffer oluştur (patlama/top ateşi için temel) */
function createNoiseBuffer(duration) {
    const ctx = ensureContext();
    const sr = ctx.sampleRate;
    const len = sr * duration;
    const buf = ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    return buf;
}

/**
 * 🔊 Top ateşi — kısa, keskin patlama
 * Kullanım: Kıyı bataryası ateşi, deniz bombardımanı
 */
export function sfxCannonFire() {
    if (!sfxEnabled) return;
    const ctx = ensureContext();
    const now = ctx.currentTime;

    // Gürültü (patlama gövdesi)
    const noise = ctx.createBufferSource();
    noise.buffer = createNoiseBuffer(0.3);
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.6, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

    // Bandpass — top sesi tonalitesi
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 800;
    bp.Q.value = 1.5;

    noise.connect(bp).connect(noiseGain).connect(sfxGain);
    noise.start(now);
    noise.stop(now + 0.3);

    // Düşük vuruş (boom)
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);
    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0.5, now);
    oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    osc.connect(oscGain).connect(sfxGain);
    osc.start(now);
    osc.stop(now + 0.25);
}

/**
 * 💥 Büyük patlama — gemi batması, mayın infilakı
 * Kullanım: Bouvet/Irresistible/Ocean batışları
 */
export function sfxExplosion() {
    if (!sfxEnabled) return;
    const ctx = ensureContext();
    const now = ctx.currentTime;

    // Uzun gürültü
    const noise = ctx.createBufferSource();
    noise.buffer = createNoiseBuffer(1.2);
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.7, now);
    noiseGain.gain.linearRampToValueAtTime(0.5, now + 0.1);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 1.0);

    // Lowpass — derin patlama
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(2000, now);
    lp.frequency.exponentialRampToValueAtTime(200, now + 0.8);

    noise.connect(lp).connect(noiseGain).connect(sfxGain);
    noise.start(now);
    noise.stop(now + 1.2);

    // Derin bas boom
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.exponentialRampToValueAtTime(20, now + 0.5);
    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0.6, now);
    oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
    osc.connect(oscGain).connect(sfxGain);
    osc.start(now);
    osc.stop(now + 0.7);
}

/**
 * 💣 Mayın patlaması — sualtı sesi, kabarcıklı
 * Kullanım: Nusret mayınları, mayın hattı
 */
export function sfxMineExplosion() {
    if (!sfxEnabled) return;
    const ctx = ensureContext();
    const now = ctx.currentTime;

    // Sualtı gürültüsü
    const noise = ctx.createBufferSource();
    noise.buffer = createNoiseBuffer(0.8);
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.4, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.7);

    // Lowpass — sualtı boğukluğu
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(600, now);
    lp.frequency.exponentialRampToValueAtTime(100, now + 0.6);

    noise.connect(lp).connect(noiseGain).connect(sfxGain);
    noise.start(now);
    noise.stop(now + 0.8);

    // Su kabarcığı efekti
    const bubble = ctx.createOscillator();
    bubble.type = 'sine';
    bubble.frequency.setValueAtTime(300, now + 0.15);
    bubble.frequency.exponentialRampToValueAtTime(50, now + 0.5);
    const bubbleGain = ctx.createGain();
    bubbleGain.gain.setValueAtTime(0, now);
    bubbleGain.gain.linearRampToValueAtTime(0.3, now + 0.15);
    bubbleGain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
    bubble.connect(bubbleGain).connect(sfxGain);
    bubble.start(now + 0.1);
    bubble.stop(now + 0.55);
}

/**
 * 🔫 Tüfek/siper ateşi — kısa, keskin
 * Kullanım: Siper savaşı, keskin nişancı
 */
export function sfxRifleShot() {
    if (!sfxEnabled) return;
    const ctx = ensureContext();
    const now = ctx.currentTime;

    const noise = ctx.createBufferSource();
    noise.buffer = createNoiseBuffer(0.08);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);

    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 2000;

    noise.connect(hp).connect(gain).connect(sfxGain);
    noise.start(now);
    noise.stop(now + 0.08);
}

/**
 * ⚓ Gemi düdüğü — uzun, derin
 * Kullanım: Donanma hareketi, çıkarma
 */
export function sfxShipHorn() {
    if (!sfxEnabled) return;
    const ctx = ensureContext();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(180, now);
    osc1.frequency.linearRampToValueAtTime(175, now + 1.5);

    const osc2 = ctx.createOscillator();
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(220, now);
    osc2.frequency.linearRampToValueAtTime(215, now + 1.5);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.3);
    gain.gain.setValueAtTime(0.15, now + 1.0);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 1.8);

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 400;

    osc1.connect(lp);
    osc2.connect(lp);
    lp.connect(gain).connect(sfxGain);
    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 1.9);
    osc2.stop(now + 1.9);
}

/**
 * 🥁 Davul sesi — taarruz başlangıcı
 * Kullanım: Büyük taarruz fazları
 */
export function sfxWarDrum() {
    if (!sfxEnabled) return;
    const ctx = ensureContext();
    const now = ctx.currentTime;

    for (let i = 0; i < 3; i++) {
        const t = now + i * 0.35;
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(90, t);
        osc.frequency.exponentialRampToValueAtTime(50, t + 0.15);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.3, t);
        g.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
        osc.connect(g).connect(sfxGain);
        osc.start(t);
        osc.stop(t + 0.3);
    }
}

/** SFX aç/kapat */
export function toggleSfx() {
    sfxEnabled = !sfxEnabled;
    return sfxEnabled;
}

export function isSfxEnabled() { return sfxEnabled; }

// ═══════════════════════════════════════════════════════════
// OLAY TİPİNE GÖRE OTOMATİK SFX TETİKLEME
// ═══════════════════════════════════════════════════════════

/** Throttle — aynı SFX'i çok sık çalmayı önle */
const lastPlayTime = {};
function throttled(key, minIntervalMs, fn) {
    const now = Date.now();
    if (lastPlayTime[key] && now - lastPlayTime[key] < minIntervalMs) return;
    lastPlayTime[key] = now;
    fn();
}

/**
 * Faz geçişinde animasyon verisine göre uygun SFX'leri tetikle.
 * @param {object} animData - animation-events.json kaydı
 * @param {string} campaignPhaseId - 'naval-ops' | 'land-campaign' vs.
 */
export function triggerPhaseSfx(animData, campaignPhaseId) {
    if (!sfxEnabled || !animData) return;

    const eventType = animData.eventType || 'IDLE';
    const intensity = animData.intensity ?? 0;
    const fronts = animData.fronts || [];
    const isNaval = fronts.includes('Deniz');

    switch (eventType) {
        case 'BOMBARDMENT':
            if (intensity >= 8 && isNaval) {
                // Ağır deniz bombardımanı — top + mayın
                throttled('cannon', 3000, sfxCannonFire);
                if (intensity >= 9) {
                    setTimeout(() => throttled('mine', 5000, sfxMineExplosion), 800);
                }
            } else if (intensity >= 6) {
                throttled('cannon', 2000, sfxCannonFire);
            }
            break;

        case 'COMBAT':
            if (intensity >= 8) {
                // Yoğun çatışma
                throttled('explosion', 4000, sfxExplosion);
                setTimeout(() => throttled('cannon', 2500, sfxCannonFire), 500);
            } else if (intensity >= 6) {
                throttled('cannon', 3000, sfxCannonFire);
            } else if (intensity >= 4) {
                throttled('rifle', 1500, sfxRifleShot);
            }
            break;

        case 'NAVAL_PATROL':
            if (intensity >= 5) {
                throttled('cannon', 4000, sfxCannonFire);
            }
            break;

        case 'LANDING':
            throttled('horn', 8000, sfxShipHorn);
            setTimeout(() => throttled('rifle', 2000, sfxRifleShot), 1500);
            break;

        case 'ASSAULT':
            throttled('drum', 6000, sfxWarDrum);
            setTimeout(() => throttled('explosion', 4000, sfxExplosion), 1200);
            break;

        default:
            // Idle — sessiz
            break;
    }
}

// ═══════════════════════════════════════════════════════════
// SES KONTROL PANELİ DOM
// ═══════════════════════════════════════════════════════════

/** Ses kontrol butonlarını topbar'a ekle */
export function renderAudioControls() {
    const legend = document.querySelector('.legend');
    if (!legend) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'audio-controls';
    wrapper.innerHTML = `
        <button class="audio-btn" id="musicToggle" type="button" title="Müzik Aç/Kapat">
            <span class="audio-icon">🎵</span>
        </button>
        <button class="audio-btn" id="sfxToggle" type="button" title="Ses Efektleri Aç/Kapat">
            <span class="audio-icon">🔊</span>
        </button>
    `;
    legend.prepend(wrapper);

    document.getElementById('musicToggle').addEventListener('click', () => {
        const on = toggleMusic();
        document.getElementById('musicToggle').querySelector('.audio-icon').textContent = on ? '🎵' : '🔇';
    });

    document.getElementById('sfxToggle').addEventListener('click', () => {
        const on = toggleSfx();
        document.getElementById('sfxToggle').querySelector('.audio-icon').textContent = on ? '🔊' : '🔈';
    });
}

/** Kullanıcı ilk etkileşimde müziği başlat */
export function initAudioOnInteraction() {
    const handler = () => {
        startMusic();
        document.removeEventListener('click', handler);
        document.removeEventListener('keydown', handler);
    };
    document.addEventListener('click', handler, { once: false });
    document.addEventListener('keydown', handler, { once: false });
}
