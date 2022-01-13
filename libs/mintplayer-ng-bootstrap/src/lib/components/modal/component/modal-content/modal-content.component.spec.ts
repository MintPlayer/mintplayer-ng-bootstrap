import { Component, TemplateRef, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MODAL_CONTENT } from '../../providers/modal-content.provider';
import { BsModalContentComponent } from './modal-content.component';

@Component({
  selector: 'bs-modal-content-test',
  template: 
    `<ng-template #modalTemplate let-modal>
      <bs-modal>
        <div *bsModalHeader>
          <h1>Modal title</h1>
        </div>
        <div *bsModalBody>
          <p>Modal body</p>
        </div>
        <div *bsModalFooter>
          <button type="button">Close</button>
        </div>
      </bs-modal>
    </ng-template>`
})
class BsModalTestComponent {
  @ViewChild('modalTemplate') modalTemplate!: TemplateRef<any>;
}


describe('BsModalContentComponent', () => {
  let component: BsModalTestComponent;
  let fixture: ComponentFixture<BsModalTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        // Unit to test
        BsModalContentComponent,
        
        // Testbench
        BsModalTestComponent
      ],
      // providers: [{
      //   provide: MODAL_CONTENT,
      //   useValue: 
      // }]
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
