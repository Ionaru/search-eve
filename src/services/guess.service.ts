import { IUniverseNamesData, IUniverseNamesDataUnit } from '@ionaru/eve-utils';
import * as escapeStringRegexp from 'escape-string-regexp';

import { UniverseCacheController } from '../controllers/universe-cache.controller';
import { EVEFuse } from '../EVEFuse';
import { debug } from '../index';
import { ESIService } from './esi.service';

interface IShortcuts {
    [shortcut: string]: string;
}

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

    private static matchWithRegex(possibility: IUniverseNamesDataUnit, regex: RegExp) {
        return possibility.name ? possibility.name.match(regex) || undefined : undefined;
    }

    private static replaceQuotes(text: string): string {
        return text.replace(/'/g, '').replace(/"/g, '');
    }

    private readonly debug = debug.extend('GuessService');
    private readonly universeCacheController: UniverseCacheController;
    private readonly esiService: ESIService;

    constructor(universeCacheController: UniverseCacheController, esiService: ESIService) {
        this.universeCacheController = universeCacheController;
        this.esiService = esiService;
    }

    public async searchRegion(query: string) {
        return this.search(query, this.universeCacheController.regions, this.universeCacheController.regionsFuse);
    }

    public async searchSystem(query: string) {
        return this.search(query, this.universeCacheController.systems, this.universeCacheController.systemsFuse);
    }

    public async searchType(query: string) {
        return this.search(query, this.universeCacheController.types, this.universeCacheController.typesFuse);
    }

    private async search(query: string, data: IUniverseNamesData, fuse: EVEFuse, raw = true): Promise<IUniverseNamesDataUnit | undefined> {
        query = escapeStringRegexp(query);

        let possibilities: IUniverseNamesData = [];
        let answer: IUniverseNamesDataUnit | undefined;

        const words = query.split(' ');

        // Check if the item is an ID
        const possibleId = Number(words[0]);
        if (!isNaN(possibleId)) {
            possibilities.push(...data.filter((possibility): boolean => possibility.id === possibleId));
            possibilities = await this.filterUnpublishedTypes(possibilities);
            this.sortArrayByObjectPropertyLength(possibilities, 'name');
            if (possibilities.length) {
                this.debug(`#${query} -> ${possibilities[0].name}`);
                return possibilities[0];
            }
        }

        // Check if word is defined as a shortcut.
        const shortcutRegex = new RegExp(`^${words[0]}`, 'i');
        const shortcut = Object.keys(GuessService.shortcuts).find((shortcutText) => shortcutText.match(shortcutRegex));
        if (shortcut) {
            words[0] = GuessService.shortcuts[shortcut];
            query = words.join(' ');
        }

        // Check for full words.
        possibilities.push(...data.filter((possibility) => {
            const possibilityName = GuessService.replaceQuotes(possibility.name).toLowerCase();
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
            possibilities.push(...data.filter((possibility) => {
                return possibility.name.toLowerCase().includes(query.toLowerCase());
            }));
        }

        possibilities = await this.filterUnpublishedTypes(possibilities);

        if (!possibilities.length) {
            // Use Fuse to search (slow but fuzzy).
            const fuseGuess = fuse.search(query)[0] as IUniverseNamesDataUnit | undefined;

            if (fuseGuess) {
                possibilities.push(fuseGuess);
            }
        }

        if (possibilities.length) {
            // Sort by word length, shortest is usually the correct one.
            let sortedPossibilities = this.sortArrayByObjectPropertyLength(possibilities, 'name');
            sortedPossibilities = await this.filterUnpublishedTypes(sortedPossibilities);
            if (sortedPossibilities.length) {
                answer = sortedPossibilities[0];
            }
        }

        if (!answer && raw) {
            // Strip quotes from possibilities and try guessing again.
            const list = data.map((possibility) => {
                return {
                    category: possibility.category,
                    id: possibility.id,
                    name: GuessService.replaceQuotes(possibility.name),
                    originalName: possibility.name,
                };
            });
            answer = await this.search(query, list, fuse, false);
        }

        this.debug(`${query} -> ${answer?.name}`);

        return answer;
    }

    private async filterUnpublishedTypes(possibilities: IUniverseNamesData): Promise<IUniverseNamesData> {

        for (const possibility of possibilities) {

            if (possibility.category === 'inventory_type') {
                const type = await this.esiService.getType(possibility.id);
                if (!type || !type.published) {
                    continue;
                }
            }
            return [possibility];
        }

        return [];
    }

    private sortArrayByObjectPropertyLength<T>(array: T[], property: string, inverse = false): T[] {
        function compare(a: any, b: any) {
            if (a[property].length < b[property].length) {
                return inverse ? 1 : -1;
            }
            if (a[property].length > b[property].length) {
                return inverse ? -1 : 1;
            }
            return 0;
        }

        return array.sort(compare);
    }
}
