import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ToggleButtonsComponent } from './toggle-buttons.component';

describe('ToggleButtonsComponent', () => {
  let component: ToggleButtonsComponent;
  let fixture: ComponentFixture<ToggleButtonsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ToggleButtonsComponent]
    });
    fixture = TestBed.createComponent(ToggleButtonsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
