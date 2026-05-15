import { afterEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ApplicationRef, Component, signal } from '@angular/core';
import { BsQueryBuilderComponent } from './query-builder.component';
import { BsQueryBuilderEditorDirective } from './query-builder-editor.directive';
import type {
  EditorContext,
  EditorFactory,
  EditorHandle,
  EditorRegistry,
} from '../model/editor';
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

const CYCLES = 100;

async function settle(host: Element): Promise<void> {
  // One macrotask + microtask drain is enough — Lit batches into the next
  // microtask, Angular's signal-driven effects pick up on the macrotask.
  // We keep this tight because the harness runs hundreds of iterations.
  await Promise.resolve();
  await new Promise<void>((r) => setTimeout(r, 0));
  void host;
}

function deepFindAll(root: Element, selector: string): Element[] {
  const out: Element[] = [];
  const stack: Array<Element | ShadowRoot> = [root];
  if (root.shadowRoot) stack.push(root.shadowRoot);
  while (stack.length > 0) {
    const cur = stack.pop()!;
    for (const el of Array.from(cur.querySelectorAll(selector))) out.push(el);
    for (const el of Array.from(cur.querySelectorAll('*'))) {
      if (el.shadowRoot) stack.push(el.shadowRoot);
    }
  }
  return out;
}

function conditionFor(i: number): Expression {
  return {
    kind: 'group', id: `g-${i}`, logic: 'and',
    children: [{ kind: 'condition', id: `c-${i}`, field: 'total', operator: 'equals', value: i }],
  };
}

describe('bs-query-builder memory-leak harness (M16 pre-merge gate)', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('programmatic editorRegistry: 100 add/remove cycles → built === disposed (M4 contract)', { timeout: 30_000 }, async () => {
    let built = 0;
    let disposed = 0;
    const trackedFactory: EditorFactory = (_ctx: EditorContext): EditorHandle => {
      built++;
      const el = document.createElement('span');
      el.className = 'tracked-editor';
      return {
        element: el,
        dispose: () => { disposed++; },
      };
    };

    @Component({
      standalone: true,
      imports: [BsQueryBuilderComponent],
      template: `<bs-query-builder
        [schema]="schema"
        [rootEntity]="'orders'"
        [editorRegistry]="registry"
        [(query)]="query"
      ></bs-query-builder>`,
    })
    class Host {
      schema = SCHEMA;
      registry: EditorRegistry = { total: trackedFactory };
      query = signal<Expression>(emptyGroup('and'));
    }

    const fix = TestBed.createComponent(Host);
    fix.detectChanges();
    await settle(fix.nativeElement);

    for (let i = 0; i < CYCLES; i++) {
      fix.componentInstance.query.set(conditionFor(i) as Group);
      fix.detectChanges();
      await settle(fix.nativeElement);

      fix.componentInstance.query.set(emptyGroup('and'));
      fix.detectChanges();
      await settle(fix.nativeElement);
    }

    // The real "no leak" invariant: every constructed handle was disposed.
    // The exact count can exceed CYCLES because the wrapper's effect may
    // push a fresh merged registry object on render churn (changing the
    // editor's identity-key → forcing a rebuild). That's a separate perf
    // smell, not a leak — what matters here is that every build has a
    // matching dispose so no Angular view / DOM element is orphaned.
    expect(built).toBeGreaterThanOrEqual(CYCLES);
    expect(disposed).toBe(built);
  });

  it('*bsQueryBuilderEditor template projection: 100 add/remove cycles leave no orphan DOM and viewCount stable', { timeout: 30_000 }, async () => {
    @Component({
      standalone: true,
      imports: [BsQueryBuilderComponent, BsQueryBuilderEditorDirective],
      template: `<bs-query-builder
        [schema]="schema"
        [rootEntity]="'orders'"
        [(query)]="query"
      >
        <span *bsQueryBuilderEditor="'total'; let ctx" class="projected-editor" [attr.data-i]="ctx.value">
          v={{ ctx.value }}
        </span>
      </bs-query-builder>`,
    })
    class Host {
      schema = SCHEMA;
      query = signal<Expression>(emptyGroup('and'));
    }

    const fix = TestBed.createComponent(Host);
    fix.detectChanges();
    await settle(fix.nativeElement);

    const appRef = TestBed.inject(ApplicationRef);
    const baselineViewCount = appRef.viewCount;

    for (let i = 0; i < CYCLES; i++) {
      fix.componentInstance.query.set(conditionFor(i) as Group);
      fix.detectChanges();
      await settle(fix.nativeElement);

      fix.componentInstance.query.set(emptyGroup('and'));
      fix.detectChanges();
      await settle(fix.nativeElement);
    }

    // No orphan projected editor DOM anywhere in the host's subtree
    // (light DOM or any shadow root) after the final cleanup.
    const orphans = deepFindAll(fix.nativeElement as Element, '.projected-editor');
    expect(orphans).toHaveLength(0);

    // ApplicationRef.viewCount counts top-level attached views. Only the host
    // component is a root view; every embedded view from *bsQueryBuilderEditor
    // lives under it. If the EmbeddedViewRefs were leaking AT THE APPLICATION
    // ROOT level, viewCount would grow. We allow ±1 jitter for any framework
    // bookkeeping noise.
    expect(appRef.viewCount).toBeLessThanOrEqual(baselineViewCount + 1);
  });
});
