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
let musicEnabled = false;
let sfxEnabled = true;
let isPlaying = false;
let audioUnlocked = false;
const ACTIVE_COMBAT_STATES = new Set(['fighting', 'bombardment']);
const FORCED_SILENCE_DATES = new Set(['1915-03-08', '1915-05-24']);

/** Lazy AudioContext — kullanıcı etkileşimi gerektirir */
function ensureContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        musicGain = audioCtx.createGain();
        musicGain.gain.value = 0.25; // Arka plan müziği düşük ses
        musicGain.connect(audioCtx.destination);
        sfxGain = audioCtx.createGain();
        sfxGain.gain.value = 0.22;
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
    audioUnlocked = true;
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
    audioUnlocked = true;
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

/** Beyaz gürültü buffer oluştur (patlama/top ateşi için temel) — yüksek frekans sınırlı */
function createNoiseBuffer(duration) {
    const ctx = ensureContext();
    const sr = ctx.sampleRate;
    const len = sr * duration;
    const buf = ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);
    // Pembe gürültüye yakın: yüksek frekansları bastır (tıss/hiss azaltma)
    let prev = 0;
    for (let i = 0; i < len; i++) {
        const white = Math.random() * 2 - 1;
        prev = prev * 0.6 + white * 0.4; // Basit lowpass — tıss sesi kırılır
        data[i] = prev;
    }
    return buf;
}

/** Rastgele pitch varyasyonu — monotonluğu kır */
function rp(base, variance) {
    return base + (Math.random() - 0.5) * variance;
}

/** Rastgele gecikme */
function rd(base, variance) {
    return base + Math.random() * variance;
}

function createCombatEnvelope(ctx, now, options = {}) {
    const filter = ctx.createBiquadFilter();
    filter.type = options.filterType || 'lowpass';
    filter.frequency.setValueAtTime(options.frequency ?? 1200, now);
    if (Number.isFinite(options.frequencyEnd)) {
        filter.frequency.exponentialRampToValueAtTime(options.frequencyEnd, now + (options.release ?? 0.3));
    }
    filter.Q.value = options.q ?? 0.8;

    const gain = ctx.createGain();
    const attack = options.attack ?? 0.01;
    const peak = options.peak ?? 0.12;
    const hold = options.hold ?? 0.04;
    const release = options.release ?? 0.28;
    const sustain = Math.max(0.0001, peak * (options.sustainRatio ?? 0.4));

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(peak, now + attack);
    gain.gain.exponentialRampToValueAtTime(sustain, now + attack + hold);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + release);

    filter.connect(gain).connect(sfxGain);
    return { filter, gain, release };
}

function normalizeEventType(value) {
    return String(value || 'IDLE').toUpperCase();
}

function getActiveCombatUnits(animData) {
    return Array.isArray(animData?.units)
        ? animData.units.filter((unit) => ACTIVE_COMBAT_STATES.has(String(unit?.state || '').toLowerCase()))
        : [];
}

function isNavalEngagement(animData) {
    const fronts = Array.isArray(animData?.fronts) ? animData.fronts : [];
    return fronts.includes('Deniz') || String(animData?.date || '') < '1915-04-25';
}

export function classifyCombatAudio(animData, campaignPhaseId) {
    if (!animData || campaignPhaseId === 'evacuation') return 'none';
    if (FORCED_SILENCE_DATES.has(String(animData.date || ''))) return 'none';

    const eventType = normalizeEventType(animData.eventType);
    const intensity = Number(animData.intensity ?? 0);
    if (intensity < 6) return 'none';
    if (['IDLE', 'LOGISTICS', 'POLITICAL', 'NAVAL_PATROL', 'LANDING', 'ASSAULT'].includes(eventType)) return 'none';

    const activeUnits = getActiveCombatUnits(animData);
    const activeSides = new Set(activeUnits.map((unit) => unit.side).filter(Boolean));
    if (!activeUnits.length || activeSides.size < 2) return 'none';

    const isNaval = isNavalEngagement(animData);
    if (eventType === 'BOMBARDMENT' && isNaval) {
        return intensity >= 8 ? 'heavy' : 'none';
    }

    if (eventType !== 'COMBAT' && eventType !== 'BOMBARDMENT') return 'none';
    if (intensity >= 8) return 'heavy';
    if (intensity >= 7) return 'direct';
    return 'distant';
}

