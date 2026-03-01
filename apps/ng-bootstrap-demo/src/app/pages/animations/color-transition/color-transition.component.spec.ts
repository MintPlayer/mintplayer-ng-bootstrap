import { MockComponent, MockDirective } from 'ng-mocks';
import { FormsModule } from '@angular/forms';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { ColorTransitionComponent } from './color-transition.component';
import { BsToggleButtonComponent, BsToggleButtonGroupDirective } from '@mintplayer/ng-bootstrap/toggle-button';

describe('ColorTransitionComponent', () => {
  let component: ColorTransitionComponent;
  let fixture: ComponentFixture<ColorTransitionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        FormsModule,
        NoopAnimationsModule,
        MockComponent(BsToggleButtonComponent), MockDirective(BsToggleButtonGroupDirective),
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
