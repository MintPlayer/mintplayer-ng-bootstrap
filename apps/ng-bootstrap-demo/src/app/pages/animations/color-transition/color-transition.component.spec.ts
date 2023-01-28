import { MockModule } from 'ng-mocks';
import { FormsModule } from '@angular/forms';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { BsToggleButtonModule } from '@mintplayer/ng-bootstrap/toggle-button';

import { ColorTransitionComponent } from './color-transition.component';

describe('ColorTransitionComponent', () => {
  let component: ColorTransitionComponent;
  let fixture: ComponentFixture<ColorTransitionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        FormsModule,
        NoopAnimationsModule,
        MockModule(BsToggleButtonModule),
      ],
      declarations: [ ColorTransitionComponent ]
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
