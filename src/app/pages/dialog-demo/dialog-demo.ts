import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { ImsButton } from '../../components/ims-button';
import {
  type IBaseOutput,
  type IMessage,
  IMS_DIALOG_DATA,
  ImsAbstractDialog,
  ImsDialogActions,
  ImsDialogContent,
  ImsDialogService,
  ImsDialogSeverity,
  ImsDialogTitle,
  ImsDialogToolbar,
} from '../../components/ims-dialog';
import { ImsGrid, ImsGridCell, ImsGridRow } from '../../components/ims-grid';

interface MergeDialogData {
  readonly fromConfig: string;
  readonly fromBuilder: string;
  readonly shared: string;
}

interface ProfileDialogData {
  readonly account: string;
  readonly plan: string;
}

interface ProfileDialogResult {
  readonly status: 'saved';
  readonly displayName: string;
}

interface RiskDialogData {
  readonly environment: string;
  readonly deployments: number;
}

type DialogButtonReviewResult = 'default' | 'primary' | 'secondary';

const LONG_DIALOG_CONTENT: string[] = [
  'The content region owns all overflow while the dialog title, toolbar, and actions remain fixed in their intrinsic grid rows.',
  'This paragraph begins a deliberately long release summary used to verify scrolling with an explicit dialog height.',
  'Workspace policies now preserve reviewer assignments when a draft is duplicated across environments.',
  'Validation messages include the affected field path and keep their original order after asynchronous checks finish.',
  'Local dialogs continue following their boundary element when the document scrolls and never render a backdrop.',
  'Confirmation dialogs map every empty or negative dismissal path to false while affirmative actions resolve to true.',
  'Builder data and CDK configuration data are shallow-merged, with values supplied through data() taking precedence.',
  'Projected title, toolbar, content, and action sections suppress only the generated sections that they replace.',
  'Material Symbols use explicit optical sizing and weight settings so dialog chrome remains visually consistent.',
  'The overlay pane is available from ImsDialogRef.panelElement for scoped measurement and observation.',
  'Read-only mode can follow a boolean signal and update its generated chrome without reopening the dialog.',
  'If this final paragraph is visible, the content viewport reached the end without moving the title or Close action.',
];

