import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BsHasOverlayComponent } from './has-overlay.component';

describe('BsHasOverlayComponent', () => {
  let component: BsHasOverlayComponent;
  let fixture: ComponentFixture<BsHasOverlayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BsHasOverlayComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BsHasOverlayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
