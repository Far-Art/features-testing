type ViewTransitionDocument = Document & {
    startViewTransition?: (updateCallback: () => void) => {
        readonly finished?: Promise<unknown>;
    };
};

type ViewTransitionElement = HTMLElement & {
    startViewTransition?: (options: {
        callback: () => void;
        update: () => void;
    }) => {
        readonly finished?: Promise<unknown>;
    };
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

    const transition = startViewTransition.call(document, () => {
        update();
        afterUpdate?.();
    });
    void transition.finished?.catch(() => undefined);
}

export function runScopedViewTransition(
    element: HTMLElement | undefined,
    update: () => void,
    afterUpdate?: () => void
): void {
    if (typeof window === 'undefined') {
        update();
        return;
    }

    const startViewTransition = (element as ViewTransitionElement | undefined)
        ?.startViewTransition;
    if (!startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        update();
        return;
    }

    const updateCallback = () => {
        update();
        afterUpdate?.();
    };
    const transition = startViewTransition.call(element, {
        callback: updateCallback,
        update: updateCallback
    });
    void transition.finished?.catch(() => undefined);
}
