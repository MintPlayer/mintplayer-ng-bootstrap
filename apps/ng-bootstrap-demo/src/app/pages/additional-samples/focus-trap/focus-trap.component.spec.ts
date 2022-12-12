import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsForTestingModule, BsGridTestingModule, BsModalTestingModule } from '@mintplayer/ng-bootstrap/testing';
import { FocusTrapComponent } from './focus-trap.component';

describe('FocusTrapComponent', () => {
  let component: FocusTrapComponent;
  let fixture: ComponentFixture<FocusTrapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        BsForTestingModule,
        BsGridTestingModule,
        BsModalTestingModule
      ],
      declarations: [
        // Unit to test
        FocusTrapComponent,
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FocusTrapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
