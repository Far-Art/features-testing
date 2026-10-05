import {SPEC_BLOCKS} from './blocks';
import {SpecBuilderConfig} from './core/spec-builder.types';
import {SPEC_VIEWS} from './views';

/**
 * Everything that differs between the environments the builder runs in.
 * This is the file to edit when the builder moves: the blocks the palette
 * offers, the page layouts, page sizes, and which CSS custom properties count
 * as colour tokens.
 */
export const SPEC_BUILDER_SETTINGS: SpecBuilderConfig = {
    blocks: SPEC_BLOCKS,
    views: SPEC_VIEWS,
    pagePresets: [
        {label: 'מסך רחב, 1920 × 1080', size: {width: 1920, height: 1080}},
        {label: 'מחשב נייד, 1440 × 900', size: {width: 1440, height: 900}},
        {label: 'מחשב נייד קטן, 1366 × 768', size: {width: 1366, height: 768}},
        {label: 'טאבלט, 1024 × 768', size: {width: 1024, height: 768}}
    ],
    gridSize: 8,
    gridSizes: [4, 8, 10, 12, 16, 20, 24, 32],
    // The steps Chrome zooms through.
    zoomSteps: [25, 33, 50, 67, 75, 80, 90, 100, 110, 125, 150, 175, 200, 250, 300, 400, 500],
    tokenSources: [
        {prefix: '--ims-background-', kind: 'background'},
        {prefix: '--ims-color-', kind: 'color'}
    ],
    draftStorageKey: 'spec-builder.draft',
    exitUrl: '/'
};
