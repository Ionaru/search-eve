import { IUniverseNamesDataUnit } from '@ionaru/eve-utils';
import * as Fuse from 'fuse.js';

export class EVEFuse extends Fuse<IUniverseNamesDataUnit, Fuse.FuseOptions<IUniverseNamesDataUnit>> {
    constructor(possibilities: ReadonlyArray<IUniverseNamesDataUnit>) {
        super(possibilities, {
            distance: 100,
            keys: ['name'],
            location: 0,
            maxPatternLength: 128,
            minMatchCharLength: 1,
            shouldSort: true,
            threshold: 0.6,
            tokenize: true,
        });
    }
}
