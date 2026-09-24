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

@Directive({
    selector: '[imsFormFieldHint]',
    standalone: true
})
/**
 * Marks a short text that describes a form field's control, such as a note
 * that a date must be the first day of the month.
 *
 * As a direct child of `ims-form-field`, after the control, the hint sits
 * under the control and wraps within the value track rather than widening it.
 * Inside an `[imsFormFieldInline]` value it sits beside the control, level
 * with the control's text, and moves under it when the line has no room.
 *
 * The field adds the hint's id to the `aria-describedby` of the control its
 * main label names, and gives the hint an id when it has none, so a screen
 * reader reads the hint with the control.
 *
 * The directive is intentionally behavior-free; placement, styling, and the
 * description are implemented by `ImsFormField`.
 */
export class ImsFormFieldHint {
}

@Directive({
    selector: '[imsFormFieldInline]',
    standalone: true
})
/**
 * Lays out a form field's value on one line: the control, then what belongs
 * beside it, such as an `[imsFormFieldHint]` or a unit. An item that no
 * longer fits moves to the next line, under the control, rather than
 * squeezing it.
 *
 * Use it as a direct child of `ims-form-field`, in place of the bare control.
 * The field still finds the control inside it for its label and hints.
 *
 * The directive is intentionally behavior-free; the layout is implemented by
 * the form-layout styles.
 */
export class ImsFormFieldInline {
}
