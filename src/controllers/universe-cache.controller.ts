import { IUniverseNamesData } from '@ionaru/eve-utils';
import * as fs from 'fs';
import * as moment from 'moment';
import * as path from 'path';

import { EVEFuse } from '../EVEFuse';
import { debug } from '../index';
import { ESIService } from '../services/esi.service';

type fetchFunctionType = 'getRegions' | 'getSystems' | 'getTypes';

export class UniverseCacheController {

    private static readFileContents(filePath: string): string | undefined {
        if (fs.existsSync(filePath)) {
            try {
                return fs.readFileSync(filePath).toString();
            } catch {
                process.emitWarning(`The file ${filePath} could not be read.`);
                UniverseCacheController.deleteFile(filePath);
            }
        }
        return;
    }

    private static deleteFile(filePath: string) {
        try {
            fs.unlinkSync(filePath);
            process.emitWarning(`File ${filePath} deleted.`);
        } catch (e) {
            process.stderr.write(`The file ${filePath} could not be deleted, please delete manually. Reason: ${e}`);
            throw e;
        }
    }

    public serverVersion?: string;

    public regions: IUniverseNamesData = [];
    public regionsFuse!: EVEFuse;

    public systems: IUniverseNamesData = [];
    public systemsFuse!: EVEFuse;

    public types: IUniverseNamesData = [];
    public typesFuse!: EVEFuse;

    private readonly debug = debug.extend('UniverseCacheController');

    private readonly serverVersionFileName = 'serverVersion.txt';
    private readonly dataPath: string;
    private readonly esiService: ESIService;

    constructor(dataPath: string, esiService: ESIService) {
        this.dataPath = dataPath;
        this.esiService = esiService;
    }

    public async doUpdateCycle() {
        const cacheValid = await this.checkCacheValidity();

        const newRegions = await this.cacheUniverse(cacheValid, 'regions', 'getRegions');
        const newSystems = await this.cacheUniverse(cacheValid, 'systems', 'getSystems');
        const newTypes = await this.cacheUniverse(cacheValid, 'types', 'getTypes');

        if (!newRegions.length || !newSystems.length || !newTypes.length) {
            fs.unlinkSync(`${this.dataPath}/${this.serverVersionFileName}`);
            throw new Error('Universe data incomplete, unable to create new cache');
        }

        this.regions = newRegions;
        this.regionsFuse = new EVEFuse(this.regions);

        this.systems = newSystems;
        this.systemsFuse = new EVEFuse(this.systems);

        this.types = newTypes;
        this.typesFuse = new EVEFuse(this.types);

        setTimeout(() => {
            this.doUpdateCycle().catch((error: Error) => {
                process.stderr.write(error.stack as string + '\n');
                process.stderr.write('An error prevented a cache update, attempting to re-use the old cache\n');
            });
        }, UniverseCacheController.timeUntilNoon);

        fs.writeFileSync(`${this.dataPath}/${(this.serverVersionFileName)}`, this.serverVersion);
    }

    private static get timeUntilNoon() {
        let noon = moment.utc().hours(12).minute(0).second(0).millisecond(0);
        if (moment.utc().isAfter(noon)) {
            noon = noon.add(1, 'day');
        }
        return noon.valueOf() - Date.now();
    }

    private async checkCacheValidity(): Promise<boolean> {
        const serverVersionFilePath = path.join(this.dataPath, this.serverVersionFileName);
        const serverVersion = UniverseCacheController.readFileContents(serverVersionFilePath);

        const serverStatus = await this.esiService.getStatus();

        if (!serverStatus) {
            process.stderr.write('Could not get EVE Online server status, using cache if possible\n');
            this.serverVersion = undefined;
            return true;
        }

        this.serverVersion = serverStatus.server_version;

        if (serverStatus.server_version === serverVersion) {
            this.debug(`EVE Online server version matches saved version, using cache`);
            return true;
        }

        this.debug(`EVE Online server version does not match saved version (or there is no saved version), cache invalid`);
        return false;
    }

    private async cacheUniverse(useCache: boolean, type: string, fetchFunction: fetchFunctionType): Promise<IUniverseNamesData> {
        const savePath = `${this.dataPath}/${type}.json`;

        if (useCache) {
            const cachedData = UniverseCacheController.readFileContents(savePath);
            if (cachedData) {
                let cachedNames: IUniverseNamesData = [];
                try {
                    cachedNames = JSON.parse(cachedData);
                    this.debug(`Loaded ${cachedNames.length} ${type} from cache into memory`);
                    return cachedNames;
                } catch {
                    process.stderr.write(`Could not parse cached ${type} data!\n`);
                }
            }
        }

        this.debug(`No valid cached ${type} available, updating from API`);

        const data = await this.esiService[fetchFunction]();
        if (data) {
            const names = await this.esiService.getNames(data).catch(() => []);
            if (names.length === data.length) {
                fs.writeFileSync(savePath, JSON.stringify(names));
                this.debug(`Wrote ${names.length} ${type} to cache at ${savePath} and loaded into memory`);
                return names;
            } else {
                process.stderr.write(`Name data for ${type} was incomplete!\n`);
            }
        } else {
            process.stderr.write(`Could not get ${type} from EVE Online API\n`);
            if (!useCache) {
                // Attempt to load from cache if we didn't try that already.
                process.emitWarning(`Attempting to get ${type} from cache`);
                return this.cacheUniverse(true, type, fetchFunction).catch(() => []);
            }
        }
        return [];
    }
}
