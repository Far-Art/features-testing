import {DOCUMENT} from '@angular/common';
import {Injectable, inject} from '@angular/core';
import {SPEC_BUILDER_CONFIG} from './spec-builder.tokens';
import {SpecDocument} from './spec-builder.types';
import {parseDocument, serializeDocument} from './spec-document.utils';

/** How long a download link stays valid. The browser has read the file long before. */
const DOWNLOAD_URL_LIFETIME_MS = 10_000;

/**
 * Files in and out of the builder: downloads, and the page in progress kept
 * in the browser so a reload does not lose it.
 *
 * Browser storage can be missing or full, as in a private window. Every
 * access is guarded, and the builder works without it.
 */
@Injectable()
export class SpecFilesService {
    private readonly config = inject(SPEC_BUILDER_CONFIG);
    private readonly document = inject(DOCUMENT);

    /** Saves `content` as a file in the browser's downloads. */
    download(content: Blob, fileName: string): void {
        const url = URL.createObjectURL(content);
        const link = this.document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.hidden = true;
        this.document.body.append(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), DOWNLOAD_URL_LIFETIME_MS);
    }

    downloadDocument(document: SpecDocument): void {
        this.download(new Blob([serializeDocument(document)], {type: 'application/json'}), `${fileBaseName(document.name)}.spec.json`);
    }

    downloadText(text: string, fileName: string, type: string): void {
        this.download(new Blob([text], {type}), fileName);
    }

    saveDraft(document: SpecDocument): void {
        try {
            localStorage.setItem(this.config.draftStorageKey, serializeDocument(document));
        } catch {
            // No storage in this browser, or it is full: the draft is only a convenience.
        }
    }

    /** The page that was open when the builder was last left, if any. */
    loadDraft(): SpecDocument | null {
        try {
            const text = localStorage.getItem(this.config.draftStorageKey);
            return text ? parseDocument(text, this.config).document ?? null : null;
        } catch {
            return null;
        }
    }
}

/** A document name as a file name: characters that are not allowed in file names become dashes. */
export function fileBaseName(name: string): string {
    return name.trim().replace(/[\\/:*?"<>|]+/g, '-') || 'spec';
}
