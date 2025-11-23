import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { BsButtonGroupComponent } from '@mintplayer/ng-bootstrap/button-group';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsColorPickerComponent } from '@mintplayer/ng-bootstrap/color-picker';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { BsListGroupModule } from '@mintplayer/ng-bootstrap/list-group';
import { BsToggleButtonComponent } from '@mintplayer/ng-bootstrap/toggle-button';
import { MockComponent, MockDirective, MockModule } from 'ng-mocks';

import { ColorPickerComponent } from './color-picker.component';

describe('ColorPickerComponent', () => {
  let component: ColorPickerComponent;
  let fixture: ComponentFixture<ColorPickerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        FormsModule,
        MockModule(BsGridModule),
        MockModule(BsListGroupModule),
        MockModule(BsColorPickerComponent),
        MockModule(BsToggleButtonComponent),
        MockComponent(BsButtonGroupComponent),
        MockDirective(BsButtonTypeDirective)
      ],
      declarations: [
        // Unit to test
        ColorPickerComponent,
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ColorPickerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
