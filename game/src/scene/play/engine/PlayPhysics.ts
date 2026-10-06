import Matter from 'matter-js';
import { UIScale, SAFE_WIDTH, SAFE_HEIGHT } from '../../../util/UIScale';
import { getFruitRadius } from '../Model/PlayRules';
export interface FruitBody extends Matter.Body {
    typeX: number;
}

export class PlayPhysics {
    public readonly engine: Matter.Engine;
    public minX: number;
    public maxX: number;
    public readonly spawnY = UIScale.safeToCanvasY(340);
    public readonly gameOverY = UIScale.safeToCanvasY(800);
    private count = 0;
    private debugRender: Matter.Render;
    constructor() {
        this.engine = Matter.Engine.create();
        this.engine.world.gravity.y = 3;

        document.body.style.backgroundColor = '#000';
        this.debugRender = Matter.Render.create({
            canvas: document.getElementById('create_cvs') as HTMLCanvasElement,
            engine: this.engine,
            options: { width: 720, height: 1280, wireframes: true },
        });
        this.buildWalls();
    }

    private buildWalls(): void {
        const basketWidth = SAFE_WIDTH * 0.92;
        const basketHeight = SAFE_HEIGHT * 0.7; // 화면 높이의 70% 정도
        const wallThickness = 40;
        // ✅ 중앙 하단 기준 (세로 위치 수정)
        const centerX = UIScale.safeToCanvasX(SAFE_WIDTH / 2);
        // ✅ Safe Area 하단에서 130px 위 (원본 기준)
        const bottomY = UIScale.safeToCanvasY(SAFE_HEIGHT - 210);
        this.minX = centerX - basketWidth / 2 + wallThickness / 2;
        this.maxX = centerX + basketWidth / 2 - wallThickness / 2;
        const ground = Matter.Bodies.rectangle(
            centerX,
            bottomY,
            basketWidth,
            wallThickness,
            {
                isStatic: true,
                label: 'ground',
                render: { fillStyle: '#8B4513' },
            }
        );
        const leftWall = Matter.Bodies.rectangle(
            centerX - basketWidth / 2,
            bottomY - basketHeight / 2,
            wallThickness,
            basketHeight,
            {
                isStatic: true,
                label: 'leftWall',
                render: { fillStyle: '#8B4513' },
            }
        );
        const rightWall = Matter.Bodies.rectangle(
            centerX + basketWidth / 2,
            bottomY - basketHeight / 2,
            wallThickness,
            basketHeight,
            {
                isStatic: true,
                label: 'rightWall',
                render: { fillStyle: '#8B4513' },
            }
        );
        Matter.World.add(this.engine.world, [ground, leftWall, rightWall]);
    }

    public update(): void {
        Matter.Engine.update(this.engine);
    }

    public get pairs(): Matter.Pair[] {
        return this.engine.pairs.list;
    }

    public createFruit(
        type: number,
        x: number,
        y: number,
        merged: boolean
    ): FruitBody {
        const body = Matter.Bodies.circle(x, y, getFruitRadius(type), {
            label: 'Bead_' + this.count++,
        }) as FruitBody;
        body.typeX = type;
        if (merged)
            Matter.Body.setVelocity(body, {
                x: (Math.random() - 0.5) * 2,
                y: -Math.random() * 2,
            });
        else Matter.Body.setMass(body, type + 1);
        Matter.World.add(this.engine.world, body);
        return body;
    }

    public removeFruit(body: Matter.Body): void {
        Matter.World.remove(this.engine.world, body);
    }

    public onCollision(
        listener: (event: Matter.IEventCollision<Matter.Engine>) => void
    ): void {
        Matter.Events.on(this.engine, 'collisionStart', listener);
    }

    public offCollision(
        listener: (event: Matter.IEventCollision<Matter.Engine>) => void
    ): void {
        Matter.Events.off(this.engine, 'collisionStart', listener);
    }

    public dispose(): void {
        Matter.Render.stop(this.debugRender);
        Matter.World.clear(this.engine.world, false);
        Matter.Engine.clear(this.engine);
    }
}
