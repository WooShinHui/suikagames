export class ResultEffects {
    private disposed = false;
    private timer: ReturnType<typeof setTimeout> | null = null;
    private readonly particles = new Set<HTMLElement>();

    constructor(private readonly resultCt: HTMLElement) {}

    public play(isNewHighScore: boolean): void {
        if (this.timer !== null) clearTimeout(this.timer);
        this.injectAnimationStyles();
        this.applyEntryAnimation();
        if (isNewHighScore)
            this.timer = setTimeout(() => {
                this.timer = null;
                if (!this.disposed) this.playNewRecordEffect();
            }, 450);
        this.resultCt.querySelector('#score-val')?.classList.add('score-pop');
    }

    private frame(callback: () => void): void {
        requestAnimationFrame(() => {
            if (!this.disposed) callback();
        });
    }

    public dispose(): void {
        this.disposed = true;
        if (this.timer !== null) clearTimeout(this.timer);
        for (const el of this.particles) el.remove();
        this.particles.clear();
    }

    private applyEntryAnimation(): void {
        const box = this.resultCt.querySelector<HTMLElement>('#inner-box');
        if (!box) return;

        box.style.transform = 'translateY(50px) scale(0.88)';
        box.style.opacity = '0';
        box.style.transition = 'none';

        this.resultCt.style.opacity = '0';
        this.resultCt.style.transition = 'opacity 0.25s ease';
        this.resultCt.style.display = 'flex';

        this.frame(() => {
            this.resultCt.style.opacity = '1';
            this.frame(() => {
                box.style.transition =
                    'transform 0.55s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease';
                box.style.transform = 'translateY(0) scale(1)';
                box.style.opacity = '1';
            });
        });
    }

    private playNewRecordEffect(): void {
        const emojis = ['🍉', '🍊', '🍋', '🍇', '🍓', '⭐', '✨'];
        const directions = ['fruitFallCW', 'fruitFallCCW'];

        for (let i = 0; i < 14; i++) {
            const el = document.createElement('div');
            el.textContent =
                emojis[Math.floor(Math.random() * emojis.length)] || '';
            const anim = directions[Math.floor(Math.random() * 2)];
            Object.assign(el.style, {
                position: 'fixed',
                left: `${15 + Math.random() * 70}%`,
                top: `${20 + Math.random() * 40}%`,
                fontSize: `${16 + Math.random() * 20}px`,
                pointerEvents: 'none',
                zIndex: '2000',
                animation: `${anim} ${
                    0.7 + Math.random() * 0.9
                }s ease-out forwards`,
                animationDelay: `${Math.random() * 0.4}s`,
            });
            this.particles.add(el);
            document.body.appendChild(el);
            el.addEventListener('animationend', () => {
                this.particles.delete(el);
                el.remove();
            });
        }
    }

    private injectAnimationStyles(): void {
        if (document.getElementById('result-anim-style')) return;
        const style = document.createElement('style');
        style.id = 'result-anim-style';

        const rowDelays = Array.from(
            { length: 25 },
            (_, i) =>
                `#ranking-tbody tr:nth-child(${i + 1}) { animation-delay:${
                    0.04 * (i + 1)
                }s; }`
        ).join('\n');

        style.textContent = `
        @keyframes fruitFallCW {
            0%   { transform:translateY(0) rotate(0deg);     opacity:1; }
            100% { transform:translateY(140px) rotate(360deg); opacity:0; }
        }
        @keyframes fruitFallCCW {
            0%   { transform:translateY(0) rotate(0deg);      opacity:1; }
            100% { transform:translateY(140px) rotate(-360deg); opacity:0; }
        }
        @keyframes scoreCountUp {
            0%   { transform:scale(1.4); color:#e8a020; }
            100% { transform:scale(1);   color:inherit; }
        }
        .score-pop { animation:scoreCountUp 0.5s ease-out; }
        @keyframes rankRowFadeIn {
            from { opacity:0; transform:translateX(-10px); }
            to   { opacity:1; transform:translateX(0); }
        }
        #ranking-tbody tr { animation:rankRowFadeIn 0.3s ease-out both; }
        ${rowDelays}`;

        document.head.appendChild(style);
    }
}
