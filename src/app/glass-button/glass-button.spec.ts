import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GlassButton } from './glass-button';

describe('GlassButton', () => {
  let component: GlassButton;
  let fixture: ComponentFixture<GlassButton>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GlassButton]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GlassButton);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
