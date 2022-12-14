import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsGridTestingModule, BsPopoverTestingModule } from '@mintplayer/ng-bootstrap/testing';

import { PopoverComponent } from './popover.component';


describe('PopoverComponent', () => {
  let component: PopoverComponent;
  let fixture: ComponentFixture<PopoverComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        BsGridTestingModule,
        BsPopoverTestingModule
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
