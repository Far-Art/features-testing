# `ImsFocusMode`

`ims-focus-mode` puts a small action beside a native `input` or `textarea` that opens the
field in a dialog with room to read and edit it.

```ts
import {ImsFocusMode} from './components/ims-focus-mode';

@Component({
    imports: [ImsFocusMode]
})
export class NotesPage {}
```

```html
<ims-focus-mode label="הערות">
    <textarea imsInput [formControl]="notes"></textarea>
</ims-focus-mode>
```

Works the same with reactive and template-driven bindings, and with a plain unbound field.

## Inputs

| Attribute | Type | Default | Meaning |
| --- | --- | --- | --- |
| `label` | `string` | `''` | Dialog title. Falls back to the trigger's accessible name. |
| `labels` | `Partial<ImsFocusModeLabels> \| null` | `null` | Per-instance overrides merged over `IMS_FOCUS_MODE_LABELS`. |
| `hint` | `string` | `''` | Note describing what the field expects. |

Application-wide text comes from the `IMS_FOCUS_MODE_LABELS` token.

## The dialog hosts the real control

The dialog does not rebuild the field. A CDK `DomPortal` moves the actual element into the
dialog and restores it to its original position on close. Angular never destroys the
directives on that element, so `NgControl`, every sync and async validator, and the value
accessor stay the same instances throughout. There is nothing to copy and nothing to keep
in sync.

One consequence is worth knowing: the projected control keeps its **original** injector.
Angular dependency injection follows the logical template hierarchy, not the rendered DOM,
so the dialog's own readonly provider does not reach the field. The field's own scope
stays the single source of truth for its state.

## The trigger follows the field

| Field state | Trigger | Dialog |
| --- | --- | --- |
| Editable | the shared `ims-button-edit` affordance | Apply and Cancel |
| Disabled, readonly, or in a readonly scope | an icon button showing `zoom_in` | Cancel only, no editing |

The editable trigger is the house edit affordance rather than an icon chosen here, so it
carries the same glyph as every other edit button in the application and cannot drift from
it. The dialog title takes its icon from the same place. The two states share a rest tone so
that switching between them changes the glyph and nothing else.

State is read from every source that can change it: the Angular control, the native
`disabled` and `readonly` attributes, and the nearest `ims-readonly` provider. All three are
live — a control disabled while the dialog is open takes the dialog readonly with it and
removes the Apply action, without closing.

The trigger itself deliberately stays interactive inside a readonly scope. Reading a locked
value is still allowed, so a readonly field keeps a working zoom-in action.

## Edits are buffered

Keystrokes are stopped before Angular's value accessor observes them and held in a draft.
The control is not modified while the dialog is open — no `valueChanges`, no `dirty`, no
dependent field recalculating against a value the user may still discard.

- **Apply** replays the draft as real user input, so reactive bindings, `ngModel`, `dirty`
  and `touched` all update exactly as if the user had typed into the field in place.
- **Cancel** needs no model work at all, because the control was never modified. Escape and
  a backdrop click take the same path.

If the control is written from outside while the dialog is open, that write wins and the
draft is re-seeded from it — the same thing that would have happened with no dialog open.

## The dialog footer

The footer counts the buffered characters. Where the field enforces a length limit it counts
against it — `142 / 240` — and the count turns invalid once it goes over.

The limit is found without being told about it: a native `maxlength` if the element carries
one, otherwise the limit is recovered from the control's own validators. Angular validators
are opaque functions, so the only way to learn the limit is to run one against a value that
fails it and read `requiredLength` off the resulting error. The probe carries nothing but a
`length`, which is all a length validator inspects, so nothing large is allocated.

**Typing stops at the limit.** While the field is in the dialog its limit is handed to the
browser as a `maxlength` attribute, and the original is restored on close. Letting the
platform enforce it is what keeps caret position, selection replacement, paste truncation and
IME composition correct — none of which a hand-rolled guard gets right for free. A limit the
element already declares is left alone: that is the one the browser was enforcing anyway, and
it wins over a looser validator.

This is scoped to the dialog. A limit the consumer expressed as a validator is theirs to
enforce in their own form row, and quietly making their field reject input everywhere is not
focus mode's call to make.

A field carrying a `required` validator says so in the footer, stated plainly at rest and
called out once the buffered value leaves it unmet.

### Hints

