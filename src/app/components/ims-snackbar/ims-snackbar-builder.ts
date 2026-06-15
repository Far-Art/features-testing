import {ImsSnackbarRef} from './ims-snackbar-ref';
import {
    ImsSnackbarContent,
    ImsSnackbarGlobalConfig,
    ImsSnackbarHorizontalPosition,
    ImsSnackbarProgressConfig,
    ImsSnackbarProgressSource,
    ImsSnackbarReplaceStrategy,
    ImsSnackbarResolvedProgressConfig,
    ImsSnackbarSeverity,
    ImsSnackbarVerticalPosition
} from './ims-snackbar.types';

export interface ImsSnackbarBuilderHost {
    openFromBuilder(
        content: ImsSnackbarContent,
        severity: ImsSnackbarSeverity,
        timeout: number,
        verticalPosition: ImsSnackbarVerticalPosition,
        horizontalPosition: ImsSnackbarHorizontalPosition,
        dismissible: boolean,
        replaceStrategy: ImsSnackbarReplaceStrategy,
        data: unknown,
        progress: ImsSnackbarResolvedProgressConfig | null
    ): ImsSnackbarRef;
}

export class ImsSnackbarBuilder {
    private timeoutMillis: number;
    private verticalPosition: ImsSnackbarVerticalPosition;
    private horizontalPosition: ImsSnackbarHorizontalPosition;
    private isDismissible = true;
    private strategy: ImsSnackbarReplaceStrategy;
    private customData: unknown;
    private progressConfig: ImsSnackbarResolvedProgressConfig | null = null;

    constructor(
        private readonly host: ImsSnackbarBuilderHost,
        private readonly content: ImsSnackbarContent,
        private readonly severity: ImsSnackbarSeverity,
        globalConfig: ImsSnackbarGlobalConfig
    ) {
        this.timeoutMillis = globalConfig.timeout;
        this.strategy = globalConfig.replaceStrategy;
        this.verticalPosition = globalConfig.verticalPosition;
        this.horizontalPosition = globalConfig.horizontalPosition;
    }

    timeout(milliseconds: number): this {
        if (!Number.isFinite(milliseconds) || milliseconds < 0) {
            throw new RangeError('Snackbar timeout must be a finite, non-negative number.');
        }

        this.timeoutMillis = milliseconds;
        return this;
    }

    data<D>(data: D): this {
        this.customData = data;
        return this;
    }

    dismissible(dismissible: boolean): this {
        this.isDismissible = dismissible;
        return this;
    }

    progress(
        source: ImsSnackbarProgressSource | null = null,
        config: ImsSnackbarProgressConfig = {}
    ): this {
        const closeDelay = config.closeDelay ?? 5000;
        const settleDuration = config.settleDuration ?? 2000;
        if (!Number.isFinite(closeDelay) || closeDelay < 0) {
            throw new RangeError(
                'Snackbar progress close delay must be a finite, non-negative number.'
            );
        }
        if (!Number.isFinite(settleDuration) || settleDuration < 0) {
            throw new RangeError(
                'Snackbar progress settle duration must be a finite, non-negative number.'
            );
        }

        this.progressConfig = {
            source,
            closeDelay,
            settleDuration,
            cancelOnDismiss: config.cancelOnDismiss ?? false
        };
        return this;
    }

    replaceStrategy(strategy: ImsSnackbarReplaceStrategy): this {
        this.strategy = strategy;
        return this;
    }

    position(
        verticalPosition: ImsSnackbarVerticalPosition,
        horizontalPosition: ImsSnackbarHorizontalPosition = 'center'
    ): this {
        this.verticalPosition = verticalPosition;
        this.horizontalPosition = horizontalPosition;
        return this;
    }

    open(): ImsSnackbarRef {
        return this.host.openFromBuilder(
            this.content,
            this.severity,
            this.timeoutMillis,
            this.verticalPosition,
            this.horizontalPosition,
            this.isDismissible,
            this.strategy,
            this.customData,
            this.progressConfig
        );
    }
}
