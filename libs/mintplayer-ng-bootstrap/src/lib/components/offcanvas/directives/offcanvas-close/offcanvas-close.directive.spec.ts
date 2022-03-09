import { Overlay, OverlayModule } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { Component, Inject, Injectable, Injector, TemplateRef, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsOffcanvasCloseDirective } from './offcanvas-close.directive';

@Component({
  selector: 'bs-offcanvas-holder',
  template: `<ng-container *ngTemplateOutlet="content; context: { $implicit: this }"></ng-container>`
})
class BsOffcanvasMockComponent {
  constructor(@Inject('OFFCANVAS_CONTENT') content: TemplateRef<any>) {
    this.content = content;
  }

  content: TemplateRef<any>;
}

@Component({
  selector: 'offcanvas-close-test-component',
  template: `
    <ng-template #offcanvasTemplate let-offcanvas>
      <div>
          <span>Notifications</span>
          <button [bsOffcanvasClose]="offcanvas" class="btn btn-secondary flex-end">Close</button>
      </div>
    </ng-template>`
})
class OffcanvasCloseTestComponent {
  constructor(private overlay: Overlay, private parentInjector: Injector) {}
  
  @ViewChild('offcanvasTemplate') offcanvasTemplate!: TemplateRef<any>;

  generateOffcanvas(template: TemplateRef<any>) {
    const injector = Injector.create({
      providers: [{ provide: 'OFFCANVAS_CONTENT', useValue: template }],
      parent: this.parentInjector
    });
    const portal = new ComponentPortal(BsOffcanvasMockComponent, null, injector);
    const overlayRef = this.overlay.create({ });
    const componentInstance = overlayRef.attach<BsOffcanvasMockComponent>(portal);

    return componentInstance;
  }
}

describe('BsOffcanvasCloseDirective', () => {
  let component: OffcanvasCloseTestComponent;
  let fixture: ComponentFixture<OffcanvasCloseTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        OverlayModule
      ],
      declarations: [
        // Directive to test
        BsOffcanvasCloseDirective,

        // Mock dependencies
        BsOffcanvasMockComponent,

        // Testbench
        OffcanvasCloseTestComponent
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(OffcanvasCloseTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create an instance', () => {
    expect(component).toBeTruthy();
  });

  it('should create the offcanvas', () => {
    const componentInstance = component.generateOffcanvas(component.offcanvasTemplate);
    expect(componentInstance).toBeTruthy();
  });
});
