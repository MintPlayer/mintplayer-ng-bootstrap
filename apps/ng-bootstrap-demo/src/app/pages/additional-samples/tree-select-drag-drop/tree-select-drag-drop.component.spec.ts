import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockComponent } from 'ng-mocks';
import { TreeSelectDragDropComponent } from './tree-select-drag-drop.component';
import { BsTreeSelectComponent } from '@mintplayer/ng-bootstrap/tree-select';
import { BsFormComponent } from '@mintplayer/ng-bootstrap/form';
import type { TreeNode } from '@mintplayer/ng-bootstrap/tree-select';

describe('TreeSelectDragDropComponent', () => {
  let component: TreeSelectDragDropComponent;
  let fixture: ComponentFixture<TreeSelectDragDropComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MockComponent(BsFormComponent),
        MockComponent(BsTreeSelectComponent),
        TreeSelectDragDropComponent,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TreeSelectDragDropComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('reorders within a list on drop (same container)', () => {
    const a: TreeNode = { id: 'a', label: 'A' };
    const b: TreeNode = { id: 'b', label: 'B' };
    component['left'] = [a, b];
    const container = { data: component['left'] };
    component.drop({ previousContainer: container, container, previousIndex: 0, currentIndex: 1 } as never);
    expect(component['left'].map((n) => n.id)).toEqual(['b', 'a']);
  });

  it('transfers a chip between the two lists on drop', () => {
    const a: TreeNode = { id: 'a', label: 'A' };
    component['left'] = [a];
    component['right'] = [];
    const prev = { data: component['left'] };
    const cur = { data: component['right'] };
    component.drop({ previousContainer: prev, container: cur, previousIndex: 0, currentIndex: 0 } as never);
    expect(component['left'].map((n) => n.id)).toEqual([]);
    expect(component['right'].map((n) => n.id)).toEqual(['a']);
  });
});
