import {Directive} from '@angular/core';

@Directive({
    selector: '[imsFormFieldLabel]',
    standalone: true
})
/**
 * Marks a projected element as the main label area of an `ims-form-field`.
 *
 * Native `label` elements are recognized automatically, so this directive is
 * primarily for non-label display elements such as a `span` used with a
 * read-only value. It can also disambiguate which label is the main label when
 * more than one direct label-like element is projected.
 *
 * The directive is intentionally behavior-free; projection and styling are
 * implemented by `ImsFormField`.
 */
export class ImsFormFieldLabel {
}
