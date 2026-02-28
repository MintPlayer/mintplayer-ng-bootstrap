import { Component, TemplateRef, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsModalHostComponent } from '../../components/modal-host/modal-host.component';
import { BsModalDirective } from './modal.directive';

@Component({
  selector: 'bs-modal',
  template: ``,
  providers: [
    { provide: BsModalHostComponent, useExisting: BsModalHostMockComponent }
  ]
})
class BsModalHostMockComponent {
  template!: TemplateRef<any>;
}

@Component({
  selector: 'bs-modal-test',
  imports: [BsModalHostMockComponent, BsModalDirective],
  template: `
    <bs-modal #modal>
      <div *bsModal>
        <div bsModalHeader><h5>Title</h5></div>
        <div bsModalBody>Content</div>
        <div bsModalFooter>Footer</div>
      </div>
    </bs-modal>`
})
class BsModalTestComponent {
  isOpen = false;
  @ViewChild('modal') modal!: BsModalHostMockComponent;
}

describe('BsModalDirective', () => {
  let component: BsModalTestComponent;
  let fixture: ComponentFixture<BsModalTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        // Unit to test
        BsModalDirective,

        // Mock dependencies
        BsModalHostMockComponent,

        // Testbench
        BsModalTestComponent
      ],
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsModalTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create an instance', () => {
    expect(component).toBeTruthy();
    expect(component.modal.template).toBeTruthy();
  });
});
