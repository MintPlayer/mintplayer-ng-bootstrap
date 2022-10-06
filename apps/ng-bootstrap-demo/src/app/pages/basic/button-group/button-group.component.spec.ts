import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ButtonGroupComponent } from './button-group.component';

@Component({
  selector: 'bs-button-group',
  template: `
    <div>
      <ng-content></ng-content>
    </div>`
})
class BsButtonGroupMockComponent {}

describe('ButtonGroupComponent', () => {
  let component: ButtonGroupComponent;
  let fixture: ComponentFixture<ButtonGroupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        // Unit to test
        ButtonGroupComponent,
      
        // Mock dependencies
        BsButtonGroupMockComponent
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ButtonGroupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
