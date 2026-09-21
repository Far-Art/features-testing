import {ChangeDetectionStrategy, Component, computed, signal} from '@angular/core';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {ImsButton, ImsButtonIcon} from '../../components/ims-button';
import {ImsCheckbox} from '../../components/ims-checkbox';
import {ImsIcon} from '../../components/ims-icon';
import {ImsPanel, ImsPanelHeader, ImsPanelHeaderActions, ImsPanelSeverity} from '../../components/ims-panel';
import {ImsRadio, ImsRadioGroup} from '../../components/ims-radio';
import {ImsOption, ImsSelect} from '../../components/ims-select';

interface PanelDemoYear {
    readonly value: number;
    readonly label: string;
}

interface PanelDemoViewMode {
    readonly value: string;
    readonly label: string;
}

@Component({
    selector: 'app-panel-demo',
    imports: [
        ReactiveFormsModule,
        ImsPanel,
        ImsPanelHeader,
        ImsPanelHeaderActions,
        ImsButton,
        ImsButtonIcon,
        ImsCheckbox,
        ImsIcon,
        ImsRadioGroup,
        ImsRadio,
        ImsSelect,
        ImsOption
    ],
    templateUrl: './panel-demo.html',
    styleUrl: './panel-demo.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class PanelDemo {
    // The five severities in the order the stylesheet declares them, so the row
    // on screen reads the same way the file does.
    readonly severities: readonly ImsPanelSeverity[] = ['neutral', 'info', 'success', 'warning', 'danger'];

    readonly severityCaptions: Readonly<Record<ImsPanelSeverity, string>> = {
        neutral: 'ברירת המחדל — אפור, בלי לציין דבר',
        info: 'מידע — כחול הבית',
        success: 'הצלחה — פעולה שהושלמה',
        warning: 'אזהרה — דורש תשומת לב',
        danger: 'שגיאה — חריגה או כשל'
    };

    readonly yearOptions = signal<readonly PanelDemoYear[]>([
        {value: 2026, label: 'שנת 2026'},
        {value: 2025, label: 'שנת 2025'},
        {value: 2024, label: 'שנת 2024'}
    ]);

    readonly viewModes: readonly PanelDemoViewMode[] = [
        {value: 'all', label: 'הכל'},
        {value: 'open', label: 'פתוחים'},
        {value: 'settled', label: 'שולמו'}
    ];

    readonly viewMode = signal<string>('all');

    readonly viewModeLabel = computed(
        () => this.viewModes.find((mode) => mode.value === this.viewMode())?.label ?? ''
    );

    readonly includeCancelled = new FormControl(false, {nonNullable: true});
    readonly selectedYear = new FormControl<number>(2026, {nonNullable: true});
}
