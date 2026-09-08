import { ChangeDetectionStrategy, Component, computed, linkedSignal, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ImsErrorPopoverDirective } from '../../components/ims-error-popover';
import { ImsInputDirective } from '../../ims-input.directive';
import {
  IMS_PATTERN,
  ImsPatternDirective,
  type ImsPatternInput,
} from '../../shared/ims-pattern.directive';

/** A ready-made pattern presented in the gallery. */
interface PatternPreset {
  readonly title: string;
  readonly pattern: string;
  readonly placeholder: string;
  readonly hint: string;
}

/** A built-in preset, in one of the two spellings that reach the same regex. */
interface NumericPresetCard {
  readonly title: string;
  /** Bound as-is, so the card exercises the spelling it advertises. */
  readonly pattern: ImsPatternInput;
  /** How that binding is written at a call site. */
  readonly source: string;
  readonly placeholder: string;
  readonly hint: string;
}

/** One insertion the playground field saw, and whether the pattern let it through. */
interface PatternAttempt {
  readonly id: number;
  readonly text: string;
  readonly accepted: boolean;
}

const FALLBACK_PATTERN = '[0-9]{0,3}';
const MAX_ATTEMPTS = 10;

const compile = (pattern: string): RegExp | null => {
  try {
    return new RegExp(pattern);
  } catch {
    return null;
  }
};

@Component({
  selector: 'app-pattern-demo',
  standalone: true,
  imports: [FormsModule, ImsErrorPopoverDirective, ImsInputDirective, ImsPatternDirective],
  templateUrl: './pattern-demo.html',
  styleUrl: './pattern-demo.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PatternDemo {
  /** Pattern typed into the playground editor, whether or not it compiles. */
  readonly patternDraft = signal(FALLBACK_PATTERN);

  /** Last pattern that compiled, so a half-typed regex never breaks the field. */
  readonly activePattern = linkedSignal<string, string>({
    source: this.patternDraft,
    computation: (draft, previous) =>
      compile(draft) === null ? (previous?.value ?? FALLBACK_PATTERN) : draft,
  });

  readonly patternIsBroken = computed(() => compile(this.patternDraft()) === null);

  readonly playgroundValue = signal('');
  readonly attempts = signal<readonly PatternAttempt[]>([]);

  /** A `RegExp` keeps its flags: `i` accepts both letter cases. */
  readonly hexColor = /#?[0-9a-f]{0,6}/i;

  /** `\n` has to be part of the pattern, otherwise Enter is blocked in a textarea. */
  readonly noteText = /[א-ת0-9 ,.\n-]*/;

  /** An amount that arrives as zero, the case the preset selects on focus. */
  readonly amount = signal('0');

  /** A required field, so a refusal and a validation error can share one popover. */
  readonly quantity = signal('5');

  readonly numericPresets: readonly NumericPresetCard[] = [
    {
      title: 'מספר שלם',
      pattern: 'integer',
      source: 'imsPattern="integer"',
      placeholder: '2026',
      hint: 'הקלדת 0 ואז ספרה מחליפה את האפס, ואפס מוביל לא יכול להיווצר.',
    },
    {
      title: 'סכום עשרוני',
      pattern: 'decimal',
      source: 'imsPattern="decimal"',
      placeholder: '1250.75',
      hint: 'נקודה בשדה ריק מקבלת 0 לפניה, ואחריה עד שתי ספרות.',
    },
    {
      title: 'מספר שלם עם סימן',
      pattern: 'signedInteger',
      source: 'imsPattern="signedInteger"',
      placeholder: '-42',
      hint: 'מינוס פותח מותר, וגם מינוס לבדו בזמן ההקלדה. מינוס שני נחסם.',
    },
    {
      title: 'סכום עם סימן',
      pattern: 'signedDecimal',
      source: 'imsPattern="signedDecimal"',
      placeholder: '-1250.75',
      hint: 'אותם כללים אחרי הסימן, כולל תיקון האפס המוביל.',
    },
    {
      title: 'מספר שלם · ערך מפורש',
      pattern: IMS_PATTERN.integer,
      source: '[imsPattern]="IMS_PATTERN.integer"',
      placeholder: '2026',
      hint: 'אותה תבנית בדיוק, בלי שם קסום. הזיהוי לפי זהות האובייקט, ולכן גם התיקונים זהים.',
    },
    {
      title: 'סכום עשרוני · ערך מפורש',
      pattern: IMS_PATTERN.decimal,
      source: '[imsPattern]="IMS_PATTERN.decimal"',
      placeholder: '1250.75',
      hint: 'גם כאן ההתנהגות מלאה: תיקון אפס מוביל, ועד שתי ספרות אחרי הנקודה.',
    },
  ];

  readonly presets: readonly PatternPreset[] = [
    {
      title: 'טלפון נייד',
      pattern: '0|05[0-9]{0,8}',
      placeholder: '0501234567',
      hint: 'התבנית חייבת לקבל גם קלט חלקי, ולכן 0 לבדו מותר.',
    },
    {
      title: 'אותיות עבריות ורווח',
      pattern: '[א-ת ]*',
      placeholder: 'ישראל ישראלי',
      hint: 'טווח יוניקוד עברי, ללא ספרות וסימני פיסוק.',
    },
    {
      title: 'מזהה לכתובת',
      pattern: '[a-z0-9-]*',
      placeholder: 'my-page-slug',
      hint: 'אותיות קטנות בלבד: A גדולה לא תיכנס.',
    },
    {
      title: 'קוד אימות',
      pattern: '[0-9]{0,6}',
      placeholder: '123456',
      hint: 'הגבול העליון עוצר את ההקלדה אחרי שש ספרות.',
    },
  ];

  private nextAttemptId = 0;

  protected onPatternDraft(event: Event): void {
    this.patternDraft.set((event.target as HTMLInputElement).value);
  }

  /**
   * Records the outcome of an insertion. The listener sits on the wrapper, so it runs after
   * the directive cancelled the event on the field itself.
   */
  protected recordAttempt(event: Event): void {
    if (!(event instanceof InputEvent) || !event.inputType.startsWith('insert')) {
      return;
    }

    const text = event.data ?? event.dataTransfer?.getData('text/plain') ?? '';

    if (text === '') {
      return;
    }

    const attempt: PatternAttempt = {
      id: this.nextAttemptId++,
      text,
      accepted: !event.defaultPrevented,
    };

    this.attempts.update((attempts) => [attempt, ...attempts].slice(0, MAX_ATTEMPTS));
  }

  protected clearAttempts(): void {
    this.attempts.set([]);
  }
}
