import { BaseRouter, Request, Response } from '@ionaru/micro-web-service';
import * as httpStatus from 'http-status-codes';

import { GuessService, searchFunction } from '../services/guess.service';

export class GuessRouter extends BaseRouter {

    private static guessService: GuessService;

    private static async search(request: Request, response: Response, searcher: searchFunction) {
        const query = request.query.q.trim().toLowerCase();

        if (!query.length) {
            return GuessRouter.send404(response);
        }

        if (query.length > GuessRouter.guessService.longestAllowed) {
            return GuessRouter.sendResponse(response, httpStatus.BAD_REQUEST, 'Query too long');
        }

        const answer = await GuessRouter.guessService[searcher](query);

        if (!answer) {
            return GuessRouter.send404(response);
        }

        return GuessRouter.sendSuccessResponse(response, answer);
    }

    @GuessRouter.requestDecorator(GuessRouter.checkQueryParameters, 'q')
    private static async searchType(request: Request, response: Response) {
        return GuessRouter.search(request, response, 'searchType');
    }

    @GuessRouter.requestDecorator(GuessRouter.checkQueryParameters, 'q')
    private static async searchSystem(request: Request, response: Response) {
        return GuessRouter.search(request, response, 'searchSystem');
    }

    @GuessRouter.requestDecorator(GuessRouter.checkQueryParameters, 'q')
    private static async searchConstellation(request: Request, response: Response) {
        return GuessRouter.search(request, response, 'searchConstellation');
    }

    @GuessRouter.requestDecorator(GuessRouter.checkQueryParameters, 'q')
    private static async searchRegion(request: Request, response: Response) {
        return GuessRouter.search(request, response, 'searchRegion');
    }

    private static async shortcuts(_request: Request, response: Response) {

        const shortcuts = Object.entries(GuessService.shortcuts);
        return GuessRouter.sendSuccessResponse(response, shortcuts);
    }

    constructor(guessService: GuessService) {
        super();

        GuessRouter.guessService = guessService;
        this.createRoute('get', '/type', GuessRouter.searchType);
        this.createRoute('get', '/system', GuessRouter.searchSystem);
        this.createRoute('get', '/constellation', GuessRouter.searchConstellation);
        this.createRoute('get', '/region', GuessRouter.searchRegion);
        this.createRoute('get', '/shortcuts', GuessRouter.shortcuts);
    }
}