/**
 * 🔊 Top ateşi — keskin patlama + metalik geri tepme + yankı
 * Kullanım: Kıyı bataryası ateşi
 */
export function sfxCannonFire() {
    if (!sfxEnabled) return;
    const ctx = ensureContext();
    const now = ctx.currentTime;

    // Patlama gövdesi (randomize edilmiş)
    const noise = ctx.createBufferSource();
    noise.buffer = createNoiseBuffer(0.5);
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(rp(0.55, 0.1), now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + rp(0.35, 0.1));
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = rp(700, 200);
    bp.Q.value = 1.5;
    noise.connect(bp).connect(noiseGain).connect(sfxGain);
    noise.start(now);
    noise.stop(now + 0.5);

    // Düşük vuruş (boom)
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(rp(110, 20), now);
    osc.frequency.exponentialRampToValueAtTime(35, now + 0.2);
    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0.45, now);
    oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
    osc.connect(oscGain).connect(sfxGain);
    osc.start(now);
    osc.stop(now + 0.3);

    // Metalik geri tepme tıkırtısı
    const click = ctx.createOscillator();
    click.type = 'square';
    click.frequency.setValueAtTime(rp(2000, 500), now + 0.05);
    click.frequency.exponentialRampToValueAtTime(500, now + 0.1);
    const clickG = ctx.createGain();
    clickG.gain.setValueAtTime(0.08, now + 0.05);
    clickG.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
    click.connect(clickG).connect(sfxGain);
    click.start(now + 0.05);
    click.stop(now + 0.15);
}

/**
 * 💥 Büyük patlama — çok katmanlı: şok dalgası + enkaz + yankı
 * Kullanım: Bouvet/Irresistible/Ocean batışları, mayın infilakı
 */
export function sfxExplosion() {
    if (!sfxEnabled) return;
    const ctx = ensureContext();
    const now = ctx.currentTime;
    const noise = ctx.createBufferSource();
    noise.buffer = createNoiseBuffer(0.42);
    const body = createCombatEnvelope(ctx, now, {
        frequency: 680,
        frequencyEnd: 140,
        peak: 0.11,
        hold: 0.05,
        release: 0.34,
        sustainRatio: 0.28
    });
    noise.connect(body.filter);
    noise.start(now);
    noise.stop(now + 0.45);

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(rp(58, 8), now);
    osc.frequency.exponentialRampToValueAtTime(24, now + 0.28);
    const low = ctx.createGain();
    low.gain.setValueAtTime(0.08, now);
    low.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
    osc.connect(low).connect(sfxGain);
    osc.start(now);
    osc.stop(now + 0.34);
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
 * 🔫 Tüfek/siper ateşi — keskin atış + mermi çınlaması + 2-3 aralıklı atış
 * Kullanım: Siper savaşı, keskin nişancı
 */
export function sfxRifleShot() {
    if (!sfxEnabled) return;
    const ctx = ensureContext();
    const now = ctx.currentTime;
    const shots = 1 + Math.floor(Math.random() * 2);

    for (let i = 0; i < shots; i++) {
        const t = now + i * rd(0.22, 0.1);
        const noise = ctx.createBufferSource();
        noise.buffer = createNoiseBuffer(0.05);
        const voice = createCombatEnvelope(ctx, t, {
            frequency: rp(1250, 120),
            frequencyEnd: 520,
            peak: rp(0.04, 0.01),
            hold: 0.015,
            release: 0.09,
            sustainRatio: 0.18
        });
        noise.connect(voice.filter);
        noise.start(t);
        noise.stop(t + 0.06);
    }
}

/**
 * ⚓ Gemi düdüğü — derin, yankılı, çift tonlu buharlı düdük
 * Kullanım: Donanma hareketi, çıkarma
 */
export function sfxShipHorn() {
    if (!sfxEnabled) return;
    const ctx = ensureContext();
    const now = ctx.currentTime;

    // İki tonlu düdük (buharlı gemi karakteristiği)
    const f1 = rp(165, 10);
    const osc1 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(f1, now);
    osc1.frequency.linearRampToValueAtTime(f1 - 5, now + 2.0);

    const osc2 = ctx.createOscillator();
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(f1 * 1.25, now);
    osc2.frequency.linearRampToValueAtTime(f1 * 1.25 - 5, now + 2.0);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.4);
    gain.gain.setValueAtTime(0.12, now + 1.3);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 2.2);

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 350;

    osc1.connect(lp);
    osc2.connect(lp);
    lp.connect(gain).connect(sfxGain);
    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 2.3);
    osc2.stop(now + 2.3);

    // Buhar sızıntı sesi — düşük seviye, yumuşak lowpass (tıss önleme)
    const steam = ctx.createBufferSource();
    steam.buffer = createNoiseBuffer(1.0);
    const steamG = ctx.createGain();
    steamG.gain.setValueAtTime(0, now + 1.8);
    steamG.gain.linearRampToValueAtTime(0.02, now + 2.0);
    steamG.gain.exponentialRampToValueAtTime(0.001, now + 2.6);
    const steamLp = ctx.createBiquadFilter();
    steamLp.type = 'lowpass';
    steamLp.frequency.value = 1500;
    steam.connect(steamLp).connect(steamG).connect(sfxGain);
    steam.start(now + 1.8);
    steam.stop(now + 2.6);
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

