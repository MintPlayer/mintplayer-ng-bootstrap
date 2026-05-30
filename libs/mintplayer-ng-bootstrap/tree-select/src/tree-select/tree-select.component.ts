import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  CUSTOM_ELEMENTS_SCHEMA,
  DestroyRef,
  effect,
  ElementRef,
  EmbeddedViewRef,
  forwardRef,
  inject,
  input,
  model,
  output,
  signal,
  ViewContainerRef,
  viewChild,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { BsFormComponent } from '@mintplayer/ng-bootstrap/form';
import {
  MpTreeSelect,
  type TreeNode,
  type TreeSelectChangeEventDetail,
  type TreeSelectMode,
  type TreeSelectProvider,
  type TreeSelectVariant,
} from '@mintplayer/web-components/tree-select';

// Side-effect import: registers the <mp-tree-select> custom element.
import '@mintplayer/web-components/tree-select';

import {
  BsTreeSelectButtonTemplateDirective,
  BsTreeSelectEnterSearchTermTemplateDirective,
  BsTreeSelectFooterTemplateDirective,
  BsTreeSelectHeaderTemplateDirective,
  BsTreeSelectItemTemplateDirective,
  type BsTreeSelectNodeContext,
  BsTreeSelectNoResultsTemplateDirective,
  BsTreeSelectSuggestionTemplateDirective,
  type BsTreeSelectValueContext,
} from '../directives/template-directives';

type Value = TreeNode | TreeNode[] | null;

/**
 * Angular wrapper for `<mp-tree-select>`. A `ControlValueAccessor`, so it works
 * with `[(ngModel)]` / `formControlName`. **Requires a `<bs-form>` ancestor**
 * (parity with the legacy searchbox it replaces).
 */
@Component({
  selector: 'bs-tree-select',
  templateUrl: './tree-select.component.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => BsTreeSelectComponent),
      multi: true,
    },
  ],
})
export class BsTreeSelectComponent implements ControlValueAccessor, AfterViewInit {
  // ---- inputs (pushed to the WC as properties) --------------------------
  readonly provider = input<TreeSelectProvider | undefined>(undefined);
  readonly mode = input<TreeSelectMode>('single');
  readonly variant = input<TreeSelectVariant>('textbox');
  readonly cascadeSelect = input<boolean>(false);
  readonly placeholder = input<string>('');
  readonly showClear = input<boolean>(false);
  readonly panelScrollHeight = input<string>('300px');
  readonly searchDebounceMs = input<number>(200);
  readonly disabled = input<boolean>(false);

  readonly value = model<Value>(null);

  readonly opened = output<void>();
  readonly closed = output<void>();
  readonly cleared = output<void>();

  readonly elementRef = viewChild<ElementRef<MpTreeSelect>>('el');

  private readonly itemTpl = contentChild(BsTreeSelectItemTemplateDirective);
  private readonly suggestionTpl = contentChild(BsTreeSelectSuggestionTemplateDirective);
  private readonly buttonTpl = contentChild(BsTreeSelectButtonTemplateDirective);
  private readonly headerTpl = contentChild(BsTreeSelectHeaderTemplateDirective);
  private readonly footerTpl = contentChild(BsTreeSelectFooterTemplateDirective);
  private readonly noResultsTpl = contentChild(BsTreeSelectNoResultsTemplateDirective);
  private readonly enterSearchTermTpl = contentChild(BsTreeSelectEnterSearchTermTemplateDirective);

  private readonly bsForm = inject(BsFormComponent, { optional: true });
  private readonly vcr = inject(ViewContainerRef);
  private readonly destroyRef = inject(DestroyRef);

  private readonly nodeCaches = new Set<Map<string, EmbeddedViewRef<unknown>>>();
  private readonly singleViews: EmbeddedViewRef<unknown>[] = [];
  private readonly disabledByCva = signal(false);
  private readonly effectiveDisabled = computed(() => this.disabled() || this.disabledByCva());

