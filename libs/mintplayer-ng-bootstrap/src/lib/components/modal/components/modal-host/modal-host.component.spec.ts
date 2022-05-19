import { Component, Directive, Injector, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OverlayModule } from '@angular/cdk/overlay';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ComponentPortal } from '@angular/cdk/portal';
import { BsModalHostComponent } from './modal-host.component';
import { PORTAL_FACTORY } from '../../providers/portal-factory.provider';

@Component({
  selector: 'bs-modal-test',
  template: `
    <bs-modal [(isOpen)]="isOpen">
      <div *bsModal>
        <div bsModalHeader><h5>Title</h5></div>
        <div bsModalBody>Content</div>
        <div bsModalFooter>Footer</div>
      </div>
    </bs-modal>`
})
class BsModalTestComponent {
  isOpen = false;
}

@Component({
  selector: 'bs-modal-content',
  template: `test`
})
class BsModalMockComponent {
}

@Directive({ selector: '[bsModal]' })
class BsModalMockDirective {
  constructor(offcanvasHost: BsModalHostComponent, template: TemplateRef<any>) {
    offcanvasHost.template = template;
  }
}

describe('BsModalHostComponent', () => {
  let component: BsModalTestComponent;
  let fixture: ComponentFixture<BsModalTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        CommonModule,
        OverlayModule,
        NoopAnimationsModule
      ],
      declarations: [
        // Unit to test
        BsModalHostComponent,

        // Mock dependencies
        BsModalMockComponent,
        BsModalMockDirective,

        // Testbench
        BsModalTestComponent
      ],
      providers: [{
        provide: PORTAL_FACTORY,
        useValue: (injector: Injector) => {
          return new ComponentPortal(BsModalMockComponent, null, injector);
        }
      }]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsModalTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
