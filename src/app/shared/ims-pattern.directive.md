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
| `imsPatternMessage` | `string \| false \| undefined` | `undefined` | What a refusal says. A preset supplies its own sentence, which this replaces; a custom pattern says nothing until given one, and `false` refuses in silence. |
| `imsPatternMin` | `number \| null \| undefined` | none | The smallest value the field may hold. Only on a preset, and only against a value that has already passed it. |
| `imsPatternMax` | `number \| null \| undefined` | none | The largest value the field may hold. Only on a preset, and only against a value that has already passed it. |

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
3. **Test.** The corrected value is tested against the anchored pattern, and — on a preset — against
   the far side of `imsPatternMin` and `imsPatternMax`. An empty value is always accepted; emptiness
   is a validation concern, not a typing one.
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

## Bounding a preset

`imsPatternMin` and `imsPatternMax` put a range around the number a preset describes. Both are
read as numeric attributes, so a literal and a binding are spelled the usual two ways:

```html
<input imsPattern="integer" imsPatternMax="120" />
<input imsPattern="signedDecimal" [imsPatternMin]="floor()" [imsPatternMax]="ceiling()" />
```

They are tested on the same prospective value the pattern is tested on, after correction, and a
value outside the range is refused exactly like a value of the wrong shape. A bound only means
something where there is a number to bound, so **both are ignored on a custom pattern** — naming
a preset is what opts a field into being bounded, just as it is what opts it into being corrected.

### Only the far side of a bound is enforced

Inserting a digit moves a number **away from zero**, and that is what decides which side of a
bound can be guarded at all:

| With | Typing | What happens | Why |
| --- | --- | --- | --- |
| `imsPatternMax="100"` | `1` → `12` → `123` | `123` is refused | it has passed the maximum, and every further digit is worse |
| `imsPatternMin="10"` | `1` | `1` is allowed | it is on its way up to `10` |
| `imsPatternMin="-50"` | `-5` → `-51` | `-51` is refused | it has passed the minimum, and further digits only deepen it |
| `imsPatternMax="-10"` | `-5` | `-5` is allowed | it is on its way down to `-10` |

An upper bound therefore stops a positive value from growing past it, and a lower bound stops a
negative value from falling past it: one rule, read from either side of zero. Refusing the other
half of each pair would block the way to a legal value — turning down `1` under `min="10"` turns
down the first keystroke of `100` — which is the same reason the pattern itself has to accept
partial input.

A partial value is never bounded either, because it is not yet a number the range can speak about:
a lone `-` and a trailing `.` are both `NaN`, and so is an unset bound.

> **A bound you do not have yet is `null`, not `0`.** Both spellings are accepted, and `null` and
> `undefined` read as `NaN` and bound nothing — but `0` is a real maximum, and it refuses every
> positive digit. A limit bound to a signal that starts at zero while it loads makes the field look
> like it refuses everything, because for as long as the zero is there, it does.
>
> ```html
> <!-- unbounded until the limit arrives -->
> <input imsPattern="integer" [imsPatternMax]="limit()" />
> ```
> ```ts
> readonly limit = signal<number | null>(null);
> ```

An insertion into a value that is **already** outside the range is never refused for that bound. A
model value of `5000` under `imsPatternMax="100"`, or a limit that tightens under a value already
above it, would otherwise refuse every keystroke inside it — so the range only ever refuses the
change that would take a value out, never the edits inside one already out.

### The near side is settled on blur

What a keystroke cannot refuse, leaving the field can. On blur the value is held to the **whole**
range, and one still outside it is announced on the error popover exactly like a refused
keystroke — the same sentence, the same once-and-gone window:

```html
<input imsPattern="integer" imsPatternMin="10" ims-error-popover />
```

Typing `5` there is allowed, and walking away from it says *The value may not be less than 10.* An
empty field says nothing: emptiness is `required`'s business, not the range's.

Neither does a control the user has not changed. Where the element carries an `ngModel` or a
`formControl`, a value the form *loaded* outside the range is not something the user did, so
tabbing past the field is silent; the first edit is what gives it a voice. A field with no control
has no such record and always speaks. (The control's own `dirty` is what this reads, backed by the
directive's own record of the first accepted change, because `updateOn: 'blur'` marks a control
dirty in the same blur this listener runs in, and `updateOn: 'submit'` not until submit.)

> **This is still not a validator.** The announcement is a message, not a verdict — like every
> other refusal it leaves the control's own validity, and its `aria-invalid`, exactly as they were.
> A form that must *reject* `5` needs `Validators.min` as well. What the bound adds is that the
> user hears about it the moment they leave, rather than at submit.

### A non-negative minimum takes the sign away

