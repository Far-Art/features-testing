import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  ImsDatepicker,
  ImsDatepickerDateValueHandlerDirective,
  ImsDatepickerValue,
} from '../../components/ims-datepicker';
import {
  ImsDatepickerExperimental,
  ImsDatepickerExperimentalValue,
  provideImsDatepickerExperimentalConfig,
} from '../../components/ims-datepicker-experimental';
import { ImsAutocomplete, ImsAutocompleteOption } from '../../components/ims-autocomplete';
import { ImsCheckbox } from '../../components/ims-checkbox/ims-checkbox';
import { ImsOption, ImsSelect } from '../../components/ims-select';
import { ReadonlyDirective } from '../../shared/readonly.directive';
import { TemporalHelper } from '../../shared/temporal.helper';

interface ComponentStateDemoOption {
  readonly id: number;
  readonly label: string;
  readonly disabled?: boolean;
}

type NativeDatepickerValue = ImsDatepickerValue<Date>;

@Component({
  selector: 'app-component-states-demo',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ImsAutocomplete,
    ImsCheckbox,
    ImsDatepicker,
    ImsDatepickerDateValueHandlerDirective,
    ImsDatepickerExperimental,
    ImsOption,
    ImsSelect,
    ReadonlyDirective,
  ],
  providers: [
    provideImsDatepickerExperimentalConfig({
      locale: 'he',
      zone: 'Asia/Jerusalem',
      firstDayOfWeek: 7,
    }),
  ],
  templateUrl: './component-states-demo.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './component-states-demo.scss',
})
export class ComponentStatesDemo {
  readonly options: readonly ComponentStateDemoOption[] = [
    { id: 1, label: 'פוליסה פעילה' },
    { id: 2, label: 'ממתין לאישור' },
    { id: 3, label: 'נדרש מסמך' },
    { id: 4, label: 'אפשרות חסומה', disabled: true },
  ];

  readonly autocompleteOptions: readonly ImsAutocompleteOption<ComponentStateDemoOption>[] =
    this.options.map((option) => ({
      value: option,
      label: option.label,
      disabled: option.disabled,
    }));

  readonly textNormal = new FormControl('ערך רגיל', { nonNullable: true });
  readonly textDisabled = new FormControl(
    { value: 'ערך מושבת', disabled: true },
    { nonNullable: true },
  );
  readonly textReadonly = new FormControl('ערך לקריאה בלבד', { nonNullable: true });
  readonly textInvalid = new FormControl('', {
    nonNullable: true,
    validators: Validators.required,
  });
  readonly textInvalidReadonly = new FormControl('', {
    nonNullable: true,
    validators: Validators.required,
  });

  readonly textareaNormal = new FormControl('טקסט ארוך לעריכה.', { nonNullable: true });
  readonly textareaDisabled = new FormControl(
    { value: 'טקסט מושבת.', disabled: true },
    { nonNullable: true },
  );
  readonly textareaReadonly = new FormControl('טקסט לקריאה בלבד.', { nonNullable: true });
  readonly textareaInvalid = new FormControl('', {
    nonNullable: true,
    validators: Validators.required,
  });
  readonly textareaInvalidReadonly = new FormControl('', {
    nonNullable: true,
    validators: Validators.required,
  });

  readonly checkboxNormal = new FormControl(true, { nonNullable: true });
  readonly checkboxDisabled = new FormControl(
    { value: true, disabled: true },
    { nonNullable: true },
  );
  readonly checkboxReadonly = new FormControl(true, { nonNullable: true });
  readonly checkboxInvalid = new FormControl(false, {
    nonNullable: true,
    validators: Validators.requiredTrue,
  });
  readonly checkboxInvalidReadonly = new FormControl(false, {
    nonNullable: true,
    validators: Validators.requiredTrue,
  });

  readonly selectNormal = new FormControl<ComponentStateDemoOption | null>(this.options[0]);
  readonly selectDisabled = new FormControl<ComponentStateDemoOption | null>({
    value: this.options[1],
    disabled: true,
  });
  readonly selectReadonly = new FormControl<ComponentStateDemoOption | null>(this.options[2]);
  readonly selectInvalid = new FormControl<ComponentStateDemoOption | null>(null, {
    validators: Validators.required,
  });
  readonly selectInvalidReadonly = new FormControl<ComponentStateDemoOption | null>(null, {
    validators: Validators.required,
  });

