import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockDirective } from 'ng-mocks';

import { BsColorPickerComponent } from './color-picker.component';

describe('ColorPickerComponent', () => {
  let component: BsColorPickerComponent;
  let fixture: ComponentFixture<BsColorPickerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        // Unit to test
        BsColorPickerComponent,
      ],
      imports: [
        // Mock dependencies
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsColorPickerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
