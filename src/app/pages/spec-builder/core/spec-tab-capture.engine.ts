import {DOCUMENT} from '@angular/common';
import {Injectable, inject, signal} from '@angular/core';
import {SpecCapture, SpecCaptureRequest} from './spec-builder.types';
import {SpecCaptureError, SpecScreenshotEngine} from './spec-screenshot.service';

/**
 * Time for the page to settle once sharing starts: the browser adds a
 * "sharing this tab" bar, which makes the viewport shorter.
 */
const SHARE_SETTLE_MS = 700;

/** Time for a repainted page to reach the captured video. */
const FRAME_DELAY_MS = 250;

/** Most the frame's proportions may differ from the viewport's before it is taken for another tab. */
const ASPECT_TOLERANCE = 0.03;

/**
 * Chrome's options for sharing a tab. Not all of them are in TypeScript's DOM
 * types yet, so they are declared here.
 */
interface TabShareOptions extends DisplayMediaStreamOptions {
    /** Offers the current tab in the share prompt. */
    preferCurrentTab?: boolean;
    /** Allows the current tab to be picked at all. */
    selfBrowserSurface?: 'include' | 'exclude';
    /** Hides the button that switches to another tab while sharing. */
    surfaceSwitching?: 'include' | 'exclude';
}

/**
 * Takes screenshots by sharing the current tab with itself, through the
 * browser's screen-capture API, and cutting the page out of a video frame.
 *
 * What it takes is exactly what is on screen, open lists and popups
 * included, and needs no library. The first picture asks the user to share
 * the tab; later ones reuse the share until the user stops it.
 *
 * Needs Chrome or Edge, and a secure context: https or localhost.
 */
@Injectable()
export class SpecTabCaptureEngine extends SpecScreenshotEngine {
    private readonly document = inject(DOCUMENT);
    private readonly sharing = signal(false);
    private stream: MediaStream | null = null;
    private video: HTMLVideoElement | null = null;

    readonly supported = typeof navigator !== 'undefined' && typeof navigator.mediaDevices?.getDisplayMedia === 'function';
    readonly active = this.sharing.asReadonly();

    async prepare(): Promise<void> {
        if (!this.supported) {
            throw new SpecCaptureError('unsupported');
        }
        if (this.stream) {
            return;
        }

        const options: TabShareOptions = {
            video: true,
            audio: false,
            preferCurrentTab: true,
            selfBrowserSurface: 'include',
            surfaceSwitching: 'exclude'
        };

        let stream: MediaStream;
        try {
            stream = await navigator.mediaDevices.getDisplayMedia(options);
        } catch (error) {
            throw new SpecCaptureError(error instanceof DOMException && error.name === 'NotAllowedError' ? 'cancelled' : 'failed');
        }

        const [track] = stream.getVideoTracks();
        const surface = (track?.getSettings() as {displaySurface?: string} | undefined)?.displaySurface;
        if (!track || surface !== 'browser') {
            stopTracks(stream);
            throw new SpecCaptureError('wrongSurface');
        }

        const video = this.document.createElement('video');
        video.muted = true;
        video.playsInline = true;
        video.srcObject = stream;
        await video.play();

        track.addEventListener('ended', () => this.stop());
        this.stream = stream;
        this.video = video;
        this.sharing.set(true);
        await delay(SHARE_SETTLE_MS);
    }

    async capture(request: SpecCaptureRequest): Promise<SpecCapture> {
        const video = this.video;
        const view = this.document.defaultView;
        if (!video || !view) {
            throw new SpecCaptureError('failed');
        }

        // Lets the browser paint the page without the editing aids, and that
        // paint reach the video.
        await nextPaint(view);
        await delay(FRAME_DELAY_MS);

        const scaleX = video.videoWidth / view.innerWidth;
        const scaleY = video.videoHeight / view.innerHeight;
        if (!scaleX || Math.abs(scaleX - scaleY) > scaleX * ASPECT_TOLERANCE) {
            // A frame that is not the shape of this tab's viewport is another tab.
            throw new SpecCaptureError('wrongSurface');
        }

        const page = request.page.getBoundingClientRect();
        const visible = intersect(page, request.viewport.getBoundingClientRect(), new DOMRect(0, 0, view.innerWidth, view.innerHeight));
        if (!visible) {
            throw new SpecCaptureError('failed');
        }

        const canvas = this.document.createElement('canvas');
        canvas.width = Math.round(visible.width * scaleX);
        canvas.height = Math.round(visible.height * scaleY);
        const context = canvas.getContext('2d');
        if (!context) {
            throw new SpecCaptureError('failed');
        }
        context.drawImage(video, visible.left * scaleX, visible.top * scaleY, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);

        return {
            image: await toPngBlob(canvas),
            complete: visible.width >= page.width - 1 && visible.height >= page.height - 1
        };
    }

    stop(): void {
        if (this.stream) {
            stopTracks(this.stream);
        }
        if (this.video) {
            this.video.srcObject = null;
        }
        this.stream = null;
        this.video = null;
        this.sharing.set(false);
    }
}

function stopTracks(stream: MediaStream): void {
    for (const track of stream.getTracks()) {
        track.stop();
    }
}

/** The part all the rects share, or null when they do not overlap. */
function intersect(...rects: DOMRect[]): DOMRect | null {
    const left = Math.max(...rects.map((rect) => rect.left));
    const top = Math.max(...rects.map((rect) => rect.top));
    const right = Math.min(...rects.map((rect) => rect.right));
    const bottom = Math.min(...rects.map((rect) => rect.bottom));
    return right > left && bottom > top ? new DOMRect(left, top, right - left, bottom - top) : null;
}

/**
 * Resolves after the browser has painted twice. Animation frames do not run
 * in a hidden tab, so a timeout resolves it there instead.
 */
function nextPaint(view: Window): Promise<void> {
    return new Promise((resolve) => {
        const fallback = setTimeout(resolve, 500);
        view.requestAnimationFrame(() => view.requestAnimationFrame(() => {
            clearTimeout(fallback);
            resolve();
        }));
    });
}

function delay(milliseconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function toPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => blob ? resolve(blob) : reject(new SpecCaptureError('failed')), 'image/png');
    });
}
