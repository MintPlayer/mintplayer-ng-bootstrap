import { Component, TemplateRef, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsModalFooterDirective } from './modal-footer.directive';

@Component({
  selector: 'bs-modal-footer-test',
  template: `
    <ng-template #modalTemplate let-modal>
      <bs-modal>
        <div *bsModalFooter>
          <span class="col-form-label">Search for tags</span>
        </div>
      </bs-modal>
    </ng-template>`
})
class BsModalFooterTestComponent {
  @ViewChild('modalTemplate') modalTemplate!: TemplateRef<any>;
}

describe('BsModalFooterDirective', () => {
  let component: BsModalFooterTestComponent;
  let fixture: ComponentFixture<BsModalFooterTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [],
      declarations: [
        // Directive to test
        BsModalFooterDirective,

        // Testbench
        BsModalFooterTestComponent
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsModalFooterTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create an instance', () => {
    expect(component).toBeTruthy();
  });
});
