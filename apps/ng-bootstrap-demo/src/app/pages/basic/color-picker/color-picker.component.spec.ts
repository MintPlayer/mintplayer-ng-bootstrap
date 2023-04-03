import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { BsButtonGroupModule } from '@mintplayer/ng-bootstrap/button-group';
import { BsButtonTypeModule } from '@mintplayer/ng-bootstrap/button-type';
import { BsColorPickerModule } from '@mintplayer/ng-bootstrap/color-picker';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { BsListGroupModule } from '@mintplayer/ng-bootstrap/list-group';
import { BsToggleButtonModule } from '@mintplayer/ng-bootstrap/toggle-button';
import { MockModule } from 'ng-mocks';

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
        MockModule(BsColorPickerModule),
        MockModule(BsToggleButtonModule),
        MockModule(BsButtonGroupModule),
        MockModule(BsButtonTypeModule)
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
