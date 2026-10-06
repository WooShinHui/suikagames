export interface RankingEntry {
    rank: number;
    username: string;
    total_score: number;
    userId: string;
    countryCode?: string;
}

export type ResultMode = 'GAME_OVER' | 'START';

export interface ResultData {
    userId?: string;
    username?: string;
    finalScore?: number;
    totalScore?: number;
    previousHighScore?: number;
    isNewRecord?: boolean;
    mode?: ResultMode;
}

export interface ResultSnapshot {
    userId: string | null;
    finalScore: number;
    previousHighScore: number;
    isNewRecord: boolean;
    mode: ResultMode;
}

export interface RankingSource {
    getRankingData(
        userId: string
    ): Promise<{ topRankings: RankingEntry[]; myRanking: RankingEntry | null }>;
    getNearbyBestRankings(rank: number, score: number): Promise<RankingEntry[]>;
    getTopBestScores(
        pageSize: number,
        cursor: any,
        offset: number
    ): Promise<{ rankings: RankingEntry[]; lastDoc: any }>;
}

export interface ResultActions {
    close(): void;
    restart(): void;
    top(): void;
    nearby(): void;
    loadMore(): void;
}
