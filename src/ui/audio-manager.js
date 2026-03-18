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

/** Rastgele pitch varyasyonu — monotonluğu kır */
function rp(base, variance) {
    return base + (Math.random() - 0.5) * variance;
}

/** Rastgele gecikme */
function rd(base, variance) {
    return base + Math.random() * variance;
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

    // 1. İlk şok dalgası (keskin, kısa)
    const shock = ctx.createBufferSource();
    shock.buffer = createNoiseBuffer(0.15);
    const shockG = ctx.createGain();
    shockG.gain.setValueAtTime(0.7, now);
    shockG.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    const shockHp = ctx.createBiquadFilter();
    shockHp.type = 'highpass';
    shockHp.frequency.value = 1500;
    shock.connect(shockHp).connect(shockG).connect(sfxGain);
    shock.start(now);
    shock.stop(now + 0.15);

    // 2. Ana patlama gövdesi
    const noise = ctx.createBufferSource();
    noise.buffer = createNoiseBuffer(1.5);
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.65, now + 0.03);
    noiseGain.gain.linearRampToValueAtTime(0.45, now + 0.15);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 1.2);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(2500, now);
    lp.frequency.exponentialRampToValueAtTime(150, now + 1.0);
    noise.connect(lp).connect(noiseGain).connect(sfxGain);
    noise.start(now + 0.02);
    noise.stop(now + 1.5);

    // 3. Derin bas boom (göğüste hissedilen)
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(rp(70, 15), now);
    osc.frequency.exponentialRampToValueAtTime(18, now + 0.6);
    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0.6, now);
    oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.7);
    osc.connect(oscGain).connect(sfxGain);
    osc.start(now);
    osc.stop(now + 0.75);

    // 4. Enkaz düşme sesleri (gecikmeli tıkırtılar)
    for (let i = 0; i < 4; i++) {
        const t = now + 0.5 + rd(0.2, 0.4) * i;
        const deb = ctx.createBufferSource();
        deb.buffer = createNoiseBuffer(0.06);
        const dg = ctx.createGain();
        dg.gain.setValueAtTime(rp(0.06, 0.03), t);
        dg.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
        const dhp = ctx.createBiquadFilter();
        dhp.type = 'highpass';
        dhp.frequency.value = rp(3000, 1000);
        deb.connect(dhp).connect(dg).connect(sfxGain);
        deb.start(t);
        deb.stop(t + 0.06);
    }
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
    const shots = 2 + Math.floor(Math.random() * 2); // 2-3 atış

    for (let i = 0; i < shots; i++) {
        const t = now + i * rd(0.3, 0.2);

        // Atış patlaması
        const noise = ctx.createBufferSource();
        noise.buffer = createNoiseBuffer(0.1);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(rp(0.2, 0.05), t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.07);
        const hp = ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = rp(2200, 400);
        noise.connect(hp).connect(gain).connect(sfxGain);
        noise.start(t);
        noise.stop(t + 0.1);

        // Mermi çınlaması (vızıltı)
        const whiz = ctx.createOscillator();
        whiz.type = 'sine';
        whiz.frequency.setValueAtTime(rp(4000, 800), t + 0.03);
        whiz.frequency.exponentialRampToValueAtTime(1000, t + 0.12);
        const wg = ctx.createGain();
        wg.gain.setValueAtTime(0.03, t + 0.03);
        wg.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        whiz.connect(wg).connect(sfxGain);
        whiz.start(t + 0.03);
        whiz.stop(t + 0.13);
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

    // Buhar sızıntı sesi
    const steam = ctx.createBufferSource();
    steam.buffer = createNoiseBuffer(1.0);
    const steamG = ctx.createGain();
    steamG.gain.setValueAtTime(0, now + 1.8);
    steamG.gain.linearRampToValueAtTime(0.04, now + 2.0);
    steamG.gain.exponentialRampToValueAtTime(0.001, now + 2.8);
    const steamLp = ctx.createBiquadFilter();
    steamLp.type = 'bandpass';
    steamLp.frequency.value = 4000;
    steamLp.Q.value = 3;
    steam.connect(steamLp).connect(steamG).connect(sfxGain);
    steam.start(now + 1.8);
    steam.stop(now + 2.8);
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
    const burstLen = 8 + Math.floor(Math.random() * 5); // 8-12 atış

    for (let i = 0; i < burstLen; i++) {
        const t = now + i * rp(0.075, 0.015); // Hafif düzensiz ritim

        // Her atış
        const noise = ctx.createBufferSource();
        noise.buffer = createNoiseBuffer(0.05);
        const g = ctx.createGain();
        g.gain.setValueAtTime(rp(0.16, 0.04), t);
        g.gain.exponentialRampToValueAtTime(0.01, t + 0.04);
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = rp(3000, 600);
        bp.Q.value = 2;
        noise.connect(bp).connect(g).connect(sfxGain);
        noise.start(t);
        noise.stop(t + 0.05);
    }

    // Mekanizma sesi (arka plan tıkırtısı)
    const mech = ctx.createOscillator();
    mech.type = 'square';
    mech.frequency.setValueAtTime(120, now);
    const mechG = ctx.createGain();
    mechG.gain.setValueAtTime(0.03, now);
    mechG.gain.setValueAtTime(0.03, now + burstLen * 0.075);
    mechG.gain.exponentialRampToValueAtTime(0.001, now + burstLen * 0.075 + 0.1);
    mech.connect(mechG).connect(sfxGain);
    mech.start(now);
    mech.stop(now + burstLen * 0.075 + 0.15);
}

