import {JsonPipe} from '@angular/common';
import {ChangeDetectionStrategy, Component, signal} from '@angular/core';
import {FormControl, ReactiveFormsModule, ValidationErrors, Validators} from '@angular/forms';
import {
    ImsDatepicker,
    ImsDatepickerDateValueHandlerDirective,
    ImsDatepickerValue
} from '../../components/ims-datepicker';
import {
    ImsErrorMapper,
    ImsErrorPopoverDirective
} from '../../components/ims-error-popover';
import {ReadonlyDirective} from '../../shared/readonly.directive';

type NativeDatepickerValue = ImsDatepickerValue<Date>;

@Component({
    selector: 'app-error-popover-demo',
    imports: [
        JsonPipe,
        ReactiveFormsModule,
        ImsDatepicker,
        ImsDatepickerDateValueHandlerDirective,
        ImsErrorPopoverDirective,
        ReadonlyDirective
    ],
    templateUrl: './error-popover-demo.html',
    styleUrl: './error-popover-demo.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ErrorPopoverDemo {
    readonly emailControl = new FormControl('demo@ims.co.il', {
        nonNullable: true,
        validators: [Validators.required, Validators.email]
    });
    readonly policyControl = new FormControl('POL-2026', {nonNullable: true});
    readonly stateControl = new FormControl('ערך תקין', {
        nonNullable: true,
        validators: [Validators.required]
    });
    readonly dayControl = new FormControl<NativeDatepickerValue>(utcDate(2026, 6, 7));
    readonly monthControl = new FormControl<NativeDatepickerValue>(Date.UTC(2026, 5, 30));

    readonly serverErrors = signal<ValidationErrors | null>(null);
    readonly popoverDisabled = signal(false);
    readonly readonlyEnabled = signal(false);

    readonly policyMapper: ImsErrorMapper = {
        policyPeriod: 'לא ניתן להפיק פוליסה לתקופה {period}.'
    };
    readonly signalMapper: ImsErrorMapper = {
        maintenanceWindow: 'השירות אינו זמין בתקופה {period}.'
    };

    readonly minimumDate = utcDate(2020, 1, 1);
    readonly maximumDate = utcDate(2035, 12, 31);

    /** Applies one of the deterministic validation states to the email example. */
    setEmailState(state: 'empty' | 'invalid' | 'valid'): void {
        const values = {
            empty: '',
            invalid: 'demo@ims',
            valid: 'demo@ims.co.il'
        } as const;
        this.emailControl.setValue(values[state]);
    }

    /** Adds a custom payload-bearing error to the explicitly supplied control. */
    showPolicyError(): void {
        this.policyControl.setErrors({
            policyPeriod: {period: 'ינואר–יוני 2026'}
        });
    }

    /** Clears the custom error from the explicitly supplied control. */
    clearPolicyError(): void {
        this.policyControl.setErrors(null);
    }

    /** Shows two built-in mappings as separate popover rows. */
    showMultipleSignalErrors(): void {
        this.serverErrors.set({
            required: true,
            minlength: {requiredLength: 8, actualLength: 0}
        });
    }

    /** Replaces visible signal errors and demonstrates payload interpolation. */
    replaceSignalErrors(): void {
        this.serverErrors.set({
            maintenanceWindow: {period: 'אוגוסט 2026'},
            maxlength: {requiredLength: 12, actualLength: 17}
        });
    }

    /** Removes all errors from the signal-driven example. */
    clearSignalErrors(): void {
        this.serverErrors.set(null);
    }

    /** Makes the state example invalid so suppression modes can be tested. */
    makeStateControlInvalid(): void {
        this.stateControl.setValue('');
    }

    /** Restores a valid value to the state example. */
    makeStateControlValid(): void {
        this.stateControl.setValue('ערך תקין');
    }

    /** Toggles the directive's explicit disabled input. */
    togglePopoverDisabled(): void {
        this.popoverDisabled.update((disabled) => !disabled);
    }

    /** Toggles disabled state through the Angular control API. */
    toggleControlDisabled(): void {
        if (this.stateControl.disabled) {
            this.stateControl.enable();
        } else {
            this.stateControl.disable();
        }
    }

    /** Toggles the inherited IMS readonly state around the example. */
    toggleReadonly(): void {
        this.readonlyEnabled.update((readonly) => !readonly);
    }

    /** Selects a day before the configured datepicker minimum. */
    showDayBeforeMinimum(): void {
        this.dayControl.setValue(utcDate(2019, 12, 31));
    }

    /** Restores a valid day value. */
    restoreValidDay(): void {
        this.dayControl.setValue(utcDate(2026, 6, 7));
    }

    /** Selects a month after the configured datepicker maximum. */
    showMonthAfterMaximum(): void {
        this.monthControl.setValue(Date.UTC(2036, 0, 31));
    }

    /** Restores a valid month value. */
    restoreValidMonth(): void {
        this.monthControl.setValue(Date.UTC(2026, 5, 30));
    }
}

/** Creates a native Date at UTC midnight without local-time ambiguity. */
function utcDate(year: number, month: number, day: number): Date {
    return new Date(Date.UTC(year, month - 1, day));
}
