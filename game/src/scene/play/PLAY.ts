import SceneX from '../../core/SceneX';
import View from './View';
import Controller from './Controller';
import { PlayModel } from './Model/PlayModel';
import { PlayPhysics } from './engine/PlayPhysics';
import { EVT_HUB_SAFE } from '../../events/SafeEventHub';
import { G_EVT } from '../../events/EVT_HUB';
import { AUTH_SERVICE } from '../../auth/AuthService';
import { API_CONNECTOR } from '../../fetch/ApiConnector';

class PLAY extends SceneX {
    private view: View | null = null;
    private controller: Controller | null = null;
    private model: PlayModel | null = null;
    private generation = 0;
    private readonly onRestart = () => {
        this.dispose();
        this.goScene('PLAY');
    };
    private readonly onLoginSuccess = (event: {
        data?: {
            userId?: string;
            username?: string;
        };
    }) => {
        const userId = event.data?.userId;
        if (userId)
            EVT_HUB_SAFE.emit(G_EVT.DATA.DATA_SEND, {
                userId,
                username: event.data?.username || 'guest',
            });
    };
    public async preload(): Promise<void> {}

    public async create(): Promise<void> {}

    public onMounted(): void {
        const generation = ++this.generation;
        EVT_HUB_SAFE.on(G_EVT.RE.START, this.onRestart);
        EVT_HUB_SAFE.on(G_EVT.LOGIN.LOGIN_SUCCESS, this.onLoginSuccess);
        const physics = new PlayPhysics();
        this.model = new PlayModel(physics);
        this.view = new View(this.model);
        this.addChild(this.view);
        this.controller = new Controller(this.view);
        this.startNewGameSession()
            .catch((error) =>
                console.error('세션 초기화 실패, 게임은 계속:', error)
            )
            .finally(() => {
                if (generation !== this.generation) return;
                this.model?.startGame();
                (window as any).LoadingScreen?.finish();
            });
    }

    public async startNewGameSession(): Promise<void> {
        const user = await AUTH_SERVICE.authenticate();
        await API_CONNECTOR.setCrazyGamesUser({
            userId: user.userId,
            username: user.username,
            countryCode: user.countryCode,
            profilePicture: user.profilePicture,
        });
    }

    public dispose(): void {
        ++this.generation;
        EVT_HUB_SAFE.off(G_EVT.RE.START, this.onRestart);
        EVT_HUB_SAFE.off(G_EVT.LOGIN.LOGIN_SUCCESS, this.onLoginSuccess);
        this.controller?.dispose();
        this.model?.dispose();
        this.view?.dispose();
        this.controller = null;
        this.model = null;
        this.view = null;
        this.removeAllChildren();
    }

    public onUnmounted(): void {
        this.dispose();
        super.onUnmounted();
    }
}
export default PLAY;
