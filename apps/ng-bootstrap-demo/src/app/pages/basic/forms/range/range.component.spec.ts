import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { BsRangeModule } from '@mintplayer/ng-bootstrap/range';
import { MockComponent, MockModule } from 'ng-mocks';
import { RangeComponent } from './range.component';
import { BsCheckboxModule } from '@mintplayer/ng-bootstrap/checkbox';

describe('RangeComponent', () => {
  let component: RangeComponent;
  let fixture: ComponentFixture<RangeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        FormsModule,
        MockModule(BsGridModule),
        MockModule(BsRangeModule),
        MockModule(BsCheckboxModule),
      ],
      declarations: [
        // Unit to test
        RangeComponent,
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RangeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
