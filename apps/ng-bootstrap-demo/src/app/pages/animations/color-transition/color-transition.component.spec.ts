import { MockComponent, MockModule } from 'ng-mocks';
import { FormsModule } from '@angular/forms';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { BsCheckboxModule } from '@mintplayer/ng-bootstrap/checkbox';

import { ColorTransitionComponent } from './color-transition.component';

describe('ColorTransitionComponent', () => {
  let component: ColorTransitionComponent;
  let fixture: ComponentFixture<ColorTransitionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        FormsModule,
        NoopAnimationsModule,
        MockModule(BsCheckboxModule),
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
