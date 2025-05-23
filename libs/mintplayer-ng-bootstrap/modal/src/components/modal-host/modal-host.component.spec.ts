import { Component, Directive, Injector, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Overlay, OverlayModule } from '@angular/cdk/overlay';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ComponentPortal } from '@angular/cdk/portal';
import { BsModalHostComponent } from './modal-host.component';
import { PORTAL_FACTORY } from '../../providers/portal-factory.provider';
import { MockComponent, MockDirective, MockModule, MockProvider } from 'ng-mocks';
import { BsModalComponent } from '../modal/modal.component';
import { BsModalDirective } from '../../directives/modal/modal.directive';
import { BsHasOverlayComponent } from '@mintplayer/ng-bootstrap/has-overlay';

@Component({
  selector: 'bs-modal-test',
  standalone: false,
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

describe('BsModalHostComponent', () => {
  let component: BsModalTestComponent;
  let fixture: ComponentFixture<BsModalTestComponent>;

  const modalMockType = MockComponent(BsModalComponent);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        CommonModule,
        OverlayModule,
        MockComponent(BsHasOverlayComponent),
        NoopAnimationsModule,
      ],
      declarations: [
        // Unit to test
        BsModalHostComponent,

        // Mock dependencies
        modalMockType,
        MockDirective(BsModalDirective),

        // Testbench
        BsModalTestComponent
      ],
      providers: [
        {
          provide: PORTAL_FACTORY,
          useValue: (injector: Injector) => {
            return new ComponentPortal(modalMockType, null, injector);
          }
        }
      ]
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
