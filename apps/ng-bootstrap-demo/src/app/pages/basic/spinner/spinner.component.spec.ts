import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsSpinnerTestingModule } from '@mintplayer/ng-bootstrap/testing';
import { SpinnerComponent } from './spinner.component';

describe('SpinnerComponent', () => {
  let component: SpinnerComponent;
  let fixture: ComponentFixture<SpinnerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        BsSpinnerTestingModule,
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
