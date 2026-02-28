import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { MockDirective, MockComponent } from 'ng-mocks';

import { PopoverComponent } from './popover.component';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsColFormLabelDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsPopoverComponent, BsPopoverDirective, BsPopoverBodyDirective, BsPopoverHeaderDirective } from '@mintplayer/ng-bootstrap/popover';


describe('PopoverComponent', () => {
  let component: PopoverComponent;
  let fixture: ComponentFixture<PopoverComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MockComponent(BsGridComponent), MockDirective(BsGridRowDirective), MockDirective(BsGridColumnDirective), MockDirective(BsColFormLabelDirective),
        MockComponent(BsPopoverComponent), MockDirective(BsPopoverDirective), MockDirective(BsPopoverBodyDirective), MockDirective(BsPopoverHeaderDirective),
        MockDirective(BsButtonTypeDirective),
        PopoverComponent,
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
