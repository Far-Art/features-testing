import {ChangeDetectionStrategy, Component, inject, signal} from '@angular/core';
import {Observable} from 'rxjs';
import {
    IMS_SNACKBAR_DATA,
    ImsSnackbarHorizontalPosition,
    ImsSnackbarRef,
    ImsSnackbarService,
    ImsSnackbarVerticalPosition
} from '../../components/ims-snackbar';

interface SnackbarDemoData {
    readonly title: string;
    readonly detail: string;
}

@Component({
    selector: 'app-snackbar-demo-content',
    standalone: true,
    template: `
        <div class="custom-snackbar">
            <span>
                <strong>{{ data.title }}</strong>
                {{ data.detail }}
            </span>
            <button type="button" (click)="snackbarRef.dismiss()">סגירה</button>
        </div>
    `,
    styles: `
        .custom-snackbar {
            display: flex;
            align-items: center;
            gap: 1rem;
        }

        .custom-snackbar button {
            padding: 0.35rem 0.6rem;
            color: inherit;
            background: rgb(255 255 255 / 55%);
            border: 1px solid currentColor;
            border-radius: 0.35rem;
            font: inherit;
            cursor: pointer;
        }
    `,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SnackbarDemoContent {
    readonly snackbarRef = inject(ImsSnackbarRef);
    readonly data = inject(IMS_SNACKBAR_DATA) as SnackbarDemoData;
}

@Component({
    selector: 'app-snackbar-demo',
    standalone: true,
    templateUrl: './snackbar-demo.html',
    styleUrl: './snackbar-demo.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SnackbarDemo {
    private readonly snackbar = inject(ImsSnackbarService);
    private manualProgressRef: ImsSnackbarRef | null = null;

    readonly lastEvent = signal('טרם הופעלה הודעה');

    showInfo(): void {
        this.observe(
            this.snackbar.info('הודעת מידע עם ברירות המחדל').open(),
            'הודעת מידע'
        );
    }

    showSuccess(): void {
        this.observe(
            this.snackbar.success('הפעולה הושלמה בהצלחה').open(),
            'הודעת הצלחה'
        );
    }

    showWarning(): void {
        this.observe(
            this.snackbar.warning('יש לבדוק את הנתונים לפני המשך')
                .timeout(8000)
                .open(),
            'הודעת אזהרה'
        );
    }

    showDanger(): void {
        this.observe(
            this.snackbar.danger('שמירת הנתונים נכשלה').open(),
            'הודעת סכנה'
        );
    }

    showPersistent(): void {
        this.observe(
            this.snackbar.info('הודעה זו תישאר עד לסגירה ידנית')
                .timeout(0)
                .open(),
            'הודעה קבועה'
        );
    }

    showComponent(): void {
        this.observe(
            this.snackbar.success(SnackbarDemoContent)
                .data<SnackbarDemoData>({
                    title: 'נשמר:',
                    detail: 'התוכן הועבר לקומפוננטה דרך IMS_SNACKBAR_DATA.'
                })
                .dismissible(false)
                .open(),
            'הודעת קומפוננטה'
        );
    }

    showStack(): void {
        const stackItems = [
            ['info', 'הודעת מידע ראשונה'],
            ['success', 'הודעת הצלחה שנייה'],
            ['warning', 'הודעת אזהרה שלישית'],
            ['danger', 'הודעת סכנה רביעית'],
            ['info', 'הודעה חמישית שמחליפה את הישנה ביותר']
        ] as const;

        for (const [severity, message] of stackItems) {
            const ref = this.snackbar[severity](message)
                .timeout(10000)
                .open();
            ref.onDismiss().subscribe(() => {
                this.lastEvent.set(`${message} נסגרה והערימה הסתדרה מחדש`);
            });
        }

        this.lastEvent.set('נפתחו חמש הודעות; הערימה הוגבלה לארבע האחרונות');
    }

    showReplace(): void {
        this.observe(
            this.snackbar.info('הודעה זו החליפה את כל הערימה')
                .replaceStrategy('replace')
                .open(),
            'הודעת replace'
        );
    }

    showNonDismissible(): void {
        this.observe(
            this.snackbar.warning('אין כפתור סגירה; ההודעה תיסגר אוטומטית')
                .dismissible(false)
                .timeout(5000)
                .open(),
            'הודעה ללא כפתור סגירה'
        );
    }

    showProgress(): void {
        const request$ = new Observable<string>((subscriber) => {
            const timer = setTimeout(() => {
                subscriber.next('upload-result');
                subscriber.complete();
            }, 8000);

            return () => clearTimeout(timer);
        });
        const ref = this.snackbar.info('מעלה קבצים; כפתור הסגירה יופיע לאחר 5 שניות')
            .progress(request$)
            .open();

        this.observeProgress(ref, 'העלאת קבצים');
    }

    showKeyIgnore(): void {
        this.snackbar.info('הודעה ראשונה עם מפתח — ignore')
            .key('demo-key', 'ignore')
            .timeout(6000)
            .open();
        this.snackbar.warning('ניסיון שני — יתעלם ממנו')
            .key('demo-key', 'ignore')
            .timeout(6000)
            .open();
        this.lastEvent.set('נפתחה הודעה עם מפתח demo-key; הניסיון השני התעלם');
    }

    showKeyReplace(): void {
        const ref = this.snackbar.info('הודעה ראשונה עם מפתח — replace')
            .key('demo-key', 'replace')
            .timeout(6000)
            .open();
        this.lastEvent.set('נפתחה הודעה ראשונה');
        setTimeout(() => {
            this.snackbar.success('הודעה שנייה — החליפה את הראשונה')
                .key('demo-key', 'replace')
                .timeout(6000)
                .open();
            this.lastEvent.set('הודעה שנייה החליפה את הראשונה');
        }, 1500);
        ref.onDismiss().subscribe(() => this.lastEvent.set('הודעה ראשונה נסגרה'));
    }

    showKeyUpdate(): void {
        this.snackbar.info('שומר טיוטה...')
            .key('demo-key', 'update')
            .timeout(0)
            .open();
        this.lastEvent.set('נפתחה הודעת שמירה');
        setTimeout(() => {
            this.snackbar.success('הטיוטה נשמרה בהצלחה')
                .key('demo-key', 'update')
                .timeout(3000)
                .open();
            this.lastEvent.set('ההודעה עודכנה באותו מקום');
        }, 2000);
    }

    showLiveUpdate(): void {
        const steps = [
            'מעלה קבצים... 0%',
            'מעלה קבצים... 20%',
            'מעלה קבצים... 40%',
            'מעלה קבצים... 60%',
            'מעלה קבצים... 80%',
            'מעלה קבצים... 100%'
        ];

        const ref = this.snackbar.info(steps[0]).timeout(0).open();
        this.lastEvent.set('העלאה התחילה');

        let step = 0;
        const interval = setInterval(() => {
            step++;
            if (step < steps.length) {
                ref.updateMessage(steps[step]);
            }
            if (step === steps.length - 1) {
                clearInterval(interval);
                setTimeout(() => {
                    ref.updateSeverity('success');
                    ref.updateMessage('הקבצים הועלו בהצלחה!');
                    this.lastEvent.set('העלאה הושלמה — ההודעה תיסגר בעוד שתי שניות');
                    setTimeout(() => ref.dismiss(), 2000);
                }, 600);
            }
        }, 1000);

        ref.onDismiss().subscribe(() => {
            clearInterval(interval);
            this.lastEvent.set('הודעת העלאה נסגרה');
        });
    }

    showManualProgress(): void {
        this.manualProgressRef?.dismiss();
        this.manualProgressRef = this.snackbar.warning(
            'פעולה ידנית בתהליך; "סגירת הכל" לא תסגור הודעה זו'
        )
            .progress()
            .open();
        this.observeProgress(this.manualProgressRef, 'פעולה ידנית');
        this.manualProgressRef.onDismiss().subscribe(() => {
            this.manualProgressRef = null;
        });
    }

    resolveManualProgress(): void {
        this.manualProgressRef?.resolveProgress({completed: true});
    }

    rejectManualProgress(): void {
        this.manualProgressRef?.rejectProgress(new Error('Manual demo failure'));
    }

    showAt(
        verticalPosition: ImsSnackbarVerticalPosition,
        horizontalPosition: ImsSnackbarHorizontalPosition
    ): void {
        this.observe(
            this.snackbar.info(`מיקום: ${verticalPosition} / ${horizontalPosition}`)
                .timeout(3000)
                .position(verticalPosition, horizontalPosition)
                .open(),
            'הודעה ממוקמת'
        );
    }

    dismiss(): void {
        this.snackbar.dismiss();
        this.lastEvent.set('ההודעה נסגרה ידנית');
    }

    private observe(ref: ImsSnackbarRef, label: string): void {
        this.lastEvent.set(`${label} נפתחה`);
        ref.onDismiss().subscribe(() => {
            this.lastEvent.set(`${label} נסגרה`);
        });
    }

    private observeProgress(ref: ImsSnackbarRef, label: string): void {
        this.lastEvent.set(`${label} התחילה`);
        ref.onProgressResolved().subscribe((result) => {
            this.lastEvent.set(
                result.state === 'success'
                    ? `${label} הושלמה בהצלחה`
                    : `${label} נכשלה`
            );
        });
        ref.onDismiss().subscribe(() => {
            this.lastEvent.set(`${label} נסגרה`);
        });
    }
}
