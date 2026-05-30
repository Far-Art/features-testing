type ViewTransitionDocument = Document & {
    startViewTransition?: (updateCallback: () => void) => unknown;
};

export function runViewTransition(update: () => void, afterUpdate?: () => void): void {
    if (typeof document === 'undefined' || typeof window === 'undefined') {
        update();
        return;
    }

    const startViewTransition = (document as ViewTransitionDocument).startViewTransition;
    if (!startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        update();
        return;
    }

    startViewTransition.call(document, () => {
        update();
        afterUpdate?.();
    });
}
