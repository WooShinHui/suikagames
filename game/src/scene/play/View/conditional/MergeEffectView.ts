import ContainerX from '../../../../core/ContainerX';
export class MergeEffectView extends ContainerX {
    public playCrashEffect(
        _$type: number,
        $px: number,
        $py: number,
        $index: number
    ): void {
        const effect = this.resource.getLibrary(
            'circle_2',
            `effect_com${$index}`
        );
        effect.x = $px;
        effect.y = $py;
        effect.gotoAndPlay(1);
        effect.addEventListener('tick', () => {
            if (effect.currentFrame === effect.totalFrames - 1) {
                effect.stop();
                effect.removeAllEventListeners();
                this.removeChild(effect);
            }
        });
        this.addChild(effect);
    }

    public dispose(): void {
        for (const child of this.children) child.removeAllEventListeners();
        this.removeAllChildren();
    }
}
