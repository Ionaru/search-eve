// tslint:disable-next-line:no-implicit-dependencies
import { BaseRouter, Request, Response } from '@ionaru/micro-web-service';
import * as httpStatus from 'http-status-codes';

import { GuessService, searchFunction } from '../services/guess.service';

export class MyRouter extends BaseRouter {

    private static guessService: GuessService;

    private static async search(request: Request, response: Response, searcher: searchFunction) {
        if (request.query.q.length > MyRouter.guessService.longestAllowed) {
            return MyRouter.sendResponse(response, httpStatus.BAD_REQUEST, 'Query too long');
        }

        const answer = await MyRouter.guessService[searcher](request.query.q);

        if (!answer) {
            return MyRouter.send404(response);
        }

        return MyRouter.sendSuccessResponse(response, answer);
    }

    @MyRouter.requestDecorator(MyRouter.checkQueryParameters, 'q')
    private static async searchType(request: Request, response: Response) {
        return MyRouter.search(request, response, 'searchType');
    }

    @MyRouter.requestDecorator(MyRouter.checkQueryParameters, 'q')
    private static async searchSystem(request: Request, response: Response) {
        return MyRouter.search(request, response, 'searchSystem');
    }

    @MyRouter.requestDecorator(MyRouter.checkQueryParameters, 'q')
    private static async searchRegion(request: Request, response: Response) {
        return MyRouter.search(request, response, 'searchRegion');
    }

    private static async shortcuts(_request: Request, response: Response) {

        const shortcuts = Object.entries(GuessService.shortcuts);
        return MyRouter.sendSuccessResponse(response, shortcuts);
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
