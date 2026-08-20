import { IUniverseNamesDataUnit } from '@ionaru/eve-utils';
// eslint-disable-next-line @typescript-eslint/naming-convention -- Fuse is a class, PascalCase is correct.
import Fuse from 'fuse.js';

export class EVEFuse extends Fuse<IUniverseNamesDataUnit> {
    public constructor(possibilities: readonly IUniverseNamesDataUnit[]) {
        super(possibilities, {
            distance: 100,
            keys: ['name'],
        });
    }
}
