import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockComponent } from 'ng-mocks';
import { computed, model, signal } from '@angular/core';
import { BsTreeviewItemComponent } from './treeview-item.component';
import { BsTreeviewComponent } from '../treeview/treeview.component';
import { BsListGroupComponent, BsListGroupItemComponent } from '@mintplayer/ng-bootstrap/list-group';

class BsTreeviewComponentStub {
  level = computed(() => 0);
  indentation = computed(() => 0);
  isExpanded = model<boolean>(true);

  // Direct-children + focused tracking
  items = signal<unknown[]>([]);
  focusedItem = signal<unknown | null>(null);

  // Roving tabindex methods
  registerItem = () => {};
  unregisterItem = () => {};
  setFocusedItem = () => {};
  isFocusedItem = () => true;
}

describe('BsTreeviewItemComponent', () => {
  let component: BsTreeviewItemComponent;
  let fixture: ComponentFixture<BsTreeviewItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MockComponent(BsListGroupComponent), MockComponent(BsListGroupItemComponent),
        BsTreeviewItemComponent
      ],
      providers: [
        { provide: BsTreeviewComponent, useClass: BsTreeviewComponentStub }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BsTreeviewItemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
