import {Injectable, InjectionToken, Provider, Type, inject} from '@angular/core';
import {
    ImsDatepickerFormats,
    ImsDatepickerMonthDay,
    ImsDatepickerPrecision
} from './ims-datepicker.types';
import {parseDateText, toUtcEpochMillis} from './ims-datepicker.utils';

export interface ImsDatepickerParserOptions {
    readonly precision: ImsDatepickerPrecision;
    readonly monthDay: ImsDatepickerMonthDay;
    readonly formats: ImsDatepickerFormats;
    readonly locale: string;
    readonly interpretationZone: string;
}

export interface ImsDatepickerParser {
    /**
     * Parses text into the represented calendar date at UTC midnight.
     * Returns null when the text cannot be parsed.
     */
    parse(text: string, options: ImsDatepickerParserOptions): number | null;
}

@Injectable({providedIn: 'root'})
class DefaultImsDatepickerParser implements ImsDatepickerParser {
    parse(text: string, options: ImsDatepickerParserOptions): number | null {
        const parsed = parseDateText(text, options);
        return parsed === null ? null : toUtcEpochMillis(parsed);
    }
}

export const IMS_DATEPICKER_PARSER = new InjectionToken<ImsDatepickerParser>(
    'IMS_DATEPICKER_PARSER',
    {factory: () => inject(DefaultImsDatepickerParser)}
);

export function provideImsDatepickerParser(
    parser: Type<ImsDatepickerParser>
): Provider {
    return {
        provide: IMS_DATEPICKER_PARSER,
        useClass: parser
    };
}
