import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { BsTreeviewComponent } from './treeview.component';
import type { MpTreeview, TreeNode } from '@mintplayer/web-components/treeview';
import { Component, signal } from '@angular/core';
import { BsTreeviewNodeTemplateDirective } from '../treeview-node-template/treeview-node-template.directive';

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

@Component({
  imports: [BsTreeviewComponent, BsTreeviewNodeTemplateDirective],
  template: `
    <bs-treeview [items]="items()" [(expandedIds)]="expanded" [(selectedIds)]="selected"
      [selectionMode]="'multiple'" [hideBorders]="true"
      (nodeSelect)="events.push('select')" (nodeExpand)="events.push('expand')" (nodeCollapse)="events.push('collapse')">
      @if (templated()) {
        @switch (mode()) {
          @case ('two') {
            <ng-template bsTreeviewNode let-node><b class="label">{{ node.label }}</b><i class="suffix">!</i></ng-template>
          }
          @case ('none') {
            <ng-template bsTreeviewNode></ng-template>
          }
          @default {
            <ng-template bsTreeviewNode let-node><b class="label">{{ node.label }}</b></ng-template>
          }
        }
      }
    </bs-treeview>`,
})
class SignalHost {
  readonly items = signal<TreeNode[]>([
    { id: 'a', label: 'A', children: [{ id: 'a1', label: 'A1' }] },
    { id: 'b', label: 'B' },
  ]);
  readonly expanded = signal<string[]>([]);
  readonly selected = signal<string[]>([]);
  readonly templated = signal(true);
  readonly mode = signal<'one' | 'two' | 'none'>('one');
  readonly events: string[] = [];
}

/** The render context is the element's business; the Angular bridge ignores it. */
const CTX = {} as never;

describe('BsTreeviewComponent wrapper', () => {
  let fixture: ComponentFixture<SignalHost>;
  const wc = () => fixture.nativeElement.querySelector('mp-treeview') as MpTreeview;
  const fire = (type: string, detail: unknown) => {
    wc().dispatchEvent(new CustomEvent(type, { detail }));
    fixture.detectChanges();
  };

  beforeEach(() => {
    fixture = TestBed.createComponent(SignalHost);
    fixture.detectChanges();
  });

  it('pushes the configuration inputs to the element', () => {
    fixture.componentInstance.expanded.set(['a']);
    fixture.componentInstance.selected.set(['b']);
    fixture.detectChanges();
    expect(wc().expandedIds).toEqual(['a']);
    expect(wc().selectedIds).toEqual(['b']);
    expect(wc().selectionMode).toBe('multiple');
    expect(wc().hideBorders).toBe(true);
  });

  it('select, expand and collapse events update the two-way bindings and re-emit', () => {
    fire('tree-node-select', { selectedIds: ['a', 'b'] });
    fire('tree-node-expand', { expandedIds: ['a'] });
    expect(fixture.componentInstance.selected()).toEqual(['a', 'b']);
    expect(fixture.componentInstance.expanded()).toEqual(['a']);
    fire('tree-node-collapse', { expandedIds: [] });
    expect(fixture.componentInstance.expanded()).toEqual([]);
    expect(fixture.componentInstance.events).toEqual(['select', 'expand', 'collapse']);
  });

  it('renders a node through the template, reusing the view for the same node id', () => {
    const renderer = wc().nodeRenderer!;
    const first = renderer({ id: 'a', label: 'A' }, CTX) as HTMLElement;
    expect(first.textContent).toBe('A');
    const second = renderer({ id: 'a', label: 'A renamed' }, CTX) as HTMLElement;
    // the same embedded view, updated in place
    expect(second).toBe(first);
    expect(second.textContent).toBe('A renamed');
  });

  it('wraps a multi-root template in a fragment', () => {
    fixture.componentInstance.mode.set('two');
    fixture.detectChanges();
    const out = wc().nodeRenderer!({ id: 'b', label: 'B' }, CTX) as DocumentFragment;
    expect(out).toBeInstanceOf(DocumentFragment);
    expect(out.textContent).toBe('B!');
  });

  it('renders nothing for a template with no root nodes', () => {
    fixture.componentInstance.mode.set('none');
    fixture.detectChanges();
    expect(wc().nodeRenderer!({ id: 'b', label: 'B' }, CTX)).toBeUndefined();
  });

  it('destroys the cached view of a node that leaves the tree', () => {
    const node = wc().nodeRenderer!({ id: 'b', label: 'B' }, CTX) as HTMLElement;
    fixture.componentInstance.items.set([{ id: 'a', label: 'A' }]);
    fixture.detectChanges();
    // a fresh render builds a new view: the old one was pruned
    expect(wc().nodeRenderer!({ id: 'b', label: 'B' }, CTX)).not.toBe(node);
  });

  it('clears the renderer when the template is removed', () => {
    expect(wc().nodeRenderer).toBeTypeOf('function');
    fixture.componentInstance.templated.set(false);
    fixture.detectChanges();
    expect(wc().nodeRenderer).toBeUndefined();
  });
});
