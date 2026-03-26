import { TestBed } from '@angular/core/testing';
import {of} from 'rxjs';
import { App } from './app';
import {QueryDialogService} from './query-infra/query-dialog.service';
import {QuerySelectionResult} from './query-infra/query.models';

class QueryDialogServiceStub {
  open(_queryKey: string, _scopeInjector?: unknown, _initialFilter?: Record<string, unknown>) {
    return of<QuerySelectionResult | null>(null);
  }
}

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [{provide: QueryDialogService, useClass: QueryDialogServiceStub}]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render title', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Generic Query Infrastructure Demo');
  });
});
