import type {
    RankingEntry,
    ResultActions,
    ResultSnapshot,
} from '../../../Model/ResultTypes';
import { RankingView } from './RankingView';
import { ResultEffects } from './ResultEffects';

export class ResultView {
    private resultCt: HTMLDivElement;
    private readonly effects: ResultEffects;
    private readonly ranking = new RankingView((base) => this.px(base));
    private actions: ResultActions | null = null;
    private disposed = false;
    private closeTimer: ReturnType<typeof setTimeout> | null = null;
    private readonly onResize = () => this.handleResize();

    constructor() {
        const canvas = document.querySelector('canvas') as HTMLCanvasElement;
        const parent = canvas?.parentElement || document.body;

        this.resultCt = document.createElement('div');
        this.resultCt.id = 'result-container';
        Object.assign(this.resultCt.style, {
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            // 게임 배경과 어울리는 하늘색 반투명 오버레이
            background: 'rgba(27, 27, 27, 0.82)',
            color: '#5a3000',
            display: 'none',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '0',
            zIndex: '1001',
            fontFamily: '"SchoolSafeDungGeunMiSo", "Montserrat", sans-serif',
            boxSizing: 'border-box',
            textAlign: 'center',
            opacity: '0',
            transition: 'opacity 0.25s ease',
        });
        parent.appendChild(this.resultCt);

        this.effects = new ResultEffects(this.resultCt);
        window.addEventListener('resize', this.onResize);
        this.handleResize();
    }

    public setActions(actions: ResultActions): void {
        this.actions = actions;
    }

    private handleResize() {
        const canvas = document.querySelector('canvas');
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        this.resultCt.style.width = `${rect.width}px`;
        this.resultCt.style.height = `${rect.height}px`;
        this.resultCt.style.top = `${canvas.offsetTop}px`;
        this.resultCt.style.left = `${canvas.offsetLeft}px`;
    }

    private px(base: number): number {
        return Math.max(8, (base * window.innerWidth) / 720);
    }

    public showLoading(): void {
        if (this.closeTimer !== null) {
            clearTimeout(this.closeTimer);
            this.closeTimer = null;
        }

        // 로딩 표시
        this.resultCt.style.display = 'flex';
        this.resultCt.style.opacity = '0';
        this.resultCt.innerHTML = `
            <div style="
                background: linear-gradient(180deg,#f0c060 0%,#e8a020 50%,#c47010 100%);
                border-radius:${this.px(16)}px;
                padding:${this.px(16)}px ${this.px(32)}px;
              box-shadow: 0 3px 0 #7a4a05, 0 ${this.px(4)}px ${this.px(
                  6
              )}px rgba(0,0,0,0.25);
                color:#fff; font-size:${this.px(15)}px; font-weight:800;
                letter-spacing:3px;
                text-shadow: 0 2px 0 rgba(0,0,0,0.2);
            ">LOADING...</div>`;

        requestAnimationFrame(() => {
            if (this.disposed) return;
            this.resultCt.style.opacity = '1';
        });
    }

    public showError(): void {
        this.resultCt.innerHTML =
            '<p style="color:#c00;">Failed to load rankings</p>';
    }