/**
 * 🔫 Makineli tüfek — gerçekçi seri atış: hızlı rafale + geri tepme ritmi
 * Kullanım: Siper savaşı, yoğun çatışma
 */
export function sfxMachineGun() {
    if (!sfxEnabled) return;
    const ctx = ensureContext();
    const now = ctx.currentTime;
    const burstLen = 4 + Math.floor(Math.random() * 2);

    for (let i = 0; i < burstLen; i++) {
        const t = now + i * rp(0.09, 0.02);
        const noise = ctx.createBufferSource();
        noise.buffer = createNoiseBuffer(0.035);
        const voice = createCombatEnvelope(ctx, t, {
            frequency: rp(1450, 180),
            frequencyEnd: 760,
            peak: rp(0.05, 0.01),
            hold: 0.01,
            release: 0.06,
            sustainRatio: 0.16
        });
        noise.connect(voice.filter);
        noise.start(t);
        noise.stop(t + 0.04);
    }

    const mech = ctx.createOscillator();
    mech.type = 'sine';
    mech.frequency.setValueAtTime(62, now);
    const mechG = ctx.createGain();
    mechG.gain.setValueAtTime(0.006, now);
    mechG.gain.setValueAtTime(0.006, now + burstLen * 0.09);
    mechG.gain.exponentialRampToValueAtTime(0.001, now + burstLen * 0.075 + 0.1);
    mech.connect(mechG).connect(sfxGain);
    mech.start(now);
    mech.stop(now + burstLen * 0.09 + 0.12);
}

/**
 * ⚓ Gemi topu — derin, yankılı deniz topu
 * Kullanım: Deniz bombardımanı (sfxCannonFire'dan farklı: daha derin, daha uzun)
 */
export function sfxNavalCannon() {
    if (!sfxEnabled) return;
    const ctx = ensureContext();
    const now = ctx.currentTime;

    const noise = ctx.createBufferSource();
    noise.buffer = createNoiseBuffer(0.55);
    const body = createCombatEnvelope(ctx, now, {
        frequency: 520,
        frequencyEnd: 90,
        peak: 0.085,
        hold: 0.05,
        release: 0.45,
        sustainRatio: 0.26
    });
    noise.connect(body.filter);
    noise.start(now);
    noise.stop(now + 0.55);

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(46, now);
    osc.frequency.exponentialRampToValueAtTime(20, now + 0.38);
    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0.075, now);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
    osc.connect(oscGain).connect(sfxGain);
    osc.start(now);
    osc.stop(now + 0.45);
}

/**
 * 💣 Havan mermisi — ıslık + patlama
 * Kullanım: Kara bombardımanı, topçu ateşi
 */
