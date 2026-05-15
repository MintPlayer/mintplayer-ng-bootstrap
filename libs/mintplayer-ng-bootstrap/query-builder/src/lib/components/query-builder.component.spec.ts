import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BsQueryBuilderComponent } from './query-builder.component';
import { BsQueryBuilderEditorDirective } from './query-builder-editor.directive';
import type { Expression, Group } from '../model/expression';
import type { EntitySchema } from '../model/field-def';
import { emptyGroup } from '../model/default-tree';

const SCHEMA: EntitySchema[] = [
  {
    name: 'orders',
    label: 'Orders',
    fields: [
      { name: 'total', label: 'Total', type: 'number' },
      { name: 'status', label: 'Status', type: 'string' },
    ],
  },
];

@Component({
  standalone: true,
  imports: [BsQueryBuilderComponent, BsQueryBuilderEditorDirective, ReactiveFormsModule, FormsModule],
  template: `
    <bs-query-builder
      #qb
      [schema]="schema"
      [rootEntity]="'orders'"
      [(query)]="query"
    >
      <span *bsQueryBuilderEditor="'total'; let ctx" class="custom-total-editor" [attr.data-value]="ctx.value">CUSTOM</span>
    </bs-query-builder>
  `,
})
class Host {
  schema = SCHEMA;
  query: Expression = emptyGroup('and');
}

@Component({
  standalone: true,
  imports: [BsQueryBuilderComponent, ReactiveFormsModule],
  template: `<bs-query-builder [schema]="schema" [rootEntity]="'orders'" [formControl]="ctrl"></bs-query-builder>`,
})
class HostForm {
  schema = SCHEMA;
  ctrl = new FormControl<Expression | null>(emptyGroup('and'));
}

async function settleHost(host: HTMLElement): Promise<void> {
  // Run several macro+microtask flushes so Lit + Angular finish painting.
  for (let i = 0; i < 4; i++) {
    await Promise.resolve();
    await new Promise((r) => setTimeout(r, 0));
  }
  void host;
}

describe('bs-query-builder (M12 Angular wrapper)', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('renders an mp-query-builder web component', async () => {
    const fix = TestBed.createComponent(Host);
    fix.detectChanges();
    await settleHost(fix.nativeElement);
    const wc = fix.nativeElement.querySelector('mp-query-builder');
    expect(wc).toBeTruthy();
  });

  it('forwards [schema] / [rootEntity] / [(query)] to the WC', async () => {
    const fix = TestBed.createComponent(Host);
    fix.detectChanges();
    await settleHost(fix.nativeElement);
    const wc = fix.nativeElement.querySelector('mp-query-builder') as HTMLElement & {
      schema?: unknown;
      rootEntity?: string;
      query?: Expression;
    };
    expect(wc.schema).toBe(SCHEMA);
    expect(wc.rootEntity).toBe('orders');
    expect(wc.query?.kind).toBe('group');
  });

  it('updates [(query)] on the host when the WC fires query-change', async () => {
    const fix = TestBed.createComponent(Host);
    fix.detectChanges();
    await settleHost(fix.nativeElement);
    const wc = fix.nativeElement.querySelector('mp-query-builder') as HTMLElement;
    const next: Group = { kind: 'group', id: 'g2', logic: 'or', children: [] };
    wc.dispatchEvent(new CustomEvent('query-change', { detail: { tree: next } }));
    fix.detectChanges();
    expect(fix.componentInstance.query).toBe(next);
  });

  it('aggregates *bsQueryBuilderEditor templates into the WC editorRegistry', async () => {
    const fix = TestBed.createComponent(Host);
    fix.detectChanges();
    await settleHost(fix.nativeElement);
    const wc = fix.nativeElement.querySelector('mp-query-builder') as HTMLElement & {
      editorRegistry?: Record<string, unknown>;
    };
    expect(wc.editorRegistry).toBeDefined();
    expect(typeof wc.editorRegistry!['total']).toBe('function');
  });

  it('[formControl] integration: writeValue → query; CVA does not infinite-loop', async () => {
    const fix = TestBed.createComponent(HostForm);
    fix.detectChanges();
    await settleHost(fix.nativeElement);

    const newTree: Group = { kind: 'group', id: 'r', logic: 'or', children: [
      { kind: 'condition', id: 'c1', field: 'total', operator: 'gt', value: 5 },
    ] };
    fix.componentInstance.ctrl.setValue(newTree);
    fix.detectChanges();
    await settleHost(fix.nativeElement);

    const wc = fix.nativeElement.querySelector('mp-query-builder') as HTMLElement & { query?: Expression };
    expect(wc.query).toBe(newTree);

    // Simulate user edit via the WC; control.value should follow.
    const userTree: Group = { kind: 'group', id: 'r2', logic: 'and', children: [] };
    let onChangeCalls = 0;
    fix.componentInstance.ctrl.valueChanges.subscribe(() => onChangeCalls++);
    wc.dispatchEvent(new CustomEvent('query-change', { detail: { tree: userTree } }));
    fix.detectChanges();
    await settleHost(fix.nativeElement);

    expect(fix.componentInstance.ctrl.value).toBe(userTree);
    // One emission from the user edit; setValue earlier was synchronous so it
    // doesn't show in the valueChanges count from the subscribe-after point.
    expect(onChangeCalls).toBeGreaterThanOrEqual(1);
    expect(onChangeCalls).toBeLessThanOrEqual(2);
  });

  it('setDisabledState propagates to the WC disabled attribute', async () => {
    const fix = TestBed.createComponent(HostForm);
    fix.detectChanges();
    await settleHost(fix.nativeElement);
    fix.componentInstance.ctrl.disable();
    fix.detectChanges();
    await settleHost(fix.nativeElement);
    const wc = fix.nativeElement.querySelector('mp-query-builder') as HTMLElement & { disabled?: boolean };
    expect(wc.disabled).toBe(true);
  });

  it('validateOperatorOverrides warnings logged for unknown fields', async () => {
    @Component({
      standalone: true,
      imports: [BsQueryBuilderComponent],
      template: `<bs-query-builder
        [schema]="schema"
        [rootEntity]="'orders'"
        [operatorOverrides]="{ bogus: ['equals'] }"
      ></bs-query-builder>`,
    })
    class H {
      schema = SCHEMA;
    }
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      const fix = TestBed.createComponent(H);
      fix.detectChanges();
      await settleHost(fix.nativeElement);
      expect(warn).toHaveBeenCalled();
      expect((warn.mock.calls[0]?.[0] ?? '') as string).toMatch(/Unknown field "bogus"/);
    } finally {
      warn.mockRestore();
    }
  });

  it('(saveQuery) Angular output fires when the WC emits save-query', async () => {
    @Component({
      standalone: true,
      imports: [BsQueryBuilderComponent],
      template: `<bs-query-builder
        [schema]="schema"
        [rootEntity]="'orders'"
        (saveQuery)="captured = $event"
      ></bs-query-builder>`,
    })
    class H {
      schema = SCHEMA;
      captured: unknown = null;
    }
    const fix = TestBed.createComponent(H);
    fix.detectChanges();
    await settleHost(fix.nativeElement);
    const wc = fix.nativeElement.querySelector('mp-query-builder') as HTMLElement;
    wc.dispatchEvent(new CustomEvent('save-query', { detail: { name: 'A', tree: emptyGroup('and') } }));
    fix.detectChanges();
    expect(fix.componentInstance.captured).toEqual({ name: 'A', tree: expect.any(Object) });
  });
});

afterEach(() => {
  TestBed.resetTestingModule();
});
