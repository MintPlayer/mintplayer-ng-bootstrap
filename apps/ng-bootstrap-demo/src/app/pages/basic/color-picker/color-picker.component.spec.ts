import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { BsButtonGroupModule } from '@mintplayer/ng-bootstrap/button-group';
import { BsButtonTypeModule } from '@mintplayer/ng-bootstrap/button-type';
import { BsColorPickerModule } from '@mintplayer/ng-bootstrap/color-picker';
import { MockModule } from 'ng-mocks';

import { ColorPickerComponent } from './color-picker.component';

describe('ColorPickerComponent', () => {
  let component: ColorPickerComponent;
  let fixture: ComponentFixture<ColorPickerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        FormsModule,
        MockModule(BsColorPickerModule),
        MockModule(BsButtonGroupModule),
        MockModule(BsButtonTypeModule)
      ],
      declarations: [ ColorPickerComponent ]
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
