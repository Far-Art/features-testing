import {booleanAttribute, Directive, ElementRef, HostListener, input, OnInit} from '@angular/core';


@Directive({
    selector: 'input[imsPattern], textarea[imsPattern]'
})
export class Pattern implements OnInit {
    imsPattern = input.required<'integer' | 'decimal' | RegExp | (string & {})>();
    clearOnPatternMismatch = input(false, {transform: booleanAttribute});
    private previousValue = '';

    constructor(private el: ElementRef<HTMLInputElement | HTMLTextAreaElement>) {}

    ngOnInit(): void {
        const input = this.el.nativeElement;
        if (this.clearOnPatternMismatch() && input.value) {
            const regex = this.getRegex(this.imsPattern());
            if (!this.test(input.value, regex)) {
                input.value = '';
            }
        }
        this.previousValue = input.value;
    }

    @HostListener('input', ['$event'])
    onInput(event: Event): void {
        const pattern = this.imsPattern();
        const input = event.target as HTMLInputElement | HTMLTextAreaElement;
        const regex = this.getRegex(pattern);

        if (pattern === 'integer' || pattern === 'decimal') {
            if (input.value.startsWith('0') && input.value.length > 1 && input.value[1] !== '.') {
                input.value = input.value.substring(1);
            }
        }

        if (this.test(input.value, regex)) {
            this.previousValue = input.value;
        } else {
            input.value = this.previousValue;
        }
    }

    private getRegex(pattern: 'integer' | 'decimal' | RegExp | string): RegExp {
        if (pattern === 'integer') {
            return /^(0|[1-9][0-9]*)$/;
        } else if (pattern === 'decimal') {
            return /^(0|[1-9][0-9]*)?(\.?[0-9]*)$/;
        } else if (pattern instanceof RegExp) {
            return pattern;
        } else {
            return new RegExp(pattern);
        }
    }

    private test(value: string, regex: RegExp): boolean {
        return value === '' || regex.test(value);
    }
}
