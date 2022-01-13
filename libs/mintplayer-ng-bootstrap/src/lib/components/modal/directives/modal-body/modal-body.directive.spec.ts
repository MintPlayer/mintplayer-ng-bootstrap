import { Component, TemplateRef, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsModalBodyDirective } from './modal-body.directive';

@Component({
  selector: 'bs-modal-body-test',
  template: `
    <ng-template #modalTemplate let-modal>
      <bs-modal>
        <div *bsModalBody>
          <span class="col-form-label">Search for tags</span>
        </div>
      </bs-modal>
    </ng-template>`
})
class BsModalBodyTestComponent {
  @ViewChild('modalTemplate') modalTemplate!: TemplateRef<any>;
}

describe('BsModalBodyDirective', () => {
  let component: BsModalBodyTestComponent;
  let fixture: ComponentFixture<BsModalBodyTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [],
      declarations: [
        // Directive to test
        BsModalBodyDirective,

        // Testbench
        BsModalBodyTestComponent
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsModalBodyTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create an instance', () => {
    expect(component).toBeTruthy();
  });
});
