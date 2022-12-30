import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { BsFormModule } from '@mintplayer/ng-bootstrap/form';
import { BsOrdinalNumberPipe } from '@mintplayer/ng-bootstrap/ordinal-number';
import { MockModule, MockPipe } from 'ng-mocks';

import { OrdinalNumberComponent } from './ordinal-number.component';

describe('OrdinalNumberComponent', () => {
  let component: OrdinalNumberComponent;
  let fixture: ComponentFixture<OrdinalNumberComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MockModule(FormsModule),
        MockModule(BsFormModule),
      ],
      declarations: [
        // Unit to test
        OrdinalNumberComponent,

        // Mock dependencies
        MockPipe(BsOrdinalNumberPipe),
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
