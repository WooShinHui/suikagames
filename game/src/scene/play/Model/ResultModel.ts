import type {
    RankingEntry,
    RankingSource,
    ResultData,
    ResultMode,
    ResultSnapshot,
} from './ResultTypes';

export class ResultModel {
    private userId: string | null = null;
    private username: string | null = null;
    private finalScore = 0;
    private previousHighScore = 0;
    private paginationCursor: any = null;
    private paginationOffset = 0;
    private topRankings: RankingEntry[] = [];
    private myRanking: RankingEntry | null = null;

    constructor(private readonly source: RankingSource) {}

    public setSession(data: ResultData): void {
        this.userId = data.userId || null;
        this.username = data.username || null;
    }

    public updateScore(data: ResultData): void {
        if (typeof data.totalScore === 'number')
            this.finalScore = data.totalScore;
    }

    public scoreSaveRequest(data: ResultData) {
        if (typeof data.finalScore === 'number')
            this.finalScore = data.finalScore;
        return {
            finalScore: this.finalScore,
            userId: this.userId,
            gameSessionId: null,
            username: this.username,
        };
    }

    public beginResult(data: ResultData, mode: ResultMode): ResultSnapshot {
        this.paginationCursor = null;
        this.paginationOffset = 0;
        if (mode !== 'START') {
            if (typeof data.finalScore === 'number')
                this.finalScore = data.finalScore;
            if (typeof data.previousHighScore === 'number')
                this.previousHighScore = data.previousHighScore;
            this.userId = data.userId || this.userId;
        }
        return {
            userId: this.userId,
            finalScore: this.finalScore,
            previousHighScore: this.previousHighScore || 0,
            isNewRecord: mode !== 'START' && data.isNewRecord === true,
            mode,
        };
    }

    public async loadRanking(): Promise<{
        topRankings: RankingEntry[];
        myRanking: RankingEntry | null;
    }> {
        const data = await this.source.getRankingData(this.userId || 'guest');
        this.topRankings = data.topRankings || [];
        this.myRanking = data.myRanking || null;
        return { topRankings: this.topRankings, myRanking: this.myRanking };
    }

    public selectTop(): RankingEntry[] {
        this.paginationOffset = this.topRankings.length;
        return this.topRankings;
    }

    public async loadNearby(): Promise<RankingEntry[]> {
        if (!this.myRanking) return [];
        return this.source.getNearbyBestRankings(
            this.myRanking.rank,
            this.myRanking.total_score
        );
    }

    public get pagination(): { hasMore: boolean; offset: number } {
        return {
            hasMore: !!this.paginationCursor,
            offset: this.paginationOffset,
        };
    }

    public get currentUserId(): string | null {
        return this.userId;
    }

    public async loadMore(): Promise<RankingEntry[]> {
        const page = await this.source.getTopBestScores(
            20,
            this.paginationCursor,
            this.paginationOffset
        );
        this.paginationCursor = page.lastDoc;
        this.paginationOffset += page.rankings.length;
        return page.rankings;
    }
}
