import {SpecBlockDefinition} from '../core/spec-builder.types';
import {AUTOCOMPLETE_BLOCK} from './spec-block-autocomplete';
import {BUTTON_BLOCK} from './spec-block-button';
import {CHECKBOX_BLOCK} from './spec-block-checkbox';
import {DATEPICKER_BLOCK} from './spec-block-datepicker';
import {FORM_BLOCK} from './spec-block-form';
import {GRID_BLOCK} from './spec-block-grid';
import {HTML_TABLE_BLOCK} from './spec-block-html-table';
import {ICON_BLOCK} from './spec-block-icon';
import {ICON_BUTTON_BLOCK} from './spec-block-icon-button';
import {LINE_BLOCK} from './spec-block-line';
import {PANEL_BLOCK} from './spec-block-panel';
import {RADIO_GROUP_BLOCK} from './spec-block-radio-group';
import {SELECT_BLOCK} from './spec-block-select';
import {SHAPE_BLOCK} from './spec-block-shape';
import {HEADING_BLOCK, TEXT_BLOCK} from './spec-block-text';
import {TEXT_FIELD_BLOCK} from './spec-block-text-field';
import {TOGGLE_SWITCH_BLOCK} from './spec-block-toggle-switch';

/** Every block the palette offers, in the order it lists them within each category. */
export const SPEC_BLOCKS: readonly SpecBlockDefinition[] = [
    SHAPE_BLOCK,
    LINE_BLOCK,
    HEADING_BLOCK,
    TEXT_BLOCK,
    BUTTON_BLOCK,
    ICON_BUTTON_BLOCK,
    TEXT_FIELD_BLOCK,
    SELECT_BLOCK,
    AUTOCOMPLETE_BLOCK,
    DATEPICKER_BLOCK,
    FORM_BLOCK,
    CHECKBOX_BLOCK,
    RADIO_GROUP_BLOCK,
    TOGGLE_SWITCH_BLOCK,
    PANEL_BLOCK,
    ICON_BLOCK,
    GRID_BLOCK,
    HTML_TABLE_BLOCK
];
