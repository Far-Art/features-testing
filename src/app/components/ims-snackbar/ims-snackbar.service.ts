import {Overlay, OverlayRef} from '@angular/cdk/overlay';
import {ComponentPortal} from '@angular/cdk/portal';
import {DOCUMENT} from '@angular/common';
import {
    DestroyRef,
    Injectable,
    Injector,
    Type,
    inject
} from '@angular/core';
import {
    ImsSnackbarBuilder,
    ImsSnackbarBuilderHost
} from './ims-snackbar-builder';
import {ImsSnackbarRef} from './ims-snackbar-ref';
import {ImsSnackbar} from './ims-snackbar';
import {ImsSnackbarStackControl} from './ims-snackbar-stack-control';
import {
    IMS_SNACKBAR_CONFIG,
    IMS_SNACKBAR_DATA,
    IMS_SNACKBAR_GLOBAL_CONFIG,
    ImsSnackbarConfig,
    ImsSnackbarContent,
    ImsSnackbarHorizontalPosition,
    ImsSnackbarKeyStrategy,
    ImsSnackbarResolvedProgressConfig,
    ImsSnackbarReplaceStrategy,
    ImsSnackbarSeverity,
    ImsSnackbarVerticalPosition,
    ImsSnackbarVisualStyle
} from './ims-snackbar.types';

interface ActiveSnackbar {
    readonly ref: ImsSnackbarRef;
    readonly overlayRef: OverlayRef;
    readonly config: ImsSnackbarConfig;
    readonly groupKey: string;
    readonly mouseEnterListener: (event: MouseEvent) => void;
    readonly mouseLeaveListener: (event: MouseEvent) => void;
    dismissTimer: ReturnType<typeof setTimeout> | null;
    timerStartedAt: number | null;
    remainingTimeout: number;
}

interface StackControl {
    readonly overlayRef: OverlayRef;
    readonly mouseEnterListener: (event: MouseEvent) => void;
    readonly mouseLeaveListener: (event: MouseEvent) => void;
    enterFrame: number | null;
    leaveTimer: ReturnType<typeof setTimeout> | null;
}

const STACK_COLLAPSED_OFFSET_PX = 8;
const STACK_EXPANDED_GAP_PX = 12;
const STACK_MIN_OPACITY = 0.35;
const STACK_OPACITY_STEP = 0.16;
const STACK_COLLAPSE_DELAY_MS = 280;
const STACK_HOVER_TOLERANCE_PX = 4;
const STACK_CONTROL_FADE_MS = 160;

@Injectable({providedIn: 'root'})
export class ImsSnackbarService implements ImsSnackbarBuilderHost {
    private readonly overlay = inject(Overlay);
    private readonly injector = inject(Injector);
    private readonly document = inject(DOCUMENT);
    private readonly destroyRef = inject(DestroyRef);
    private readonly globalConfig = inject(IMS_SNACKBAR_GLOBAL_CONFIG);
    private readonly activeSnackbars: ActiveSnackbar[] = [];
    private readonly keyedSnackbars = new Map<string, ImsSnackbarRef>();
    private readonly expandedGroups = new Set<string>();
    private readonly dismissingGroups = new Set<string>();
    private readonly dismissingGroupRefs = new Map<string, Set<ImsSnackbarRef>>();
    private readonly collapseTimers = new Map<string, ReturnType<typeof setTimeout>>();
    private readonly stackControls = new Map<string, StackControl>();
    private pointerPosition: {readonly x: number; readonly y: number} | null = null;

    constructor() {
        const pointerMoveListener = (event: PointerEvent) => {
            this.pointerPosition = {x: event.clientX, y: event.clientY};
        };

        this.document.addEventListener('pointermove', pointerMoveListener, {passive: true});
        this.destroyRef.onDestroy(() => {
            this.document.removeEventListener('pointermove', pointerMoveListener);
        });
    }

    info(content: string | Type<unknown>): ImsSnackbarBuilder {
        return this.createBuilder(content, 'info');
    }

    success(content: string | Type<unknown>): ImsSnackbarBuilder {
        return this.createBuilder(content, 'success');
    }

