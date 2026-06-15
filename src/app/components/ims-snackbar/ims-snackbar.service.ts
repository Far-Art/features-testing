import {Overlay, OverlayRef} from '@angular/cdk/overlay';
import {ComponentPortal} from '@angular/cdk/portal';
import {Injectable, Injector, inject} from '@angular/core';
import {ImsSnackbarRef} from './ims-snackbar-ref';
import {ImsSnackbar} from './ims-snackbar';
import {
    IMS_SNACKBAR_CONFIG,
    IMS_SNACKBAR_DATA,
    ImsSnackbarConfig
} from './ims-snackbar.types';

const DEFAULT_CONFIG: Required<Omit<ImsSnackbarConfig, 'panelClass' | 'data'>> = {
    duration: 0,
    horizontalPosition: 'center',
    verticalPosition: 'bottom',
    direction: 'ltr',
    politeness: 'polite'
};

@Injectable({providedIn: 'root'})
export class ImsSnackbarService {
    private readonly overlay = inject(Overlay);
    private readonly injector = inject(Injector);
    private activeRef: ImsSnackbarRef | null = null;
    private dismissTimer: ReturnType<typeof setTimeout> | null = null;

    open<D = unknown>(
        message: string,
        action = '',
        config: ImsSnackbarConfig<D> = {}
    ): ImsSnackbarRef {
        this.dismiss();

        const resolvedConfig = {...DEFAULT_CONFIG, ...config};
        const overlayRef = this.createOverlay(resolvedConfig);
        const snackbarRef = new ImsSnackbarRef(overlayRef);
        const portalInjector = Injector.create({
            parent: this.injector,
            providers: [
                {provide: ImsSnackbarRef, useValue: snackbarRef},
                {provide: IMS_SNACKBAR_CONFIG, useValue: resolvedConfig},
                {provide: IMS_SNACKBAR_DATA, useValue: resolvedConfig.data}
            ]
        });
        const componentRef = overlayRef.attach(new ComponentPortal(ImsSnackbar, null, portalInjector));

        componentRef.instance.message = message;
        componentRef.instance.action = action;
        componentRef.changeDetectorRef.detectChanges();

        this.activeRef = snackbarRef;
        snackbarRef.afterDismissed().subscribe(() => {
            if (this.activeRef === snackbarRef) {
                this.activeRef = null;
            }
            this.clearDismissTimer();
        });

        if (resolvedConfig.duration > 0) {
            this.dismissTimer = setTimeout(() => snackbarRef.dismiss(), resolvedConfig.duration);
        }

        return snackbarRef;
    }

    dismiss(): void {
        this.clearDismissTimer();
        this.activeRef?.dismiss();
        this.activeRef = null;
    }

    private createOverlay(config: Required<Omit<ImsSnackbarConfig, 'panelClass' | 'data'>>
        & Pick<ImsSnackbarConfig, 'panelClass' | 'data'>): OverlayRef {
        const position = this.overlay.position().global();
        const edgeOffset = '1.5rem';

        if (config.verticalPosition === 'top') {
            position.top(edgeOffset);
        } else {
            position.bottom(edgeOffset);
        }

        if (config.horizontalPosition === 'center') {
            position.centerHorizontally();
        } else {
            const isLeft = config.horizontalPosition === 'start'
                ? config.direction === 'ltr'
                : config.direction === 'rtl';

            if (isLeft) {
                position.left(edgeOffset);
            } else {
                position.right(edgeOffset);
            }
        }

        return this.overlay.create({
            positionStrategy: position,
            scrollStrategy: this.overlay.scrollStrategies.noop(),
            panelClass: normalizePanelClass(config.panelClass)
        });
    }

    private clearDismissTimer(): void {
        if (this.dismissTimer === null) {
            return;
        }

        clearTimeout(this.dismissTimer);
        this.dismissTimer = null;
    }
}

function normalizePanelClass(panelClass: ImsSnackbarConfig['panelClass']): string[] {
    if (!panelClass) {
        return [];
    }

    return typeof panelClass === 'string' ? [panelClass] : [...panelClass];
}
