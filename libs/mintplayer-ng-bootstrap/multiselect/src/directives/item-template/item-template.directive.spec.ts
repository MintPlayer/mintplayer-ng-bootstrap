import { Component, signal, TemplateRef, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsMultiselectComponent } from '../../component/multiselect.component';
import { BsItemTemplateDirective } from './item-template.directive';

@Component({
  selector: 'bs-multiselect',
  template: `
    <button>
      <ng-container *ngTemplateOutlet="itemTemplate(); context: { $implicit: 'test' }"></ng-container>
    </button>`,
  providers: [
    { provide: BsMultiselectComponent, useExisting: BsMultiselectMockComponent }
  ]
})
class BsMultiselectMockComponent {
  readonly itemTemplate = signal<TemplateRef<any> | undefined>(undefined);
  readonly items = signal<any[]>([]);
}

@Component({
  selector: 'bs-item-template-test',
  imports: [BsMultiselectMockComponent, BsItemTemplateDirective],
  template: `
    <bs-multiselect #multiselect>
      <ng-template bsItemTemplate let-item>
          {{ item }}
      </ng-template>
    </bs-multiselect>`
})
class BsItemTemplateTestComponent {
  @ViewChild('multiselect') multiselect!: BsMultiselectMockComponent;
}

describe('BsItemTemplateDirective', () => {
  let component: BsItemTemplateTestComponent;
  let fixture: ComponentFixture<BsItemTemplateTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        // Directive to test
        BsItemTemplateDirective,

        // Mock dependencies
        BsMultiselectMockComponent,

        // Testbench
        BsItemTemplateTestComponent
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsItemTemplateTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create an instance', () => {
    expect(component).toBeTruthy();
  });

  it('should contain an item template', () => {
    expect(component.multiselect.itemTemplate()).toBeTruthy();
  });
});
