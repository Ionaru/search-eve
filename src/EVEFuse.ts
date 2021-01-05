import { IUniverseNamesDataUnit } from '@ionaru/eve-utils';
import Fuse from 'fuse.js';

export class EVEFuse extends Fuse<IUniverseNamesDataUnit> {
    constructor(possibilities: ReadonlyArray<IUniverseNamesDataUnit>) {
        super(possibilities, {
            distance: 100,
            keys: ['name'],
        });
    }
}
