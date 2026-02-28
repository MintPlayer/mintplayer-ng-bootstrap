import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { BsOrdinalNumberPipe } from '@mintplayer/ng-bootstrap/ordinal-number';
import { MockModule, MockPipe, MockComponent, MockDirective } from 'ng-mocks';

import { OrdinalNumberComponent } from './ordinal-number.component';
import { BsFormComponent, BsFormGroupDirective, BsFormControlDirective } from '@mintplayer/ng-bootstrap/form';

describe('OrdinalNumberComponent', () => {
  let component: OrdinalNumberComponent;
  let fixture: ComponentFixture<OrdinalNumberComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MockModule(FormsModule),
        MockComponent(BsFormComponent), MockDirective(BsFormGroupDirective), MockDirective(BsFormControlDirective),
        MockPipe(BsOrdinalNumberPipe),
        OrdinalNumberComponent,
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OrdinalNumberComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
