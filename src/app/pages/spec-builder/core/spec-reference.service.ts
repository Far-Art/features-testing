import {Clipboard} from '@angular/cdk/clipboard';
import {Injectable, computed, inject} from '@angular/core';
import {ImsSnackbarService} from '../../../components/ims-snackbar';
import {SpecBuilderStore} from './spec-builder.store';
import {SPEC_LABELS} from './spec-builder.labels';
import {SpecFilesService, fileBaseName} from './spec-files.service';
import {buildReference, renderMarkdown} from './spec-reference.utils';
import {SpecTokensService} from './spec-tokens.service';

/**
 * The developer reference of the open page, for the inspect panel and the
 * Markdown export. The content itself is built by `spec-reference.utils.ts`.
 */
@Injectable()
export class SpecReferenceService {
    private readonly store = inject(SpecBuilderStore);
    private readonly tokens = inject(SpecTokensService);
    private readonly files = inject(SpecFilesService);
    private readonly clipboard = inject(Clipboard);
    private readonly snackbar = inject(ImsSnackbarService);

    /** One entry per item of the page on screen, ordered by the number on its badge. */
    readonly entries = computed(() =>
        buildReference(this.store.page(), this.store.view(), (type) => this.store.blockFor(type), this.store.numbers())
    );

    /** A token's current value, such as `#EAEEFB`. */
    resolveToken(name: string): string {
        return this.tokens.resolve(name);
    }

    /** The reference of every page of the spec. */
    markdown(): string {
        const pages = this.store.pages().map((page) => {
            const view = this.store.viewOf(page);
            return {page, view, entries: buildReference(page, view, (type) => this.store.blockFor(type))};
        });
        return renderMarkdown(this.store.document(), pages, (name) => this.tokens.resolve(name));
    }

    downloadMarkdown(): void {
        this.files.downloadText(this.markdown(), `${fileBaseName(this.store.document().name)}.reference.md`, 'text/markdown');
    }

    copyMarkdown(): void {
        this.copy(this.markdown());
    }

    /** Copies text, and says whether that worked. */
    copy(text: string): void {
        if (this.clipboard.copy(text)) {
            this.snackbar.success(SPEC_LABELS.reference.copied).open();
        } else {
            this.snackbar.warning(SPEC_LABELS.reference.copyFailed).open();
        }
    }
}
