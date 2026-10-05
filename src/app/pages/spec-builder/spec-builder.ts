import {ChangeDetectionStrategy, Component, effect, inject, signal} from '@angular/core';
import {ImsButton, ImsButtonIcon} from '../../components/ims-button';
import {ImsIcon} from '../../components/ims-icon';
import {ImsPanel, ImsPanelHeader, ImsPanelHeaderActions} from '../../components/ims-panel';
import {SpecBuilderStore} from './core/spec-builder.store';
import {SPEC_BUILDER_CONFIG} from './core/spec-builder.tokens';
import {SPEC_LABELS} from './core/spec-builder.labels';
import {SpecFilesService} from './core/spec-files.service';
import {SpecReferenceService} from './core/spec-reference.service';
import {SpecScreenshotEngine, SpecScreenshotService} from './core/spec-screenshot.service';
import {SpecSurfaceService} from './core/spec-surface.service';
import {SpecTabCaptureEngine} from './core/spec-tab-capture.engine';
import {SpecTokensService} from './core/spec-tokens.service';
import {SpecZoomService} from './core/spec-zoom.service';
import {SPEC_BUILDER_SETTINGS} from './spec-builder.config';
import {SpecBuilderCanvas} from './ui/spec-builder-canvas';
import {SpecBuilderElements} from './ui/spec-builder-elements';
import {SpecBuilderInspector} from './ui/spec-builder-inspector';
import {SpecBuilderPages} from './ui/spec-builder-pages';
import {SpecBuilderPalette} from './ui/spec-builder-palette';
import {SpecBuilderReference} from './ui/spec-builder-reference';
import {SpecBuilderToolbar} from './ui/spec-builder-toolbar';

/** How long after the last change the page in progress is saved in the browser. */
const DRAFT_SAVE_DELAY_MS = 500;

/**
 * The spec builder: a page where the spec team lays out the design system's
 * components and shapes on a page layout, takes screenshots of it for the
 * spec document, and hands developers a numbered reference.
 *
 * Provides the services every part shares, so each builder on screen has its
 * own state. Covers the whole window, above the application's own chrome.
 * See README.md for how to add blocks and views.
 */
@Component({
    selector: 'app-spec-builder',
    standalone: true,
    imports: [
        ImsButton,
        ImsButtonIcon,
        ImsIcon,
        ImsPanel,
        ImsPanelHeader,
        ImsPanelHeaderActions,
        SpecBuilderCanvas,
        SpecBuilderElements,
        SpecBuilderInspector,
        SpecBuilderPages,
        SpecBuilderPalette,
        SpecBuilderReference,
        SpecBuilderToolbar
    ],
    templateUrl: './spec-builder.html',
    styleUrl: './spec-builder.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [
        {provide: SPEC_BUILDER_CONFIG, useValue: SPEC_BUILDER_SETTINGS},
        {provide: SpecScreenshotEngine, useClass: SpecTabCaptureEngine},
        SpecBuilderStore,
        SpecZoomService,
        SpecSurfaceService,
        SpecTokensService,
        SpecFilesService,
        SpecReferenceService,
        SpecScreenshotService
    ]
})
export class SpecBuilder {
    protected readonly store = inject(SpecBuilderStore);
    protected readonly screenshot = inject(SpecScreenshotService);
    protected readonly labels = SPEC_LABELS.capture;
    protected readonly elementLabels = SPEC_LABELS.elements;
    /** What the start column shows while editing: the blocks to add, or the items on the page. */
    protected readonly startPanel = signal<'add' | 'list'>('add');
    private readonly files = inject(SpecFilesService);

    constructor() {
        const draft = this.files.loadDraft();
        if (draft) {
            this.store.reset(draft);
        }

        // Keeps the page in progress in the browser, so a reload does not lose
        // it. The only effect in the builder; it writes no signal.
        effect((onCleanup) => {
            const document = this.store.document();
            const timer = setTimeout(() => this.files.saveDraft(document), DRAFT_SAVE_DELAY_MS);
            onCleanup(() => clearTimeout(timer));
        });
    }
}

