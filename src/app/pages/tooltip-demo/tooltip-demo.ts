import {ChangeDetectionStrategy, Component, Type, input, signal} from '@angular/core';
import {ImsButton, ImsButtonIcon} from '../../components/ims-button';
import {ImsIcon} from '../../components/ims-icon';
import {
    ImsPopover,
    ImsTooltip,
    ImsTooltipPosition,
    ImsTooltipSeverity
} from '../../components/ims-tooltip';

/**
 * Component content for the popover that takes a type rather than a template.
 *
 * Kept deliberately ordinary — signal inputs, no knowledge of the popover it is
 * rendered in — because that is the point being demonstrated: anything the
 * application already has can be put in one.
 */
@Component({
    selector: 'app-tooltip-demo-policy-card',
    standalone: true,
    template: `
        <strong class="tooltip-demo__card-title">{{ holder() }}</strong>
        <dl class="tooltip-demo__card-rows">
            <dt>מספר פוליסה</dt>
            <dd>{{ policyId() }}</dd>
            <dt>בתוקף עד</dt>
            <dd>{{ expiry() }}</dd>
        </dl>
        <a class="tooltip-demo__card-link" href="#" (click)="$event.preventDefault()">
            פתיחת הפוליסה
        </a>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class TooltipDemoPolicyCard {
    readonly policyId = input(0);
    readonly holder = input('');
    readonly expiry = input('');
}

@Component({
    selector: 'app-tooltip-demo',
    imports: [
        ImsButton,
        ImsButtonIcon,
        ImsIcon,
        ImsPopover,
        ImsTooltip
    ],
    templateUrl: './tooltip-demo.html',
    styleUrl: './tooltip-demo.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class TooltipDemo {
    readonly severities: readonly ImsTooltipSeverity[] = ['info', 'success', 'warning', 'danger'];

    readonly severityCaptions: Readonly<Record<ImsTooltipSeverity, string>> = {
        info: 'מידע',
        success: 'הצלחה',
        warning: 'אזהרה',
        danger: 'סכנה'
    };

    readonly positions: readonly ImsTooltipPosition[] = [
        'above',
        'below',
        'before',
        'after',
        'left',
        'right'
    ];

    /** The component handed to the popover that takes a type. */
    readonly policyCard: Type<unknown> = TooltipDemoPolicyCard;

    readonly policyCardInputs: Record<string, unknown> = {
        policyId: 48201,
        holder: 'דנה כהן',
        expiry: '31.12.2026'
    };

    /** Drives the example showing that a bound message can disable a tooltip. */
    readonly noteMessage = signal<string>('הסבר שאפשר לרוקן');

    clearNote(): void {
        this.noteMessage.set('');
    }

    restoreNote(): void {
        this.noteMessage.set('הסבר שאפשר לרוקן');
    }
}
