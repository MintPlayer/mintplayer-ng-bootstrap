import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsGridComponent, BsGridRowDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsPopoverModule } from '@mintplayer/ng-bootstrap/popover';
import { MockDirective, MockModule } from 'ng-mocks';

import { PopoverComponent } from './popover.component';


describe('PopoverComponent', () => {
  let component: PopoverComponent;
  let fixture: ComponentFixture<PopoverComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MockModule(BsGridComponent, BsGridRowDirective),
        MockModule(BsPopoverModule),
        MockDirective(BsButtonTypeDirective),
      ],
      declarations: [
        // Unit to test
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
