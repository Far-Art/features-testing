import {SpecViewDefinition} from '../core/spec-builder.types';
import {SpecViewProcess} from './spec-view-process';
import {SpecViewTools} from './spec-view-tools';

/**
 * The page layouts a spec can use. The first one is the layout of a new page.
 *
 * Zone ids are saved in documents: renaming one moves the items saved in it
 * to the view's first zone.
 */
export const SPEC_VIEWS: readonly SpecViewDefinition[] = [
    {
        id: 'tools',
        label: 'עמוד כלים',
        component: SpecViewTools,
        zones: [{id: 'main', label: 'תוכן'}]
    },
    {
        id: 'process',
        label: 'עמוד תהליך',
        component: SpecViewProcess,
        zones: [
            {id: 'primary', label: 'חלונית ראשונה'},
            {id: 'secondary', label: 'חלונית שנייה'}
        ]
    }
];