    warning(content: string | Type<unknown>): ImsSnackbarBuilder {
        return this.createBuilder(content, 'warning');
    }

    danger(content: string | Type<unknown>): ImsSnackbarBuilder {
        return this.createBuilder(content, 'danger');
    }

    openFromBuilder(
        content: ImsSnackbarContent,
        severity: ImsSnackbarSeverity,
        timeout: number,
        verticalPosition: ImsSnackbarVerticalPosition,
        horizontalPosition: ImsSnackbarHorizontalPosition,
        dismissible: boolean,
        replaceStrategy: ImsSnackbarReplaceStrategy,
        data: unknown,
        progress: ImsSnackbarResolvedProgressConfig | null,
        key: string | null,
        keyStrategy: ImsSnackbarKeyStrategy,
        title: string,
        visualStyle: ImsSnackbarVisualStyle
    ): ImsSnackbarRef {
        if (key !== null) {
            const existing = this.keyedSnackbars.get(key);
            if (existing) {
                if (keyStrategy === 'ignore') {
                    return existing;
                }
                if (keyStrategy === 'update') {
                    if (typeof content === 'string') {
                        existing.updateMessage(content);
                    }
                    existing.updateSeverity(severity);
                    return existing;
                }
                existing.dismiss();
            }
        }

        if (replaceStrategy === 'replace') {
            this.dismiss();
        }

        const config: ImsSnackbarConfig = {
            timeout,
            verticalPosition,
            horizontalPosition,
            severity,
            dismissible,
            replaceStrategy,
            visualStyle,
            direction: this.resolveDirection(),
            politeness: severity === 'danger' ? 'assertive' : 'polite',
            data,
            progress: progress ?? undefined
        };
        const overlayRef = this.createOverlay(config);
        const snackbarRef = new ImsSnackbarRef(overlayRef, progress, severity);
        const portalInjector = Injector.create({
            parent: this.injector,
            providers: [
                {provide: ImsSnackbarRef, useValue: snackbarRef},
                {provide: IMS_SNACKBAR_CONFIG, useValue: config},
                {provide: IMS_SNACKBAR_DATA, useValue: config.data}
            ]
        });
        const componentRef = overlayRef.attach(new ComponentPortal(ImsSnackbar, null, portalInjector));

        snackbarRef.title.set(title);
        if (typeof content === 'string') {
            snackbarRef.message.set(content);
        } else {
            componentRef.instance.contentComponent = content;
        }
        componentRef.changeDetectorRef.detectChanges();

        const groupKey = this.getGroupKey(config);
        const mouseEnterListener = (event: MouseEvent) => {
            this.capturePointer(event);
            this.handleGroupEnter(groupKey);
        };
        const mouseLeaveListener = (event: MouseEvent) => {
            this.capturePointer(event);
            this.scheduleGroupCollapse(groupKey);
        };
        const activeSnackbar: ActiveSnackbar = {
            ref: snackbarRef,
            overlayRef,
            config,
            groupKey,
            mouseEnterListener,
            mouseLeaveListener,
            dismissTimer: null,
            timerStartedAt: null,
            remainingTimeout: config.timeout
        };
        overlayRef.overlayElement.classList.add('ims-snackbar-stack-item');
        overlayRef.overlayElement.addEventListener('mouseenter', mouseEnterListener);
        overlayRef.overlayElement.addEventListener('mouseleave', mouseLeaveListener);
        this.activeSnackbars.push(activeSnackbar);
        snackbarRef.onDismiss().subscribe(() => this.remove(activeSnackbar));

        if (key !== null) {
            this.keyedSnackbars.set(key, snackbarRef);
            snackbarRef.onDismiss().subscribe(() => {
                if (this.keyedSnackbars.get(key) === snackbarRef) {
                    this.keyedSnackbars.delete(key);
                }
            });
        }

        this.enforceStackLimit(groupKey);
        this.startSnackbarTimer(activeSnackbar);

        this.reflowStacks();
        queueMicrotask(() => this.reflowStacks());

        return snackbarRef;
    }

    dismiss(): void {
        this.activeSnackbars
            .filter(({ref}) => !ref.isProgressPending())
            .forEach(({ref}) => ref.dismiss());
    }

