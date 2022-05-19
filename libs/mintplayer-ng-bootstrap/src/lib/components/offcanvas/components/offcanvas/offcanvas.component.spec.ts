import { Overlay, OverlayModule } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { Component, Injector, TemplateRef, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OFFCANVAS_CONTENT } from '../../providers/offcanvas-content.provider';
import { BsOffcanvasComponent } from './offcanvas.component';

@Component({
  selector: 'offcanvas-test-component',
  template: `
    <ng-template #offcanvasTemplate let-offcanvas>
      <div>Notifications</div>
    </ng-template>`
})
class OffcanvasTestComponent {
  constructor(private overlay: Overlay, private parentInjector: Injector) {}
  
  @ViewChild('offcanvasTemplate') offcanvasTemplate!: TemplateRef<any>;

  generateOffcanvas(template: TemplateRef<any>) {
    const injector = Injector.create({
      providers: [{ provide: OFFCANVAS_CONTENT, useValue: template }],
      parent: this.parentInjector
    });
    const portal = new ComponentPortal(BsOffcanvasComponent, null, injector);
    const overlayRef = this.overlay.create({ });
    const componentInstance = overlayRef.attach<BsOffcanvasComponent>(portal);

    return componentInstance;
  }
}

describe('BsOffcanvasComponent', () => {
  let component: OffcanvasTestComponent;
  let fixture: ComponentFixture<OffcanvasTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ OverlayModule ],
      declarations: [
        // Unit to test
        BsOffcanvasComponent,
      
        // Testbench
        OffcanvasTestComponent
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(OffcanvasTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should create the offcanvas', () => {
    const componentInstance = component.generateOffcanvas(component.offcanvasTemplate);
    expect(componentInstance).toBeTruthy();
  });
});
