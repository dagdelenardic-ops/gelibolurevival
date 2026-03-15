// ══════════════════════════════════════════════════════════════
// Gelibolu Revival — Onboarding Tutorial
// İlk ziyaretçi için 4 adımlık rehber overlay
// ══════════════════════════════════════════════════════════════

const STORAGE_KEY = 'gelibolu_onboarding_done';

const STEPS = [
    {
        target: '.map-container svg',
        title: 'İnteraktif Savaş Haritası',
        text: 'Çanakkale Savaşı\'nı 433 günlük faz faz izleyin. Birlik tokenlarına tıklayarak detaylı bilgi alabilirsiniz.',
        position: 'center'
    },
    {
        target: '.timeline',
        title: 'Zaman Çizelgesi',
        text: 'Alt kısımdaki zaman çizelgesinden herhangi bir güne tıklayın. Büyük noktalar önemli olayları gösterir. ▶ düğmesiyle otomatik oynatmayı başlatın.',
        position: 'top'
    },
    {
        target: '.narration-box',
        title: 'Anlatım Kutusu',
        text: 'Her gün için tarihsel anlatım burada görünür. Savaşın o günkü gelişmelerini takip edin.',
        position: 'right'
    },
    {
        target: null,
        title: 'Klavye Kısayolları',
        text: '← → Ok tuşlarıyla fazlar arası geçiş yapın.\nSpace ile oynat/duraklat.\nEsc ile paneli kapatın.\nMobilde iki parmakla yakınlaştırın.',
        position: 'center'
    }
];

function createOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'onboardingOverlay';
    overlay.innerHTML = `
        <div class="onboarding-backdrop"></div>
        <div class="onboarding-card">
            <div class="onboarding-step-indicator"></div>
            <h3 class="onboarding-title"></h3>
            <p class="onboarding-text"></p>
            <div class="onboarding-actions">
                <button class="onboarding-skip" type="button">Atla</button>
                <button class="onboarding-next" type="button">İleri</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    return overlay;
}

function positionCard(overlay, step, index) {
    const card = overlay.querySelector('.onboarding-card');
    const title = overlay.querySelector('.onboarding-title');
    const text = overlay.querySelector('.onboarding-text');
    const indicator = overlay.querySelector('.onboarding-step-indicator');
    const nextBtn = overlay.querySelector('.onboarding-next');

    title.textContent = step.title;
    text.textContent = step.text;
    indicator.innerHTML = STEPS.map((_, i) =>
        `<span class="onboarding-dot${i === index ? ' active' : ''}"></span>`
    ).join('');
    nextBtn.textContent = index === STEPS.length - 1 ? 'Başla' : 'İleri';

    // Reset card position
    card.style.top = '';
    card.style.left = '';
    card.style.bottom = '';
    card.style.right = '';
    card.style.transform = '';

    // Highlight target element
    const backdrop = overlay.querySelector('.onboarding-backdrop');
    const existingHighlight = overlay.querySelector('.onboarding-highlight');
    if (existingHighlight) existingHighlight.remove();

    if (step.target) {
        const target = document.querySelector(step.target);
        if (target) {
            const rect = target.getBoundingClientRect();
            const highlight = document.createElement('div');
            highlight.className = 'onboarding-highlight';
            highlight.style.cssText = `
                position:fixed;
                top:${rect.top - 4}px;left:${rect.left - 4}px;
                width:${rect.width + 8}px;height:${rect.height + 8}px;
                border:2px solid rgba(201,168,76,.8);
                border-radius:8px;
                z-index:10001;
                pointer-events:none;
                box-shadow:0 0 0 9999px rgba(0,0,0,.6);
            `;
            overlay.appendChild(highlight);

            // Position card relative to target
            if (step.position === 'top') {
                card.style.bottom = `${window.innerHeight - rect.top + 16}px`;
                card.style.left = '50%';
                card.style.transform = 'translateX(-50%)';
            } else if (step.position === 'right') {
                card.style.top = `${rect.top}px`;
                card.style.left = `${rect.right + 16}px`;
            } else {
                card.style.top = '50%';
                card.style.left = '50%';
                card.style.transform = 'translate(-50%, -50%)';
            }
        } else {
            card.style.top = '50%';
            card.style.left = '50%';
            card.style.transform = 'translate(-50%, -50%)';
        }
    } else {
        card.style.top = '50%';
        card.style.left = '50%';
        card.style.transform = 'translate(-50%, -50%)';
    }
}

function injectStyles() {
    if (document.getElementById('onboarding-styles')) return;
    const style = document.createElement('style');
    style.id = 'onboarding-styles';
    style.textContent = `
        #onboardingOverlay{position:fixed;inset:0;z-index:10000}
        .onboarding-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.5)}
        .onboarding-card{
            position:fixed;
            background:linear-gradient(145deg,rgba(33,32,26,.98),rgba(24,22,15,.98));
            border:1px solid rgba(201,168,76,.5);
            border-radius:12px;
            padding:20px 24px;
            max-width:360px;
            min-width:280px;
            box-shadow:0 16px 48px rgba(0,0,0,.5);
            z-index:10002;
            animation:onboardFadeIn .3s ease
        }
        @keyframes onboardFadeIn{from{opacity:0;transform:translate(-50%,-50%) scale(.95)}to{opacity:1}}
        .onboarding-title{
            font-family:var(--mono);font-size:1rem;color:var(--gold);
            margin:0 0 8px;letter-spacing:.03em
        }
        .onboarding-text{
            font-size:.88rem;color:var(--text);line-height:1.55;
            margin:0 0 16px;white-space:pre-line
        }
        .onboarding-step-indicator{display:flex;gap:6px;margin-bottom:12px}
        .onboarding-dot{
            width:8px;height:8px;border-radius:50%;
            background:rgba(201,168,76,.25);transition:background .2s
        }
        .onboarding-dot.active{background:var(--gold)}
        .onboarding-actions{display:flex;justify-content:space-between;align-items:center}
        .onboarding-skip{
            background:none;border:none;color:var(--text-muted);
            font-size:.8rem;cursor:pointer;padding:6px 10px;
            font-family:var(--mono)
        }
        .onboarding-skip:hover{color:var(--text)}
        .onboarding-next{
            background:rgba(201,168,76,.18);border:1px solid var(--gold-dim);
            color:var(--gold);padding:8px 20px;border-radius:6px;
            font-family:var(--mono);font-size:.84rem;cursor:pointer;
            transition:background .15s
        }
        .onboarding-next:hover{background:rgba(201,168,76,.3)}
    `;
    document.head.appendChild(style);
}

export function initOnboarding() {
    if (localStorage.getItem(STORAGE_KEY)) return;

    injectStyles();

    // Small delay to let the map render
    setTimeout(() => {
        const overlay = createOverlay();
        let currentStep = 0;

        function show(index) {
            currentStep = index;
            positionCard(overlay, STEPS[index], index);
        }

        function finish() {
            localStorage.setItem(STORAGE_KEY, '1');
            overlay.style.opacity = '0';
            overlay.style.transition = 'opacity .3s';
            setTimeout(() => overlay.remove(), 300);
        }

        overlay.querySelector('.onboarding-next').addEventListener('click', () => {
            if (currentStep >= STEPS.length - 1) {
                finish();
            } else {
                show(currentStep + 1);
            }
        });

        overlay.querySelector('.onboarding-skip').addEventListener('click', finish);

        // Escape to dismiss
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                finish();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);

        show(0);
    }, 800);
}
