import { Component, TemplateRef, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsMultiselectComponent } from '../../component/multiselect.component';
import { BsFooterTemplateDirective } from './footer-template.directive';

@Component({
  selector: 'bs-footer-template-test',
  template: `
    <bs-multiselect #multiselect>
      <ng-template bsFooterTemplate let-count>
          {{ count }} geselecteerd
      </ng-template>
  </bs-multiselect>`
})
class BsFooterTemplateTestComponent {
  @ViewChild('modalTemplate') modalTemplate!: TemplateRef<any>;
  @ViewChild('multiselect') multiselect!: BsMultiselectMockComponent;
}

@Component({
  selector: 'bs-multiselect',
  template: `
    <button class="btn btn-primary">
      <ng-container *ngTemplateOutlet="footerTemplate ?? defaultFooterTemplate; context: { $implicit: 0 }"></ng-container>
    </button>`,
  providers: [
    { provide: BsMultiselectComponent, useExisting: BsMultiselectMockComponent }
  ]
})
class BsMultiselectMockComponent {
  footerTemplate!: TemplateRef<any>;
}

describe('BsFooterTemplateDirective', () => {
  let component: BsFooterTemplateTestComponent;
  let fixture: ComponentFixture<BsFooterTemplateTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [],
      declarations: [
        // Directive to test
        BsFooterTemplateDirective,

        // Mock dependencies
        BsMultiselectMockComponent,

        // Testbench
        BsFooterTemplateTestComponent
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsFooterTemplateTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create an instance', () => {
    expect(component).toBeTruthy();
  });

  it('should contain a footer template', () => {
    expect(component.multiselect.footerTemplate).toBeTruthy();
  });
});
