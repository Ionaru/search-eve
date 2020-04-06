import { IUniverseNamesDataUnit } from '@ionaru/eve-utils';
import * as Fuse from 'fuse.js';

export class EVEFuse extends Fuse<IUniverseNamesDataUnit, Fuse.IFuseOptions<IUniverseNamesDataUnit>> {
    constructor(possibilities: ReadonlyArray<IUniverseNamesDataUnit>) {
        super(possibilities, {
            distance: 100,
            keys: ['name'],
        });
    }
}
