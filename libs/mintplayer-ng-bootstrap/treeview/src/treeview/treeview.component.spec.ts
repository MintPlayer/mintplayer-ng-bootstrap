import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { BsTreeviewComponent } from './treeview.component';
import type { TreeNode } from '@mintplayer/web-components/treeview';

describe('BsTreeviewComponent', () => {
  let component: BsTreeviewComponent;
  let fixture: ComponentFixture<BsTreeviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NoopAnimationsModule, BsTreeviewComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BsTreeviewComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('items', [
      { id: 'a', label: 'A', children: [{ id: 'a1', label: 'A1' }] },
      { id: 'b', label: 'B' },
    ] satisfies TreeNode[]);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should reflect the items input to the underlying <mp-treeview>', () => {
    const wcElement = fixture.nativeElement.querySelector('mp-treeview') as HTMLElement & { items: TreeNode[] };
    expect(wcElement).toBeTruthy();
    expect(wcElement.items.length).toBe(2);
  });
});
