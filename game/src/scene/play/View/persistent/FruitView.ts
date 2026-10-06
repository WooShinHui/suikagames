import ContainerX from '../../../../core/ContainerX';
import type { FruitBody } from '../../engine/PlayPhysics';

export class FruitView extends ContainerX {
    private clips = new Map<string, createjs.MovieClip>();
    private faceTimers = new Set<ReturnType<typeof setTimeout>>();

    public addFruit(body: FruitBody, merged: boolean): void {
        const clip = this.resource.getLibrary('circle_2', `bead_${body.typeX}`);
        clip.x = body.position.x;
        clip.y = body.position.y;
        this.clips.set(body.label, clip);
        this.addChild(clip);
        if (merged) this.setFruitFace(body.label, 4, 2000);
        else
            createjs.Tween.get(clip, { loop: -1, bounce: true }).to(
                { rotation: 720, rotationDir: 1 },
                1000,
            );
    }

    public removeFruit(label: string): void {
        const clip = this.clips.get(label);
        if (!clip) return;
        createjs.Tween.removeTweens(clip);
        this.removeChild(clip);
        this.clips.delete(label);
    }

    public syncFruits(bodies: ReadonlyMap<string, FruitBody>): void {
        for (const [label, body] of bodies) {
            const clip = this.clips.get(label);
            if (!clip) continue;
            clip.x = body.position.x;
            clip.y = body.position.y;
            clip.rotation = body.angle * (180 / Math.PI);
        }
    }

    public setFruitFace(label: string, frame: number, duration: number): void {
        const clip = this.clips.get(label);
        if (!clip) return;
        clip.gotoAndStop(frame);
        if (duration === -1) return;
        const timer = setTimeout(() => {
            if (this.clips.get(label) === clip) clip.gotoAndStop(0);
            this.faceTimers.delete(timer);
        }, duration);
        this.faceTimers.add(timer);
    }

    public dispose(): void {
        for (const timer of this.faceTimers) clearTimeout(timer);
        this.faceTimers.clear();
        for (const label of this.clips.keys()) this.removeFruit(label);
        this.removeAllChildren();
    }
}
