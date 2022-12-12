import { Directive, Input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsGridTestingModule } from '@mintplayer/ng-bootstrap/testing';
import { TooltipComponent } from './tooltip.component';

@Directive({
  selector: '*[bsTooltip]'
})
class BsTooltipMockDirective {
  @Input() bsTooltip: Position = Position.bottom;
}

enum Position { top, left, bottom, right }

describe('TooltipComponent', () => {
  let component: TooltipComponent;
  let fixture: ComponentFixture<TooltipComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        BsGridTestingModule,
      ],
      declarations: [
        // Unit to test
        TooltipComponent,

        // Mock dependencies
        BsTooltipMockDirective,
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
