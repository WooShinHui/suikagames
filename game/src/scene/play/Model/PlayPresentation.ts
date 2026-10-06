import type { FruitBody } from '../engine/PlayPhysics';

export interface PlayPresentation {
    addFruit(body: FruitBody, merged: boolean): void;
    removeFruit(label: string): void;
    syncFruits(bodies: ReadonlyMap<string, FruitBody>): void;
    setFruitFace(label: string, frame: number, duration: number): void;
    showPreview(
        x: number,
        current: number,
        next: number,
        animate: boolean
    ): void;
    movePreview(x: number): void;
    playMerge(type: number, x: number, y: number): void;
    playDrop(): void;
    updateWarning(active: boolean): void;
    showMergeUnavailable(): void;
}
