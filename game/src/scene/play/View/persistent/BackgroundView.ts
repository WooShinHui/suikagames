import ContainerX from '../../../../core/ContainerX';
import { UIScale, CANVAS_ORIGINAL_WIDTH } from '../../../../util/UIScale';
export class BackgroundView extends ContainerX {
    constructor() {
        super();
        const bg = this.resource.getLibrary('circle_2', 'mBg');
        UIScale.update();
        bg.x = CANVAS_ORIGINAL_WIDTH / 2 - 1422;
        bg.y = 0;
        this.addChild(bg);
    }
}