    private createBuilder(
        content: ImsSnackbarContent,
        severity: ImsSnackbarSeverity
    ): ImsSnackbarBuilder {
        return new ImsSnackbarBuilder(this, content, severity, this.globalConfig);
    }

    private createOverlay(config: ImsSnackbarConfig): OverlayRef {
        return this.overlay.create({
            positionStrategy: this.createPositionStrategy(config, 0),
            scrollStrategy: this.overlay.scrollStrategies.noop(),
            panelClass: [
                `ims-snackbar-overlay--${config.severity}`,
                `ims-snackbar-stack-item--${config.verticalPosition}`,
                ...normalizePanelClass(config.panelClass)
            ]
        });
    }

    private createPositionStrategy(config: ImsSnackbarConfig, stackOffset: number) {
        const position = this.overlay.position().global();
        const verticalEdgeOffset = `${24 + stackOffset}px`;
        const horizontalEdgeOffset = '24px';

        if (config.verticalPosition === 'top') {
            position.top(verticalEdgeOffset);
        } else {
            position.bottom(verticalEdgeOffset);
        }

        if (config.horizontalPosition === 'center') {
            position.centerHorizontally();
        } else {
            const isLeft = config.horizontalPosition === 'start'
                ? config.direction === 'ltr'
                : config.direction === 'rtl';

            if (isLeft) {
                position.left(horizontalEdgeOffset);
            } else {
                position.right(horizontalEdgeOffset);
            }
        }

        return position;
    }

    private resolveDirection(): 'ltr' | 'rtl' {
        return this.document.documentElement.dir === 'rtl'
            || this.document.body.dir === 'rtl'
            ? 'rtl'
            : 'ltr';
    }

    private remove(activeSnackbar: ActiveSnackbar): void {
        const index = this.activeSnackbars.indexOf(activeSnackbar);
        if (index < 0) {
            return;
        }

        if (activeSnackbar.dismissTimer !== null) {
            clearTimeout(activeSnackbar.dismissTimer);
            activeSnackbar.dismissTimer = null;
        }
        activeSnackbar.timerStartedAt = null;

        activeSnackbar.overlayRef.overlayElement.removeEventListener(
            'mouseenter',
            activeSnackbar.mouseEnterListener
        );
        activeSnackbar.overlayRef.overlayElement.removeEventListener(
            'mouseleave',
            activeSnackbar.mouseLeaveListener
        );
        this.activeSnackbars.splice(index, 1);
        const groupKey = activeSnackbar.groupKey;
        const dismissingRefs = this.dismissingGroupRefs.get(groupKey);
        dismissingRefs?.delete(activeSnackbar.ref);
        if (dismissingRefs?.size === 0) {
            this.dismissingGroupRefs.delete(groupKey);
            this.dismissingGroups.delete(groupKey);
        }
        const groupStillExists = this.activeSnackbars.some(
            (snackbar) => snackbar.groupKey === groupKey
        );
        const wasExpanded = this.expandedGroups.has(groupKey);

        this.clearGroupCollapseTimer(groupKey);

        if (!groupStillExists) {
            this.expandedGroups.delete(groupKey);
            this.disposeStackControl(groupKey);
        } else if (!wasExpanded) {
            this.resumeGroupTimers(groupKey);
        }

        this.reflowStacks();
        if (groupStillExists && wasExpanded) {
            this.scheduleGroupCollapse(groupKey);
        }
    }

    private reflowStacks(): void {
        const groups = new Map<string, ActiveSnackbar[]>();

        for (const snackbar of this.activeSnackbars) {
            const group = groups.get(snackbar.groupKey) ?? [];
            group.push(snackbar);
            groups.set(snackbar.groupKey, group);
        }

        for (const [groupKey, group] of groups) {
            const expanded = this.expandedGroups.has(groupKey);
            let stackOffset = 0;
            const newestFirst = [...group].reverse();

            newestFirst.forEach((snackbar, age) => {
                this.applyStackAppearance(
                    snackbar,
                    age,
                    expanded,
                    newestFirst.length,
                    stackOffset
                );
                stackOffset += expanded
                    ? snackbar.overlayRef.overlayElement.offsetHeight
                        + STACK_EXPANDED_GAP_PX
                    : STACK_COLLAPSED_OFFSET_PX;
            });

            this.updateStackControl(
                groupKey,
                newestFirst[0],
                expanded
                    && newestFirst.length > 1
                    && newestFirst.some(
                        (snackbar) => !snackbar.ref.isProgressPending()
                    ),
            );
        }
    }

