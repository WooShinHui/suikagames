import ContainerX from '../../../../core/ContainerX';
import { UIScale, SAFE_WIDTH } from '../../../../util/UIScale';
import { SoundMgr } from '../../../../manager/SoundMgr';

export class GameOverLineView extends ContainerX {
    private gameOverLine: number;
    private readonly WARNING_LINE_OFFSET = 60;
    private gameOverLineVisual: createjs.MovieClip;
    private gameOverLineShape: createjs.Shape;
    private warningVisual: createjs.Shape;
    private isWarningSoundPlayed = false;
    private startTime: number | null = null;
    constructor() {
        super();
        const safeY = 800; // Safe Area 기준 Y 좌표
        // ✅ Canvas 좌표로 변환해서 저장
        this.gameOverLine = UIScale.safeToCanvasY(safeY);
        const centerX = UIScale.safeToCanvasX(SAFE_WIDTH / 2);
        const gameoverLineWidth = SAFE_WIDTH * 0.85;
        // 빨간선
        this.gameOverLineVisual = new createjs.MovieClip();
        this.gameOverLineShape = new createjs.Shape();
        this.gameOverLineShape.visible = false;
        this.gameOverLineShape.graphics
            .setStrokeStyle(3)
            .beginStroke('rgba(255, 0, 0, 0.7)')
            .setStrokeDash([10])
            .moveTo(centerX - gameoverLineWidth / 2, 0)
            .lineTo(centerX + gameoverLineWidth / 2, 0);
        // ✅ 변환 없이 직접 사용 (이미 Canvas 좌표)
        this.gameOverLineVisual.y = this.gameOverLine;
        this.gameOverLineVisual.addChild(this.gameOverLineShape);
        this.addChild(this.gameOverLineVisual);
        // 노란선
        this.warningVisual = new createjs.Shape();
        this.warningVisual.graphics
            .setStrokeStyle(2)
            .beginStroke('rgba(255, 255, 0, 0.6)')
            .setStrokeDash([5])
            .moveTo(centerX - gameoverLineWidth / 2, 0)
            .lineTo(centerX + gameoverLineWidth / 2, 0);
        // ✅ Canvas 좌표에 offset 직접 더하기
        this.warningVisual.y = this.gameOverLine + this.WARNING_LINE_OFFSET;
        this.addChild(this.warningVisual);
        this.gameOverLineVisual.alpha = 0;
    }

    public updateWarning(active: boolean): void {
        if (active) {
            if (!this.isWarningSoundPlayed) {
                SoundMgr.handle.playSound('warning');
                this.isWarningSoundPlayed = true;
            }
            this.gameOverLineShape.visible = true;
            if (!this.startTime) this.startTime = Date.now();
            this.gameOverLineVisual.alpha =
                Math.abs(Math.sin((Date.now() - this.startTime) / 200)) * 0.7;
        } else {
            this.startTime = null;
            this.isWarningSoundPlayed = false;
            this.gameOverLineVisual.alpha = 0;
        }
    }
}
