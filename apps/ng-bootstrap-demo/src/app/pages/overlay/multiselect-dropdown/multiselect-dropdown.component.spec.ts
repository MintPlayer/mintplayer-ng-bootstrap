import { Component, Input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MultiselectDropdownComponent } from './multiselect-dropdown.component';

@Component({
  selector: 'bs-multiselect',
  template: 'multiselect'
})
class BsMultiselectMockComponent {
  @Input() public items: any[] = [];
  @Input() public selectedItems: any[] = [];
}

describe('MultiselectDropdownComponent', () => {
  let component: MultiselectDropdownComponent;
  let fixture: ComponentFixture<MultiselectDropdownComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        // Unit to test
        MultiselectDropdownComponent,

        // Mock dependencies
        BsMultiselectMockComponent
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MultiselectDropdownComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
