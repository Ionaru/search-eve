import * as path from 'path';

import { CacheController, PublicESIService } from '@ionaru/esi-service';
import { NotFoundRoute, ServiceController } from '@ionaru/micro-web-service';
import { HttpsAgent } from 'agentkeepalive';
import axios from 'axios';
import cors from 'cors';

import { UniverseCacheController } from './controllers/universe-cache.controller';
import { GuessRouter } from './routers/guess.router';
import { ESIService } from './services/esi.service';
import { GuessService } from './services/guess.service';

let cacheController: CacheController;

const start = async () => {

    const dataFolder = 'data';

    const axiosInstance = axios.create({
        // keepAlive pools and reuses TCP connections, so it's faster
        httpsAgent: new HttpsAgent(),

        // Cap the maximum content length we'll accept to 50MBs, just in case
        maxContentLength: 50000000,

        // Follow up to 10 HTTP 3xx redirects
        maxRedirects: 10,

        // 60 sec timeout
        timeout: 60000,
    });

    cacheController = new CacheController(path.join(dataFolder, 'requests.json'));
    const publicESIService = new PublicESIService({
        axiosInstance,
        cacheController,
    });

    const esiService = new ESIService(publicESIService, cacheController, axiosInstance);

    const universeCacheController = new UniverseCacheController(dataFolder, esiService);
    await universeCacheController.doUpdateCycle();

    const guessService = new GuessService(universeCacheController, esiService);

    const serverPort = process.env.SEARCHEVE_PORT || 3000;
    await new ServiceController({
        middleware: [
            cors(),
        ],
        port: Number(serverPort),
        routes: [
            ['/', new GuessRouter(guessService)],
            ['*', new NotFoundRoute()],
        ],
    }).listen();

    process.stdin.resume();
    process.on('unhandledRejection', (reason, p): void => {
        process.stderr.write(`Unhandled Rejection at: \nPromise ${p} \nReason: ${reason}\n`);
    });
    process.on('uncaughtException', (error) => {
        process.stderr.write(`Uncaught Exception! \n${error}\n`);
        stop().then();
    });
    process.on('SIGINT', () => {
        stop().then();
    });
    process.on('SIGTERM', () => {
        stop().then();
    });
};

const stop = async () => {
    if (cacheController) {
        cacheController.dumpCache();
    }
    process.exit(0);
};

start().then();