/**
 * ⚓ Gemi topu — derin, yankılı deniz topu
 * Kullanım: Deniz bombardımanı (sfxCannonFire'dan farklı: daha derin, daha uzun)
 */
export function sfxNavalCannon() {
    if (!sfxEnabled) return;
    const ctx = ensureContext();
    const now = ctx.currentTime;

    // Derin patlama gövdesi
    const noise = ctx.createBufferSource();
    noise.buffer = createNoiseBuffer(0.8);
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.5, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.7);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(600, now);
    lp.frequency.exponentialRampToValueAtTime(80, now + 0.6);
    noise.connect(lp).connect(noiseGain).connect(sfxGain);
    noise.start(now);
    noise.stop(now + 0.8);

    // Çok derin bas vuruş
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(60, now);
    osc.frequency.exponentialRampToValueAtTime(18, now + 0.6);
    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0.55, now);
    oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.7);
    osc.connect(oscGain).connect(sfxGain);
    osc.start(now);
    osc.stop(now + 0.75);

    // Yankı — gecikmeli gürültü
    const echo = ctx.createBufferSource();
    echo.buffer = createNoiseBuffer(0.5);
    const echoGain = ctx.createGain();
    echoGain.gain.setValueAtTime(0, now);
    echoGain.gain.linearRampToValueAtTime(0.12, now + 0.3);
    echoGain.gain.exponentialRampToValueAtTime(0.01, now + 1.2);
    const echoLp = ctx.createBiquadFilter();
    echoLp.type = 'lowpass';
    echoLp.frequency.value = 300;
    echo.connect(echoLp).connect(echoGain).connect(sfxGain);
    echo.start(now + 0.2);
    echo.stop(now + 1.2);
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
    noise.buffer = createNoiseBuffer(3.0);
    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.01, now);
    nGain.gain.linearRampToValueAtTime(0.06, now + 0.5);
    nGain.gain.setValueAtTime(0.06, now + 2.0);
    nGain.gain.exponentialRampToValueAtTime(0.01, now + 2.8);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 800;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 100;
    noise.connect(lp).connect(hp).connect(nGain).connect(sfxGain);
    noise.start(now);
    noise.stop(now + 3.0);

    // Aralıklı uzak patlamalar
    for (let i = 0; i < 3; i++) {
        const t = now + 0.4 + i * 0.8 + Math.random() * 0.3;
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(50 + Math.random() * 30, t);
        osc.frequency.exponentialRampToValueAtTime(20, t + 0.2);
        const og = ctx.createGain();
        og.gain.setValueAtTime(0.08, t);
        og.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
        osc.connect(og).connect(sfxGain);
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
            if (isNaval) {
                // Deniz bombardımanı — gemi topu + dalga
                throttled('navalCannon', 3000, sfxNavalCannon);
                setTimeout(() => throttled('waves', 5000, sfxWaves), 600);
                if (intensity >= 9) {
                    setTimeout(() => throttled('mine', 5000, sfxMineExplosion), 1200);
                }
            } else {
                // Kara bombardımanı — kara topu + havan
                throttled('cannon', 2000, sfxCannonFire);
                if (intensity >= 7) {
                    setTimeout(() => throttled('mortar', 3000, sfxMortarWhistle), 800);
                }
            }
            break;

        case 'COMBAT':
            if (intensity >= 8) {
                // Yoğun çatışma — makineli + patlama
                throttled('machineGun', 3000, sfxMachineGun);
                setTimeout(() => throttled('explosion', 4000, sfxExplosion), 600);
            } else if (intensity >= 5) {
                // Orta çatışma — tüfek + uzak çatışma
                throttled('rifle', 1500, sfxRifleShot);
                setTimeout(() => throttled('distant', 5000, sfxDistantBattle), 400);
            } else if (intensity >= 3) {
                throttled('distant', 4000, sfxDistantBattle);
            }
            break;

        case 'NAVAL_PATROL':
            // Deniz devriyesi — dalga + hafif top
            throttled('waves', 6000, sfxWaves);
            if (intensity >= 5) {
                setTimeout(() => throttled('navalCannon', 4000, sfxNavalCannon), 1000);
            }
            break;

        case 'LANDING':
            // Çıkarma — gemi düdüğü + dalga + tüfek
            throttled('horn', 8000, sfxShipHorn);
            setTimeout(() => throttled('waves', 5000, sfxWaves), 800);
            setTimeout(() => throttled('rifle', 2000, sfxRifleShot), 1500);
            break;

        case 'ASSAULT':
            // Taarruz — boru + makineli + patlama
            throttled('bugle', 6000, sfxBugle);
            setTimeout(() => throttled('machineGun', 3000, sfxMachineGun), 1000);
            setTimeout(() => throttled('explosion', 4000, sfxExplosion), 1800);
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
