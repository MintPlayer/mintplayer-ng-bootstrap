import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { BsFormComponent } from '@mintplayer/ng-bootstrap/form';
import type { MpTreeSelect, TreeNode, TreeSelectMode } from '@mintplayer/web-components/tree-select';
import { BsTreeSelectComponent } from './tree-select.component';
import {
  BsTreeSelectButtonTemplateDirective,
  BsTreeSelectEnterSearchTermTemplateDirective,
  BsTreeSelectFooterTemplateDirective,
  BsTreeSelectHeaderTemplateDirective,
  BsTreeSelectItemTemplateDirective,
  BsTreeSelectNoResultsTemplateDirective,
  BsTreeSelectSuggestionTemplateDirective,
} from '../directives/template-directives';

const NODE_A: TreeNode = { id: 'a', label: 'Apple' };
const NODE_B: TreeNode = { id: 'b', label: 'Banana' };

@Component({
  imports: [
    BsFormComponent, BsTreeSelectComponent, ReactiveFormsModule,
    BsTreeSelectItemTemplateDirective, BsTreeSelectSuggestionTemplateDirective, BsTreeSelectButtonTemplateDirective,
    BsTreeSelectHeaderTemplateDirective, BsTreeSelectFooterTemplateDirective,
    BsTreeSelectNoResultsTemplateDirective, BsTreeSelectEnterSearchTermTemplateDirective,
  ],
  template: `
    <bs-form>
      <bs-tree-select [formControl]="ctrl" [mode]="mode()" [variant]="'button'" [cascadeSelect]="true"
        [placeholder]="'Pick'" [showClear]="true" [panelScrollHeight]="'200px'" [searchDebounceMs]="50"
        [disabled]="disabled()"
        (opened)="events.push('opened')" (closed)="events.push('closed')" (cleared)="events.push('cleared')">
        <b *bsTreeSelectItem="let node; let q = query" class="item">{{ node.label }}/{{ q }}</b>
        <i *bsTreeSelectSuggestion="let node">{{ node.label }}</i>
        <span *bsTreeSelectButton="let value">{{ value?.label ?? 'none' }}</span>
        <ng-template bsTreeSelectHeader><span>Header</span><em>2</em></ng-template>
        <span *bsTreeSelectFooter>Footer</span>
        <span *bsTreeSelectNoResults>Nothing</span>
        <span *bsTreeSelectEnterSearchTerm>Type</span>
      </bs-tree-select>
    </bs-form>`,
})
class HostComponent {
  readonly ctrl = new FormControl<TreeNode | TreeNode[] | null>(NODE_A);
  readonly mode = signal<TreeSelectMode>('single');
  readonly disabled = signal(false);
  readonly events: string[] = [];
}

describe('BsTreeSelectComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  const el = () => fixture.nativeElement.querySelector('mp-tree-select') as MpTreeSelect;
  const cmp = () => fixture.debugElement.query(By.directive(BsTreeSelectComponent)).componentInstance as BsTreeSelectComponent;

  beforeEach(() => {
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('requires a <bs-form> ancestor', () => {
    @Component({ imports: [BsTreeSelectComponent], template: '<bs-tree-select></bs-tree-select>' })
    class Bare {}
    expect(() => TestBed.createComponent(Bare)).toThrow('<bs-tree-select> must be inside a <bs-form>');
  });

  it('pushes its configuration and the form value to the element', () => {
    const e = el();
    expect(e.mode).toBe('single');
    expect(e.variant).toBe('button');
    expect(e.cascadeSelect).toBe(true);
    expect(e.placeholder).toBe('Pick');
    expect(e.showClear).toBe(true);
    expect(e.panelScrollHeight).toBe('200px');
    expect(e.searchDebounceMs).toBe(50);
    expect(e.value).toBe(NODE_A);
    fixture.componentInstance.ctrl.setValue(NODE_B);
    fixture.detectChanges();
    expect(e.value).toBe(NODE_B);
  });

  it('is disabled by its input or by the form control', () => {
    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();
    expect(el().disabled).toBe(true);
    fixture.componentInstance.disabled.set(false);
    fixture.componentInstance.ctrl.disable();
    fixture.detectChanges();
    expect(el().disabled).toBe(true);
    fixture.componentInstance.ctrl.enable();
    fixture.detectChanges();
    expect(el().disabled).toBe(false);
  });

  it('a value-change from the element reaches the model and the form', () => {
    el().dispatchEvent(new CustomEvent('value-change', { detail: { value: NODE_B } }));
    expect(cmp().value()).toBe(NODE_B);
    expect(fixture.componentInstance.ctrl.value).toBe(NODE_B);
  });

  it('re-emits open, close and clear; closing marks the control touched', () => {
    el().dispatchEvent(new CustomEvent('open'));
    el().dispatchEvent(new CustomEvent('clear'));
    expect(fixture.componentInstance.ctrl.touched).toBe(false);
    el().dispatchEvent(new CustomEvent('close'));
    expect(fixture.componentInstance.ctrl.touched).toBe(true);
    expect(fixture.componentInstance.events).toEqual(['opened', 'cleared', 'closed']);
  });

  describe('template bridges', () => {
    it('renders a node through its template with the search query, reusing the view per node id', () => {
      const render = el().itemTemplate!;
      const first = render(NODE_A, 'ap') as HTMLElement;
      expect(first.textContent).toBe('Apple/ap');
      const again = render({ ...NODE_A, label: 'Apricot' }, 'apr') as HTMLElement;
      expect(again).toBe(first);
      expect(again.textContent).toBe('Apricot/apr');
      // the dropdown row template is bridged the same way, with its own cache
      expect(el().suggestionTemplate!(NODE_B, '').textContent).toBe('Banana');
    });

    it('evicts the least recently used node view past 400', () => {
      const render = el().itemTemplate!;
      const first = render({ id: 'n0', label: '0' }, '');
      Array.from({ length: 400 }, (_, i) => render({ id: `n${i + 1}`, label: `${i + 1}` }, ''));
      // n0 was the oldest: its view was destroyed, so rendering it again builds a new one
      expect(render({ id: 'n0', label: '0' }, '')).not.toBe(first);
    });

    it('a recently rendered node survives eviction', () => {
      const render = el().itemTemplate!;
      const first = render({ id: 'n0', label: '0' }, '');
      Array.from({ length: 399 }, (_, i) => render({ id: `n${i + 1}`, label: `${i + 1}` }, ''));
      render({ id: 'n0', label: '0' }, '');
      render({ id: 'n400', label: '400' }, '');
      expect(render({ id: 'n0', label: '0' }, '')).toBe(first);
    });

    it('the button template renders the current value in one reused view', () => {
      const render = el().buttonTemplate!;
      const node = render(NODE_A) as HTMLElement;
      expect(node.textContent).toBe('Apple');
      expect(render(null)).toBe(node);
      expect(node.textContent).toBe('none');
    });

    it('static templates render once and are reused; several roots come back as a fragment', () => {
      const header = el().headerTemplate!;
      const out = header();
      expect(out).toBeInstanceOf(DocumentFragment);
      expect(out.textContent).toBe("Header2");
      expect(el().footerTemplate!().textContent).toBe('Footer');
      expect(el().noResultsTemplate!().textContent).toBe('Nothing');
      const type = el().enterSearchTermTemplate!;
      expect(type()).toBe(type());
    });
  });
});
