import {CurrencyPipe} from '@angular/common';
import {Directive, ElementRef, HostListener, inject, input, LOCALE_ID, OnInit} from '@angular/core';


@Directive({
    selector: 'input[imsFormat], textarea[imsFormat]'
})
export class Format implements OnInit {
    imsFormat = input.required<'#,###' | '#,###.#' | '#,###.##' | '###.#' | '###.##' | 'currency' | (string & {})>();
    currencySymbol = input('ILS');
    private rawValue = '';
    private currencyPipe = new CurrencyPipe(inject(LOCALE_ID));
    private el = inject<ElementRef<HTMLInputElement | HTMLTextAreaElement>>(ElementRef);

    ngOnInit(): void {
        const input = this.el.nativeElement;
        this.rawValue = input.value;
        if (input.value) {
            input.value = this.format(input.value);
        }
    }

    @HostListener('focus')
    onFocus(): void {
        const input = this.el.nativeElement;
        if (this.imsFormat() === 'currency') {
            input.value = this.rawValue.replace(/[^0-9.-]/g, '').trim();
            this.rawValue = input.value;
        } else {
            input.value = this.rawValue;
        }
    }

    @HostListener('input', ['$event'])
    onInput(event: Event): void {
        const input = event.target as HTMLInputElement | HTMLTextAreaElement;
        this.rawValue = input.value;
    }

    @HostListener('blur')
    onBlur(): void {
        const input = this.el.nativeElement;
        input.value = this.format(this.rawValue);
    }

    private format(value: string): string {
        const formatType = this.imsFormat();
        if (value && !isNaN(Number(value))) {
            const num = Number(value);
            if (formatType === '#,###') {
                return num.toLocaleString('en-US', {maximumFractionDigits: 0});
            } else if (formatType === '#,###.#') {
                return num.toLocaleString('en-US', {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1
                });
            } else if (formatType === '#,###.##') {
                return num.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                });
            } else if (formatType === '###.#') {
                return num.toFixed(1);
            } else if (formatType === '###.##') {
                return num.toFixed(2);
            } else if (formatType === 'currency') {
                return this.currencyPipe.transform(num, this.currencySymbol(), 'symbol', '1.2-2', 'he-IL') || value;
            }
        }
        return value;
    }
}