  readonly multiSelectNormal = new FormControl<readonly ComponentStateDemoOption[]>(
    [this.options[0], this.options[1]],
    { nonNullable: true },
  );
  readonly multiSelectDisabled = new FormControl<readonly ComponentStateDemoOption[]>(
    {
      value: [this.options[0], this.options[2]],
      disabled: true,
    },
    { nonNullable: true },
  );
  readonly multiSelectReadonly = new FormControl<readonly ComponentStateDemoOption[]>(
    [this.options[1], this.options[2]],
    { nonNullable: true },
  );
  readonly multiSelectInvalid = new FormControl<readonly ComponentStateDemoOption[]>([], {
    nonNullable: true,
    validators: Validators.required,
  });
  readonly multiSelectInvalidReadonly = new FormControl<readonly ComponentStateDemoOption[]>([], {
    nonNullable: true,
    validators: Validators.required,
  });

  readonly autocompleteNormal = new FormControl<ComponentStateDemoOption | string | null>(
    this.options[0],
  );
  readonly autocompleteDisabled = new FormControl<ComponentStateDemoOption | string | null>({
    value: this.options[1],
    disabled: true,
  });
  readonly autocompleteReadonly = new FormControl<ComponentStateDemoOption | string | null>(
    this.options[2],
  );
  readonly autocompleteInvalid = new FormControl<ComponentStateDemoOption | string | null>(null, {
    validators: Validators.required,
  });
  readonly autocompleteInvalidReadonly = new FormControl<ComponentStateDemoOption | string | null>(
    null,
    {
      validators: Validators.required,
    },
  );

  readonly multiAutocompleteNormal = new FormControl<readonly ComponentStateDemoOption[]>(
    [this.options[0], this.options[1]],
    { nonNullable: true },
  );
  readonly multiAutocompleteDisabled = new FormControl<readonly ComponentStateDemoOption[]>(
    {
      value: [this.options[0], this.options[2]],
      disabled: true,
    },
    { nonNullable: true },
  );
  readonly multiAutocompleteReadonly = new FormControl<readonly ComponentStateDemoOption[]>(
    [this.options[1], this.options[2]],
    { nonNullable: true },
  );
  readonly multiAutocompleteInvalid = new FormControl<readonly ComponentStateDemoOption[]>([], {
    nonNullable: true,
    validators: Validators.required,
  });
  readonly multiAutocompleteInvalidReadonly = new FormControl<readonly ComponentStateDemoOption[]>(
    [],
    {
      nonNullable: true,
      validators: Validators.required,
    },
  );

  readonly datepickerNormal = new FormControl<NativeDatepickerValue>(utcDate(2026, 8, 12));
  readonly datepickerDisabled = new FormControl<NativeDatepickerValue>({
    value: utcDate(2026, 8, 13),
    disabled: true,
  });
  readonly datepickerReadonly = new FormControl<NativeDatepickerValue>(utcDate(2026, 8, 14));
  readonly datepickerInvalid = new FormControl<NativeDatepickerValue>(null, {
    validators: Validators.required,
  });
  readonly datepickerInvalidReadonly = new FormControl<NativeDatepickerValue>(null, {
    validators: Validators.required,
  });

  readonly experimentalNormal = new FormControl<ImsDatepickerExperimentalValue>(
    TemporalHelper.plainDate(2026, 8, 12),
  );
  readonly experimentalDisabled = new FormControl<ImsDatepickerExperimentalValue>({
    value: TemporalHelper.plainDate(2026, 8, 13),
    disabled: true,
  });
  readonly experimentalReadonly = new FormControl<ImsDatepickerExperimentalValue>(
    TemporalHelper.plainDate(2026, 8, 14),
  );
  readonly experimentalInvalid = new FormControl<ImsDatepickerExperimentalValue>(null, {
    validators: Validators.required,
  });
  readonly experimentalInvalidReadonly = new FormControl<ImsDatepickerExperimentalValue>(null, {
    validators: Validators.required,
  });

  constructor() {
    [
      this.textInvalid,
      this.textInvalidReadonly,
      this.textareaInvalid,
      this.textareaInvalidReadonly,
      this.checkboxInvalid,
      this.checkboxInvalidReadonly,
      this.selectInvalid,
      this.selectInvalidReadonly,
      this.multiSelectInvalid,
      this.multiSelectInvalidReadonly,
      this.autocompleteInvalid,
      this.autocompleteInvalidReadonly,
      this.multiAutocompleteInvalid,
      this.multiAutocompleteInvalidReadonly,
      this.datepickerInvalid,
      this.datepickerInvalidReadonly,
      this.experimentalInvalid,
      this.experimentalInvalidReadonly,
    ].forEach((control) => control.markAsTouched());
  }

  compareOptionById(
    first: ComponentStateDemoOption | null | undefined,
    second: ComponentStateDemoOption | null | undefined,
  ): boolean {
    return first?.id === second?.id;
  }
}

function utcDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}
