import { CommonModule } from '@angular/common';
import { Component, Directive, EventEmitter, inject, Inject, Injector, Output, TemplateRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OverlayModule } from '@angular/cdk/overlay';

import { BsOffcanvasHostComponent } from './offcanvas-host.component';
import { BsOffcanvasComponent } from '../offcanvas/offcanvas.component';
import { OFFCANVAS_CONTENT } from '../../providers/offcanvas-content.provider';
import { PORTAL_FACTORY } from '../../providers/portal-factory.provider';
import { ComponentPortal } from '@angular/cdk/portal';
import { MockComponent, MockModule } from 'ng-mocks';
import { BsHasOverlayComponent } from '@mintplayer/ng-bootstrap/has-overlay';

describe('BsOffcanvasHostComponent', () => {
  let component: BsOffcanvasTestComponent;
  let fixture: ComponentFixture<BsOffcanvasTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        CommonModule,
        OverlayModule,
        MockComponent(BsHasOverlayComponent),
      ],
      declarations: [
        // Unit to test
        BsOffcanvasHostComponent,
      
        // Mock dependencies
        BsOffcanvasMockComponent,
        BsOffcanvasHeaderMockComponent,
        BsOffcanvasBodyMockComponent,
        BsOffcanvasContentMockDirective,

        // Testbench
        BsOffcanvasTestComponent,
      ],
      providers: [{
        provide: PORTAL_FACTORY,
        useValue: (injector: Injector) => {
          return new ComponentPortal(BsOffcanvasMockComponent, null, injector);
        }
      }]
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
  selector: 'bs-offcanvas-holder',
  standalone: false,
  template: `
    <div>
      <ng-container *ngTemplateOutlet="contentTemplate"></ng-container>
    </div>`,
  providers: [
    { provide: BsOffcanvasComponent, useExisting: BsOffcanvasMockComponent }
  ]
})
class BsOffcanvasMockComponent {
  contentTemplate = inject(OFFCANVAS_CONTENT);
  @Output() backdropClick = new EventEmitter<MouseEvent>();
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