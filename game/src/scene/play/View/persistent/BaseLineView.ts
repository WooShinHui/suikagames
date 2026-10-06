import ContainerX from '../../../../core/ContainerX';
import { UIScale, SAFE_WIDTH } from '../../../../util/UIScale';

export class BaseLineView extends ContainerX {
    private base_line: createjs.MovieClip;
    private drop_target: createjs.MovieClip;
    constructor() {
        super();
        const centerX = UIScale.safeToCanvasX(SAFE_WIDTH / 2);
        this.base_line = new createjs.MovieClip();
        this.base_line.x = centerX;
        this.base_line.y = UIScale.safeToCanvasY(-280); // y 오프셋은 내부에서 처리하는 게 낫습니다.
        const shape = new createjs.Shape();
        const startY = UIScale.safeToCanvasY(400);
        const endY = UIScale.safeToCanvasY(1100);
        shape.graphics.setStrokeStyle(1.5, 'round', 'round');
        shape.graphics.beginStroke('rgba(255,0,0,1)');
        shape.graphics.moveTo(0, startY).lineTo(0, endY);
        shape.snapToPixel = true;
        shape.graphics.endStroke();
        this.base_line.addChild(shape);
        this.addChild(this.base_line);
        this.drop_target = this.resource.getLibrary('circle_2', 'bundle');
        this.drop_target.x = centerX;
        this.drop_target.y = UIScale.safeToCanvasY(340);
        this.addChild(this.drop_target);
    }

    public setPositionX(x: number): void {
        this.base_line.x = x;
        this.drop_target.x = x;
    }

    public showCurrent(type: number): void {
        this.drop_target.gotoAndStop(type);
    }

    public animateNext(type: number): void {
        this.drop_target.alpha = 0;
        this.drop_target.scaleX = this.drop_target.scaleY = 0.1;
        this.drop_target.gotoAndStop(type);
        (this.drop_target.getChildAt(0) as createjs.MovieClip).gotoAndStop(0);
        createjs.Tween.get(this.drop_target)
            .wait(500)
            .to({ scaleX: 1, scaleY: 1, alpha: 1 }, 500);
    }

    public dispose(): void {
        createjs.Tween.removeTweens(this.drop_target);
        this.removeAllChildren();
    }
}
