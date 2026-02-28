import { Component, TemplateRef, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsMultiselectComponent } from '../../component/multiselect.component';
import { BsFooterTemplateDirective } from './footer-template.directive';
import { MockComponent } from 'ng-mocks';

@Component({
  selector: 'bs-footer-template-test',
  standalone: true,
  imports: [MockComponent(BsMultiselectComponent), BsFooterTemplateDirective],
  template: `
    <bs-multiselect #multiselect>
      <ng-container *bsFooterTemplate="let count">{{ count }} geselecteerd</ng-container>
    </bs-multiselect>`
})
class BsFooterTemplateTestComponent {
  @ViewChild('modalTemplate') modalTemplate!: TemplateRef<any>;
  @ViewChild('multiselect') multiselect!: BsMultiselectComponent<any>;
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
        MockComponent(BsMultiselectComponent),
        
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
    expect(component.multiselect.footerTemplate).toBeTruthy();
  });
});
