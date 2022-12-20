import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsSpinnerModule } from '@mintplayer/ng-bootstrap/spinner';
import { MockModule } from 'ng-mocks';
import { SpinnerComponent } from './spinner.component';

describe('SpinnerComponent', () => {
  let component: SpinnerComponent;
  let fixture: ComponentFixture<SpinnerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MockModule(BsSpinnerModule),
      ],
      declarations: [
        // Unit to test
        SpinnerComponent,
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SpinnerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