@Component({
  selector: 'app-dialog-merge-content',
  standalone: true,
  template: `
    <div class="merge-dialog-demo">
      <p>
        This component does not declare <code>ims-dialog-content</code>, so the shell wraps the
        entire component automatically.
      </p>
      <dl>
        <div>
          <dt>config.data</dt>
          <dd>{{ data.fromConfig }}</dd>
        </div>
        <div>
          <dt>builder.data</dt>
          <dd>{{ data.fromBuilder }}</dd>
        </div>
        <div>
          <dt>shared key</dt>
          <dd>{{ data.shared }}</dd>
        </div>
      </dl>
    </div>
  `,
  styles: `
    .merge-dialog-demo {
      display: grid;
      gap: 1rem;
    }

    .merge-dialog-demo p {
      margin: 0;
      color: var(--ims-color-on-surface-muted);
      line-height: 1.6;
    }

    .merge-dialog-demo code {
      color: #00005f;
      font-weight: 700;
    }

    .merge-dialog-demo dl {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.625rem;
      margin: 0;
    }

    .merge-dialog-demo dl div {
      min-width: 0;
      padding: 0.75rem;
      border: 1px solid var(--ims-color-border-subtle);
      border-radius: 0.625rem;
      background: var(--ims-color-surface-subtle);
    }

    .merge-dialog-demo dt {
      color: var(--ims-color-on-surface-muted);
      font-size: 0.75rem;
    }

    .merge-dialog-demo dd {
      margin: 0.25rem 0 0;
      overflow: hidden;
      font-weight: 700;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    @media (max-width: 34rem) {
      .merge-dialog-demo dl {
        grid-template-columns: 1fr;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogMergeContent {
  readonly data = inject(IMS_DIALOG_DATA) as MergeDialogData;
}

@Component({
  selector: 'app-dialog-profile-content',
  standalone: true,
  imports: [ImsDialogActions, ImsDialogContent, ImsDialogTitle, ImsDialogToolbar],
  template: `
    <ims-dialog-title icon="manage_accounts">Edit account profile</ims-dialog-title>

    <ims-dialog-toolbar>
      <span class="profile-dialog-demo__toolbar-label">Custom toolbar</span>
    </ims-dialog-toolbar>

    <ims-dialog-content>
      <div class="profile-dialog-demo">
        <div class="profile-dialog-demo__identity">
          <span class="profile-dialog-demo__avatar">{{ data.account.slice(0, 1) }}</span>
          <span>
            <strong>{{ data.account }}</strong>
            <small>{{ data.plan }} plan</small>
          </span>
        </div>

        <label>
          <span>Display name</span>
          <input  type="text" [value]="displayName()" (input)="updateDisplayName($event)" />
        </label>

        <p>
          All four supporting components come from the supplied component. Builder title and icon
          options are intentionally ignored.
        </p>
      </div>
    </ims-dialog-content>

    <ims-dialog-actions>
      <button type="button" class="profile-dialog-demo__button" (click)="cancel()">Cancel</button>
      <button
        type="button"
        class="profile-dialog-demo__button profile-dialog-demo__button--primary"
        (click)="save()"
      >
        Save profile
      </button>
    </ims-dialog-actions>
  `,
  styles: `
    .profile-dialog-demo {
      display: grid;
      gap: 1.125rem;
    }

    .profile-dialog-demo__identity {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.875rem;
      border-radius: 0.75rem;
      background: #f3f8ff;
    }

    .profile-dialog-demo__identity > span:last-child {
      display: grid;
      gap: 0.125rem;
    }

    .profile-dialog-demo__identity small {
      color: var(--ims-color-on-surface-muted);
    }

    .profile-dialog-demo__avatar {
      display: grid;
      place-items: center;
      width: 2.625rem;
      height: 2.625rem;
      border-radius: 0.75rem;
      background: #1f7a4d;
      color: #fff;
      font-size: 1.1rem;
      font-weight: 800;
    }

    .profile-dialog-demo label {
      display: grid;
      gap: 0.375rem;
      color: var(--ims-color-on-surface-muted);
      font-size: 0.8rem;
      font-weight: 650;
    }

    .profile-dialog-demo input {
      min-height: 2.5rem;
      padding: 0 0.75rem;
      border: 1px solid var(--ims-color-border);
      border-radius: 0.625rem;
      background: var(--ims-background-input);
      color: var(--ims-color-on-surface);
      font: inherit;
    }

    .profile-dialog-demo input:focus {
      border-color: var(--ims-color-interactive);
      outline: none;
      box-shadow: 0 0 0 3px var(--ims-color-focus-ring);
    }

    .profile-dialog-demo p {
      margin: 0;
      color: var(--ims-color-on-surface-muted);
      font-size: 0.84rem;
      line-height: 1.55;
    }

    .profile-dialog-demo__toolbar-label {
      padding: 0.25rem 0.5rem;
      border-radius: 999px;
      background: var(--ims-color-surface-subtle);
      color: var(--ims-color-on-surface-muted);
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
    }

    .profile-dialog-demo__button {
      min-height: 2.375rem;
      padding: 0.5rem 1rem;
      border: 1px solid var(--ims-color-border);
      border-radius: 0.625rem;
      background: var(--ims-background-dialog);
      color: var(--ims-color-on-surface);
      font: inherit;
      font-weight: 650;
      cursor: pointer;
    }

    .profile-dialog-demo__button--primary {
      border-color: #1f7a4d;
      background: #1f7a4d;
      color: #fff;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogProfileContent extends ImsAbstractDialog<
  ProfileDialogData,
  ProfileDialogResult | undefined
> {
  readonly data = this.dialogData;
  readonly displayName = signal(this.dialogData.account);

  updateDisplayName(event: Event): void {
    const target = event.target;
    if (target instanceof HTMLInputElement) {
      this.displayName.set(target.value);
    }
  }

  save(): void {
    this.closeDialog({
      status: 'saved',
      displayName: this.displayName().trim() || this.data.account,
    });
  }

  cancel(): void {
    this.closeDialog();
  }
}

@Component({
  selector: 'app-dialog-risk-content',
  standalone: true,
  imports: [ImsDialogContent],
  template: `
    <ims-dialog-content>
      <div class="risk-dialog-demo">
        <span class="material-symbols-sharp" aria-hidden="true">rocket_launch</span>
        <div>
          <strong>{{ data.deployments }} deployments are waiting</strong>
          <p>
            Continuing will deploy the current release to
            <b>{{ data.environment }}</b
            >.
          </p>
        </div>
      </div>
    </ims-dialog-content>
  `,
  styles: `
    .risk-dialog-demo {
      display: flex;
      align-items: flex-start;
      gap: 0.875rem;
    }

    .risk-dialog-demo > .material-symbols-sharp {
      display: grid;
      place-items: center;
      flex: 0 0 auto;
      width: 2.5rem;
      height: 2.5rem;
      border-radius: 0.75rem;
      background: #fbf1dc;
      color: #b7791f;
    }

    .risk-dialog-demo strong {
      color: var(--ims-color-on-surface);
    }

    .risk-dialog-demo p {
      margin: 0.375rem 0 0;
      color: var(--ims-color-on-surface-muted);
      line-height: 1.55;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogRiskContent {
  readonly data = inject(IMS_DIALOG_DATA) as RiskDialogData;
}

@Component({
  selector: 'app-dialog-button-review-content',
  standalone: true,
  imports: [ImsButton, ImsDialogActions, ImsDialogContent],
  template: `
    <ims-dialog-content>
      <p class="button-review-dialog__description">
        Compare the header close sweep with each action button variant for this severity.
      </p>
    </ims-dialog-content>

    <ims-dialog-actions>
      <button ims-button icon="tune" (click)="select('default')">Default action</button>
      <button ims-button ims-button-variation="secondary" icon="visibility" (click)="select('secondary')">
        Secondary action
      </button>
      <button ims-button ims-button-variation="primary" icon="check" (click)="select('primary')">Primary action</button>
    </ims-dialog-actions>
  `,
  styles: `
    .button-review-dialog__description {
      margin: 0;
      color: var(--ims-color-on-surface-muted);
      line-height: 1.6;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogButtonReviewContent extends ImsAbstractDialog<
  unknown,
  DialogButtonReviewResult
> {
  select(result: DialogButtonReviewResult): void {
    this.closeDialog(result);
  }
}

@Component({
  selector: 'app-dialog-toolbar-content',
  standalone: true,
  imports: [ImsDialogContent, ImsDialogTitle, ImsDialogToolbar],
  template: `
    <ims-dialog-title icon="dashboard_customize">Workspace overview</ims-dialog-title>

    <ims-dialog-toolbar aria-label="Workspace view">
      <button
        type="button"
        class="toolbar-dialog-demo__tab"
        [class.toolbar-dialog-demo__tab--active]="view() === 'summary'"
        [attr.aria-pressed]="view() === 'summary'"
        (click)="view.set('summary')"
      >
        <span class="material-symbols-sharp" aria-hidden="true">view_agenda</span>
        Summary
      </button>
      <button
        type="button"
        class="toolbar-dialog-demo__tab"
        [class.toolbar-dialog-demo__tab--active]="view() === 'activity'"
        [attr.aria-pressed]="view() === 'activity'"
        (click)="view.set('activity')"
      >
        <span class="material-symbols-sharp" aria-hidden="true">history</span>
        Activity
      </button>
      <span class="toolbar-dialog-demo__spacer"></span>
      <button
        type="button"
        class="toolbar-dialog-demo__refresh"
        aria-label="Refresh current view"
        (click)="refreshCount.update((count) => count + 1)"
      >
        <span class="material-symbols-sharp" aria-hidden="true">refresh</span>
      </button>
    </ims-dialog-toolbar>

    <ims-dialog-content>
      <div class="toolbar-dialog-demo__content">
        @if (view() === 'summary') {
          <span class="toolbar-dialog-demo__eyebrow">Current state</span>
          <h3>Everything is ready for review.</h3>
          <p>
            This body is projected independently from the toolbar. Switching views changes only the
            content region while the title and close control stay in place.
          </p>
        } @else {
          <span class="toolbar-dialog-demo__eyebrow">Recent activity</span>
          <h3>Three updates today.</h3>
          <p>
            Policy rules were synchronized, two reviewers were assigned, and the workspace passed
            its latest validation.
          </p>
        }

        <span class="toolbar-dialog-demo__refresh-count">
          Refreshes in this session: {{ refreshCount() }}
        </span>
      </div>
    </ims-dialog-content>
  `,
  styles: `
    .toolbar-dialog-demo__tab,
    .toolbar-dialog-demo__refresh {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 2rem;
      border: 0;
      border-radius: 0.5rem;
      background: transparent;
      color: var(--ims-color-on-surface-muted);
      cursor: pointer;
    }

    .toolbar-dialog-demo__tab {
      gap: 0.375rem;
      padding: 0.375rem 0.625rem;
      font: inherit;
      font-size: 0.8125rem;
      font-weight: 650;
    }

    .toolbar-dialog-demo__tab > .material-symbols-sharp,
    .toolbar-dialog-demo__refresh > .material-symbols-sharp {
      font-size: 1.125rem;
    }

    .toolbar-dialog-demo__tab:hover,
    .toolbar-dialog-demo__refresh:hover {
      background: var(--ims-color-interactive-subtle);
      color: var(--ims-color-interactive-strong);
    }

    .toolbar-dialog-demo__tab:focus-visible,
    .toolbar-dialog-demo__refresh:focus-visible {
      outline: 2px solid var(--ims-color-focus-ring);
      outline-offset: 1px;
    }

    .toolbar-dialog-demo__tab--active {
      background: var(--ims-color-interactive-subtle);
      color: var(--ims-color-interactive-strong);
    }

    .toolbar-dialog-demo__spacer {
      flex: 1 1 auto;
    }

    .toolbar-dialog-demo__refresh {
      width: 2rem;
      padding: 0;
    }

    .toolbar-dialog-demo__content {
      min-height: 10rem;
    }

    .toolbar-dialog-demo__eyebrow {
      color: var(--ims-color-interactive-strong);
      font-size: 0.6875rem;
      font-weight: 750;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .toolbar-dialog-demo__content h3 {
      margin: 0.5rem 0 0;
      color: var(--ims-color-on-surface);
      font-size: 1.25rem;
    }

    .toolbar-dialog-demo__content p {
      max-width: 34rem;
      margin: 0.625rem 0 1.25rem;
      color: var(--ims-color-on-surface-muted);
      line-height: 1.6;
    }

    .toolbar-dialog-demo__refresh-count {
      display: inline-flex;
      padding: 0.375rem 0.625rem;
      border: 1px solid var(--ims-color-border-subtle);
      border-radius: 999px;
      color: var(--ims-color-on-surface-muted);
      font-size: 0.75rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogToolbarContent {
  readonly view = signal<'summary' | 'activity'>('summary');
  readonly refreshCount = signal(0);
}

@Component({
  selector: 'app-dialog-grid-content',
  standalone: true,
  imports: [ImsDialogContent, ImsGrid, ImsGridCell, ImsGridRow],
  template: `
    <ims-dialog-content>
      <div class="dialog-grid-demo__intro">
        <strong>Sticky grid header test</strong>
        <p>Scroll this dialog body. The column header should remain pinned to its top edge.</p>
      </div>

      <ims-grid appearance="styled" columnGap="16" rowGap="0">
        <ims-grid-header>
          <ims-grid-cell width="5rem">ID</ims-grid-cell>
          <ims-grid-cell minWidth="12rem">Policy holder</ims-grid-cell>
          <ims-grid-cell width="8rem">Status</ims-grid-cell>
          <ims-grid-cell width="8rem">Premium</ims-grid-cell>
        </ims-grid-header>

        @for (row of rows; track row.id) {
          <ims-grid-row>
            <ims-grid-cell>{{ row.id }}</ims-grid-cell>
            <ims-grid-cell>{{ row.holder }}</ims-grid-cell>
            <ims-grid-cell>
              <span class="dialog-grid-demo__status">{{ row.status }}</span>
            </ims-grid-cell>
            <ims-grid-cell>{{ row.premium }}</ims-grid-cell>
          </ims-grid-row>
        }
      </ims-grid>
    </ims-dialog-content>
  `,
  styles: `
    .dialog-grid-demo__intro {
      margin-block-end: 1rem;
    }

    .dialog-grid-demo__intro strong {
      color: var(--ims-color-on-surface);
      font-size: 1.05rem;
    }

    .dialog-grid-demo__intro p {
      margin: 0.375rem 0 0;
      color: var(--ims-color-on-surface-muted);
      line-height: 1.5;
    }

    ims-grid-header {
      position: sticky;
      z-index: 1;
      top: 0;
      min-height: 3rem;
      padding-block: 0.75rem;
      border-bottom: 1px solid var(--ims-color-border-subtle);
      background: var(--ims-color-surface-subtle);
      box-shadow: 0 0.35rem 0.75rem rgb(22 35 58 / 10%);
    }

    ims-grid-row {
      min-height: 3rem;
      padding-block: 0.65rem;
      border-bottom: 1px solid var(--ims-color-border-subtle);
    }

    ims-grid-row:last-child {
      border-bottom: 0;
    }

    ims-grid-cell {
      padding-inline: 0.75rem;
    }

    .dialog-grid-demo__status {
      padding: 0.2rem 0.5rem;
      border-radius: 999px;
      background: var(--ims-color-interactive-subtle);
      color: var(--ims-color-interactive-strong);
      font-size: 0.75rem;
      font-weight: 700;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogGridContent {
  readonly rows = Array.from({ length: 32 }, (_, index) => ({
    id: `P-${String(index + 1).padStart(3, '0')}`,
    holder: ['Avery Morgan', 'Noah Williams', 'Maya Cohen', 'Liam Bennett'][index % 4],
    status: index % 5 === 0 ? 'Review' : 'Active',
    premium: `$${(86 + index * 7).toLocaleString()}`,
  }));
}

@Component({
  selector: 'app-dialog-inside-content',
  standalone: true,
  imports: [ImsDialogContent],
  template: `
    <ims-dialog-content>
      <div class="inside-dialog-demo">
        <span class="material-symbols-sharp" aria-hidden="true">select_all</span>
        <div>
          <strong>Bound to this workspace</strong>
          <p>
            Drag the title toward every edge. The dialog stays inside the dashed area and the page
            remains interactive because no backdrop is rendered.
          </p>
        </div>
      </div>
    </ims-dialog-content>
  `,
  styles: `
    .inside-dialog-demo {
      display: flex;
      align-items: flex-start;
      gap: 0.875rem;
    }

    .inside-dialog-demo > .material-symbols-sharp {
      display: grid;
      place-items: center;
      flex: 0 0 auto;
      width: 2.5rem;
      height: 2.5rem;
      border-radius: 0.75rem;
      background: var(--ims-color-interactive-subtle);
      color: var(--ims-color-interactive-strong);
    }

    .inside-dialog-demo strong {
      color: var(--ims-color-on-surface);
    }

    .inside-dialog-demo p {
      margin: 0.375rem 0 0;
      color: var(--ims-color-on-surface-muted);
      line-height: 1.55;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogInsideContent {}

@Component({
  selector: 'app-dialog-inside-playground',
  standalone: true,
  template: `
    <div class="dialog-demo-inside__copy">
      <span class="dialog-demo-inside__eyebrow">Scoped overlay · 07</span>
      <h2 id="dialog-demo-inside-title">A dialog with a smaller world.</h2>
      <p>
        The builder resolves this dashed workspace by class name, centers the dialog within it,
        removes the backdrop, and uses the element itself as the drag boundary.
      </p>
      <code>.inside('dialog-demo-inside-boundary')</code>
    </div>

    <div class="dialog-demo-inside-boundary">
      <span class="dialog-demo-inside__boundary-label">Active drag boundary</span>
      <button type="button" (click)="open()">Open inside this area</button>
    </div>
  `,
  styleUrl: './dialog-inside-demo.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'dialog-demo-inside',
    role: 'region',
    'aria-labelledby': 'dialog-demo-inside-title',
  },
})
export class DialogInsidePlayground {
  /** Emits the event-console message after the inside-boundary dialog closes. */
  readonly dialogClosed = output<string>();

  private readonly dialog = inject(ImsDialogService);

  open(): void {
    const ref = this.dialog
      .info(DialogInsideContent)
      .title('Inside the workspace')
      .withIcon('picture_in_picture')
      .inside('dialog-demo-inside-boundary')
      .config({ direction: 'ltr', width: 'min(28rem, calc(100vw - 2rem))' })
      .asReadonly()
      .open();

    ref.closed.subscribe(() => {
      this.dialogClosed.emit('Inside-boundary dialog closed.');
    });
  }
}

@Component({
  selector: 'app-dialog-demo',
  standalone: true,
  imports: [DialogInsidePlayground],
  templateUrl: './dialog-demo.html',
  styleUrl: './dialog-demo.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    dir: 'ltr',
  },
})
export class DialogDemo {
  private readonly dialog = inject(ImsDialogService);

  readonly lastEvent = signal('No dialog has been opened yet.');

  openConfirmation(): void {
    const ref = this.dialog
      .danger()
      .title('Delete archived policy?')
      .withIcon('delete_forever')
      .config({ direction: 'ltr', width: 'min(28rem, calc(100vw - 2rem))' })
      .asConfirmation('yes_no')
      .open();

    ref.closed.subscribe((confirmed) => {
      this.lastEvent.set(
        confirmed ? 'Deletion confirmed — returned true.' : 'Deletion cancelled — returned false.',
      );
    });
  }

  openMergedData(): void {
    const ref = this.dialog
      .info(DialogMergeContent)
      .title('Merged dialog data')
      .withIcon('data_object')
      .config({
        direction: 'ltr',
        width: 'min(40rem, calc(100vw - 2rem))',
        data: {
          fromConfig: 'CDK config payload',
          shared: 'config value',
        },
      })
      .data({
        fromBuilder: 'Builder payload',
        shared: 'builder wins',
      })
      .asReadonly()
      .open();

    ref.closed.subscribe(() => {
      this.lastEvent.set('Read-only merged-data dialog closed.');
    });
  }

  openCustomLayout(): void {
    const ref = this.dialog
      .success(DialogProfileContent)
      .title('Generated title is suppressed')
      .withIcon('auto_awesome')
      .data<ProfileDialogData>({
        account: 'Avery Morgan',
        plan: 'Professional',
      })
      .config({
        direction: 'ltr',
        width: 'min(38rem, calc(100vw - 2rem))',
      })
      .open<ProfileDialogResult>();

    ref.closed.subscribe((result) => {
      this.lastEvent.set(
        result
          ? `Custom dialog returned: ${result.displayName}.`
          : 'Custom profile dialog dismissed without a result.',
      );
    });
  }

  openHybridConfirmation(): void {
    const ref = this.dialog
      .warning(DialogRiskContent)
      .title('Release to production?')
      .withIcon()
      .data<RiskDialogData>({
        environment: 'production-eu-2',
        deployments: 4,
      })
      .config({ direction: 'ltr', width: 'min(32rem, calc(100vw - 2rem))' })
      .asConfirmation({
        yes: 'Deploy now',
        no: 'Review first',
      })
      .open();

    ref.closed.subscribe((confirmed) => {
      this.lastEvent.set(
        confirmed ? 'Production deployment approved.' : 'Production deployment deferred.',
      );
    });
  }

  openToolbarDemo(): void {
    const ref = this.dialog
      .info(DialogToolbarContent)
      .config({
        direction: 'ltr',
        width: 'min(40rem, calc(100vw - 2rem))',
        height: 'min(30rem, calc(100vh - 2rem))',
      })
      .open();

    ref.closed.subscribe(() => {
      this.lastEvent.set('Toolbar dialog closed.');
    });
  }

  openLongContent(): void {
    const ref = this.dialog
      .info(LONG_DIALOG_CONTENT)
      .title('Scrollable release notes')
      .withIcon('article')
      .config({
        direction: 'ltr',
        width: 'min(36rem, calc(100vw - 2rem))',
        height: 'min(30rem, calc(100vh - 2rem))',
      })
      .asReadonly()
      .open();

    ref.closed.subscribe(() => {
      this.lastEvent.set('Long-content dialog closed.');
    });
  }

  openGridContent(): void {
    const ref = this.dialog
      .info(DialogGridContent)
      .title('Policies grid')
      .withIcon('table_view')
      .config({
        direction: 'ltr',
        width: 'min(52rem, calc(100vw - 2rem))',
        height: 'min(34rem, calc(100vh - 2rem))',
      })
      .asReadonly()
      .open();

    ref.closed.subscribe(() => {
      this.lastEvent.set('Sticky-header grid dialog closed.');
    });
  }

  openBaseOutput(resultCode: 0 | -12): void {
    const output: IBaseOutput = {
      resultCode,
      resultDesc:
        resultCode === 0
          ? 'The policy review completed successfully.'
          : 'The policy review could not be completed.',
      messages: [
        { level: 1, message: 'The submitted values were preserved.' },
        { level: 3, message: 'The selected policy is no longer active.' },
        { level: 2, message: 'Review the effective date before trying again.' },
      ],
    };
    const ref = this.dialog
      .info(output)
      .title(resultCode === 0 ? 'Successful result output' : 'Failed result output')
      .withIcon(resultCode === 0 ? 'task_alt' : 'error')
      .config({ direction: 'ltr', width: 'min(38rem, calc(100vw - 2rem))' })
      .asReadonly()
      .open();

    ref.closed.subscribe(() => {
      this.lastEvent.set(`Base output dialog with result code ${resultCode} closed.`);
    });
  }

  openMessageList(): void {
    const messages: IMessage[] = [
      { level: 1, message: 'No saved values were changed.' },
      { level: 3, message: 'Customer authorization has expired.' },
      { level: 0, message: 'A new review can be started at any time.' },
      { level: 2, message: 'One supporting document needs attention.' },
    ];
    const ref = this.dialog
      .info(messages)
      .title('Validation messages')
      .withIcon('format_list_bulleted')
      .config({ direction: 'ltr', width: 'min(38rem, calc(100vw - 2rem))' })
      .asReadonly()
      .open();

    ref.closed.subscribe(() => {
      this.lastEvent.set('Standalone message-list dialog closed.');
    });
  }

  openTimedReadonlyConfirmation(): void {
    const ref = this.dialog
      .warning(
        'This dialog starts with confirmation actions. After two seconds readonly takes over and shows Close; after another two seconds confirmation returns.',
      )
      .title('Reactive confirmation state')
      .withIcon('timer')
      .config({ direction: 'ltr', width: 'min(38rem, calc(100vw - 2rem))' })
      .asConfirmation({ yes: 'Approve', no: 'Reject' })
      .open();
    const readonlyTimer = window.setTimeout(() => ref.setReadonly(), 2_000);
    const confirmationTimer = window.setTimeout(() => ref.setReadonly(false), 4_000);

    ref.closed.subscribe((confirmed) => {
      window.clearTimeout(readonlyTimer);
      window.clearTimeout(confirmationTimer);
      this.lastEvent.set(
        confirmed
          ? 'Timed confirmation approved.'
          : 'Timed confirmation rejected or closed while readonly.',
      );
    });
  }

  openSeverity(severity: ImsDialogSeverity): void {
    const labels: Record<ImsDialogSeverity, string> = {
      info: 'Information dialog',
      success: 'Successful operation',
      warning: 'Warning dialog',
      danger: 'Danger dialog',
    };
    const ref = this.dialog[severity](DialogButtonReviewContent)
      .title(labels[severity])
      .withIcon()
      .config({ direction: 'ltr', width: 'max-content' })
      .open<DialogButtonReviewResult>();

    ref.closed.subscribe((result) => {
      this.lastEvent.set(
        result
          ? `${labels[severity]} ${result} button selected.`
          : `${labels[severity]} header close selected.`,
      );
    });
  }
}
