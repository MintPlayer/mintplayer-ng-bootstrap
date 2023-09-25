import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockModule } from 'ng-mocks';
import { BsFontColorModule } from '@mintplayer/ng-bootstrap/font-color';
import { BsColorPickerModule } from '@mintplayer/ng-bootstrap/color-picker';

import { FontColorComponent } from './font-color.component';

describe('FontColorComponent', () => {
  let component: FontColorComponent;
  let fixture: ComponentFixture<FontColorComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        MockModule(BsFontColorModule),
        MockModule(BsColorPickerModule),
      ],
      declarations: [FontColorComponent]
    });
    fixture = TestBed.createComponent(FontColorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
