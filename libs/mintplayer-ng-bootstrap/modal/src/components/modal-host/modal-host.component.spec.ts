import { Component, Directive, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OverlayModule } from '@angular/cdk/overlay';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { BsModalHostComponent } from './modal-host.component';
import { MockComponent, MockDirective, MockProvider } from 'ng-mocks';
import { BsModalComponent } from '../modal/modal.component';
import { BsModalDirective } from '../../directives/modal/modal.directive';
import { BsOverlayComponent, BsOverlayService } from '@mintplayer/ng-bootstrap/overlay';

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

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        CommonModule,
        OverlayModule,
        MockComponent(BsOverlayComponent),
        NoopAnimationsModule,
      ],
      declarations: [
        // Unit to test
        BsModalHostComponent,

        // Mock dependencies
        MockComponent(BsModalComponent),
        MockDirective(BsModalDirective),

        // Testbench
        BsModalTestComponent
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
    fixture = TestBed.createComponent(BsModalTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
