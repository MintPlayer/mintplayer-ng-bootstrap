import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockComponent } from 'ng-mocks';
import { TreeSelectDragDropComponent } from './tree-select-drag-drop.component';
import { BsTreeSelectComponent } from '@mintplayer/ng-bootstrap/tree-select';
import { BsFormComponent } from '@mintplayer/ng-bootstrap/form';

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

  it('reorders the selection on drop', () => {
    const a = { id: 'a', label: 'A' };
    const b = { id: 'b', label: 'B' };
    component['selected'].set([a, b]);
    component.onDrop({ previousIndex: 0, currentIndex: 1 } as never);
    expect(component['selected']().map((n) => n.id)).toEqual(['b', 'a']);
  });
});
