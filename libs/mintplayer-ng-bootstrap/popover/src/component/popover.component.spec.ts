import { Overlay, OverlayModule } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { Component, ComponentRef, Injector, TemplateRef, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { POPOVER_CONTENT } from '../providers/popover-content.provider';
import { BsPopoverComponent } from './popover.component';

@Component({
  selector: 'bs-popover-test',
  template: `
    <ng-template #popoverTemplate>
      Hello <b>world</b>
      <br />
      This is me
    </ng-template>`,
})
class BsPopoverTestComponent {
  constructor(private overlay: Overlay, private injector: Injector) {}

  @ViewChild('popoverTemplate') popoverTemplate!: TemplateRef<any>;
  component: ComponentRef<BsPopoverComponent> | null = null;
  
  renderPopover() {
    this.injector = Injector.create({
      providers: [{ provide: POPOVER_CONTENT, useValue: this.popoverTemplate }],
      parent: this.injector
    });
    const portal = new ComponentPortal(BsPopoverComponent, null, this.injector);
    const overlayRef = this.overlay.create({});
    this.component = overlayRef.attach<BsPopoverComponent>(portal);
  }
}

describe('BsPopoverComponent', () => {
  let component: BsPopoverTestComponent;
  let fixture: ComponentFixture<BsPopoverTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        OverlayModule,
      ],
      declarations: [
        // Unit to test
        BsPopoverComponent,
      
        // Testbench
        BsPopoverTestComponent,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BsPopoverTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the popover', () => {
    component.renderPopover();
    expect(component.component).toBeTruthy();
  });
});
