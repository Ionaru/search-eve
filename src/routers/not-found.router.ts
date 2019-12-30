import { BaseRouter, Request, Response } from '@ionaru/micro-web-service';

export class NotFoundRouter extends BaseRouter {

    private static async notFound(_request: Request, response: Response) {
        return NotFoundRouter.send404(response);
    }

    constructor() {
        super();
        this.createRoute('all', '', NotFoundRouter.notFound);
    }

}
