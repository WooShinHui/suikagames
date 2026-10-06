import { API_CONNECTOR } from '../../../../fetch/ApiConnector';
import { ResultModel } from '../../Model/ResultModel';
import { ResultController } from '../../Controller/ResultController';
import { ResultView } from './result/ResultView';

export class Result {
    private readonly view = new ResultView();
    private readonly model = new ResultModel(API_CONNECTOR);
    private readonly controller = new ResultController(this.model, this.view);

    public dispose(): void {
        this.controller.dispose();
        this.view.dispose();
    }
}
