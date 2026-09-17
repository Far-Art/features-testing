import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterEveryRender,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ImsInputDirective } from '../../ims-input.directive';
import {
  ImsFormatCurrencyDirective,
  ImsFormatCurrencyPipe,
  ImsFormatDirective,
  ImsFormatPipe,
  type ImsFormatToken,
} from '../../shared/ims-format';
import { ImsPatternDirective } from '../../shared/ims-pattern.directive';

/** One token shown with a value that makes its shape obvious. */
interface TokenCard {
  readonly token: ImsFormatToken;
  readonly source: string;
  readonly seed: string;
  readonly hint: string;
}

/** One currency spelling, with the symbol it ends up appending. */
interface CurrencyCard {
  readonly title: string;
  readonly symbol: string;
  readonly showSymbol: boolean;
  readonly source: string;
  readonly seed: string;
  readonly hint: string;
}

@Component({
  selector: 'app-format-demo',
  standalone: true,
  imports: [
    FormsModule,
    ImsInputDirective,
    ImsPatternDirective,
    ImsFormatDirective,
    ImsFormatCurrencyDirective,
    ImsFormatPipe,
    ImsFormatCurrencyPipe,
  ],
  templateUrl: './format-demo.html',
  styleUrl: './format-demo.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormatDemo {
  /** The token the playground field is currently bound to. */
  readonly activeToken = signal<ImsFormatToken>('#,###.##');

  readonly tokenChoices: readonly ImsFormatToken[] = [
    '#,###',
    '#,###.#',
    '#,###.##',
    '###.#',
    '###.##',
  ];

  readonly playgroundValue = signal('1234.56');
  readonly currencyValue = signal('1234.5');
  readonly guardedValue = signal('1234.56');

  /** Feeds the pipe examples, which never touch a field at all. */
  readonly total = 1234567.891;

  readonly tokenCards: readonly TokenCard[] = [
    {
      token: '#,###',
      source: 'imsFormat',
      seed: '1234.56',
      hint: 'ברירת המחדל, גם בלי לכתוב ערך לתכונה. מקבצת אלפים ומשאירה את השבר בדיוק כפי שהוא.',
    },
    {
      token: '#,###.#',
      source: 'imsFormat="#,###.#"',
      seed: '1234.56',
      hint: 'טוקן שנוקב בשבר כן מעגל אליו: ספרה אחת בדיוק, עם מפרידי אלפים.',
    },
    {
      token: '#,###.##',
      source: 'imsFormat="#,###.##"',
      seed: '1234.5',
      hint: 'שתי ספרות תמיד, גם כשהערך מסתיים באפס.',
    },
    {
      token: '###.#',
      source: 'imsFormat="###.#"',
      seed: '1234.56',
      hint: 'פסיק בטוקן הוא מה שמדליק את הקיבוץ, וכאן אין פסיק — אז אין מפרידים.',
    },
    {
      token: '###.##',
      source: 'imsFormat="###.##"',
      seed: '1234.5',
      hint: 'אותו דבר עם שתי ספרות. שימושי לשדות שמועתקים למערכת אחרת.',
    },
  ];

  readonly currencyCards: readonly CurrencyCard[] = [
    {
      title: 'ברירת מחדל · בלי סימן',
      symbol: '',
      showSymbol: false,
      source: 'imsFormatCurrency',
      seed: '1234.5',
      hint: 'התכונה לבדה מציגה רק #,###.##, בלי סימן מטבע.',
    },
    {
      title: 'שקל',
      symbol: '',
      showSymbol: true,
      source: 'imsFormatCurrency showSymbol',
      seed: '1234.5',
      hint: 'showSymbol מוסיף את הסימן, ובלי ערך לתכונה הוא ₪ — ושקל נכתב לפני המספר.',
    },
    {
      title: 'דולר',
      symbol: '$',
      showSymbol: true,
      source: 'imsFormatCurrency="$" showSymbol',
      seed: '1234.5',
      hint: 'ערך התכונה הוא הסימן. הצורה המספרית לא משתנה.',
    },
    {
      title: 'אירו',
      symbol: '€',
      showSymbol: true,
      source: 'imsFormatCurrency="€" showSymbol',
      seed: '99',
      hint: 'כל סימן שאינו שקל נוסף בסוף, כטקסט רגיל בלי סימני כיווניות נסתרים.',
    },
  ];

  private readonly numberField = viewChild.required<ElementRef<HTMLInputElement>>('numberField');
  private readonly currencyField =
    viewChild.required<ElementRef<HTMLInputElement>>('currencyField');
  private readonly guardedField = viewChild.required<ElementRef<HTMLInputElement>>('guardedField');

  /** What each field is actually showing, read back from the DOM after every render. */
  readonly numberDisplay = signal('');
  readonly currencyDisplay = signal('');
  readonly guardedDisplay = signal('');

  constructor() {
    // The directives write the display outside the template, so the only honest way to show what
    // a field holds is to read it back once the DOM has settled. Setting a signal here schedules
    // one more pass, and the pass after that reads the same value and stops.
    afterEveryRender(() => {
      this.numberDisplay.set(this.numberField().nativeElement.value);
      this.currencyDisplay.set(this.currencyField().nativeElement.value);
      this.guardedDisplay.set(this.guardedField().nativeElement.value);
    });
  }
}
