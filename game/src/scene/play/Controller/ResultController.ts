import { EVT_HUB_SAFE } from '../../../events/SafeEventHub';
import { G_EVT } from '../../../events/EVT_HUB';
import type { ResultModel } from '../Model/ResultModel';
import type { ResultData } from '../Model/ResultTypes';
import type { ResultView } from '../View/conditional/result/ResultView';

export class ResultController {
    private disposed = false;
    private showing = false;
    private revision = 0;
    private readonly onSessionStarted = (event: { data?: ResultData }) =>
        this.model.setSession(event.data || {});
    private readonly onScoreUpdated = (event: { data?: ResultData }) =>
        this.model.updateScore(event.data || {});
    private readonly onGameOver = (event: { data?: ResultData }) => {
        EVT_HUB_SAFE.emit(
            G_EVT.PLAY.REQUEST_COLLISION_SAVE,
            this.model.scoreSaveRequest(event.data || {})
        );
    };
    private readonly onShowResult = (event: { data?: ResultData }) => {
        void this.showResult(event.data || {});
    };

    constructor(
        private readonly model: ResultModel,
        private readonly view: ResultView
    ) {
        view.setActions({
            close: () => this.close(),
            restart: () => this.restart(),
            top: () => this.top(),
            nearby: () => {
                void this.nearby();
            },
            loadMore: () => {
                void this.loadMore();
            },
        });
        EVT_HUB_SAFE.on(G_EVT.PLAY.SESSION_STARTED, this.onSessionStarted);
        EVT_HUB_SAFE.on(G_EVT.PLAY.GAME_OVER, this.onGameOver);
        EVT_HUB_SAFE.on(G_EVT.PLAY.SHOW_RESULT, this.onShowResult);
        EVT_HUB_SAFE.on(G_EVT.DATA.SCORE_UPDATED, this.onScoreUpdated);
    }

    private isCurrent(revision: number): boolean {
        return !this.disposed && revision === this.revision;
    }

    private async showResult(data: ResultData): Promise<void> {
        if (this.disposed || this.showing) return;
        this.showing = true;
        const revision = ++this.revision;
        const snapshot = this.model.beginResult(
            data,
            data.mode === 'START' ? 'START' : 'GAME_OVER'
        );
        this.view.showLoading();
        try {
            const ranking = await this.model.loadRanking();
            if (!this.isCurrent(revision)) return;
            this.view.render(snapshot, ranking.topRankings, ranking.myRanking);
            this.view.updatePagination(this.model.pagination);
        } catch (error) {
            if (!this.isCurrent(revision)) return;
            console.error('❌ 랭킹 로드 에러:', error);
            this.view.showError();
        } finally {
            if (this.isCurrent(revision)) this.showing = false;
        }
    }

    private close(): void {
        ++this.revision;
        this.showing = false;
        this.view.hide();
    }

    private restart(): void {
        this.view.hide(true);
        EVT_HUB_SAFE.emit(G_EVT.RE.START);
    }

    private top(): void {
        ++this.revision;
        this.view.renderRankings(
            this.model.selectTop(),
            '🏆 Global Top',
            this.model.currentUserId
        );
        this.view.updatePagination(this.model.pagination);
    }

    private async nearby(): Promise<void> {
        const revision = ++this.revision;
        this.view.showNearbyLoading();
        try {
            const nearby = await this.model.loadNearby();
            if (this.isCurrent(revision))
                this.view.renderRankings(
                    nearby,
                    '👥 내 주변 순위',
                    this.model.currentUserId
                );
        } catch {
            if (this.isCurrent(revision)) this.view.showNearbyError();
        }
    }

    private async loadMore(): Promise<void> {
        const revision = ++this.revision;
        try {
            const rankings = await this.model.loadMore();
            if (!this.isCurrent(revision)) return;
            this.view.appendRankings(rankings, this.model.currentUserId);
            this.view.updatePagination(this.model.pagination);
        } catch {
            if (this.isCurrent(revision))
                this.view.updatePagination(this.model.pagination);
        }
    }

    public dispose(): void {
        if (this.disposed) return;
        this.disposed = true;
        ++this.revision;
        EVT_HUB_SAFE.off(G_EVT.PLAY.SESSION_STARTED, this.onSessionStarted);
        EVT_HUB_SAFE.off(G_EVT.PLAY.GAME_OVER, this.onGameOver);
        EVT_HUB_SAFE.off(G_EVT.PLAY.SHOW_RESULT, this.onShowResult);
        EVT_HUB_SAFE.off(G_EVT.DATA.SCORE_UPDATED, this.onScoreUpdated);
    }
}
