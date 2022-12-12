import { Directive, Input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsGridTestingModule } from '@mintplayer/ng-bootstrap/testing';

import { PopoverComponent } from './popover.component';

enum Position { top, left, bottom, right }

@Directive({
  selector: '*[bsPopover]'
})
class BsPopoverMockDirective {
  @Input() public bsPopover: Position = Position.top;
}

describe('PopoverComponent', () => {
  let component: PopoverComponent;
  let fixture: ComponentFixture<PopoverComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        BsGridTestingModule,
      ],
      declarations: [
        // Unit to test
        PopoverComponent,

        // Mock dependencies
        BsPopoverMockDirective
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PopoverComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
