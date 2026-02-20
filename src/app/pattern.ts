import {booleanAttribute, Directive, ElementRef, HostListener, input, OnInit} from '@angular/core';


@Directive({
    selector: 'input[imsPattern], textarea[imsPattern]'
})
export class Pattern implements OnInit {
    imsPattern = input.required<'numeric' | RegExp | (string & {})>();
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

        if (this.test(input.value, regex)) {
            this.previousValue = input.value;
        } else {
            input.value = this.previousValue;
        }
    }

    private getRegex(pattern: 'numeric' | RegExp | string): RegExp {
        if (pattern === 'numeric') {
            return /^[0-9]*$/;
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
