import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MockPipe, MockComponent } from 'ng-mocks';
import { BsFontColorPipe } from '@mintplayer/ng-bootstrap/font-color';

import { FontColorComponent } from './font-color.component';
import { BsColorPickerComponent } from '@mintplayer/ng-bootstrap/color-picker';

describe('FontColorComponent', () => {
  let component: FontColorComponent;
  let fixture: ComponentFixture<FontColorComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        FormsModule,
        MockPipe(BsFontColorPipe),
        MockComponent(BsColorPickerComponent),
        FontColorComponent,
      ]
    });
    fixture = TestBed.createComponent(FontColorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
