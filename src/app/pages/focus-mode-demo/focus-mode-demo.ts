import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ImsButton } from '../../components/ims-button';
import { ImsFocusMode } from '../../components/ims-focus-mode';
import { ImsGrid, ImsGridCell, ImsGridRow } from '../../components/ims-grid';
import {
  ImsFormField,
  ImsFormFieldGrid,
  ImsFormFieldRow,
} from '../../components/ims-form-layout';
import { ImsInputDirective } from '../../ims-input.directive';
import { ReadonlyDirective } from '../../shared/readonly.directive';

const LONG_NOTE = [
  'הלקוח ביקש לעדכן את פרטי ההתקשרות ואת כתובת המשלוח.',
  'יש לוודא מול מחלקת הגבייה שאין חוב פתוח לפני ביצוע השינוי,',
  'ולתעד את מספר הפנייה בטופס המקושר.',
].join(' ');

@Component({
  selector: 'app-focus-mode-demo',
  standalone: true,
  imports: [
    FormsModule,
    ImsButton,
    ImsFocusMode,
    ImsFormField,
    ImsFormFieldGrid,
    ImsFormFieldRow,
    ImsGrid,
    ImsGridCell,
    ImsGridRow,
    ImsInputDirective,
    ReactiveFormsModule,
    ReadonlyDirective,
  ],
  templateUrl: './focus-mode-demo.html',
  styleUrl: './focus-mode-demo.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FocusModeDemo {
  /** Long free text: the case focus mode exists for. */
  readonly notes = new FormControl(LONG_NOTE, {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(20), Validators.maxLength(240)],
  });

  /** Single-line control with a validator, projected as-is into the dialog. */
  readonly reference = new FormControl('REF-2026-0041', {
    nonNullable: true,
    validators: [Validators.required, Validators.pattern(/^REF-\d{4}-\d{4}$/)],
  });

  /** Toggled from outside the dialog to prove live state tracking. */
  readonly locked = new FormControl('סכום מאושר: 12,400 ₪', { nonNullable: true });

  /** Template-driven field, to prove the commit path emits `ngModelChange`. */
  summary = 'סיכום שיחה עם הלקוח מיום ראשון.';

  /** Grid neighbours, present so a collapsing field would be obvious. */
  readonly firstName = new FormControl('ישראל', { nonNullable: true });
  readonly lastName = new FormControl('ישראלי-כהן', { nonNullable: true });
  readonly phone = new FormControl('050-1234567', { nonNullable: true });
  readonly address = new FormControl(
    'רחוב הרצל 42, דירה 7, קומה 3, תל אביב-יפו, מיקוד 6120101',
    { nonNullable: true },
  );
  readonly city = new FormControl('תל אביב-יפו', { nonNullable: true });
  readonly postalCode = new FormControl('6120101', { nonNullable: true });

  /** Fields whose own sizing would overflow a narrow dialog. */
  readonly wideText = new FormControl(
    'שורה ארוכה מאוד שנכתבה עבור שדה טופס רחב במיוחד ולכן חורגת מרוחב הדיאלוג.',
    { nonNullable: true },
  );
  readonly fixedWidth = new FormControl('ערך בשדה ברוחב קבוע', { nonNullable: true });
  readonly unbroken = new FormControl(
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
    { nonNullable: true },
  );
  readonly singleRow = new FormControl(
    'שדה שנכתב כשורה אחת בטופס, ונפתח במצב מיקוד בארבע שורות.',
    { nonNullable: true },
  );

  /** Rows whose field and focus-mode action live in different columns. */
  readonly lineItems = [
    {
      name: 'ייעוץ טכנולוגי',
      note: new FormControl('הוסכם על שלוש פגישות ליווי בחודש הראשון, כולל דוח מסכם.', {
        nonNullable: true,
        validators: [Validators.required, Validators.maxLength(180)],
      }),
    },
    {
      name: 'פיתוח ממשק',
      note: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.maxLength(180)],
      }),
    },
  ];

  readonly pageReadonly = signal(false);

  constructor() {
    this.locked.disable();
  }

  toggleLocked(): void {
    if (this.locked.disabled) {
      this.locked.enable();
      return;
    }

    this.locked.disable();
  }

  toggleNotesDisabled(): void {
    if (this.notes.disabled) {
      this.notes.enable();
      return;
    }

    this.notes.disable();
  }

  togglePageReadonly(): void {
    this.pageReadonly.update((state) => !state);
  }
}
