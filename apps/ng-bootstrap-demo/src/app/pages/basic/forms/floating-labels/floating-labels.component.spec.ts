import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsFloatingLabelComponent } from '@mintplayer/ng-bootstrap/floating-labels';
import { MockComponent, MockDirective } from 'ng-mocks';

import { FloatingLabelsComponent } from './floating-labels.component';
import { BsFormComponent, BsFormGroupDirective, BsFormControlDirective } from '@mintplayer/ng-bootstrap/form';

describe('FloatingLabelsComponent', () => {
  let component: FloatingLabelsComponent;
  let fixture: ComponentFixture<FloatingLabelsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MockComponent(BsFormComponent), MockDirective(BsFormGroupDirective), MockDirective(BsFormControlDirective),
        MockComponent(BsFloatingLabelComponent),
        FloatingLabelsComponent,
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
