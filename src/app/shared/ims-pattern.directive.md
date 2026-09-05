# `ImsPatternDirective`

`ImsPatternDirective` restricts what can be typed, pasted or dropped into a native text field to
values that match a pattern. It is a guard, not a formatter: it decides at `beforeinput` whether
the value the field is *about* to hold may exist, and cancels the keystroke when it may not. It is
standalone and is selected with the `imsPattern` attribute on `input` and `textarea`.

```ts
import { ImsPatternDirective } from './shared/ims-pattern.directive';

@Component({
  imports: [ImsPatternDirective],
})
export class InvoiceForm {}
```

```html
<input imsPattern="decimal" [(ngModel)]="amount" />
<input imsPattern="[a-z0-9-]*" />
<textarea [imsPattern]="/[א-ת0-9 ,.\n-]*/"></textarea>
```

Because the keystroke is cancelled before the DOM changes, no `input` event fires and the bound
`ngModel` or `FormControl` never sees the rejected text.

## Inputs

| Attribute | Type | Default | Meaning |
| --- | --- | --- | --- |
| `imsPattern` | `ImsPatternPreset \| RegExp \| string` | required | What the value must match. A preset name, a regular expression, or its source text. |
| `imsPatternCorrect` | `ImsPatternCorrector \| false \| undefined` | `undefined` | Replaces the correction a preset applies. A function corrects with your own rule and is the only way a custom pattern corrects at all; `false` guards without ever rewriting. |

The pattern is always anchored to the whole value, as `^(?:…)$`, matching the semantics of the
native `pattern` attribute. `g` and `y` flags are stripped, because they make `test` stateful and
would reject every other keystroke; every other flag is kept.

## Presets

| Name | Accepts while typing | Rejects |
| --- | --- | --- |
| `integer` | `0`, `7`, `1250` | a leading zero, a dot, a minus |
| `decimal` | the above, plus `12.`, `12.3`, `12.34` | a third fraction digit, a minus |
| `signedInteger` | the `integer` values, plus `-` alone and `-42` | `--`, a minus that is not first |
| `signedDecimal` | the `decimal` values, plus `-`, `-.5`, `-1250.75` | as above |

The compiled patterns are exported as `IMS_PATTERN`, so a call site can bind one explicitly
instead of naming it:

```html
<input imsPattern="decimal" />
<input [imsPattern]="IMS_PATTERN.decimal" />
```

Both spellings behave identically — a preset is recognised by name *or* by the identity of the
exported instance, so the explicit form keeps the correction and the focus behavior. A regex with
the same source but a different identity is treated as a custom pattern.

> These are **typing** patterns, not validators. They deliberately accept partial input, so
> `decimal` accepts `12.` and `signedDecimal` accepts a lone `-`. Do not hand one to
> `Validators.pattern` expecting it to reject those, and note that `Validators.pattern` does not
> anchor a `RegExp` argument at all — `Validators.pattern(IMS_PATTERN.integer)` would accept
> `abc7`. A form that must reject partial values needs its own, stricter validator.

## How one keystroke is decided

1. **Project.** The current value with the selection replaced by the inserted text.
2. **Correct.** The corrector in force proposes a rewrite of that projected value.
3. **Test.** The corrected value is tested against the anchored pattern. An empty value is always
   accepted; emptiness is a validation concern, not a typing one.
4. **Act.** Failing the test cancels the keystroke. Passing it unchanged lets the browser insert
   normally. Passing it *changed* cancels the keystroke and writes the corrected value instead,
   dispatching an `input` event so Angular forms follow.

Deletions never reach this pipeline — see below. An insertion the browser will not let us cancel,
such as committed IME text, is settled from the `input` event instead: the same correction runs,
and a value that still fails is rolled back to the last accepted one, caret included.

## The pattern must accept partial input

The whole prospective value is tested on every keystroke, so a pattern that only describes a
finished value blocks the way to it.

| Pattern | Typing `123` | Why |
| --- | --- | --- |
| `[0-9]{3}` | refused at the first key | `1` is not three digits |
| `[0-9]{0,3}` | `1` → `12` → `123` | every intermediate value matches |

This is also why the signed presets accept a lone `-`: it is the first keystroke of every negative
number.

## Correction

A preset does not only refuse. Two numeric shapes are worth fixing instead, and both are applied
to text being **inserted**, whether typed or pasted:

| Typed or pasted | Becomes | Rule |
| --- | --- | --- |
| `0` then `1` | `1` | a zero followed by a digit is dropped |
| `007` (paste) | `7` | the same rule, greedily |
| `.` | `0.` | a leading dot gains its zero |
| `-01` | `-1` | the minus is set aside, then the same rules apply |
| `-.5` | `-0.5` | as above |
| `0` then `0` | `0` | no digit follows the survivor |

The caret follows the correction: it shifts only when the correction changed something in front of
it, so a corrector that edits behind the caret leaves it where it was.

### Supplying your own

```ts
export type ImsPatternCorrector = (value: string) => string;
```

The corrector receives the **whole projected value** — the current value with the selection
replaced by the inserted text — and returns the value to write instead. Returning the argument
unchanged means "nothing to fix", and costs nothing: the native insertion simply proceeds.

It must be:

- **Pure**, with no reading of the element and no side effects.
- **Idempotent**, `correct(correct(v)) === correct(v)`. Its result is written back through an
  `input` event that re-enters the same pipeline.
- **Cheap.** It runs once per inserted character.

Its result is still tested against the pattern, so a correction cannot smuggle in a value the
guard would refuse — a corrector that returns something the pattern rejects simply refuses the
keystroke.

```html
<!-- a rule of your own, on a pattern that is not a preset -->
<input imsPattern="[a-z0-9]*" [imsPatternCorrect]="toLowerCase" />

<!-- the preset's pattern, with nothing ever rewritten -->
<input imsPattern="decimal" [imsPatternCorrect]="false" />
```

## A zero is selected on focus

For a preset, focusing a field whose value reads as zero — `0`, `0.00`, `-0` — selects it whole, so
typing replaces it rather than appending to it. A pointer press would normally collapse that
selection on `mouseup`; the directive prevents exactly that one `mouseup`. Focus reached by keyboard
is unaffected.

## What it never does

- **Never rewrites a deletion.** Backspacing the `0` out of `0.5` leaves `.5`. Correcting there
  would put the zero straight back and the delete would look broken.
- **Never rewrites a value the application wrote.** A model value of `007` stays `007` until the
  user edits the field; the guard does not correct its own source of truth on init.
- **Never corrects a custom pattern** unless given a corrector. Naming a preset is what opts a
  field into being rewritten.
- **Never traps a value.** Deletion, undo, and outside writes are always adopted, even when they do
  not match, so a field can always be edited back into shape.
- **Never lets a correction bypass the pattern.** Step 3 above runs on the corrected value.
