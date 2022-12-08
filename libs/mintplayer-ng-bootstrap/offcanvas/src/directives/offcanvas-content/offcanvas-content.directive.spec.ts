import { CommonModule } from '@angular/common';
import { Component, Inject, Input, TemplateRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OverlayModule } from '@angular/cdk/overlay';
import { BsOffcanvasContentDirective } from './offcanvas-content.directive';
import { BsOffcanvasHostComponent } from '../../components/offcanvas-host/offcanvas-host.component';


describe('BsOffcanvasContentDirective', () => {
  let component: BsOffcanvasTestComponent;
  let fixture: ComponentFixture<BsOffcanvasTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ CommonModule, OverlayModule ],
      declarations: [
        // Unit to test
        BsOffcanvasContentDirective,
        
        // Mock dependencies
        BsOffcanvasMockComponent,
        BsOffcanvasHeaderMockComponent,
        BsOffcanvasBodyMockComponent,
        BsOffcanvasHostMockComponent,

        // Testbench
        BsOffcanvasTestComponent,
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
  template: `
    <bs-offcanvas [(show)]="isOffcanvasVisible" [position]="position" [hasBackdrop]="true" (backdropClick)="isOffcanvasVisible = false">
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
  isOffcanvasVisible = false;
  position: OffcanvasPosition = 'start';
}

@Component({
  selector: 'bs-offcanvas',
  template: ``,
  providers: [{ provide: BsOffcanvasHostComponent, useExisting: BsOffcanvasHostMockComponent }]
})
class BsOffcanvasHostMockComponent {
  @Input() show = false;
  @Input() position: OffcanvasPosition = 'bottom';
  @Input() hasBackdrop = true;
}


@Component({
  selector: 'bs-offcanvas-holder',
  template: `
    <div>
      <ng-container *ngTemplateOutlet="contentTemplate"></ng-container>
    </div>`
})
class BsOffcanvasMockComponent {
  constructor(@Inject('OFFCANVAS_CONTENT') contentTemplate: TemplateRef<any>) {
    this.contentTemplate = contentTemplate;
  }

  contentTemplate: TemplateRef<any>;
}

@Component({
  selector: 'bs-offcanvas-header',
  template: `
    <div class="offcanvas-header">
      <ng-content></ng-content>
    </div>`
})
class BsOffcanvasHeaderMockComponent {}

@Component({
  selector: 'bs-offcanvas-body',
  template: `
    <div class="offcanvas-body">
      <ng-content></ng-content>
    </div>`
})
class BsOffcanvasBodyMockComponent {}