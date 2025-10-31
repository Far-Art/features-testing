import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScoopedCircle } from './scooped-circle';

describe('ScoopedCircle', () => {
  let component: ScoopedCircle;
  let fixture: ComponentFixture<ScoopedCircle>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScoopedCircle]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ScoopedCircle);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
