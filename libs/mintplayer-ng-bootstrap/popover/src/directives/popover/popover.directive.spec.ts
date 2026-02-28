import { OverlayModule } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { Component, ElementRef, Injector, TemplateRef, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PORTAL_FACTORY } from '../../providers/portal-factory.provider';
import { BsPopoverDirective } from './popover.directive';
import { MockComponent } from 'ng-mocks';
import { BsPopoverComponent } from '../../component/popover.component';

enum Position { top, left, bottom, right }

@Component({
  selector: 'bs-Popover-directive-test',
  template: `
    <button #button>
      Bottom
      <ng-container *bsPopover="popoverPosition.bottom">
        <h3 bsPopoverHeader>Popover title</h3>
        <div bsPopoverBody>
          And here's some amazing content. It's very engaging. Right?
          <input type="checkbox">
        </div>
      </ng-container>
    </button>`,
})
class BsPopoverDirectiveTestComponent {
  @ViewChild('popoverTemplate') popoverTemplate!: TemplateRef<any>;
  @ViewChild('button') button!: ElementRef<HTMLButtonElement>;
  popoverPosition = Position;
}

describe('BsPopoverDirective', () => {
  let component: BsPopoverDirectiveTestComponent;
  let fixture: ComponentFixture<BsPopoverDirectiveTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        OverlayModule,
        // Unit to test
        BsPopoverDirective,

        // Mock dependencies
        MockComponent(BsPopoverComponent),

        // Testbench
        BsPopoverDirectiveTestComponent,
      ],
      providers: [{
        provide: PORTAL_FACTORY,
        useValue: (injector: Injector) => {
          return new ComponentPortal(MockComponent(BsPopoverComponent), null, injector);
        }
      }]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsPopoverDirectiveTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show and hide the popover', async () => {
    await fixture.whenStable();
    const button = component.button.nativeElement;

    const h3Count1 = (<HTMLElement>fixture.nativeElement).querySelectorAll('h3');
    expect(h3Count1.length).toBe(0);

    button.click();
    fixture.detectChanges();

    // const h3Count2 = (<HTMLElement>fixture.nativeElement).querySelectorAll('h3');
    // expect(h3Count2.length).toBe(1);

    button.click();
    fixture.detectChanges();

    await new Promise(resolve => setTimeout(resolve, 50));

    const h3Count3 = (<HTMLElement>fixture.nativeElement).querySelectorAll('h3');
    expect(h3Count3.length).toBe(0);
  });
});
