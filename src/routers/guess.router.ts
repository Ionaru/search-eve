import { BaseRouter, Request, Response } from '@ionaru/micro-web-service';

import { GuessService, SearchFunction } from '../services/guess.service';

export class GuessRouter extends BaseRouter {

    public constructor(
        private readonly guessService: GuessService
    ) {
        super();
        this.createRoute('get', '/type', this.searchType.bind(this));
        this.createRoute('get', '/item', this.searchType.bind(this));
        this.createRoute('get', '/system', this.searchSystem.bind(this));
        this.createRoute('get', '/constellation', this.searchConstellation.bind(this));
        this.createRoute('get', '/region', this.searchRegion.bind(this));
        this.createRoute('get', '/shortcuts', this.shortcuts.bind(this));
    }

    @GuessRouter.requestDecorator(GuessRouter.checkQueryParameters, 'q')
    private async searchType(request: Request<unknown, unknown>, response: Response) {
        return this.search(request, response, 'searchType');
    }

    @GuessRouter.requestDecorator(GuessRouter.checkQueryParameters, 'q')
    private async searchSystem(request: Request<unknown, unknown>, response: Response) {
        return this.search(request, response, 'searchSystem');
    }

    @GuessRouter.requestDecorator(GuessRouter.checkQueryParameters, 'q')
    private async searchConstellation(request: Request<unknown, unknown>, response: Response) {
        return this.search(request, response, 'searchConstellation');
    }

    @GuessRouter.requestDecorator(GuessRouter.checkQueryParameters, 'q')
    private async searchRegion(request: Request<unknown, unknown>, response: Response) {
        return this.search(request, response, 'searchRegion');
    }

    private async shortcuts(_request: Request, response: Response) {
        const shortcuts = Object.entries(GuessService.shortcuts);
        return GuessRouter.sendSuccess(response, shortcuts);
    }

    private async search(request: Request<unknown, unknown>, response: Response, searcher: SearchFunction) {
        const query = request.query.q;

        if (typeof query !== 'string') {
            return GuessRouter.sendBadRequest(response, 'query', 'Query must be a string');
        }

        if (!query.length) {
            return GuessRouter.sendNotFound(response, query);
        }

        if (query.length > this.guessService.longestAllowed) {
            return GuessRouter.sendBadRequest(response, 'query', 'Query too long');
        }

        const answer = await this.guessService[searcher](query);

        if (!answer) {
            return GuessRouter.sendNotFound(response, query);
        }

        return GuessRouter.sendSuccess(response, answer);
    }
}
