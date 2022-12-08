import { Overlay, OverlayModule } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { Component, ComponentRef, Injector, TemplateRef, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TOOLTIP_CONTENT } from '../providers/tooltip-content.provider';
import { BsTooltipComponent } from './tooltip.component';

@Component({
  selector: 'bs-tooltip-test',
  template: `
  <ng-template #tooltipTemplate>
    Hello <b>world</b>
    <br />
    This is me
  </ng-template>`,
})
class BsTooltipTestComponent {
  constructor(private overlay: Overlay, private injector: Injector) {}

  @ViewChild('tooltipTemplate') tooltipTemplate!: TemplateRef<any>;
  component: ComponentRef<BsTooltipComponent> | null = null;

  renderTooltip() {
    this.injector = Injector.create({
      providers: [{ provide: TOOLTIP_CONTENT, useValue: this.tooltipTemplate }],
      parent: this.injector
    });
    const portal = new ComponentPortal(BsTooltipComponent, null, this.injector);
    const overlayRef = this.overlay.create({});
    this.component = overlayRef.attach<BsTooltipComponent>(portal);
  }
}

describe('BsTooltipComponent', () => {
  let component: BsTooltipTestComponent;
  let fixture: ComponentFixture<BsTooltipTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        OverlayModule,
      ],
      declarations: [
        // Unit to test
        BsTooltipComponent,

        // Testbench
        BsTooltipTestComponent,
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsTooltipTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the tooltip', () => {
    component.renderTooltip();
    expect(component.component).toBeTruthy();
  });
});
