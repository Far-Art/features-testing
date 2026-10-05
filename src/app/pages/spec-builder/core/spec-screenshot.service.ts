import {DestroyRef, Injectable, Signal, inject, signal} from '@angular/core';
import {ImsSnackbarService} from '../../../components/ims-snackbar';
import {SpecBuilderStore} from './spec-builder.store';
import {SPEC_LABELS} from './spec-builder.labels';
import {SpecCapture, SpecCaptureRequest} from './spec-builder.types';
import {SpecFilesService, fileBaseName} from './spec-files.service';
import {SpecSurfaceService} from './spec-surface.service';
import {SpecZoomService} from './spec-zoom.service';

const labels = SPEC_LABELS.capture;

/** Why a screenshot could not be taken. */
export type SpecCaptureFailure = 'unsupported' | 'cancelled' | 'wrongSurface' | 'failed';

/** Thrown by a {@link SpecScreenshotEngine} that cannot take the picture. */
export class SpecCaptureError extends Error {
    constructor(readonly reason: SpecCaptureFailure) {
        super(reason);
    }
}

/**
 * Takes the picture. The builder ships with tab capture; provide another
 * subclass, such as one built on a DOM-to-image library, to change how.
 */
export abstract class SpecScreenshotEngine {
    /** False when this browser cannot take pictures this way. */
    abstract readonly supported: boolean;
    /** True while the engine holds something between pictures, such as a shared tab. */
    abstract readonly active: Signal<boolean>;

    /** Gets ready to take pictures, asking the user for permission if it has to. */
    abstract prepare(): Promise<void>;

    /** Takes the picture. The builder has hidden its editing aids by the time this is called. */
    abstract capture(request: SpecCaptureRequest): Promise<SpecCapture>;

    /** Lets go of whatever the engine holds. */
    abstract stop(): void;
}

/** The last picture taken, ready to copy or download. */
export interface SpecScreenshot extends SpecCapture {
    /** Object URL of the image, for showing it. */
    readonly url: string;
    readonly width: number;
    readonly height: number;
    /** Zoom the page was drawn at when it was taken. */
    readonly zoomPercent: number;
}

/**
 * The screenshot flow: hide the editing aids, have the engine take the
 * picture, then keep it for the user to copy or download.
 */
@Injectable()
export class SpecScreenshotService {
    private readonly engine = inject(SpecScreenshotEngine);
    private readonly store = inject(SpecBuilderStore);
    private readonly surface = inject(SpecSurfaceService);
    private readonly zoom = inject(SpecZoomService);
    private readonly files = inject(SpecFilesService);
    private readonly snackbar = inject(ImsSnackbarService);
    private readonly screenshot = signal<SpecScreenshot | null>(null);
    private countdownTimer: ReturnType<typeof setInterval> | null = null;

    readonly supported = this.engine.supported;
    /** True while a shared tab is kept for the next picture. */
    readonly sharing = this.engine.active;
    readonly busy = signal(false);
    /** Seconds left before a delayed picture is taken; 0 when none is waiting. */
    readonly countdown = signal(0);
    readonly result = this.screenshot.asReadonly();

    constructor() {
        inject(DestroyRef).onDestroy(() => {
            this.engine.stop();
            this.stopCountdown();
            this.replaceResult(null);
        });
    }

    async capture(): Promise<void> {
        if (this.busy() || this.countdown() > 0) {
            return;
        }

        this.busy.set(true);
        try {
            await this.engine.prepare();
            await this.takePicture();
        } catch (error) {
            this.report(error);
        } finally {
            this.busy.set(false);
        }
    }

    /**
     * Takes the picture after a countdown, leaving time to open a list or a
     * popup in preview mode. Permission is asked first, so the prompt cannot
     * close what was opened during the countdown.
     */
    async captureAfter(seconds: number): Promise<void> {
        if (this.busy() || this.countdown() > 0) {
            return;
        }

        this.busy.set(true);
        try {
            await this.engine.prepare();
        } catch (error) {
            this.report(error);
            this.busy.set(false);
            return;
        }

        this.countdown.set(seconds);
        this.countdownTimer = setInterval(() => {
            const left = this.countdown() - 1;
            this.countdown.set(left);
            if (left <= 0) {
                this.stopCountdown();
                this.takePicture()
                    .catch((error: unknown) => this.report(error))
                    .finally(() => this.busy.set(false));
            }
        }, 1000);
    }

    async copyResult(): Promise<void> {
        const result = this.screenshot();
        if (!result) {
            return;
        }

        try {
            await navigator.clipboard.write([new ClipboardItem({[result.image.type]: result.image})]);
            this.snackbar.success(labels.copied).open();
        } catch {
            // No clipboard outside a secure context, or the browser refused.
            this.snackbar.warning(labels.copyFailed).open();
        }
    }

    downloadResult(): void {
        const result = this.screenshot();
        if (result) {
            this.files.download(result.image, `${fileBaseName(`${this.store.document().name} - ${this.store.page().name}`)}.png`);
        }
    }

    dismissResult(): void {
        this.replaceResult(null);
    }

    stopSharing(): void {
        this.engine.stop();
    }

    private async takePicture(): Promise<void> {
        const page = this.surface.pageElement();
        const viewport = this.surface.viewportElement();
        if (!page || !viewport) {
            throw new SpecCaptureError('failed');
        }

        this.store.capturing.set(true);
        try {
            const capture = await this.engine.capture({page, viewport});
            const size = await imageSize(capture.image);
            this.replaceResult({...capture, ...size, url: URL.createObjectURL(capture.image), zoomPercent: this.zoom.percent()});
            if (!capture.complete) {
                this.snackbar.warning(labels.partial).timeout(8000).open();
            }
        } finally {
            this.store.capturing.set(false);
        }
    }

    private replaceResult(next: SpecScreenshot | null): void {
        const previous = this.screenshot();
        if (previous) {
            URL.revokeObjectURL(previous.url);
        }
        this.screenshot.set(next);
    }

    private stopCountdown(): void {
        if (this.countdownTimer !== null) {
            clearInterval(this.countdownTimer);
            this.countdownTimer = null;
        }
        this.countdown.set(0);
    }

    private report(error: unknown): void {
        const reason = error instanceof SpecCaptureError ? error.reason : 'failed';
        if (reason === 'cancelled') {
            this.snackbar.info(labels.cancelled).open();
        } else {
            this.snackbar.warning(labels[reason]).timeout(8000).open();
        }
    }
}

/** Width and height of an image in pixels. */
async function imageSize(image: Blob): Promise<{width: number; height: number}> {
    const bitmap = await createImageBitmap(image);
    const size = {width: bitmap.width, height: bitmap.height};
    bitmap.close();
    return size;
}
