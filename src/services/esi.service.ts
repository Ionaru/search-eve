import { generateNumbersArray } from '@ionaru/array-utils';
import { CacheController, PublicESIService } from '@ionaru/esi-service';
import { EVE, IStatusData, IUniverseNamesData, IUniverseTypeData } from '@ionaru/eve-utils';
import { AxiosError, AxiosInstance } from 'axios';

import { debug } from '../index';

export type fetchFunction = 'getRegions' | 'getSystems' | 'getTypes' | 'getConstellations';

export class ESIService {

    private readonly debug = debug.extend('ESIService');
    private readonly publicESIService: PublicESIService;
    private readonly cacheController: CacheController;
    private readonly axiosInstance: AxiosInstance;

    constructor(publicESIService: PublicESIService, cacheController: CacheController, axiosInstance: AxiosInstance) {
        this.publicESIService = publicESIService;
        this.cacheController = cacheController;
        this.axiosInstance = axiosInstance;
    }

    public async getStatus() {
        return this.fetchData<IStatusData>(EVE.getStatusUrl());
    }

    // noinspection JSUnusedGlobalSymbols
    public async getRegions() {
        return this.fetchData<number[]>(EVE.getUniverseRegionsUrl());
    }

    // noinspection JSUnusedGlobalSymbols
    public async getConstellations() {
        return this.fetchData<number[]>(EVE.getUniverseConstellationsUrl());
    }

    // noinspection JSUnusedGlobalSymbols
    public async getSystems() {
        return this.fetchData<number[]>(EVE.getUniverseSystemsUrl());
    }

    public async getType(id: number) {
        return this.fetchData<IUniverseTypeData>(EVE.getUniverseTypeUrl(id));
    }

    // noinspection JSUnusedGlobalSymbols
    public async getTypes() {

        const url = EVE.getUniverseTypesUrl(1);
        const types = [];

        let pageCount: number | undefined;
        if (!CacheController.isExpired(this.cacheController.responseCache[url])) {
            const cache = this.cacheController.responseCache[url];
            types.push(...cache!.data);
            pageCount = Number(cache!.headers['x-pages']);
        } else {
            const pageResponse = await this.publicESIService.fetchESIDataRaw<number[]>(url);
            types.push(...pageResponse.data);
            pageCount = Number(pageResponse.headers['x-pages']);
            this.cacheController.saveToCache(pageResponse);
        }

        if (pageCount && pageCount > 1) {
            const pageIterable = generateNumbersArray(pageCount, 2);
            await Promise.all(pageIterable.map(async (page) => {
                const pageResponse = await this.fetchData<number[]>(EVE.getUniverseTypesUrl(page));
                types.push(...pageResponse);
            }));
        }

        return types;
    }

    public async getNames(ids: number[]): Promise<IUniverseNamesData> {

        const names: IUniverseNamesData = [];
        const idsCopy = ids.slice();

        while (true) {
            const idsPart = idsCopy.splice(0, 1000);
            const namesPart = await this.getNamesChunk(idsPart);
            names.push(...namesPart);

            if (idsPart.length < 1000) {
                return names;
            }
        }

    }

    private async getNamesChunk(ids: number[]): Promise<IUniverseNamesData> {
        const url = EVE.getUniverseNamesUrl();
        const body = JSON.stringify(ids);

        this.debug(url, body);
        const namesResponse = await this.axiosInstance.post<IUniverseNamesData>(url, body).catch(() => undefined);

        return namesResponse ? namesResponse.data : [];
    }

    private async fetchData<T>(url: string, retry = false): Promise<T> {
        return this.publicESIService.fetchESIData<T>(url).catch((error: AxiosError) => {

            if (this.cacheController.responseCache[url]) {
                process.emitWarning(`Request failed: ${url}, using cached data.`);
                return this.cacheController.responseCache[url]!.data as T;
            }

            if (!retry) {
                process.emitWarning(`Request failed: ${url}, retrying.`);
                return this.fetchData<T>(url, true);
            }

            let reason = '<unknown>';

            if (error.response) {
                reason = error.response.data;
            }

            process.stderr.write(`Request failed: ${url}, ${reason}\n`);
            throw error;
        });
    }
}
