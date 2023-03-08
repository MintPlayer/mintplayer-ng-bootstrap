import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MockComponent } from 'ng-mocks';
import { BsColorPickerComponent } from '../../component/color-picker.component';
import { BsColorPickerValueAccessor } from './color-picker-value-accessor.directive';

describe('BsColorPickerValueAccessor', () => {
  let component: ColorPickerTestComponent;
  let fixture: ComponentFixture<ColorPickerTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        FormsModule
      ],
      declarations: [
        // Unit to test
        BsColorPickerValueAccessor,

        // Mock dependencies
        MockComponent(BsColorPickerComponent),

        // Testbench
        ColorPickerTestComponent
      ]
    })
    .compileComponents();
  });

  // beforeEach(() => MockBuilder(BsColorPickerValueAccessor, BsColorPickerModule));

  beforeEach(async () => {
    fixture = TestBed.createComponent(ColorPickerTestComponent)
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create an instance', () => {
    expect(component).toBeTruthy();
  });

  // it('should detect value changes', () => {
  //   component.selectedColor = '#FF0000';
  //   expect(component.directive.onValueChange).toHaveBeenCalled();
  // });
});

@Component({
  selector: 'color-picker-test',
  template: `
    <bs-color-picker [(ngModel)]="selectedColor" #picker #directive="bsColorPicker"></bs-color-picker>`
})
class ColorPickerTestComponent {
  @ViewChild('directive') directive!: BsColorPickerValueAccessor;
  selectedColor = '#0000FF';
}

