import { CommonModule } from '@angular/common';
import { Component, Directive, EventEmitter, Output, signal, TemplateRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OverlayModule } from '@angular/cdk/overlay';

import { BsOffcanvasHostComponent } from './offcanvas-host.component';
import { BsOffcanvasComponent } from '../offcanvas/offcanvas.component';
import { MockComponent, MockProvider } from 'ng-mocks';
import { BsOverlayComponent, BsOverlayService } from '@mintplayer/ng-bootstrap/overlay';
import { Position } from '@mintplayer/ng-bootstrap';

describe('BsOffcanvasHostComponent', () => {
  let component: BsOffcanvasTestComponent;
  let fixture: ComponentFixture<BsOffcanvasTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        CommonModule,
        OverlayModule,
        MockComponent(BsOverlayComponent),
      ],
      declarations: [
        // Unit to test
        BsOffcanvasHostComponent,

        // Mock dependencies
        MockComponent(BsOffcanvasComponent),
        BsOffcanvasHeaderMockComponent,
        BsOffcanvasBodyMockComponent,
        BsOffcanvasContentMockDirective,

        // Testbench
        BsOffcanvasTestComponent,
      ],
      providers: [
        MockProvider(BsOverlayService, {
          createGlobal: () => ({
            overlayRef: {} as any,
            componentRef: undefined,
            dispose: () => {},
            updatePosition: () => {}
          })
        })
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsOffcanvasTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

type OffcanvasPosition = 'top' | 'bottom' | 'start' | 'end';

@Component({
  selector: 'bs-offcanvas-test',
  standalone: false,
  template: `
    <bs-offcanvas [(isVisible)]="offcanvasVisible" [position]="position" [hasBackdrop]="true" (backdropClick)="isOffcanvasVisible = false">
        <div *bsOffcanvasContent>
            <bs-offcanvas-header>
                <h5>Offcanvas</h5>
            </bs-offcanvas-header>
            <bs-offcanvas-body>
                <span>Content</span>
            </bs-offcanvas-body>
        </div>
    </bs-offcanvas>`
})
class BsOffcanvasTestComponent {
  offcanvasVisible = false;
  position: OffcanvasPosition = 'start';
}

@Directive({
  selector: '[bsOffcanvasContent]',
  standalone: false,
})
class BsOffcanvasContentMockDirective {
  constructor(offcanvasHost: BsOffcanvasHostComponent, template: TemplateRef<any>) {
    offcanvasHost.content = template;
  }
}

@Component({
  selector: 'bs-offcanvas-header',
  standalone: false,
  template: `
    <div class="offcanvas-header">
      <ng-content></ng-content>
    </div>`
})
class BsOffcanvasHeaderMockComponent {}

@Component({
  selector: 'bs-offcanvas-body',
  standalone: false,
  template: `
    <div class="offcanvas-body">
      <ng-content></ng-content>
    </div>`
})
class BsOffcanvasBodyMockComponent {}