export function sfxMortarWhistle() {
    if (!sfxEnabled) return;
    const ctx = ensureContext();
    const now = ctx.currentTime;

    // Islık sesi (düşen mermi)
    const whistle = ctx.createOscillator();
    whistle.type = 'sine';
    whistle.frequency.setValueAtTime(1200, now);
    whistle.frequency.exponentialRampToValueAtTime(200, now + 0.6);
    const wGain = ctx.createGain();
    wGain.gain.setValueAtTime(0.12, now);
    wGain.gain.linearRampToValueAtTime(0.2, now + 0.3);
    wGain.gain.exponentialRampToValueAtTime(0.01, now + 0.55);
    whistle.connect(wGain).connect(sfxGain);
    whistle.start(now);
    whistle.stop(now + 0.6);

    // Patlama (ıslıktan sonra)
    const noise = ctx.createBufferSource();
    noise.buffer = createNoiseBuffer(0.4);
    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.5, now + 0.55);
    nGain.gain.exponentialRampToValueAtTime(0.01, now + 0.9);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(1500, now + 0.55);
    lp.frequency.exponentialRampToValueAtTime(200, now + 0.85);
    noise.connect(lp).connect(nGain).connect(sfxGain);
    noise.start(now + 0.5);
    noise.stop(now + 0.95);
}

/**
 * 🌊 Deniz dalgası — çift katmanlı: derin dalga + köpük
 * Kullanım: Deniz fazları arka planı
 */
export function sfxWaves() {
    if (!sfxEnabled) return;
    const ctx = ensureContext();
    const now = ctx.currentTime;

    // Derin dalga (düşük frekans)
    const deep = ctx.createBufferSource();
    deep.buffer = createNoiseBuffer(3.5);
    const deepG = ctx.createGain();
    deepG.gain.setValueAtTime(0.01, now);
    deepG.gain.linearRampToValueAtTime(0.07, now + 1.0);
    deepG.gain.linearRampToValueAtTime(0.02, now + 2.0);
    deepG.gain.linearRampToValueAtTime(0.06, now + 2.8);
    deepG.gain.exponentialRampToValueAtTime(0.01, now + 3.3);
    const deepLp = ctx.createBiquadFilter();
    deepLp.type = 'lowpass';
    deepLp.frequency.value = 350;
    deep.connect(deepLp).connect(deepG).connect(sfxGain);
    deep.start(now);
    deep.stop(now + 3.5);

    // Köpük/çakıl sesi (yüksek frekans, dalga kırılması)
    const foam = ctx.createBufferSource();
    foam.buffer = createNoiseBuffer(1.5);
    const foamG = ctx.createGain();
    foamG.gain.setValueAtTime(0, now + 0.8);
    foamG.gain.linearRampToValueAtTime(0.04, now + 1.2);
    foamG.gain.exponentialRampToValueAtTime(0.001, now + 2.0);
    const foamBp = ctx.createBiquadFilter();
    foamBp.type = 'bandpass';
    foamBp.frequency.value = 5000;
    foamBp.Q.value = 1;
    foam.connect(foamBp).connect(foamG).connect(sfxGain);
    foam.start(now + 0.7);
    foam.stop(now + 2.2);
}

/**
 * 🎺 Boru sesi — taarruz başlangıcı
 * Kullanım: Büyük taarruz fazları (davuldan daha keskin)
 */
export function sfxBugle() {
    if (!sfxEnabled) return;
    const ctx = ensureContext();
    const now = ctx.currentTime;

    // Ana ton (boru)
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.setValueAtTime(523, now + 0.3);
    osc.frequency.setValueAtTime(659, now + 0.6);
    osc.frequency.setValueAtTime(523, now + 0.9);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.1, now + 0.05);
    g.gain.setValueAtTime(0.1, now + 1.0);
    g.gain.exponentialRampToValueAtTime(0.01, now + 1.3);

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 800;
    bp.Q.value = 3;

    osc.connect(bp).connect(g).connect(sfxGain);
    osc.start(now);
    osc.stop(now + 1.35);
}

/**
 * 🔊 Uzaktan çatışma — düşük, sürekli ambient
 * Kullanım: Orta yoğunluklu çatışma arka planı
 */
