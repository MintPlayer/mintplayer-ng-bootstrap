import { MockComponent, MockDirective } from 'ng-mocks';
import { FormsModule } from '@angular/forms';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { ColorTransitionComponent } from './color-transition.component';
import { BsCheckboxComponent } from '@mintplayer/ng-bootstrap/checkbox';

describe('ColorTransitionComponent', () => {
  let component: ColorTransitionComponent;
  let fixture: ComponentFixture<ColorTransitionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        FormsModule,
        NoopAnimationsModule,
        MockComponent(BsCheckboxComponent),
        ColorTransitionComponent,
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ColorTransitionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
