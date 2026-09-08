# `ImsFormatDirective` · `ImsFormatCurrencyDirective`

`imsFormat` groups a numeric field while it sits at rest, and hands it back raw the moment it is
focused. It is a **formatter, not a guard** — the mirror image of
[`imsPattern`](../ims-pattern.directive.md), which refuses keystrokes and never rewrites the display.
Both are standalone and select on `input` and `textarea`.

```ts
import {
  ImsFormatCurrencyDirective,
  ImsFormatDirective,
} from './shared/ims-format';

@Component({
  imports: [ImsFormatDirective, ImsFormatCurrencyDirective],
})
export class InvoiceForm {}
```

```html
<input imsFormat />
<input imsFormat="#,###.##" [(ngModel)]="amount" />
<input imsFormatCurrency />
<input imsFormatCurrency="$" [formControl]="price" />
```

## The value contract

**Formatting is display-only. The control never holds formatted text.**

| Moment | The field shows | The control holds |
| --- | --- | --- |
| at rest | `1,234.56 ₪` | `1234.56` |
| focused | `1234.56` | `1234.56` |
| being typed | what was typed | what was typed |

Neither the focus swap nor the blur swap dispatches an `input` event, so `ngModel` and
`FormControl` never see a separator or a symbol. While the field is focused it holds raw text, which
is why the value accessor's own `input` listener needs no interception at all.

Values the application writes are followed by wrapping the value accessor's `writeValue`: the
accessor puts the raw value in the DOM, and the directive formats over it. The model stays the
source of truth and the display stays derived — there is no second copy to fall out of sync.

## Inputs

| Attribute | Type | Default | Meaning |
| --- | --- | --- | --- |
| `imsFormat` | `ImsFormatToken` | the shape of an `imsPattern` beside it, else `'#,###'` | The shape to show. The bare attribute, with no value, reads the guard on the same field. |
| `imsFormatCurrency` | `string` | `'₪'` | The symbol to append. The number is always `#,###.##`. |

The two are separate directives, not two spellings of one. A currency field needs only
`imsFormatCurrency`.

## Tokens

A token describes a *shape*, not a value: a comma in the integer part turns on grouping, and the
run of `#` after the dot fixes how many fraction digits are shown.

A token that **says nothing about the fraction only groups**: the decimals the value carries stay
exactly as they are, trailing zeros included. A token that names a fraction pads and rounds to it.

| Token | `1234` | `1234.5` | `1234.56` |
| --- | --- | --- | --- |
| `#,###` | `1,234` | `1,234.5` | `1,234.56` |
| `###` | `1234` | `1234.5` | `1234.56` |
| `#,###.#` | `1,234.0` | `1,234.5` | `1,234.6` |
| `#,###.##` | `1,234.00` | `1,234.50` | `1,234.56` |
| `###.#` | `1234.0` | `1234.5` | `1234.6` |
| `###.##` | `1234.00` | `1234.50` | `1234.56` |

The named tokens are the ones worth naming, not the ones that work: any `#` token parses, so `###`
and `#,###.###` need no new entry. A token that does not parse falls back to `#,###`.

> Where a token **does** fix the fraction, its rounding is display only. `#,###.#` on `1234.56`
> shows `1,234.6`, and the control still holds `1234.56` — focusing the field shows it again.
> Nothing is truncated by being displayed.

## Currency

`imsFormatCurrency` appends its symbol as plain text rather than going through `Intl`. On `he-IL`,
`Intl` produces `‏1,234.56 ‏₪` — two `U+200F` bidi marks that would sit invisibly inside an editable
field and travel with everything copied out of it. The appended form is `1,234.56 ₪`, and nothing
else.

Formatting is pinned to `en-US` for the same reason of round-tripping: the separators must stay `,`
and `.`, both because the displayed text is parsed back through `Number()` and because that is the
shape `IMS_PATTERN.decimal` lets the user type. `he-IL` produces identical digits and separators, so
nothing is lost by pinning it.

## Pipes

For text that is displayed and never edited, `ImsFormatPipe` and `ImsFormatCurrencyPipe` call the
same `formatNumeric` the directives call, so the two can never disagree.

```html
{{ total | imsFormat }}
{{ total | imsFormat: '#,###.##' }}
{{ premium | imsFormatCurrency }}
{{ premium | imsFormatCurrency: '$' }}
```

Both accept `number | string | null | undefined`; `null` and `undefined` render as an empty string.

## Pairing with `imsPattern`

`imsFormat` restricts nothing. A field that must also refuse bad keystrokes carries both:

```html
<input imsInput imsPattern="decimal" imsFormat [(ngModel)]="amount" />
```

### The bare attribute takes the pattern's shape

A preset already says how many decimals the number has, so the bare attribute reads it there rather
than being told the same thing twice:

| Beside it | Bare `imsFormat` shows |
| --- | --- |
| `imsPattern="decimal"`, `imsPattern="signedDecimal"` | `#,###.##` |
| `imsPattern="integer"`, `imsPattern="signedInteger"` | `#,###` |
| a pattern of your own | `#,###` |
| no `imsPattern` at all | `#,###` |

A pattern of your own is left at the default because it need not describe a number at all, and a
token written on the attribute outranks the pattern either way — a guarded decimal shown to one
place is still `imsFormat="#,###.#"`. The reading goes one way only: `imsFormat` never widens or
narrows what `imsPattern` accepts, and a pattern with no `imsFormat` beside it formats nothing.

`imsFormatCurrency` asks nothing of the pattern. Money is `#,###.##` by definition, which is what a
`decimal` preset would have said anyway.

They compose cleanly because they act at different moments. `imsPattern` guards `beforeinput` while
the field is focused and therefore raw; `imsFormat` writes only on blur, without an `input` event,
so nothing it writes re-enters the pattern pipeline.

One edge is worth knowing: `imsPattern` selects a value that reads as zero on focus. If `imsFormat`
also has to swap text on that same focus — raw `0` displayed as `0.00` — whichever host listener
runs last wins, and the selection can be lost. A display that already equals the raw text is never
rewritten, which keeps the common cases (`0` under any token) clear of it.

## What it never does

- **Never puts formatted text in the control.** That is the whole contract; everything else follows
  from it.
- **Never formats what is not a number.** Prose in a `textarea`, a half-typed `-`, and a value in
  some other notation are returned exactly as they are rather than coerced into a zero.
- **Never restricts typing.** Pair it with `imsPattern` for that.
- **Never rewrites while the field is focused.** The user's text is theirs until they leave.
- **Never writes a display that is already correct**, so a sibling directive's caret or selection
  survives.
