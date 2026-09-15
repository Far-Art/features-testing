import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ImsInputDirective } from '../../ims-input.directive';
import { ImsTextTruncateDirective } from '../../shared/ims-text-truncate.directive';
import { ReadonlyDirective } from '../../shared/readonly.directive';

@Component({
  selector: 'app-text-truncate-demo',
  standalone: true,
  imports: [FormsModule, ImsInputDirective, ImsTextTruncateDirective, ReadonlyDirective],
  templateUrl: './text-truncate-demo.html',
  styleUrl: './text-truncate-demo.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TextTruncateDemo {
  /** Inline size of the single-line fields, in rem, so a value can be made to fit or not. */
  readonly fieldWidth = signal(12);

  readonly address = signal('רחוב הנשיא הראשון 128, דירה 14, קומה 3, רחובות 7630517');
  readonly email = signal('maya.levin-rosenberg.claims@example.test');

  /** Loaded into a readonly field, which cannot be scrolled to read the rest. */
  readonly coverage = 'ביטוח דירה מורחב: מבנה ותכולה, נזקי מים, רעידת אדמה וצד שלישי';

  /** Five lines in a three-row textarea, so it starts out truncated. */
  readonly note = signal(
    [
      'הלקוחה ביקשה לעדכן את כתובת הדיוור.',
      'הכתובת החדשה נבדקה מול מרשם האוכלוסין.',
      'נשלח אישור בדוא״ל ובמסרון.',
      'יש לחדש את הפוליסה עד סוף החודש.',
      'לשיחה הבאה: לבדוק זכאות להנחת נאמנות.',
    ].join('\n'),
  );

  readonly claimSummary = [
    'סיכום תביעה 2026-04817',
    'נזק מים במטבח בעקבות פיצוץ צנרת מתחת לכיור.',
    'השמאי ביקר בדירה ב־12 באוגוסט ואישר החלפת ארונות ותיקון ריצוף.',
    'הסכום שאושר: 18,400 ₪, בניכוי השתתפות עצמית.',
    'התשלום יועבר לחשבון הבנק שבפוליסה תוך 7 ימי עסקים.',
  ].join('\n');
}
