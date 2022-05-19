import { Component, Directive, EventEmitter, Input, Output, TemplateRef, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsModalHostComponent } from '../../components/modal-host/modal-host.component';
import { BsModalCloseDirective } from './modal-close.directive';

@Component({
  selector: 'bs-modal-test',
  template: `
    <bs-modal [(isOpen)]="isOpen" #modal>
      <div *bsModal>
        <div bsModalHeader><h5>Title</h5></div>
        <div bsModalBody>Content</div>
        <div bsModalFooter><button bsModalClose>Close</button></div>
      </div>
    </bs-modal>`
})
class BsModalTestComponent {
  isOpen = false;
  @ViewChild('modal') modal!: BsModalHostMockComponent;
}

@Component({
  selector: 'bs-modal',
  template: ``,
  providers: [
    { provide: BsModalHostComponent, useExisting: BsModalHostMockComponent }
  ]
})
class BsModalHostMockComponent {
  template!: TemplateRef<any>;
  
  //#region isOpen
  private _isOpen = false;
  get isOpen() {
    return this._isOpen;
  }
  @Input() set isOpen(value: boolean) {
    this._isOpen = value;
    // if (this.componentInstance) {
    //   this.componentInstance.instance.isOpen = value;
    // }
    this.isOpenChange.emit(value);
  }
  @Output() isOpenChange = new EventEmitter<boolean>();
  //#endregion
}

@Directive({ selector: '[bsModal]' })
class BsModalMockDirective {
  constructor(template: TemplateRef<any>, host: BsModalHostComponent) {
    host.template = template;
  }
}

describe('BsModalCloseDirective', () => {
  let component: BsModalTestComponent;
  let fixture: ComponentFixture<BsModalTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [],
      declarations: [
        // Unit to test
        BsModalCloseDirective,

        // Mock dependencies
        BsModalHostMockComponent,
        BsModalMockDirective,

        // Testbench
        BsModalTestComponent
      ]
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
