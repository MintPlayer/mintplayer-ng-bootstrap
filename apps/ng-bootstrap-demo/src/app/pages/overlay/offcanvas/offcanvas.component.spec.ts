import { Overlay, OverlayModule } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { Component, Inject, Injectable, Injector, TemplateRef, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OffcanvasComponent } from './offcanvas.component';

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
      providers: [{ provide: 'OFFCANVAS_CONTENT', useValue: template }],
      parent: this.parentInjector
    });
    const portal = new ComponentPortal(BsOffcanvasMockComponent, null, injector);
    const overlayRef = this.overlay.create({ });
    const componentInstance = overlayRef.attach<BsOffcanvasMockComponent>(portal);

    return componentInstance;
  }
}

describe('OffcanvasComponent', () => {
  let component: OffcanvasTestComponent;
  let fixture: ComponentFixture<OffcanvasTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ OverlayModule ],
      declarations: [
        // Unit to test
        OffcanvasComponent,
      
        // Mock dependencies
        BsOffcanvasMockComponent,

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
});
