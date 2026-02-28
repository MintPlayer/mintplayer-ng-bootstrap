import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { MockDirective, MockComponent } from 'ng-mocks';
import { GIT_REPO } from '../../../providers/git-repo.provider';
import { TooltipComponent } from './tooltip.component';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsColFormLabelDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsTooltipDirective } from '@mintplayer/ng-bootstrap/tooltip';


describe('TooltipComponent', () => {
  let component: TooltipComponent;
  let fixture: ComponentFixture<TooltipComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MockComponent(BsGridComponent), MockDirective(BsGridRowDirective), MockDirective(BsGridColumnDirective), MockDirective(BsColFormLabelDirective),
        MockDirective(BsTooltipDirective),
        MockDirective(BsButtonTypeDirective),
        TooltipComponent,
      ],
      providers: [
        { provide: GIT_REPO, useValue: 'https://github.com' }
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
