import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsFloatingLabelComponent } from '@mintplayer/ng-bootstrap/floating-labels';
import { BsFormModule } from '@mintplayer/ng-bootstrap/form';
import { MockComponent, MockModule } from 'ng-mocks';

import { FloatingLabelsComponent } from './floating-labels.component';

describe('FloatingLabelsComponent', () => {
  let component: FloatingLabelsComponent;
  let fixture: ComponentFixture<FloatingLabelsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MockModule(BsFormModule),
        MockComponent(BsFloatingLabelComponent),
      ],
      declarations: [
        FloatingLabelsComponent
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FloatingLabelsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
