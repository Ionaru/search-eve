import { sortArrayByObjectPropertyLength } from '@ionaru/array-utils';
import { IUniverseNamesData, IUniverseNamesDataUnit } from '@ionaru/eve-utils';
import escapeStringRegexp from 'escape-string-regexp';

import { ICacheObject, UniverseCacheController } from '../controllers/universe-cache.controller';
import { debug } from '../debug';
import { EVEFuse } from '../EVEFuse';

import { ESIService } from './esi.service';

interface IShortcuts {
    [shortcut: string]: string;
}

interface IAnswerData extends IUniverseNamesDataUnit {
    fuzzy?: boolean;
}

export type SearchFunction = 'searchType' | 'searchRegion' | 'searchConstellation' | 'searchSystem';

export class GuessService {

    public static readonly shortcuts: IShortcuts = {
        bcs: 'Ballistic Control System',
        dc: 'Damage Control',
        dda: 'Drone Damage Amplifier',
        dni: 'Dominix Navy Issue',
        fnc: 'Federation Navy Comet',
        hfi: 'Hurricane Fleet Issue',
        lsi: 'Large Skill Injector',
        mlu: 'Mining Laser Upgrade',
        mni: 'Megathron Navy Issue',
        mtu: 'Mobile Tractor Unit',
        rni: 'Raven Navy Issue',
        ssi: 'Small Skill Injector',
        vni: 'Vexor Navy Issue',
    };

    public readonly longestAllowed: number;

    private readonly debug = debug.extend('GuessService');

    public constructor(
        private readonly universeCacheController: UniverseCacheController,
        private readonly esiService: ESIService,
    ) {

        this.longestAllowed = Math.max(...[
            ...this.universeCacheController.cache.types.data,
            ...this.universeCacheController.cache.regions.data,
            ...this.universeCacheController.cache.constellations.data,
            ...this.universeCacheController.cache.systems.data,
        ].map((element) => element.name.length));
    }

    private static matchWithRegex(possibility: IUniverseNamesDataUnit, regex: RegExp) {
        return possibility.name ? possibility.name.match(regex) || undefined : undefined;
    }

    private static replaceSpecialCharacters(text: string): string {
        return text
            .replace(/'/g, '')
            .replace(/"/g, '')
            .replace(/,/g, '');
    }

    // noinspection JSUnusedGlobalSymbols
    public async searchRegion(query: string) {
        return this.searchWithCache(query, this.universeCacheController.cache.regions);
    }

    // noinspection JSUnusedGlobalSymbols
    public async searchConstellation(query: string) {
        return this.searchWithCache(query, this.universeCacheController.cache.constellations);
    }

    // noinspection JSUnusedGlobalSymbols
    public async searchSystem(query: string) {
        return this.searchWithCache(query, this.universeCacheController.cache.systems);
    }

    // noinspection JSUnusedGlobalSymbols
    public async searchType(query: string) {
        return this.searchWithCache(query, this.universeCacheController.cache.types);
    }

    private async searchWithCache(query: string, {data, fuse, guesses}: ICacheObject) {

        if (query in guesses) {
            this.debug(`(Cache): ${query} -> ${guesses[query]?.name}`);
            return guesses[query];
        }

        const answer = await this.search(query, data, fuse);

        guesses[query] = answer;
        this.debug(`(Guess): ${query} -> ${answer?.name}`);

        return answer;
    }

    private async search(query: string, data: IUniverseNamesData, fuse: EVEFuse, raw = true): Promise<IAnswerData | undefined> {
        query = escapeStringRegexp(query);

        // Check if the item is an ID
        const item = await this.getFromId(query, data);
        if (item) {
            return item;
        }

        let possibilities: IAnswerData[] = [];
        let answer: IUniverseNamesDataUnit | undefined;

        const words = query.split(' ');

        // Check if word is defined as a shortcut.
        const shortcut = this.getFromShortcut(words);
        if (shortcut) {
            words[0] = GuessService.shortcuts[shortcut];
            query = words.join(' ');
        }

        // Check for full words.
        possibilities.push(...data.filter((possibility) => {
            const possibilityName = GuessService.replaceSpecialCharacters(possibility.name).toLowerCase();
            const possibilityParts = possibilityName.split(' ');
            return words.every((word) => possibilityParts.includes(word));
        }));

        possibilities = await this.filterUnpublishedTypes(possibilities);

        if (!possibilities.length) {
            // Check in start of the words.
            const regex = new RegExp(`^${query}`, 'i');
            possibilities.push(...data.filter((possibility) => GuessService.matchWithRegex(possibility, regex)));
        }

        possibilities = await this.filterUnpublishedTypes(possibilities);

        if (!possibilities.length) {
            // Check at end of the words.
            const regex = new RegExp(`${query}$`, 'i');
            possibilities.push(...data.filter((possibility) => GuessService.matchWithRegex(possibility, regex)));
        }

        possibilities = await this.filterUnpublishedTypes(possibilities);

        if (!possibilities.length) {
            // Check in middle of words.
            possibilities.push(...data.filter((possibility) => possibility.name.toLowerCase().includes(query)));
        }

        possibilities = await this.filterUnpublishedTypes(possibilities);

        if (!possibilities.length) {
            // Use Fuse to search (slow but fuzzy).
            const fuseGuess = fuse.search(query)[0];

            if (fuseGuess) {
                possibilities.push({...fuseGuess.item, fuzzy: true});
            }
        }

        if (possibilities.length) {
            // Sort by word length, shortest is usually the correct one.
            possibilities = await this.filterUnpublishedTypes(possibilities);
            sortArrayByObjectPropertyLength(possibilities, (possibility) => possibility.name);
            if (possibilities.length) {
                answer = possibilities[0];
            }
        }

        if (!answer && raw) {
            // Strip special characters from possibilities and try guessing again.
            const list = data.map((possibility) => ({
                category: possibility.category,
                id: possibility.id,
                name: GuessService.replaceSpecialCharacters(possibility.name).toLowerCase(),
                originalName: possibility.name,
            }));
            answer = await this.search(query, list, fuse, false);
        }

        return answer;
    }

    private getFromShortcut(words: string[]): string | undefined {
        const shortcutRegex = new RegExp(`^${words[0]}`, 'i');
        return Object.keys(GuessService.shortcuts).find((shortcutText) => shortcutText.match(shortcutRegex));
    }

    private async getFromId(query: string, data: IUniverseNamesData): Promise<IUniverseNamesDataUnit | void> {
        const id = Number(query);
        if (!isNaN(id)) {
            const item = data.find((possibility) => possibility.id === id);

            if (item) {
                const publishedItems = await this.filterUnpublishedTypes([item]);
                if (publishedItems.length) {
                    return item;
                }
            }
        }
    }

    private async filterUnpublishedTypes(possibilities: IUniverseNamesData): Promise<IUniverseNamesData> {

        const filteredPossibilities: IUniverseNamesData = [];

        await Promise.all(possibilities.map(async (possibility) => {
            if (possibility.category === 'inventory_type') {
                const type = await this.esiService.getType(possibility.id);
                if (!type || !type.published) {
                    return;
                }
            }
            filteredPossibilities.push(possibility);
        }));

        return filteredPossibilities;
    }
}
