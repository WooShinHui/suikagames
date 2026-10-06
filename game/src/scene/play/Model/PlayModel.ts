import Matter from 'matter-js';
import { EVT_HUB_SAFE } from '../../../events/SafeEventHub';
import { G_EVT } from '../../../events/EVT_HUB';
import { UIScale, SAFE_WIDTH } from '../../../util/UIScale';
import { PlayPhysics, FruitBody } from '../engine/PlayPhysics';
import {
    getFruitRadius,
    FRUIT_SCORES,
    WARNING_LINE_OFFSET,
    GAME_OVER_DELAY,
} from './PlayRules';
import type { PlayPresentation } from './PlayPresentation';

export class PlayModel {
    private presentation: PlayPresentation | null = null;
    private bodies = new Map<string, FruitBody>();
    private droppingBeads = new Set<string>();
    private beadOrder: number[] = [];
    private active = false;
    private clickable = true;
    private totalScore = 0;
    private dropX = UIScale.safeToCanvasX(SAFE_WIDTH / 2);
    private warningStartTime = 0;
    private hasMerged = false;
    private canMerged = false;
    private isWarningActive = false;
    private cooldown: ReturnType<typeof setTimeout> | null = null;
    private disposed = false;

    private readonly onMergeRequest = () => this.randomDoubleMerge();
    private readonly onTimeOut = (event: { data: string }) =>
        this.handleGameOver(event.data);

    constructor(private readonly physics: PlayPhysics) {
        for (let i = 0; i < 10; i++)
            this.beadOrder.push((Math.random() * 5) >> 0);
        EVT_HUB_SAFE.on(G_EVT.PLAY.MERGE_REQUEST, this.onMergeRequest);
        EVT_HUB_SAFE.on(G_EVT.PLAY.TIME_OUT, this.onTimeOut);
        physics.onCollision(this.handleCollisionStart);
    }

    public setPresentation(presentation: PlayPresentation): void {
        this.presentation = presentation;
    }

    public get isActive(): boolean {
        return this.active;
    }

    public get canMerge(): boolean {
        return this.canMerged;
    }

    public get score(): number {
        return this.totalScore;
    }

    private previewType(index: number): number {
        const type = this.beadOrder[index];
        if (type === undefined)
            throw new Error('Fruit preview queue is incomplete');
        return type;
    }

    public startGame(): void {
        if (this.disposed) return;
        this.totalScore = 0;
        this.active = true;
        this.dropX = UIScale.safeToCanvasX(SAFE_WIDTH / 2);
        this.presentation?.showPreview(
            this.dropX,
            this.previewType(0),
            this.previewType(1),
            false,
        );
    }

    public stopGame(): void {
        this.active = false;
    }

    public move(targetX: number): void {
        const space = getFruitRadius(this.previewType(0)) / 2;
        const minX = this.physics.minX + space + 10;
        const maxX = this.physics.maxX - space - 10;
        this.dropX = Math.max(minX, Math.min(maxX, Math.round(targetX)));
        this.presentation?.movePreview(this.dropX);
    }

    public drop(): void {
        if (this.disposed) return;
        if (this.clickable) {
            const type = this.previewType(0);
            this.beadOrder.shift();
            this.beadOrder.push((Math.random() * 5) >> 0);
            const body = this.physics.createFruit(
                type,
                this.dropX,
                this.physics.spawnY,
                false,
            );
            this.bodies.set(body.label, body);
            this.droppingBeads.add(body.label);
            this.presentation?.addFruit(body, false);
            this.presentation?.showPreview(
                this.dropX,
                this.previewType(0),
                this.previewType(1),
                true,
            );
            this.presentation?.playDrop();
            this.cooldown = setTimeout(() => {
                this.clickable = true;
                this.cooldown = null;
            }, 1000);
        }
        this.clickable = false;
    }

