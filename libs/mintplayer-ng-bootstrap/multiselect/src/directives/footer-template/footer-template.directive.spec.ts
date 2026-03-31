import { Component, signal, TemplateRef, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsMultiselectComponent } from '../../component/multiselect.component';
import { BsFooterTemplateDirective } from './footer-template.directive';

@Component({
  selector: 'bs-multiselect',
  template: `
    <button>
      <ng-container *ngTemplateOutlet="footerTemplate(); context: { $implicit: 0 }"></ng-container>
    </button>`,
  providers: [
    { provide: BsMultiselectComponent, useExisting: BsMultiselectMockComponent }
  ]
})
class BsMultiselectMockComponent {
  readonly footerTemplate = signal<TemplateRef<any> | undefined>(undefined);
}

@Component({
  selector: 'bs-footer-template-test',
  imports: [BsMultiselectMockComponent, BsFooterTemplateDirective],
  template: `
    <bs-multiselect #multiselect>
      <ng-container *bsFooterTemplate="let count">{{ count }} geselecteerd</ng-container>
    </bs-multiselect>`
})
class BsFooterTemplateTestComponent {
  @ViewChild('multiselect') multiselect!: BsMultiselectMockComponent;
}

describe('BsFooterTemplateDirective', () => {
  let component: BsFooterTemplateTestComponent;
  let fixture: ComponentFixture<BsFooterTemplateTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        // Directive to test
        BsFooterTemplateDirective,

        // Mock dependencies
        BsMultiselectMockComponent,

        // Testbench
        BsFooterTemplateTestComponent,
      ],
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
    expect(component.multiselect.footerTemplate()).toBeTruthy();
  });
});