  private onChange: (value: Value) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  constructor() {
    if (!this.bsForm) {
      throw new Error('<bs-tree-select> must be inside a <bs-form>');
    }

    this.destroyRef.onDestroy(() => {
      for (const cache of this.nodeCaches) for (const v of cache.values()) v.destroy();
      for (const v of this.singleViews) v.destroy();
    });

    // Push scalar config to the WC element.
    this.bindProp((el) => (el.mode = this.mode()));
    this.bindProp((el) => (el.variant = this.variant()));
    this.bindProp((el) => (el.cascadeSelect = this.cascadeSelect()));
    this.bindProp((el) => (el.placeholder = this.placeholder()));
    this.bindProp((el) => (el.showClear = this.showClear()));
    this.bindProp((el) => (el.panelScrollHeight = this.panelScrollHeight()));
    this.bindProp((el) => (el.searchDebounceMs = this.searchDebounceMs()));
    this.bindProp((el) => (el.disabled = this.effectiveDisabled()));
    this.bindProp((el) => (el.provider = this.provider()));
    this.bindProp((el) => (el.value = this.value()));

    // Wire render-callbacks from any provided ng-templates.
    this.bindProp((el) => (el.itemTemplate = this.nodeRenderer(this.itemTpl())));
    this.bindProp((el) => (el.suggestionTemplate = this.nodeRenderer(this.suggestionTpl())));
    this.bindProp((el) => (el.buttonTemplate = this.valueRenderer(this.buttonTpl())));
    this.bindProp((el) => (el.headerTemplate = this.staticRenderer(this.headerTpl())));
    this.bindProp((el) => (el.footerTemplate = this.staticRenderer(this.footerTpl())));
    this.bindProp((el) => (el.noResultsTemplate = this.staticRenderer(this.noResultsTpl())));
    this.bindProp((el) => (el.enterSearchTermTemplate = this.staticRenderer(this.enterSearchTermTpl())));
  }

  ngAfterViewInit(): void {
    // Effects above run as the view initializes; nothing else required.
  }

  private bindProp(apply: (el: MpTreeSelect) => void): void {
    effect(() => {
      const el = this.elementRef()?.nativeElement;
      if (el) apply(el);
    });
  }

  // ---- event handlers ----------------------------------------------------
  onValueChange(event: Event): void {
    const detail = (event as CustomEvent<TreeSelectChangeEventDetail>).detail;
    this.value.set(detail.value);
    this.onChange(detail.value);
  }

  onOpen(): void {
    this.opened.emit();
  }
  onClose(): void {
    this.onTouched();
    this.closed.emit();
  }
  onClear(): void {
    this.cleared.emit();
  }

  // ---- ControlValueAccessor ---------------------------------------------
  writeValue(value: Value): void {
    this.value.set(value);
  }
  registerOnChange(fn: (value: Value) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  setDisabledState(isDisabled: boolean): void {
    this.disabledByCva.set(isDisabled);
  }

  // ---- ng-template → render-callback bridges -----------------------------
  private nodeRenderer(
    dir: { templateRef: import('@angular/core').TemplateRef<BsTreeSelectNodeContext> } | undefined,
  ): ((node: TreeNode, query: string) => Node) | undefined {
    if (!dir) return undefined;
    // LRU-bounded so browsing a large server tree (every distinct node id seen
    // over the component's lifetime) can't grow the cache without limit. Map
    // iteration is insertion-ordered; re-inserting on hit marks recency, and we
    // destroy the oldest entry past the cap. Currently-rendered nodes are the
    // most-recently-used, so eviction only ever targets off-screen views.
    const MAX_VIEWS = 400;
    const cache = new Map<string, EmbeddedViewRef<BsTreeSelectNodeContext>>();
    this.nodeCaches.add(cache as Map<string, EmbeddedViewRef<unknown>>);
    return (node, query) => {
      let view = cache.get(node.id);
      if (!view) {
        view = this.vcr.createEmbeddedView(dir.templateRef, { $implicit: node, query });
        cache.set(node.id, view);
        if (cache.size > MAX_VIEWS) {
          const oldest = cache.keys().next().value as string;
          cache.get(oldest)?.destroy();
          cache.delete(oldest);
        }
      } else {
        cache.delete(node.id);
        cache.set(node.id, view);
        view.context.$implicit = node;
        view.context.query = query;
      }
      view.detectChanges();
      return this.rootNode(view);
    };
  }

  private valueRenderer(
    dir: { templateRef: import('@angular/core').TemplateRef<BsTreeSelectValueContext> } | undefined,
  ): ((value: Value) => Node) | undefined {
    if (!dir) return undefined;
    let view: EmbeddedViewRef<BsTreeSelectValueContext> | undefined;
    return (value) => {
      if (!view) {
        view = this.vcr.createEmbeddedView(dir.templateRef, { $implicit: value });
        this.singleViews.push(view);
      } else {
        view.context.$implicit = value;
      }
      view.detectChanges();
      return this.rootNode(view);
    };
  }

  private staticRenderer(
    dir: { templateRef: import('@angular/core').TemplateRef<unknown> } | undefined,
  ): (() => Node) | undefined {
    if (!dir) return undefined;
    let view: EmbeddedViewRef<unknown> | undefined;
    return () => {
      if (!view) {
        view = this.vcr.createEmbeddedView(dir.templateRef, {});
        this.singleViews.push(view);
      }
      view.detectChanges();
      return this.rootNode(view);
    };
  }

  private rootNode(view: EmbeddedViewRef<unknown>): Node {
    const nodes = (view.rootNodes as unknown[]).filter((n): n is Node => n instanceof Node);
    if (nodes.length === 1) return nodes[0];
    const fragment = document.createDocumentFragment();
    for (const n of nodes) fragment.appendChild(n);
    return fragment;
  }
}