    public update(): void {
        if (!this.active || this.disposed) return;
        this.physics.update();
        this.presentation?.syncFruits(this.bodies);
        const removedBodies = new Set<string>();
        for (const pair of this.physics.pairs) {
            const { bodyA, bodyB, collision } = pair;
            if (
                removedBodies.has(bodyA.label) ||
                removedBodies.has(bodyB.label)
            )
                continue;
            if (!bodyA.circleRadius || !bodyB.circleRadius) continue;
            const typeA = (bodyA as FruitBody).typeX;
            if (typeA !== (bodyB as FruitBody).typeX) continue;
            let x: number, y: number;
            if (collision.supports && collision.supports[0]) {
                if (collision.supports[1]) {
                    x = (collision.supports[0].x + collision.supports[1].x) / 2;
                    y = (collision.supports[0].y + collision.supports[1].y) / 2;
                } else {
                    x = collision.supports[0].x;
                    y = collision.supports[0].y;
                }
            } else {
                x = (bodyA.position.x + bodyB.position.x) / 2;
                y = (bodyA.position.y + bodyB.position.y) / 2;
            }
            if (!this.processMergePair(bodyA, bodyB, removedBodies)) continue;
            EVT_HUB_SAFE.emit(G_EVT.DATA.SCORE_UPDATED, {
                totalScore: this.totalScore,
                x,
                y,
            });
            this.presentation?.playMerge(typeA, x, y);
            if (typeA === 5) EVT_HUB_SAFE.emit(G_EVT.PLAY.MERGE_RESET);
            this.addNextPhase(typeA, x, y);
            this.hasMerged = true;
        }
        this.checkGameOverLine();
    }

    private processMergePair(
        bodyA: Matter.Body,
        bodyB: Matter.Body,
        removed: Set<string>,
    ): boolean {
        if (removed.has(bodyA.label) || removed.has(bodyB.label)) return false;
        const type = (bodyA as FruitBody).typeX;
        if (type !== (bodyB as FruitBody).typeX) return false;
        removed.add(bodyA.label);
        removed.add(bodyB.label);
        for (const body of [bodyA, bodyB]) {
            this.physics.removeFruit(body);
            this.presentation?.removeFruit(body.label);
            this.bodies.delete(body.label);
        }
        this.totalScore += FRUIT_SCORES[type] || 0;
        return true;
    }

    private addNextPhase(type: number, x: number, y: number): void {
        if (type >= 10) return;
        const body = this.physics.createFruit(type + 1, x, y, true);
        this.bodies.set(body.label, body);
        this.presentation?.addFruit(body, true);
        this.checkGameOverLine();
    }

    public randomDoubleMerge(): void {
        const typeMap = new Map<number, FruitBody[]>();
        for (const body of this.bodies.values()) {
            if (!typeMap.has(body.typeX)) typeMap.set(body.typeX, []);
            typeMap.get(body.typeX)!.push(body);
        }
        const available = Array.from(typeMap.entries()).filter(
            ([, bodies]) => bodies.length >= 2,
        );
        if (available.length === 0) {
            this.presentation?.showMergeUnavailable();
            EVT_HUB_SAFE.emit(G_EVT.PLAY.MERGE_FAIL);
            return;
        }
        this.canMerged = true;
        const selected =
            available[Math.floor(Math.random() * available.length)];
        if (!selected) throw new Error('No merge pair selected');
        const [type, bodies] = selected;

        const [bodyA, bodyB] = [...bodies].sort(() => Math.random() - 0.5);
        if (!bodyA || !bodyB)
            throw new Error('Merge requires two fruit bodies');
        const x = (bodyA.position.x + bodyB.position.x) / 2;
        const y = (bodyA.position.y + bodyB.position.y) / 2;
        this.processMergePair(bodyA, bodyB, new Set<string>());
        EVT_HUB_SAFE.emit(G_EVT.PLAY.MERGE_SUCCESS);
        this.presentation?.playMerge(type, x, y);
        this.addNextPhase(type, x, y);
        EVT_HUB_SAFE.emit(G_EVT.DATA.SCORE_UPDATED, {
            totalScore: this.totalScore,
            x,
            y,
        });
        this.hasMerged = true;
    }

