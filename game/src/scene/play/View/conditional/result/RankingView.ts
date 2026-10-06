import type { RankingEntry } from '../../../Model/ResultTypes';

export class RankingView {
    private currentUserId: string | null = null;

    constructor(private readonly px: (base: number) => number) {}

    public render(
        container: HTMLElement,
        rankings: RankingEntry[],
        title: string,
        userId: string | null
    ): void {
        this.currentUserId = userId;
        container.innerHTML = this.buildRankingTable(rankings, title);
    }

    public append(
        container: HTMLElement,
        rankings: RankingEntry[],
        userId: string | null
    ): void {
        const tbody = container.querySelector('#ranking-tbody');
        if (!tbody) return;
        for (const entry of rankings)
            tbody.insertAdjacentHTML(
                'beforeend',
                this.createRankingRow(
                    entry,
                    String(entry.userId) === String(userId)
                )
            );
    }

    public showLoading(container: HTMLElement): void {
        container.innerHTML = `<div style="padding:${this.px(16)}px;color:#a07030;font-size:${this.px(12)}px;letter-spacing:1px;">로딩 중...</div>`;
    }

    public showError(container: HTMLElement): void {
        container.innerHTML = `<p style="color:#c00;font-size:${this.px(12)}px;">순위 로드 실패</p>`;
    }

    private buildRankingTable(rankings: RankingEntry[], title: string): string {
        let html = `
        <div style="
            font-size:${this.px(12)}px; font-weight:800; color:#c47010;
            letter-spacing:2px; margin:${this.px(8)}px 0 ${this.px(6)}px;
            text-shadow:0 1px 0 rgba(255,255,255,0.7);
        ">${title}</div>

        <table id="ranking-table" style="
            width:100%; border-collapse:collapse;
            font-size:${this.px(12)}px;
            border-radius:${this.px(10)}px; overflow:hidden;
box-shadow: 0 3px 0 #7a4a05
        ">
        <thead>
            <tr style="
                background:linear-gradient(180deg,#e8a020,#c47010);
                color:#fff; font-weight:700; letter-spacing:1px;
                text-shadow:0 1px 0 rgba(0,0,0,0.18);
            ">
                <th style="padding:${this.px(7)}px ${this.px(
                    4
                )}px;width:${this.px(34)}px;text-align:center;font-size:${this.px(
                    9
                )}px;">RANK</th>
                <th style="padding:${this.px(7)}px ${this.px(
                    4
                )}px;text-align:left;font-size:${this.px(9)}px;">PLAYER</th>
                <th style="padding:${this.px(7)}px ${this.px(
                    4
                )}px;width:${this.px(68)}px;text-align:right;font-size:${this.px(
                    9
                )}px;">SCORE</th>
            </tr>
        </thead>
        <tbody id="ranking-tbody">`;

        for (const entry of rankings) {
            const isMe = String(entry.userId) === String(this.currentUserId);
            html += this.createRankingRow(entry, isMe);
        }

        html += `</tbody></table>`;
        return html;
    }

    public bindLoadMoreButton(
        container: HTMLElement,
        pagination: { hasMore: boolean; offset: number },
        onLoadMore: () => void
    ): void {
        const old = container.querySelector('#load-more-btn');
        if (old) old.remove();
        if (!pagination.hasMore) return;

        const btn = document.createElement('button');
        btn.id = 'load-more-btn';
        btn.textContent = `+ 더 보기 (${pagination.offset + 1}위~)`;
        Object.assign(btn.style, {
            display: 'block',
            margin: `${this.px(10)}px auto`,
            padding: `${this.px(7)}px ${this.px(20)}px`,
            background: 'linear-gradient(180deg,#f0c060,#c47010)',
            border: 'none',
            borderRadius: `${this.px(20)}px`,
            boxShadow: `0 ${this.px(4)}px 0 #7a4a05`,
            color: '#fff',
            fontSize: `${this.px(11)}px`,
            fontWeight: '700',
            cursor: 'pointer',
            letterSpacing: '1px',
            textShadow: '0 1px 0 rgba(0,0,0,0.2)',
            fontFamily: 'inherit',
        });

        btn.onclick = () => {
            btn.textContent = '로딩 중...';
            btn.style.opacity = '0.6';
            btn.style.pointerEvents = 'none';
            onLoadMore();
        };

        container.appendChild(btn);
    }

    private createRankingRow(entry: RankingEntry, isMe: boolean): string {
        const rank = entry.rank;
        const countryCode = (entry.countryCode || 'un').toLowerCase();
        const crown =
            rank === 1
                ? '👑'
                : rank === 2
                  ? '🥈'
                  : rank === 3
                    ? '🥉'
                    : `${rank}`;

        const flagImg = `<img
            src="https://flagcdn.com/w40/${countryCode}.png"
            style="width:${this.px(15)}px;height:auto;vertical-align:middle;
                   margin-right:${this.px(4)}px;border-radius:2px;
                   box-shadow:0 1px 2px rgba(0,0,0,0.15);"
            onerror="this.src='https://flagcdn.com/w40/un.png'"/>`;

        let rowBg =
            rank % 2 === 0 ? 'rgba(230,160,30,0.07)' : 'rgba(255,255,255,0.55)';
        let color = '#5a3000';
        let weight = '500';
        let size = 12;
        let outline = '';

        if (rank === 1) {
            rowBg = 'rgba(255,215,0,0.22)';
            color = '#7a4f00';
            weight = '800';
            size = 13;
        }
        if (rank === 2) {
            rowBg = 'rgba(192,192,192,0.18)';
            color = '#555';
            weight = '700';
            size = 13;
        }
        if (rank === 3) {
            rowBg = 'rgba(205,127,50,0.18)';
            color = '#7a4010';
            weight = '700';
            size = 13;
        }
        if (isMe) {
            rowBg = 'rgba(255,200,40,0.35)';
            color = '#6a3000';
            weight = '800';
            outline = `
                border-left: 3px solid #e8a020;
                border-top: 1px solid rgba(232,160,32,0.4);
                border-bottom: 1px solid rgba(232,160,32,0.4);
            `;
        }

        const youBadge = isMe
            ? `<span style="
                display:inline-block;
                background:#e8a020; color:#fff;
                font-size:${this.px(8)}px; font-weight:800;
                padding:1px ${this.px(4)}px;
                border-radius:${this.px(4)}px;
                margin-left:${this.px(4)}px;
                vertical-align:middle;
                letter-spacing:0.5px;
              ">YOU</span>`
            : '';

        return `
        <tr style="
            background:${rowBg}; color:${color}; font-weight:${weight};
            font-size:${this.px(size)}px;
            border-bottom:1px solid rgba(200,140,40,0.12);
            ${outline}
        ">
            <td style="padding:${this.px(6)}px ${this.px(
                3
            )}px;text-align:center;font-weight:800;">${crown}</td>
            <td style="padding:${this.px(6)}px ${this.px(
                3
            )}px;text-align:left;">
                ${flagImg}${entry.username}${youBadge}
            </td>
            <td style="padding:${this.px(6)}px ${this.px(3)}px;text-align:right;
                       font-family:'SF Mono',Consolas,monospace;font-size:${this.px(
                           size - 1
                       )}px;">
                ${entry.total_score.toLocaleString()}
            </td>
        </tr>`;
    }
}
