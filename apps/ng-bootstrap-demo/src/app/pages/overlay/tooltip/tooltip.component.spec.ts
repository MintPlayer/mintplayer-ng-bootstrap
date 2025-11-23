import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { BsTooltipModule } from '@mintplayer/ng-bootstrap/tooltip';
import { MockDirective, MockModule, MockProvider } from 'ng-mocks';
import { TooltipComponent } from './tooltip.component';
import { GIT_REPO } from '../../../providers/git-repo.provider';


describe('TooltipComponent', () => {
  let component: TooltipComponent;
  let fixture: ComponentFixture<TooltipComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MockModule(BsGridModule),
        MockModule(BsTooltipModule),
        MockDirective(BsButtonTypeDirective),
      ],
      declarations: [
        // Unit to test
        TooltipComponent,
      ],
      providers: [
        MockProvider(GIT_REPO, 'https://github.com'),
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
