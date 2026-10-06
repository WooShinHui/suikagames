import ContainerX from '../../core/ContainerX';
import { EVT_HUB_SAFE } from '../../events/SafeEventHub';
import { G_EVT } from '../../events/EVT_HUB';
import { SoundMgr } from '../../manager/SoundMgr';
import { FRUIT_SOUNDS } from './Model/PlayRules';
import type { PlayPresentation } from './Model/PlayPresentation';
import type { FruitBody } from './engine/PlayPhysics';
import { BackgroundView } from './View/persistent/BackgroundView';
import { Box } from './View/persistent/Box';
import { FruitView } from './View/persistent/FruitView';
import { BaseLineView } from './View/persistent/BaseLineView';
import { NextCh } from './View/persistent/NextCh';
import { ScoreLine } from './View/persistent/ScoreLine';
import { RandomMerge } from './View/persistent/RandomMerge';
import { Score } from './View/conditional/Score';
import { GameOverLineView } from './View/conditional/GameOverLineView';
import { MergeEffectView } from './View/conditional/MergeEffectView';
import { WarningOverlay } from './View/conditional/WarningOverlay';
import { Result } from './View/conditional/Result';
import { Option } from './View/options/Option';
import { OptionBtn } from './View/options/OptionBtn';
import { RankingBtn } from './View/options/RankingBtn';

class View extends ContainerX implements PlayPresentation {
    private readonly fruitView = new FruitView();
    private readonly lineView = new GameOverLineView();
    private readonly baseLine = new BaseLineView();
    public readonly scoreDisplay = new Score();
    private readonly nextCh = new NextCh();
    private readonly scoreLine = new ScoreLine();
    private readonly effects = new MergeEffectView();
    private readonly result: Result;
    private readonly optionBtn: OptionBtn;
    private readonly rankingBtn: RankingBtn;
    private readonly option: Option;
    private readonly warningOverlay: WarningOverlay;
    private readonly randomMerge: RandomMerge;
    private disposed = false;
    private readonly onOpenOption = () => this.option.open();

    constructor(isGameActive: () => boolean) {
        super();
        (window as any).currentGameView = this;

        this.addChild(
            new BackgroundView(),
            new Box(),
            this.fruitView,
            this.lineView,
            this.baseLine,
            this.scoreDisplay,
            this.nextCh,
            this.scoreLine,
            this.effects
        );

        this.result = new Result();
        this.optionBtn = new OptionBtn();
        this.rankingBtn = new RankingBtn(this.optionBtn);
        this.option = new Option(this.scoreDisplay);

        this.applySavedSoundSettings();
        this.warningOverlay = new WarningOverlay(isGameActive);
        this.randomMerge = new RandomMerge();

        EVT_HUB_SAFE.on(G_EVT.MENU.INGAME_OPEN_OPTION, this.onOpenOption);
    }

    private applySavedSoundSettings(): void {
        const bgm = localStorage.getItem('bgmVolume');
        const sfx = localStorage.getItem('sfxVolume');

        SoundMgr.handle.bgmVolume = (bgm !== null ? Number(bgm) : 20) / 100;
        SoundMgr.handle.bgmMuted = localStorage.getItem('bgmMuted') === 'true';
        SoundMgr.handle.sfxVolume = (sfx !== null ? Number(sfx) : 50) / 100;
        SoundMgr.handle.sfxMuted = localStorage.getItem('sfxMuted') === 'true';
    }

    public getInputX(x: number, y: number): number | null {
        if (!this.stage) return null;
        return this.stage.globalToLocal(x, y).x;
    }

    public addFruit(body: FruitBody, merged: boolean): void {
        this.fruitView.addFruit(body, merged);
    }

    public removeFruit(label: string): void {
        this.fruitView.removeFruit(label);
    }

    public syncFruits(bodies: ReadonlyMap<string, FruitBody>): void {
        this.fruitView.syncFruits(bodies);
    }

    public setFruitFace(label: string, frame: number, duration: number): void {
        this.fruitView.setFruitFace(label, frame, duration);
    }

    public showPreview(
        x: number,
        current: number,
        next: number,
        animate: boolean
    ): void {
        this.baseLine.setPositionX(x);
        if (animate) this.baseLine.animateNext(current);
        else this.baseLine.showCurrent(current);
        this.nextCh.showNext(next);
    }

    public movePreview(x: number): void {
        this.baseLine.setPositionX(x);
    }

    public playMerge(type: number, x: number, y: number): void {
        const sound = FRUIT_SOUNDS[type];
        if (sound !== undefined) SoundMgr.handle.playSfx(sound);
        this.scoreLine.activateFruit(type);
        const index = 0 <= type && type < 3 ? 1 : 3 < type && type < 7 ? 2 : 3;
        this.effects.playCrashEffect(type, x, y, index);
    }

    public playDrop(): void {
        SoundMgr.handle.playSound('beads');
    }

    public updateWarning(active: boolean): void {
        this.lineView.updateWarning(active);
    }

    public showMergeUnavailable(): void {
        alert(
            'You need at least two beads on the field. \nStack as many as you can and test your luck!'
        );
    }

    public dispose(): void {
        if (this.disposed) return;
        this.disposed = true;
        EVT_HUB_SAFE.off(G_EVT.MENU.INGAME_OPEN_OPTION, this.onOpenOption);
        this.fruitView.dispose();
        this.baseLine.dispose();
        this.effects.dispose();
        this.nextCh.dispose();
        this.scoreDisplay.dispose();
        this.result.dispose();
        this.option.dispose();
        this.optionBtn.dispose();
        this.rankingBtn.dispose();
        this.warningOverlay.dispose();
        this.randomMerge.dispose();
        this.scoreLine.dispose();
        if ((window as any).currentGameView === this)
            (window as any).currentGameView = null;
        this.removeAllChildren();
    }
}
export default View;
