import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MockModule, MockPipe } from 'ng-mocks';
import { BsFontColorPipe } from '@mintplayer/ng-bootstrap/font-color';
import { BsColorPickerModule } from '@mintplayer/ng-bootstrap/color-picker';

import { FontColorComponent } from './font-color.component';

describe('FontColorComponent', () => {
  let component: FontColorComponent;
  let fixture: ComponentFixture<FontColorComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        FormsModule,
        MockPipe(BsFontColorPipe),
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
