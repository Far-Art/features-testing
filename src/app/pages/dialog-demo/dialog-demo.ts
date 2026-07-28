import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  IMS_DIALOG_DATA,
  ImsDialogActions,
  ImsDialogContent,
  ImsDialogRef,
  ImsDialogService,
  ImsDialogSeverity,
  ImsDialogTitle,
  ImsDialogToolbar,
} from '../../components/ims-dialog';

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
          <input type="text" [value]="displayName()" (input)="updateDisplayName($event)" />
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
export class DialogProfileContent {
  readonly data = inject(IMS_DIALOG_DATA) as ProfileDialogData;
  readonly displayName = signal(this.data.account);

  private readonly dialogRef = inject(ImsDialogRef) as ImsDialogRef<
    ProfileDialogResult | undefined
  >;

  updateDisplayName(event: Event): void {
    const target = event.target;
    if (target instanceof HTMLInputElement) {
      this.displayName.set(target.value);
    }
  }

  save(): void {
    this.dialogRef.close({
      status: 'saved',
      displayName: this.displayName().trim() || this.data.account,
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }
}

@Component({
  selector: 'app-dialog-risk-content',
  standalone: true,
  imports: [ImsDialogContent],
  template: `
    <ims-dialog-content>
      <div class="risk-dialog-demo">
        <span class="material-icons" aria-hidden="true">rocket_launch</span>
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

    .risk-dialog-demo > .material-icons {
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
        <span class="material-icons" aria-hidden="true">view_agenda</span>
        Summary
      </button>
      <button
        type="button"
        class="toolbar-dialog-demo__tab"
        [class.toolbar-dialog-demo__tab--active]="view() === 'activity'"
        [attr.aria-pressed]="view() === 'activity'"
        (click)="view.set('activity')"
      >
        <span class="material-icons" aria-hidden="true">history</span>
        Activity
      </button>
      <span class="toolbar-dialog-demo__spacer"></span>
      <button
        type="button"
        class="toolbar-dialog-demo__refresh"
        aria-label="Refresh current view"
        (click)="refreshCount.update((count) => count + 1)"
      >
        <span class="material-icons" aria-hidden="true">refresh</span>
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

    .toolbar-dialog-demo__tab > .material-icons,
    .toolbar-dialog-demo__refresh > .material-icons {
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
  selector: 'app-dialog-demo',
  standalone: true,
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
      .config({ direction: 'ltr', width: 'min(40rem, calc(100vw - 2rem))' })
      .open();

    ref.closed.subscribe(() => {
      this.lastEvent.set('Toolbar dialog closed.');
    });
  }

  openSeverity(severity: ImsDialogSeverity): void {
    const labels: Record<ImsDialogSeverity, string> = {
      info: 'Information dialog',
      success: 'Successful operation',
      warning: 'Warning dialog',
      danger: 'Danger dialog',
    };
    const ref = this.dialog[severity]()
      .title(labels[severity])
      .withIcon()
      .config({ direction: 'ltr', width: 'min(26rem, calc(100vw - 2rem))' })
      .asReadonly()
      .open();

    ref.closed.subscribe(() => {
      this.lastEvent.set(`${labels[severity]} closed.`);
    });
  }
}