export function sfxDistantBattle() {
    if (!sfxEnabled) return;
    const ctx = ensureContext();
    const now = ctx.currentTime;

    const noise = ctx.createBufferSource();
    noise.buffer = createNoiseBuffer(1.4);
    const bed = createCombatEnvelope(ctx, now, {
        frequency: 520,
        frequencyEnd: 180,
        peak: 0.035,
        hold: 0.18,
        release: 0.75,
        sustainRatio: 0.45
    });
    noise.connect(bed.filter);
    noise.start(now);
    noise.stop(now + 1.5);

    for (let i = 0; i < 2; i++) {
        const t = now + 0.28 + i * 0.34 + Math.random() * 0.12;
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(42 + Math.random() * 18, t);
        osc.frequency.exponentialRampToValueAtTime(24, t + 0.12);
        const og = ctx.createGain();
        og.gain.setValueAtTime(0.03, t);
        og.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
        osc.connect(og).connect(sfxGain);
        osc.start(t);
        osc.stop(t + 0.16);
    }
}

/** SFX aç/kapat */
export function toggleSfx() {
    audioUnlocked = true;
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
    if (!audioUnlocked || !sfxEnabled || !animData) return;

    const intensity = animData.intensity ?? 0;
    const profile = classifyCombatAudio(animData, campaignPhaseId);
    if (profile === 'none') return;

    const isNaval = isNavalEngagement(animData);

    switch (profile) {
        case 'distant':
            throttled('distant', 7000, sfxDistantBattle);
            break;
        case 'direct':
            if (isNaval) {
                throttled('navalDirect', 10000, sfxNavalCannon);
            } else {
                throttled('rifle', 5000, sfxRifleShot);
            }
            break;
        case 'heavy':
            if (isNaval) {
                if (intensity >= 9) {
                    throttled('mine', 14000, sfxMineExplosion);
                } else {
                    throttled('navalHeavy', 12000, sfxNavalCannon);
                }
            } else {
                const primary = intensity >= 8 ? sfxMachineGun : sfxRifleShot;
                const key = intensity >= 8 ? 'machineGun' : 'rifle';
                throttled(key, intensity >= 8 ? 7000 : 5000, primary);
                if (intensity >= 9) {
                    setTimeout(() => throttled('explosion', 12000, sfxExplosion), 380);
                }
            }
            break;
        default:
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
        <button class="audio-btn" id="musicToggle" type="button" title="Müzik Aç/Kapat" aria-label="Müziği aç">
            <span class="audio-icon" aria-hidden="true">♪</span><span class="audio-label">Müzik</span>
        </button>
        <button class="audio-btn" id="sfxToggle" type="button" title="Ses Efektleri Aç/Kapat" aria-label="Ses efektlerini kapat">
            <span class="audio-icon" aria-hidden="true">•</span><span class="audio-label">Efekt</span>
        </button>
    `;
    legend.prepend(wrapper);

    document.getElementById('musicToggle').addEventListener('click', () => {
        const on = toggleMusic();
        const button = document.getElementById('musicToggle');
        button.querySelector('.audio-icon').textContent = on ? '♪' : '×';
        button.setAttribute('aria-label', on ? 'Müziği kapat' : 'Müziği aç');
        button.classList.toggle('is-on', on);
    });

    document.getElementById('sfxToggle').addEventListener('click', () => {
        const on = toggleSfx();
        const button = document.getElementById('sfxToggle');
        button.querySelector('.audio-icon').textContent = on ? '•' : '×';
        button.setAttribute('aria-label', on ? 'Ses efektlerini kapat' : 'Ses efektlerini aç');
        button.classList.toggle('is-on', on);
    });

    document.getElementById('sfxToggle').classList.toggle('is-on', sfxEnabled);
}

/** Kullanıcı ilk etkileşiminden sonra mevcut context'i sessizce uyandır */
export function initAudioOnInteraction() {
    const handler = () => {
        audioUnlocked = true;
        if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
        document.removeEventListener('click', handler);
        document.removeEventListener('keydown', handler);
    };
    document.addEventListener('click', handler, { once: false });
    document.addEventListener('keydown', handler, { once: false });
}