    private applyStackAppearance(
        snackbar: ActiveSnackbar,
        age: number,
        expanded: boolean,
        groupSize: number,
        stackOffset: number
    ): void {
        const element = snackbar.overlayRef.overlayElement;
        const direction = snackbar.config.verticalPosition === 'bottom' ? -1 : 1;
        element.style.opacity = expanded
            ? '1'
            : String(Math.max(STACK_MIN_OPACITY, 1 - age * STACK_OPACITY_STEP));
        element.style.zIndex = String(1000 + groupSize - age);
        element.style.setProperty(
            '--ims-snackbar-stack-offset',
            `${direction * stackOffset}px`
        );
        element.style.setProperty('--ims-snackbar-stack-scale', expanded
            ? '1'
            : String(Math.max(0.94, 1 - age * 0.015))
        );
        element.style.setProperty(
            '--ims-snackbar-stack-origin',
            snackbar.config.verticalPosition === 'bottom' ? 'bottom center' : 'top center'
        );
        element.classList.toggle('ims-snackbar-stack-item--stacked', groupSize > 1);
        element.classList.toggle('ims-snackbar-stack-item--expanded', expanded);
    }

    private handleGroupEnter(groupKey: string): void {
        if (this.dismissingGroups.has(groupKey)) {
            return;
        }

        this.clearGroupCollapseTimer(groupKey);
        this.pauseGroupTimers(groupKey);
        if (this.expandedGroups.has(groupKey)) {
            return;
        }

        this.expandedGroups.add(groupKey);
        this.reflowStacks();
    }

    private scheduleGroupCollapse(groupKey: string): void {
        this.clearGroupCollapseTimer(groupKey);
        this.collapseTimers.set(groupKey, setTimeout(() => {
            this.collapseTimers.delete(groupKey);
            if (this.isPointerInsideGroup(groupKey)) {
                return;
            }

            if (this.expandedGroups.delete(groupKey)) {
                this.reflowStacks();
            }
            this.resumeGroupTimers(groupKey);
        }, STACK_COLLAPSE_DELAY_MS));
    }

    private clearGroupCollapseTimer(groupKey: string): void {
        const timer = this.collapseTimers.get(groupKey);
        if (timer === undefined) {
            return;
        }

        clearTimeout(timer);
        this.collapseTimers.delete(groupKey);
    }

    private dismissGroup(groupKey: string): void {
        if (this.dismissingGroups.has(groupKey)) {
            return;
        }

        const group = this.activeSnackbars.filter(
            (snackbar) => snackbar.groupKey === groupKey
                && !snackbar.ref.isProgressPending()
        );
        if (group.length === 0) {
            return;
        }

        this.dismissingGroups.add(groupKey);
        this.clearGroupCollapseTimer(groupKey);
        this.disposeStackControl(groupKey);
        this.dismissingGroupRefs.set(
            groupKey,
            new Set(group.map((snackbar) => snackbar.ref))
        );
        group.forEach((snackbar) => snackbar.ref.dismiss());
    }