`imsPatternMin="0"`, or any minimum above it, leaves no negative value to be typing towards. So on a
signed preset the `-` itself is refused, before a digit can follow it, and the field says which
bound refused it. `imsPatternMin="-40"` still accepts a lone `-`, because `-40` has to be reachable.

Nor does a bound ever trap a value. A model value of `5000` under `imsPatternMax="100"` is adopted
like any other write from outside the field, and deleting is always allowed, so the value can be
edited back into range.

## Explaining a refusal

A cancelled keystroke leaves nothing behind: no character, no `input` event, and nothing on
screen that says why. Put an `ims-error-popover` on the same element and the directive tells it
about every refusal, so the field explains itself.

```html
<input imsPattern="integer" ims-error-popover />
```

Typing `.` there is refused exactly as before, and the popover says *Only whole numbers are
allowed.*

A preset reads the refusal from the text that was turned down, so a letter and a third decimal
are not told the same thing:

| Refused | Reason | What it says |
| --- | --- | --- |
| anything that is not part of a number, and a `.` in an integer shape | `wholeNumber` / `number` | Only whole numbers are allowed. / Only numbers are allowed. |
| `-` in an unsigned shape | `sign` | A negative value is not allowed. |
| `-` after the first character | `signPlacement` | A minus sign is only allowed at the start. |
| a second `.` | `decimalPoint` | Only one decimal point is allowed. |
| a third fraction digit | `decimals` | Up to two decimals are allowed. |
| a value past `imsPatternMax`, typed or left behind | `max` | The value may not be greater than 100. |
| a value past `imsPatternMin`, and a `-` under a minimum of zero or more | `min` | The value may not be less than -50. |
| anything, under a custom pattern | — | nothing, until `imsPatternMessage` gives it a sentence |

The reason travels with the message, in the payload `{imsPattern: {message, reason}}`, so an
application can word every refusal in its own language from one place — the `imsPattern` entry
of the error-popover mapper — rather than spelling out a sentence on each field:

```ts
provideImsErrorPopoverConfig({
  errorMapper: {
    imsPattern: (error) => {
      const refusal = error as {message: string; reason: string};
      return MESSAGES[refusal.reason] ?? refusal.message;
    },
  },
});
```

A `min` or `max` refusal adds one field to that payload, `bound`, holding the limit the value
passed, so a translation can name the number instead of hard-coding it:

```ts
imsPattern: (error) => {
  const refusal = error as {message: string; reason: string; bound?: number};
  return refusal.reason === 'max' ? `לא יותר מ־${refusal.bound}.` : refusal.message;
},
```

A sentence given with `imsPatternMessage` reports the reason `custom`, which is what lets the
fallback above leave it alone: the call site has already chosen its words. It replaces a bound's
wording too — one field, one sentence, whatever the refusal was.

The message is **announced once**. It stays for the popover's own duration and then goes, and
hovering or focusing the field afterwards does not bring it back — it describes a keystroke that
happened, not a state the field is in. Moving the pointer onto the panel dismisses it early, as
with any error popover, so it never sits in the way of the field it is explaining. Another
refusal announces again and reopens the window; an accepted change, deletion included, withdraws
it early. A popover configured with a duration of `0` has no automatic window at all, and so
shows nothing.

A refusal never marks the control `aria-invalid`, because the value is not the thing that was
wrong. It is a row like any other, so a field that is also invalid shows its validation errors
with the refusal underneath them, until the refusal's window closes and its own errors remain.

## A preset field is laid out for a number

A preset always holds a number, and a number reads left to right whatever the page around it does.
So a field carrying one is given two styles:

```css
direction: ltr;
text-align: end;
```

In an RTL form that keeps the digits in their own reading order while leaving the value against the
edge the eye starts from; in an LTR form it is what the field would have done anyway. A custom
pattern is never styled, because it may hold anything at all — prose in a `textarea` included.

Styling the field this way does not drag its messages along with it: an `ims-error-popover` takes
its direction from the element the field sits in, so in an RTL form the panel still hangs off the
same edge as every other field's.

Both are host bindings, which a binding in the template outranks, so a field that wants something
else says so on the field:

```html
<input imsPattern="integer" [style.text-align]="'start'" />
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
  not match, so a field can always be edited back into shape. A value already outside the range is
  editable for the same reason: only the change that takes a value out of range is refused.
- **Never explains a refusal unasked.** Without an `ims-error-popover` on the element, a refused
  keystroke is simply gone.
- **Never lets a correction bypass the pattern.** Step 3 above runs on the corrected value.
- **Never refuses the near side of a bound.** A value still short of `imsPatternMin` is on its way
  there and is let through. Leaving the field says so, but the keystroke is never cancelled.
- **Never makes a control invalid.** A bound announces, like every other refusal; rejecting a value
  is `Validators.min` and `Validators.max`'s work.
