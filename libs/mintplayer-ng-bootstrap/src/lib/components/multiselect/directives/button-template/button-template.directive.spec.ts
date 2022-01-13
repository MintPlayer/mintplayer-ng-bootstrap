import { Component, TemplateRef, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsMultiselectComponent } from '../../component/multiselect.component';
import { BsButtonTemplateDirective } from './button-template.directive';

@Component({
  selector: 'bs-button-template-test',
  template: `
    <bs-multiselect #multiselect>
      <ng-template bsButtonTemplate let-count>
          {{ count }} geselecteerd
      </ng-template>
  </bs-multiselect>`
})
class BsButtonTemplateTestComponent {
  @ViewChild('modalTemplate') modalTemplate!: TemplateRef<any>;
  @ViewChild('multiselect') multiselect!: BsMultiselectMockComponent;
}

@Component({
  selector: 'bs-multiselect',
  template: `
    <button class="btn btn-primary">
      <ng-container *ngTemplateOutlet="buttonTemplate ?? defaultButtonTemplate; context: { $implicit: 0 }"></ng-container>
    </button>`,
  providers: [
    { provide: BsMultiselectComponent, useExisting: BsMultiselectMockComponent }
  ]
})
class BsMultiselectMockComponent {
  buttonTemplate!: TemplateRef<any>;
}

describe('BsButtonTemplateDirective', () => {
  let component: BsButtonTemplateTestComponent;
  let fixture: ComponentFixture<BsButtonTemplateTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [],
      declarations: [
        // Directive to test
        BsButtonTemplateDirective,

        // Mock dependencies
        BsMultiselectMockComponent,

        // Testbench
        BsButtonTemplateTestComponent
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsButtonTemplateTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create an instance', () => {
    expect(component).toBeTruthy();
  });

  it('should contain a button template', () => {
    expect(component.multiselect.buttonTemplate).toBeTruthy();
  });
});
