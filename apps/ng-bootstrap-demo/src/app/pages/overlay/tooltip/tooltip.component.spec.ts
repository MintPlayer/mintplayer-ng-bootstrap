import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsGridTestingModule, BsTooltipTestingModule } from '@mintplayer/ng-bootstrap/testing';
import { TooltipComponent } from './tooltip.component';


describe('TooltipComponent', () => {
  let component: TooltipComponent;
  let fixture: ComponentFixture<TooltipComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        BsGridTestingModule,
        BsTooltipTestingModule,
      ],
      declarations: [
        // Unit to test
        TooltipComponent,
      ],
      providers: [
        { provide: 'GIT_REPO', useValue: 'https://github.com' }
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TooltipComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
