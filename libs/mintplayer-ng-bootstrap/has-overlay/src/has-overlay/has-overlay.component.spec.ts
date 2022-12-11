import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HasOverlayComponent } from './has-overlay.component';

describe('HasOverlayComponent', () => {
  let component: HasOverlayComponent;
  let fixture: ComponentFixture<HasOverlayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [HasOverlayComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HasOverlayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
