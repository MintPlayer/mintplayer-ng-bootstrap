import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToggleButtonComponent } from './toggle-button.component';

@Component({
  selector: 'bs-toggle-button',
  template: 'toggle-button'
})
class BsToggleButtonMockComponent {
  @Output() public isToggledChange = new EventEmitter<boolean | null>();
  @Input() public isToggled: boolean | null = false;
  @Input() public round = true;
  @Input() public disabled = false;
}

describe('ToggleButtonComponent', () => {
  let component: ToggleButtonComponent;
  let fixture: ComponentFixture<ToggleButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        // Unit to test
        ToggleButtonComponent,

        // Mock dependencies
        BsToggleButtonMockComponent
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ToggleButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