Everything else in the footer is derived from the field. `hint` is the one part that is not,
for what the field cannot say about itself — a readable spelling of a pattern, a unit, an
example value:

```html
<ims-focus-mode label="אסמכתא" hint="בפורמט REF-0000-0000">
    <input imsInput [formControl]="reference"/>
</ims-focus-mode>
```

It takes its own line above the required note and the count, since it is the only one of the
three whose length is unknown here and sharing a line would push the count around as the text
changed.

The hint also becomes the field's `aria-describedby`, so it reaches someone who arrives at the
control by keyboard or screen reader rather than by reading the footer. The reference is added
to any already on the field and removed again by id — `ImsErrorPopoverDirective` maintains its
own on the same attribute, and overwriting it would silence the errors.

**Apply is disabled while the buffered value fails validation.** Because edits are buffered,
the control's own `status` describes the value the user started from, not the one they are
typing, so validity is evaluated against the draft: the control's validators are run against
a detached probe carrying the draft. A validator that reaches past its own control — for a
parent or a sibling — cannot be answered that way, and is treated as satisfied rather than
left to block the dialog on a question that cannot be asked there.

Every validator counts, not only length. A field failing `required`, `minLength` or a
`pattern` disables Apply just as an over-long one does — so the counter alone does not always
explain why Apply is greyed out.

### What buffering costs

A consumer `(input)` handler on the field does not fire while focus mode is open. It fires
once, on Apply. This is inherent to buffering: the same interception that keeps the control
untouched also keeps other listeners on the element from seeing intermediate keystrokes.

## Sizing inside the dialog

A field arrives carrying sizing that was right for a form row, not for a dialog, so the
projection stage takes ownership of it.

| Rule | Effect |
| --- | --- |
| Every projected child is clamped to the stage width | Nothing can exceed the dialog, so it never gains a horizontal scrollbar |
| A `textarea` opens at eight rows | A field written as `rows="1"` still opens with room to work |
| A `textarea` resizes vertically only, in the dialog and in its form row | A horizontal drag cannot push the field past the dialog, or out of the column the form gave it |

The width clamp matters more than it looks. `.ims-dialog-content` sets `overflow-y: auto`,
which resolves its `overflow-x` to `auto` as well, so a field that is merely *wider* than the
dialog does not just overhang — it gives the whole dialog a horizontal scrollbar. `.ims-input`
carries a `min-width`, a `textarea` has an intrinsic `cols` width, and a caller may have added
a fixed width class such as `.field-xxl`; each is clamped.

The height is measured in rows rather than viewport height, so a focus-mode dialog is the
same size on every screen instead of growing to fill a tall one. Change it with
`--ims-focus-mode-textarea-rows`, set on the field or on any ancestor:

```scss
.contract-notes {
    --ims-focus-mode-textarea-rows: 16;
}
```

Vertical-only resizing applies in both places the field can be. In the dialog it protects the
width clamp above; in the form row it keeps the field inside its `.ims-input-action` track.

## Layout

The host uses the shared `.ims-input-action` contract, so the field keeps its own width and
the action is reserved beside it. The component adds `.ims-input-action__field` to the
projected control itself; consumer markup stays a plain field.

While the field is away, a stand-in takes its place so the row does not collapse. The
stand-in is a **clone of the field itself** — the same tag, the same classes, the same
attributes and inline styles — inserted immediately before it and removed on close.

Cloning is what makes this exact rather than approximate. A substitute element has to have
its size measured and reserved, and that only ever gets close: it cannot reproduce a
`textarea`'s `rows`, a height the user dragged to, or the baseline gap an inline-level field
contributes inside the inline-block host. A clone reproduces all of it by construction, and
occupies the same rectangle to the pixel.

The clone is disabled, hidden from assistive technology, and stripped of the `id` and `name`
a clone would otherwise duplicate — `ims-form-field` resolves its label association by id.
It shows the buffered draft, so the row reads as the work in progress rather than the value
the user has already moved past.

Visually it reads as an empty slot rather than a second copy of the field: a transparent
ground, a dashed outline, and the shared low-emphasis disabled text colour. Only the border
*style* differs from the real field — the width stays 1px, so the box is unchanged.

The trigger is sized to the field's own height rather than the shared `2.5rem` action size,
and pinned to the top of the field. `.ims-input-action` centres its action, which is right
for a single-line field and wrong for a textarea: the taller the field, the further the
button drifts from the line the user is looking at.
