import { Component, TemplateRef, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsModalHeaderDirective } from './modal-header.directive';

@Component({
  selector: 'bs-modal-header-test',
  template: `
    <ng-template #modalTemplate let-modal>
      <bs-modal>
        <div *bsModalHeader>
          <span class="col-form-label">Search for tags</span>
        </div>
      </bs-modal>
    </ng-template>`
})
class BsModalHeaderTestComponent {
  @ViewChild('modalTemplate') modalTemplate!: TemplateRef<any>;
}

describe('BsModalHeaderDirective', () => {
  let component: BsModalHeaderTestComponent;
  let fixture: ComponentFixture<BsModalHeaderTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [],
      declarations: [
        // Directive to test
        BsModalHeaderDirective,

        // Testbench
        BsModalHeaderTestComponent
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsModalHeaderTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create an instance', () => {
    expect(component).toBeTruthy();
  });
});
