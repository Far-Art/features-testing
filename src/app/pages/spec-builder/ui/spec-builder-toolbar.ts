import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {Router} from '@angular/router';
import {ImsButton, ImsButtonIcon} from '../../../components/ims-button';
import {ImsDialogService} from '../../../components/ims-dialog';
import {ImsIcon} from '../../../components/ims-icon';
import {ImsSnackbarService} from '../../../components/ims-snackbar';
import {ImsTooltip} from '../../../components/ims-tooltip';
import {ImsOption, ImsSelect} from '../../../components/ims-select';
import {ImsInputDirective} from '../../../ims-input.directive';
import {SpecBuilderStore} from '../core/spec-builder.store';
import {SPEC_BUILDER_CONFIG} from '../core/spec-builder.tokens';
import {SPEC_LABELS} from '../core/spec-builder.labels';
import {SpecBuilderMode} from '../core/spec-builder.types';
import {parseDocument} from '../core/spec-document.utils';
import {SpecFilesService} from '../core/spec-files.service';
import {SpecReferenceService} from '../core/spec-reference.service';
import {SpecScreenshotService} from '../core/spec-screenshot.service';
import {SpecZoomService} from '../core/spec-zoom.service';

/** Seconds the delayed screenshot waits. */
const CAPTURE_DELAY_SECONDS = 3;

/** The builder's top bar: the document, undo, the working mode, zoom, and the exports. */
@Component({
    selector: 'app-spec-builder-toolbar',
    standalone: true,
    imports: [ImsButton, ImsButtonIcon, ImsIcon, ImsInputDirective, ImsOption, ImsSelect, ImsTooltip],
    templateUrl: './spec-builder-toolbar.html',
    styleUrl: './spec-builder-toolbar.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        role: 'toolbar',
        '[attr.aria-label]': 'labels.label'
    }
})
export class SpecBuilderToolbar {
    protected readonly labels = SPEC_LABELS.toolbar;
    protected readonly modeLabels = SPEC_LABELS.modes;
    protected readonly exitLabel = SPEC_LABELS.exit;
    protected readonly modes: readonly SpecBuilderMode[] = ['edit', 'preview', 'inspect'];
    protected readonly store = inject(SpecBuilderStore);
    protected readonly zoom = inject(SpecZoomService);
    protected readonly screenshot = inject(SpecScreenshotService);
    protected readonly reference = inject(SpecReferenceService);
    private readonly config = inject(SPEC_BUILDER_CONFIG);
    protected readonly gridSizes = this.config.gridSizes;
    private readonly files = inject(SpecFilesService);
    private readonly dialog = inject(ImsDialogService);
    private readonly snackbar = inject(ImsSnackbarService);
    private readonly router = inject(Router);

    protected exit(): void {
        void this.router.navigateByUrl(this.config.exitUrl);
    }

    protected rename(event: Event): void {
        this.store.rename((event.target as HTMLInputElement).value);
    }

    /** Starts an empty spec, after a confirmation unless the current one is empty too. */
    protected newDocument(): void {
        const {pages, title} = this.store.document();
        if (pages.length === 1 && pages[0].items.length === 0 && !title) {
            this.store.newDocument();
            return;
        }

        this.dialog
            .warning(SPEC_LABELS.files.newMessage)
            .title(SPEC_LABELS.files.newTitle)
            .asConfirmation('yes_no')
            .open()
            .closed.subscribe((confirmed) => {
                if (confirmed) {
                    this.store.newDocument();
                }
            });
    }

    protected async openFile(event: Event): Promise<void> {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        // Cleared, so choosing the same file again opens it again.
        input.value = '';
        if (!file) {
            return;
        }

        const result = parseDocument(await file.text(), this.config);
        if (result.document) {
            this.store.load(result.document);
            this.snackbar.success(SPEC_LABELS.files.opened(result.document.name)).open();
        } else {
            this.snackbar.warning(SPEC_LABELS.files[result.error]).open();
        }
    }

    protected save(): void {
        this.files.downloadDocument(this.store.document());
    }

    protected setGridSize(size: unknown): void {
        if (typeof size === 'number') {
            this.store.gridSize.set(size);
        }
    }

    protected captureLater(): void {
        void this.screenshot.captureAfter(CAPTURE_DELAY_SECONDS);
    }
}
