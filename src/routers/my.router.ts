// tslint:disable-next-line:no-implicit-dependencies
import { BaseRouter, Request, Response } from '@ionaru/micro-web-service';
import { GuessService } from '../services/guess.service';

export class MyRouter extends BaseRouter {

    private static guessService: GuessService;

    @MyRouter.requestDecorator(MyRouter.checkQueryParameters, 'q')
    private static async searchType(request: Request, response: Response) {

        const answer = await MyRouter.guessService.searchType(request.query.q);

        if (!answer) {
            return MyRouter.send404(response);
        }

        return MyRouter.sendSuccessResponse(response, answer);
    }

    @MyRouter.requestDecorator(MyRouter.checkQueryParameters, 'q')
    private static async searchSystem(request: Request, response: Response) {

        const answer = await MyRouter.guessService.searchSystem(request.query.q);

        if (!answer) {
            return MyRouter.send404(response);
        }

        return MyRouter.sendSuccessResponse(response, answer);
    }

    @MyRouter.requestDecorator(MyRouter.checkQueryParameters, 'q')
    private static async searchRegion(request: Request, response: Response) {

        const answer = await MyRouter.guessService.searchRegion(request.query.q);

        if (!answer) {
            return MyRouter.send404(response);
        }

        return MyRouter.sendSuccessResponse(response, answer);
    }

    private static async shortcuts(_request: Request, response: Response) {

        const s = Object.entries(GuessService.shortcuts);
        return MyRouter.sendSuccessResponse(response, s);
    }

    constructor(guessService: GuessService) {
        super();

        MyRouter.guessService = guessService;
        this.createRoute('get', '/type', MyRouter.searchType);
        this.createRoute('get', '/system', MyRouter.searchSystem);
        this.createRoute('get', '/region', MyRouter.searchRegion);
        this.createRoute('get', '/shortcuts', MyRouter.shortcuts);
    }
}
