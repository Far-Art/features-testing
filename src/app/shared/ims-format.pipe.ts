import { Pipe, PipeTransform } from '@angular/core';
import {
  IMS_CURRENCY_DEFAULT,
  IMS_CURRENCY_FORMAT,
  IMS_FORMAT_DEFAULT,
  type ImsFormatToken,
  formatNumeric,
} from './ims-format';

/** What a pipe accepts: the shapes a model value actually arrives in. */
type ImsFormatValue = number | string | null | undefined;

/**
 * The read-only half of `imsFormat`, for text that is displayed rather than edited.
 *
 * ```html
 * {{ total | imsFormat }}
 * {{ total | imsFormat: '#,###.##' }}
 * ```
 */
@Pipe({
  name: 'imsFormat',
  standalone: true,
})
export class ImsFormatPipe implements PipeTransform {
  transform(value: ImsFormatValue, token: ImsFormatToken = IMS_FORMAT_DEFAULT): string {
    return value === null || value === undefined ? '' : formatNumeric(String(value), token);
  }
}

/**
 * The read-only half of `imsFormatCurrency`.
 *
 * ```html
 * {{ premium | imsFormatCurrency }}
 * {{ premium | imsFormatCurrency: '$' }}
 * ```
 */
@Pipe({
  name: 'imsFormatCurrency',
  standalone: true,
})
export class ImsFormatCurrencyPipe implements PipeTransform {
  transform(value: ImsFormatValue, symbol: string = IMS_CURRENCY_DEFAULT): string {
    if (value === null || value === undefined) {
      return '';
    }

    return formatNumeric(String(value), IMS_CURRENCY_FORMAT, ` ${symbol || IMS_CURRENCY_DEFAULT}`);
  }
}