    private handleCollisionStart = (
        event: Matter.IEventCollision<Matter.Engine>,
    ): void => {
        for (const { bodyA, bodyB } of event.pairs) {
            const isWall = (body: Matter.Body) =>
                body.label === 'leftWall' || body.label === 'rightWall';
            let bodyToActivate: Matter.Body | null = null;
            if (this.droppingBeads.has(bodyA.label) && !isWall(bodyB))
                bodyToActivate = bodyA;
            else if (this.droppingBeads.has(bodyB.label) && !isWall(bodyA))
                bodyToActivate = bodyB;
            if (bodyToActivate) {
                this.droppingBeads.delete(bodyToActivate.label);
                this.presentation?.setFruitFace(bodyToActivate.label, 4, 1000);
            }
            if (bodyA.label === 'ground' && this.droppingBeads.has(bodyB.label))
                this.droppingBeads.delete(bodyB.label);
            else if (
                bodyB.label === 'ground' &&
                this.droppingBeads.has(bodyA.label)
            )
                this.droppingBeads.delete(bodyA.label);
        }
    };

    private checkGameOverLine(): void {
        let beadOverLine: FruitBody | null = null;
        let detectedWarning = false;
        const gameOverY = this.physics.gameOverY;
        const warningY = gameOverY + WARNING_LINE_OFFSET;
        for (const body of this.bodies.values()) {
            if (this.droppingBeads.has(body.label)) continue;
            const top =
                body.position.y -
                (body.circleRadius || getFruitRadius(body.typeX));
            if (top >= gameOverY && top <= warningY) detectedWarning = true;
            if (top <= gameOverY) {
                beadOverLine = body;
                break;
            }
        }
        this.isWarningActive = !!(detectedWarning || beadOverLine);
        if (beadOverLine) {
            if (this.hasMerged) {
                this.warningStartTime = 0;
                this.hasMerged = false;
            }
            if (this.warningStartTime === 0) {
                this.warningStartTime = Date.now();
                EVT_HUB_SAFE.emit(G_EVT.PLAY.WARNING_ON);
            } else if (Date.now() - this.warningStartTime >= GAME_OVER_DELAY) {
                this.handleGameOver('GAME_OVER');
                return;
            }
        } else {
            if (this.warningStartTime !== 0) {
                EVT_HUB_SAFE.emit(G_EVT.PLAY.WARNING_OFF);
                this.warningStartTime = 0;
            }
            this.hasMerged = false;
        }
        this.presentation?.updateWarning(this.isWarningActive);
    }

    public handleGameOver(mode: string): void {
        if (!this.active) return;
        this.active = false;
        this.clickable = false;
        EVT_HUB_SAFE.emit(G_EVT.PLAY.GAME_OVER, {
            finalScore: this.totalScore,
            mode,
        });
        for (const label of this.bodies.keys())
            this.presentation?.setFruitFace(label, 9, -1);
    }

    public debugSpawnMaxPhase(): void {
        const body = this.physics.createFruit(9, 600, 500, true);
        this.bodies.set(body.label, body);
        this.presentation?.addFruit(body, true);
        this.checkGameOverLine();
    }

    public dispose(): void {
        if (this.disposed) return;
        this.disposed = true;
        this.active = false;
        if (this.cooldown !== null) clearTimeout(this.cooldown);
        EVT_HUB_SAFE.off(G_EVT.PLAY.MERGE_REQUEST, this.onMergeRequest);
        EVT_HUB_SAFE.off(G_EVT.PLAY.TIME_OUT, this.onTimeOut);
        this.physics.offCollision(this.handleCollisionStart);
        this.physics.dispose();
        this.bodies.clear();
        this.droppingBeads.clear();
        this.presentation = null;
    }
}
