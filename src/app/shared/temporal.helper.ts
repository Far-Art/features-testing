import {Temporal} from '@js-temporal/polyfill';

export class TemporalHelper {
    private constructor() {}

    static plainDate(year: number, month: number, day: number): Temporal.PlainDate {
        return Temporal.PlainDate.from({year, month, day});
    }
}
