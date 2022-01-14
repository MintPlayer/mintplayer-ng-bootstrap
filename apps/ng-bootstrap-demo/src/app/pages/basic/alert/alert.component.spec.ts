import { Component, Input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AlertComponent } from './alert.component';

enum Color {
  primary,
  secondary,
  success,
  danger,
  warning,
  info,
  light,
  dark,
  body,
  white,
  transparent
}

@Component({
  selector: 'bs-alert',
  template: `
    <div>
      <ng-content></ng-content>
    </div>`
})
class BsAlertMockComponent {
  @Input() public type: Color = Color.primary;
}

@Component({
  selector: 'bs-alert-close',
  template: `
    <button>
      <span>×</span>
    </button>`
})
class BsAlertCloseMockComponent {
}

describe('AlertComponent', () => {
  let component: AlertComponent;
  let fixture: ComponentFixture<AlertComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        // Unit to test
        AlertComponent,

        // Mock dependencies
        BsAlertMockComponent,
        BsAlertCloseMockComponent
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AlertComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
