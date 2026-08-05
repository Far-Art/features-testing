import { ChangeDetectionStrategy, Component, Signal, inject, signal } from '@angular/core';
import { ImsAutocomplete, type ImsAutocompleteOption } from '../../components/ims-autocomplete';
import {
  ImsDialogActions,
  ImsDialogContent,
  IMS_DIALOG_READONLY,
  ImsDialogRef,
  ImsDialogService,
  ImsDialogTitle,
  ImsDialogToolbar,
} from '../../components/ims-dialog';
import { ImsOption, ImsSelect } from '../../components/ims-select';
import { ReadonlyDirective } from '../../shared/readonly.directive';
import {ImsGrid, ImsGridCell, ImsGridRow, ImsGridSortHeader} from '../../components/ims-grid';

type ContactMethod = 'Email' | 'Phone' | 'Text message';

@Component({
  selector: 'app-readonly-state',
  template: `
    <span class="readonly-state" [class.readonly-state--locked]="readonly()">
      <span class="readonly-state__lamp" aria-hidden="true"></span>
      {{ readonly() ? 'Readonly' : 'Editable' }}
    </span>
  `,
  styles: `
    .readonly-state {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      color: #21634c;
      font-size: 0.78rem;
      font-weight: 800;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .readonly-state__lamp {
      width: 0.56rem;
      height: 0.56rem;
      border-radius: 50%;
      background: currentColor;
      box-shadow: 0 0 0 4px color-mix(in srgb, currentColor 12%, transparent);
    }

    .readonly-state--locked {
      color: #a84132;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class ReadonlyState {
  readonly readonly: Signal<boolean> = ReadonlyDirective.injectSignal();
}

@Component({
  selector: 'app-readonly-dialog-content',
  imports: [
    ImsDialogActions,
    ImsDialogContent,
    ImsDialogTitle,
    ImsDialogToolbar,
    ImsOption,
    ImsSelect,
    ReadonlyDirective,
  ],
  template: `
    <ims-dialog-title icon="visibility">Customer review</ims-dialog-title>

    <ims-dialog-toolbar>
      <button type="button" class="readonly-dialog-demo__toolbar-button" (click)="refresh()">
        Refresh content · {{ refreshCount() }}
      </button>
    </ims-dialog-toolbar>

    <ims-dialog-content>
      <div class="readonly-dialog-demo__content">
        <p>
          This area receives <code>asReadonly()</code>. The toolbar and footer action remain
          available outside the content provider.
        </p>

        <p>
          Injected dialog signal:
          <strong>{{ dialogReadonly() ? 'Readonly' : 'Editable' }}</strong>
        </p>

        <label>
          <span>Review note</span>
          <input value="Awaiting approval" [ims-readonly]="null" />
        </label>

        <label>
          <span>Preferred contact method</span>
          <ims-select
            filter="off"
            ariaLabel="Preferred contact method"
            [value]="preferredContactMethod()"
            (valueChange)="preferredContactMethod.set($event)"
          >
            @for (method of contactMethods; track method) {
              <ims-option [value]="method">{{ method }}</ims-option>
            }
          </ims-select>
        </label>
      </div>
    </ims-dialog-content>

    <ims-dialog-actions>
      <button type="button" class="readonly-dialog-demo__close-button" (click)="close()">
        Close dialog
      </button>
    </ims-dialog-actions>
  `,
  styles: `
    .readonly-dialog-demo__content {
      display: grid;
      gap: 1rem;
    }

    .readonly-dialog-demo__content p {
      margin: 0;
      color: #597168;
      line-height: 1.55;
    }

    .readonly-dialog-demo__content code {
      color: #9e4032;
      font-family: 'Courier New', monospace;
    }

    .readonly-dialog-demo__content label {
      display: grid;
      gap: 0.4rem;
      color: #34574d;
      font-size: 0.86rem;
      font-weight: 750;
    }

    .readonly-dialog-demo__content input {
      box-sizing: border-box;
      width: 100%;
      padding: 0.7rem 0.75rem;
      border: 1px solid #a9c0b4;
      border-radius: 0.4rem;
      color: #173f36;
      font: inherit;
    }

    .readonly-dialog-demo__content input.ims-readonly {
      color: #6d7772;
      background: #edf0ed;
      border-color: #d5dbd5;
    }

    .readonly-dialog-demo__toolbar-button,
    .readonly-dialog-demo__close-button {
      min-height: 2.25rem;
      padding-inline: 0.8rem;
      border: 1px solid #1d5949;
      border-radius: 0.45rem;
      background: #1d5949;
      color: #fffdf8;
      cursor: pointer;
      font: inherit;
      font-weight: 700;
    }

    .readonly-dialog-demo__close-button {
      background: #fffdf6;
      color: #234b41;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class ReadonlyDialogContent {
  readonly dialogReadonly = inject(IMS_DIALOG_READONLY);
  readonly contactMethods: readonly ContactMethod[] = ['Email', 'Phone', 'Text message'];
  readonly preferredContactMethod = signal<ContactMethod | readonly ContactMethod[] | null | undefined>(
    'Email',
  );
  readonly refreshCount = signal(0);

  private readonly dialogRef = inject(ImsDialogRef);

  refresh(): void {
    this.refreshCount.update((count) => count + 1);
  }

  close(): void {
    this.dialogRef.close();
  }
}

@Component({
  selector: 'app-readonly-demo',
  imports: [ReadonlyDirective, ReadonlyState, ImsSelect, ImsOption, ImsAutocomplete, ImsGrid, ImsGridCell, ImsGridRow],
  templateUrl: './readonly-demo.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './readonly-demo.scss',
})
export class ReadonlyDemo {
  private readonly dialog = inject(ImsDialogService);

  readonly pageReadonly = signal(true);
  readonly allowChildOverride = signal(false);
  readonly contactMethods: readonly ContactMethod[] = ['Email', 'Phone', 'Text message'];
  readonly contactMethodOptions: readonly ImsAutocompleteOption<ContactMethod>[] = this.contactMethods.map(
    (method) => ({ value: method, label: method })
  );
  readonly preferredContactMethod = signal<ContactMethod | readonly ContactMethod[] | null | undefined>(
    'Email'
  );
  readonly preferredContactMethodAutocomplete = signal<
    ContactMethod | string | readonly ContactMethod[] | null | undefined
  >('Phone');

  togglePageReadonly(): void {
    this.pageReadonly.update((readonly) => !readonly);
  }

  toggleChildOverride(): void {
    this.allowChildOverride.update((override) => !override);
  }

  openReadonlyDialog(): void {
    this.dialog.info(ReadonlyDialogContent).asReadonly(this.pageReadonly).open();
  }
}
