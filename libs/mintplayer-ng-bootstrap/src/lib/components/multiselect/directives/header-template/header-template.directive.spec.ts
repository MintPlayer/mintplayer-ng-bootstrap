import { Component, TemplateRef, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsMultiselectComponent } from '../../component/multiselect.component';
import { BsHeaderTemplateDirective } from './header-template.directive';

@Component({
  selector: 'bs-header-template-test',
  template: `
    <bs-multiselect #multiselect>
      <ng-template bsHeaderTemplate let-count>
          {{ count }} geselecteerd
      </ng-template>
  </bs-multiselect>`
})
class BsHeaderTemplateTestComponent {
  @ViewChild('modalTemplate') modalTemplate!: TemplateRef<any>;
  @ViewChild('multiselect') multiselect!: BsMultiselectMockComponent;
}

@Component({
  selector: 'bs-multiselect',
  template: `
    <button class="btn btn-primary">
      <ng-container *ngTemplateOutlet="headerTemplate ?? defaultHeaderTemplate; context: { $implicit: 0 }"></ng-container>
    </button>`,
  providers: [
    { provide: BsMultiselectComponent, useExisting: BsMultiselectMockComponent }
  ]
})
class BsMultiselectMockComponent {
  headerTemplate!: TemplateRef<any>;
}

describe('BsHeaderTemplateDirective', () => {
  let component: BsHeaderTemplateTestComponent;
  let fixture: ComponentFixture<BsHeaderTemplateTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [],
      declarations: [
        // Directive to test
        BsHeaderTemplateDirective,

        // Mock dependencies
        BsMultiselectMockComponent,

        // Testbench
        BsHeaderTemplateTestComponent
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsHeaderTemplateTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create an instance', () => {
    expect(component).toBeTruthy();
  });

  it('should contain a header template', () => {
    expect(component.multiselect.headerTemplate).toBeTruthy();
  });
});