    private updateStackControl(
        groupKey: string,
        newestSnackbar: ActiveSnackbar,
        visible: boolean
    ): void {
        if (this.dismissingGroups.has(groupKey)) {
            this.disposeStackControl(groupKey);
            return;
        }

        if (!visible) {
            this.disposeStackControl(groupKey);
            return;
        }

        let control = this.stackControls.get(groupKey);
        if (!control) {
            const overlayRef = this.overlay.create({
                positionStrategy: this.overlay.position().global().top('0').left('0'),
                scrollStrategy: this.overlay.scrollStrategies.noop(),
                panelClass: 'ims-snackbar-stack-control-pane'
            });
            overlayRef.overlayElement.style.visibility = 'hidden';
            overlayRef.overlayElement.classList.add(
                'ims-snackbar-stack-control-pane--entering'
            );
            const componentRef = overlayRef.attach(
                new ComponentPortal(ImsSnackbarStackControl, null, this.injector)
            );
            componentRef.instance.dismissAll = () => this.dismissGroup(groupKey);
            componentRef.changeDetectorRef.detectChanges();

            const mouseEnterListener = (event: MouseEvent) => {
                this.capturePointer(event);
                this.handleGroupEnter(groupKey);
            };
            const mouseLeaveListener = (event: MouseEvent) => {
                this.capturePointer(event);
                this.scheduleGroupCollapse(groupKey);
            };
            overlayRef.overlayElement.addEventListener('mouseenter', mouseEnterListener);
            overlayRef.overlayElement.addEventListener('mouseleave', mouseLeaveListener);
            control = {
                overlayRef,
                mouseEnterListener,
                mouseLeaveListener,
                enterFrame: null,
                leaveTimer: null
            };
            this.stackControls.set(groupKey, control);
        }

        if (control.leaveTimer !== null) {
            clearTimeout(control.leaveTimer);
            control.leaveTimer = null;
        }
        control.overlayRef.overlayElement.classList.remove(
            'ims-snackbar-stack-control-pane--leaving'
        );
        this.positionStackControl(control.overlayRef, newestSnackbar.overlayRef);
        control.overlayRef.overlayElement.style.visibility = 'visible';
        if (
            control.enterFrame === null
            && control.overlayRef.overlayElement.classList.contains(
                'ims-snackbar-stack-control-pane--entering'
            )
        ) {
            control.enterFrame = requestAnimationFrame(() => {
                control!.enterFrame = requestAnimationFrame(() => {
                    control!.enterFrame = null;
                    control!.overlayRef.overlayElement.classList.remove(
                        'ims-snackbar-stack-control-pane--entering'
                    );
                });
            });
        }
    }

    private positionStackControl(
        controlOverlayRef: OverlayRef,
        snackbarOverlayRef: OverlayRef
    ): void {
        const snackbarRect = snackbarOverlayRef.overlayElement.getBoundingClientRect();
        const controlElement = controlOverlayRef.overlayElement;
        const controlWidth = controlElement.offsetWidth;
        const controlHeight = controlElement.offsetHeight;
        const gap = 12;
        const viewportWidth = this.document.documentElement.clientWidth;
        const availableLeft = snackbarRect.left;
        const availableRight = viewportWidth - snackbarRect.right;
        const placeOnLeft = availableLeft >= controlWidth + gap
            && (availableLeft >= availableRight || availableRight < controlWidth + gap);
        const left = placeOnLeft
            ? snackbarRect.left - controlWidth - gap
            : snackbarRect.right + gap;
        const top = snackbarRect.top + (snackbarRect.height - controlHeight) / 2;
        const constrainedLeft = Math.max(8, Math.min(
            left,
            viewportWidth - controlWidth - 8
        ));
        const constrainedTop = Math.max(8, top);
        const positionStrategy = this.overlay.position()
            .global()
            .top(`${constrainedTop}px`)
            .left(`${constrainedLeft}px`);

        controlOverlayRef.updatePositionStrategy(positionStrategy);
    }

    private disposeStackControl(groupKey: string): void {
        const control = this.stackControls.get(groupKey);
        if (!control || control.leaveTimer !== null) {
            return;
        }

        if (control.enterFrame !== null) {
            cancelAnimationFrame(control.enterFrame);
            control.enterFrame = null;
        }
        control.overlayRef.overlayElement.classList.remove(
            'ims-snackbar-stack-control-pane--entering'
        );
        control.overlayRef.overlayElement.classList.add(
            'ims-snackbar-stack-control-pane--leaving'
        );
        control.leaveTimer = setTimeout(() => {
            control.leaveTimer = null;
            this.finalizeStackControlDisposal(groupKey, control);
        }, STACK_CONTROL_FADE_MS);
    }

