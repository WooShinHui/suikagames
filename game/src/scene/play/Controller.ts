import ContainerX from '../../core/ContainerX';
import type View from './View';
import type { PlayModel } from './Model/PlayModel';

class Controller extends ContainerX {
    private bActive = true;

    constructor(
        private readonly view: View,
        private readonly model: PlayModel,
    ) {
        super();

        this.enableInput();
        this.bindStageEvents();
        this.view.addEventListener('tick', this.onTick);
    }

    private enableInput(): void {
        const stage = this.system.stage;
        createjs.Touch.enable(stage, true);
        stage.enableMouseOver(0);
        stage.mouseMoveOutside = true;
    }

    private readonly onTick = () => {
        if (this.bActive) this.model.update();
    };

    private readonly handleMouseMove = (e: createjs.MouseEvent) => {
        if (!this.bActive) return;

        const x = this.view.getInputX(e.stageX, e.stageY);
        if (x !== null) this.model.move(x);
    };

    private readonly handleMouseUp = () => {
        if (!this.bActive || !this.view.stage) return;

        this.model.drop();
    };

    private bindStageEvents(): void {
        const stage = this.system.stage;

        stage.addEventListener('stagemousemove', this.handleMouseMove);
        stage.addEventListener('stagemouseup', this.handleMouseUp);
    }

    public dispose(): void {
        if (!this.bActive) return;
        this.bActive = false;

        const stage = this.system.stage;
        if (stage) {
            stage.removeEventListener('stagemousemove', this.handleMouseMove);
            stage.removeEventListener('stagemouseup', this.handleMouseUp);
        }

        this.view.removeEventListener('tick', this.onTick);
    }
}

export default Controller;