    public render(
        snapshot: ResultSnapshot,
        topRankings: RankingEntry[],
        myRanking: RankingEntry | null
    ): void {
        const {
            mode: type,
            finalScore,
            previousHighScore: previousScore,
            isNewRecord,
        } = snapshot;
        const isGameOver = type === 'GAME_OVER';
        const isRankingOnly = type === 'START';
        const currentScore = Number(finalScore);
        const isNewHighScore = isGameOver && isNewRecord;

        // 나무판 버튼 스타일 헬퍼
        const woodBtn = (id: string, label: string, active = true) => `
            <button id="${id}" style="
                flex:1; padding:${this.px(7)}px ${this.px(4)}px;
                background:linear-gradient(180deg,${
                    active ? '#f0c060,#c47010' : '#c8a050,#907030'
                });
                border:none; border-radius:${this.px(10)}px;
                box-shadow:0 ${this.px(2)}px 0 ${
                    active ? '#7a4a05' : '#5a3a00'
                };
                color:${active ? '#fff' : 'rgba(255,255,255,0.65)'};
                font-size:${this.px(11)}px; font-weight:700;
                cursor:pointer; letter-spacing:1px;
                text-shadow:0 1px 0 rgba(0,0,0,0.2);
                font-family:inherit; transition:transform 0.1s;
            ">${label}</button>`;

        // ── 타이틀 ──────────────────────────────────
        const titleText = isRankingOnly
            ? '🌍 LEADERBOARD'
            : isNewHighScore
              ? '🏆 NEW RECORD!'
              : '🎮 GAME OVER';

        let inner = `
        <div style="
            background:linear-gradient(180deg,#f0c060 0%,#e8a020 50%,#c47010 100%);
            border-radius:${this.px(14)}px;
            padding:${this.px(8)}px ${this.px(12)}px;
box-shadow: 0 3px 0 #7a4a05, inset 0 1px 0 rgba(255,255,255,0.4);
            margin-bottom:${this.px(10)}px;
        ">
            <div style="
                font-size:${this.px(17)}px; font-weight:800; color:#fff;
                letter-spacing:2px; text-shadow:0 2px 0 rgba(0,0,0,0.2);
            ">${titleText}</div>
        </div>`;

        // ── 점수 카드 ───────────────────────────────
        if (isGameOver) {
            const bestGradient = isNewHighScore
                ? '#ffcc00 0%,#ff9900 50%,#cc6600 100%'
                : '#f0c060 0%,#e8a020 50%,#c47010 100%';

            inner += `
                <div style="display:flex; gap:${this.px(
                    8
                )}px; margin-bottom:${this.px(10)}px;">
                    <!-- SCORE: 하늘색 계열 (현재 점수) -->
                    <div style="
                        flex:1;
                        background:linear-gradient(180deg,#6ec6f0 0%,#3aa0d8 50%,#1a7ab0 100%);
                        border-radius:${this.px(12)}px;
                        padding:${this.px(8)}px ${this.px(6)}px;
                        box-shadow: 0 3px 0 #0e4a70, inset 0 1px 0 rgba(255,255,255,0.4);
                    ">
                        <div style="font-size:${this.px(
                            9
                        )}px;color:rgba(255,255,255,0.85);letter-spacing:2px;font-weight:600;">SCORE</div>
                        <div id="score-val" style="font-size:${this.px(
                            20
                        )}px;font-weight:800;color:#fff;text-shadow:0 2px 0 rgba(0,0,0,0.2);">
                            ${currentScore.toLocaleString()}
                        </div>
                    </div>
                    <!-- BEST: 기존 나무색 유지 (또는 신기록 시 골드) -->
                    <div style="
                        flex:1;
                        background:linear-gradient(180deg,${bestGradient});
                        border-radius:${this.px(12)}px;
                        padding:${this.px(8)}px ${this.px(6)}px;
                        box-shadow: 0 3px 0 #7a4a05, inset 0 1px 0 rgba(255,255,255,0.4);
                    ">
                        <div style="font-size:${this.px(
                            9
                        )}px;color:rgba(255,255,255,0.85);letter-spacing:2px;font-weight:600;">BEST</div>
                        <div style="font-size:${this.px(
                            20
                        )}px;font-weight:800;color:#fff;text-shadow:0 2px 0 rgba(0,0,0,0.2);">
                            ${previousScore.toLocaleString()}
                        </div>
                    </div>
                </div>`;
        }

        // ── 내 순위 뱃지 ────────────────────────────
        const showNearbyTab = !!(myRanking && myRanking.rank > 20);

        if (showNearbyTab) {
            inner += `
            <div style="
                background:linear-gradient(180deg,#f0c060,#c47010);
                border-radius:${this.px(10)}px;
                padding:${this.px(6)}px ${this.px(10)}px;
box-shadow: 0 3px 0 #7a4a05;
                color:#fff; font-size:${this.px(11)}px; font-weight:700;
                letter-spacing:1px; margin-bottom:${this.px(8)}px;
                text-shadow:0 1px 0 rgba(0,0,0,0.2);
            ">MY RANK &nbsp;#${
                myRanking!.rank
            }&nbsp;&nbsp;·&nbsp;&nbsp;${myRanking!.total_score.toLocaleString()} pts</div>

            <div style="display:flex; gap:${this.px(
                6
            )}px; margin-bottom:${this.px(8)}px;">
                ${woodBtn('tab-top', '🏆 TOP', true)}
                ${woodBtn('tab-nearby', '👥 NEARBY', false)}
            </div>`;
        }

        inner += `<div id="ranking-content"></div>`;

        // ── 메인 패널 ───────────────────────────────
        this.resultCt.innerHTML = `
        <style>
            #inner-box::-webkit-scrollbar { width:${this.px(5)}px; }
            #inner-box::-webkit-scrollbar-track { background:rgba(200,150,50,0.15); border-radius:${this.px(
                4
            )}px; }
            #inner-box::-webkit-scrollbar-thumb { background:rgba(180,110,20,0.4);  border-radius:${this.px(
                4
            )}px; }
        </style>
        <div id="inner-box" style="
            width:90%;
            max-width:${this.px(580)}px;
            max-height:88%;
            overflow-y:auto;
            padding:${this.px(14)}px;
            border-radius:${this.px(20)}px;
            /* 크림색 나무판 내부 */
            background:linear-gradient(180deg,#fffbe8 0%,#fff3c8 100%);
            border:${this.px(4)}px solid #e8a020;
box-shadow: 0 3px 0 #7a4a05
                0 6px 16px rgba(0,0,0,0.25),
                inset 0 1px 0 rgba(255,255,255,0.95);
            text-align:center;
            position:relative;
            color:#5a3000;
        ">
            <!-- 닫기 버튼 -->
            <button id="result-close-btn" style="
                position:absolute; top:${this.px(10)}px; right:${this.px(10)}px;
                background:linear-gradient(180deg,#ff7070,#cc3030);
                color:#fff; border:none; border-radius:50%;
                width:${this.px(28)}px; height:${this.px(28)}px;
                cursor:pointer; font-size:${this.px(15)}px; font-weight:900;
                box-shadow: 0 1px 0 #880000;
                display:flex; align-items:center; justify-content:center;
                font-family:inherit; line-height:1;">×</button>
            ${inner}
        </div>`;

        const closeBtn =
            this.resultCt.querySelector<HTMLButtonElement>('#result-close-btn');
        if (closeBtn) closeBtn.onclick = () => this.actions?.close();

        this.renderRankings(topRankings, '🏆 Global Top', snapshot.userId);

        if (showNearbyTab) {
            const tabTop = this.resultCt.querySelector<HTMLElement>('#tab-top');
            const tabNearby =
                this.resultCt.querySelector<HTMLElement>('#tab-nearby');
            if (tabTop)
                tabTop.onclick = () => {
                    this.selectTab(true);
                    this.actions?.top();
                };
            if (tabNearby)
                tabNearby.onclick = () => {
                    this.selectTab(false);
                    this.actions?.nearby();
                };
        }

        // ── 재시작 버튼 ─────────────────────────────
        const restartBtn = document.createElement('button');
        Object.assign(restartBtn.style, {
            position: 'absolute',
            bottom: `${this.px(40)}px`,
            left: '50%',
            transform: 'translateX(-50%)',
            width: `${this.px(80)}px`,
            height: `${this.px(80)}px`,
            background:
                'url("./assets/images/btn_re_s.png") no-repeat center center',
            backgroundSize: 'contain',
            border: 'none',
            cursor: 'pointer',
            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.25))',
            transition: 'transform 0.12s',
            zIndex: '1010',
        });
        restartBtn.id = 'restart-action-btn';
        this.resultCt.appendChild(restartBtn);

        if (isGameOver) {
            if (closeBtn) closeBtn.style.display = 'none';
            restartBtn.onclick = () => {
                this.actions?.restart();
                this.resultCt.style.display = 'none';
            };
            restartBtn.addEventListener('pointerdown', () => {
                restartBtn.style.backgroundImage =
                    'url("./assets/images/btn_re_n.png")';
                restartBtn.style.transform = 'translateX(-50%) scale(0.93)';
            });
            restartBtn.addEventListener('pointerup', () => {
                restartBtn.style.backgroundImage =
                    'url("./assets/images/btn_re_s.png")';
                restartBtn.style.transform = 'translateX(-50%) scale(1)';
            });
            restartBtn.addEventListener('pointerleave', () => {
                restartBtn.style.backgroundImage =
                    'url("./assets/images/btn_re_s.png")';
                restartBtn.style.transform = 'translateX(-50%) scale(1)';
            });
        } else if (isRankingOnly) {
            restartBtn.style.display = 'none';
        }

        this.effects.play(isNewHighScore);
    }

    private selectTab(top: boolean): void {
        const active = this.resultCt.querySelector<HTMLElement>(
            top ? '#tab-top' : '#tab-nearby'
        );
        const inactive = this.resultCt.querySelector<HTMLElement>(
            top ? '#tab-nearby' : '#tab-top'
        );
        if (!active || !inactive) return;
        active.style.background = 'linear-gradient(180deg,#f0c060,#c47010)';
        active.style.color = '#fff';
        active.style.boxShadow = `0 ${this.px(4)}px 0 #7a4a05`;
        inactive.style.background = 'linear-gradient(180deg,#c8a050,#907030)';
        inactive.style.color = 'rgba(255,255,255,0.65)';
        inactive.style.boxShadow = `0 ${this.px(4)}px 0 #5a3a00`;
    }

    public renderRankings(
        rankings: RankingEntry[],
        title: string,
        userId: string | null
    ): void {
        const container =
            this.resultCt.querySelector<HTMLElement>('#ranking-content');
        if (container) this.ranking.render(container, rankings, title, userId);
    }

    public showNearbyLoading(): void {
        const container =
            this.resultCt.querySelector<HTMLElement>('#ranking-content');
        if (container) this.ranking.showLoading(container);
    }

    public showNearbyError(): void {
        const container =
            this.resultCt.querySelector<HTMLElement>('#ranking-content');
        if (container) this.ranking.showError(container);
    }

    public appendRankings(
        rankings: RankingEntry[],
        userId: string | null
    ): void {
        const container =
            this.resultCt.querySelector<HTMLElement>('#ranking-content');
        if (container) this.ranking.append(container, rankings, userId);
    }

    public updatePagination(pagination: {
        hasMore: boolean;
        offset: number;
    }): void {
        const container =
            this.resultCt.querySelector<HTMLElement>('#ranking-content');
        if (container)
            this.ranking.bindLoadMoreButton(container, pagination, () =>
                this.actions?.loadMore()
            );
    }

    public hide(immediate = false): void {
        if (this.closeTimer !== null) clearTimeout(this.closeTimer);
        if (immediate) {
            this.resultCt.style.display = 'none';
            return;
        }
        this.resultCt.style.opacity = '0';
        this.closeTimer = setTimeout(() => {
            this.closeTimer = null;
            if (this.disposed) return;
            this.resultCt.style.display = 'none';
            this.resultCt.style.opacity = '1';
        }, 250);
    }

    public dispose(): void {
        if (this.disposed) return;
        this.disposed = true;
        if (this.closeTimer !== null) clearTimeout(this.closeTimer);
        window.removeEventListener('resize', this.onResize);
        this.effects.dispose();
        this.actions = null;
        this.resultCt.remove();
    }
}