    private finalizeStackControlDisposal(
        groupKey: string,
        control: StackControl
    ): void {
        if (this.stackControls.get(groupKey) !== control) {
            return;
        }

        control.overlayRef.overlayElement.removeEventListener(
            'mouseenter',
            control.mouseEnterListener
        );
        control.overlayRef.overlayElement.removeEventListener(
            'mouseleave',
            control.mouseLeaveListener
        );
        control.overlayRef.dispose();
        this.stackControls.delete(groupKey);
    }

    private isPointerInsideGroup(groupKey: string): boolean {
        const pointer = this.pointerPosition;
        if (!pointer) {
            return false;
        }

        const group = this.activeSnackbars.filter(
            (snackbar) => snackbar.groupKey === groupKey
        );
        if (group.length === 0) {
            return false;
        }

        const rects = group.map(
            (snackbar) => snackbar.overlayRef.overlayElement.getBoundingClientRect()
        );
        const control = this.stackControls.get(groupKey);
        if (control) {
            rects.push(control.overlayRef.overlayElement.getBoundingClientRect());
        }
        const left = Math.min(...rects.map((rect) => rect.left))
            - STACK_HOVER_TOLERANCE_PX;
        const right = Math.max(...rects.map((rect) => rect.right))
            + STACK_HOVER_TOLERANCE_PX;
        const top = Math.min(...rects.map((rect) => rect.top))
            - STACK_HOVER_TOLERANCE_PX;
        const bottom = Math.max(...rects.map((rect) => rect.bottom))
            + STACK_HOVER_TOLERANCE_PX;

        return pointer.x >= left
            && pointer.x <= right
            && pointer.y >= top
            && pointer.y <= bottom;
    }

    private capturePointer(event: MouseEvent): void {
        this.pointerPosition = {x: event.clientX, y: event.clientY};
    }

    private enforceStackLimit(groupKey: string): void {
        const group = this.activeSnackbars.filter(
            (snackbar) => snackbar.groupKey === groupKey
        );

        while (group.length > this.globalConfig.stackSize) {
            const oldestDismissibleIndex = group.findIndex(
                (snackbar) => !snackbar.ref.isProgressPending()
            );
            if (oldestDismissibleIndex < 0) {
                return;
            }

            const [oldestDismissible] = group.splice(oldestDismissibleIndex, 1);
            oldestDismissible.ref.dismiss();
        }
    }

    private startSnackbarTimer(snackbar: ActiveSnackbar): void {
        if (
            snackbar.ref.isProgress()
            ||
            snackbar.remainingTimeout <= 0
            || snackbar.dismissTimer !== null
            || this.expandedGroups.has(snackbar.groupKey)
        ) {
            return;
        }

        snackbar.timerStartedAt = Date.now();
        snackbar.dismissTimer = setTimeout(() => {
            snackbar.dismissTimer = null;
            snackbar.timerStartedAt = null;
            snackbar.remainingTimeout = 0;
            snackbar.ref.dismiss();
        }, snackbar.remainingTimeout);
    }

    private pauseGroupTimers(groupKey: string): void {
        for (const snackbar of this.activeSnackbars) {
            if (snackbar.groupKey !== groupKey) {
                continue;
            }

            if (snackbar.dismissTimer !== null && snackbar.timerStartedAt !== null) {
                clearTimeout(snackbar.dismissTimer);
                snackbar.dismissTimer = null;
                snackbar.remainingTimeout = Math.max(
                    0,
                    snackbar.remainingTimeout - (Date.now() - snackbar.timerStartedAt)
                );
                snackbar.timerStartedAt = null;
            }

            snackbar.ref.pauseSettle();
        }
    }

    private resumeGroupTimers(groupKey: string): void {
        for (const snackbar of this.activeSnackbars) {
            if (snackbar.groupKey === groupKey) {
                this.startSnackbarTimer(snackbar);
                snackbar.ref.resumeSettle();
            }
        }
    }

    private getGroupKey(config: ImsSnackbarConfig): string {
        return [
            config.verticalPosition,
            config.horizontalPosition,
            config.direction
        ].join(':');
    }
}

function normalizePanelClass(panelClass: ImsSnackbarConfig['panelClass']): string[] {
    if (!panelClass) {
        return [];
    }

    return typeof panelClass === 'string' ? [panelClass] : [...panelClass];
}
