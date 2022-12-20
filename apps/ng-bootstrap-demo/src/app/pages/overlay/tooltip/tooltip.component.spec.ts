import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { BsTooltipModule } from '@mintplayer/ng-bootstrap/tooltip';
import { MockModule } from 'ng-mocks';
import { TooltipComponent } from './tooltip.component';


describe('TooltipComponent', () => {
  let component: TooltipComponent;
  let fixture: ComponentFixture<TooltipComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MockModule(BsGridModule),
        MockModule(BsTooltipModule),
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
