import {
  AfterContentInit,
  ChangeDetectionStrategy,
  Component,
  ContentChildren,
  CUSTOM_ELEMENTS_SCHEMA,
  effect,
  ElementRef,
  forwardRef,
  inject,
  input,
  model,
  output,
  QueryList,
  signal,
  ViewContainerRef,
  viewChild,
} from '@angular/core';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
} from '@angular/forms';
import { MpQueryBuilderElement } from '../web-components/mp-query-builder.element';
import type { Expression } from '../model/expression';
import type { EntitySchema } from '../model/field-def';
import type {
  EditorContext,
  EditorFactory,
  EditorRegistry,
} from '../model/editor';
import type { QueryBuilderMessages } from '../model/messages';
import type { SavedQuery } from '../model/saved-query';
import type { SortDescriptor } from '../model/sort';
import { emptyGroup } from '../model/default-tree';
import {
  validateOperatorOverrides,
  type OperatorOverrides,
} from '../model/operator-overrides';
import { BsQueryBuilderEditorDirective } from './query-builder-editor.directive';

void MpQueryBuilderElement;

function browserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

@Component({
  selector: 'bs-query-builder',
  standalone: true,
  templateUrl: './query-builder.component.html',
  styleUrls: ['./query-builder.component.scss'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => BsQueryBuilderComponent), multi: true },
  ],
})
export class BsQueryBuilderComponent implements AfterContentInit, ControlValueAccessor {
  // [(query)] two-way binding for ngModel/formControl-equivalent use.
  query = model<Expression>(emptyGroup('and'));

  schema = input<EntitySchema[]>([]);
  /**
   * Two-way bindable since M18: when `[multiEntityPickerEnabled]` is on and
   * the user picks a different entity in the toolbar, the model emits the
   * new value. Existing `[rootEntity]="'orders'"` static bindings keep
   * working (read-only model usage).
   */
  rootEntity = model<string>('');
  /**
   * Opt-in: render an entity-picker dropdown in the top toolbar (and any
   * other Phase-2 toolbar widgets — field projection, sort builder — once
   * those land). Default `false` preserves today's compact rendering with
   * no toolbar.
   */
  multiEntityPickerEnabled = input<boolean>(false);
  /**
   * Two-way bindable list of currently-selected field names for projection.
   * Presentation-only — does NOT affect the query tree. Consumers typically
   * map this to which datatable columns to render. Empty array = nothing
   * selected; the consumer decides how to interpret that (commonly "show
   * all"). When `rootEntity` changes, stale field names just disappear
   * from the checkbox list (no auto-reset).
   */
  selectedFields = model<string[]>([]);
  /**
   * Two-way bindable list of sort descriptors. Same shape as the
   * `QueryRequest.sort[]` wire-format field — `{ field, direction }`.
   * Multi-priority allowed: array order is the priority order.
   */
  sortBy = model<SortDescriptor[]>([]);
  messages = input<Partial<QueryBuilderMessages> | undefined>(undefined);
  showPreview = input<boolean>(false);
  showSavedQueries = input<boolean>(false);
  maxDepth = input<number>(32);
  timezone = input<string>(browserTimezone());
  savedQueries = input<SavedQuery[]>([]);
  operatorOverrides = input<OperatorOverrides | undefined>(undefined);
  disabled = input<boolean>(false);
  editorRegistry = input<EditorRegistry | undefined>(undefined);

  readonly saveQuery = output<{ name: string; tree: Expression }>();
  readonly loadQuery = output<{ name: string }>();
  readonly deleteQuery = output<{ name: string }>();

  readonly wcRef = viewChild<ElementRef<MpQueryBuilderElement>>('wc');

  @ContentChildren(BsQueryBuilderEditorDirective)
  protected editorDirectives!: QueryList<BsQueryBuilderEditorDirective>;

  private vcr = inject(ViewContainerRef);

  protected readonly formDisabled = signal(false);
  /** Combined effective disabled state used by the template. */
  protected readonly effectiveDisabled = signal(false);

  /** Re-entrancy guard for writeValue ↔ model() round-tripping (FR-18). */
  private writingFromForm = false;

  private onChangeFn: (value: Expression) => void = () => undefined;
  private onTouchedFn: () => void = () => undefined;

  /** Editor registry built from @ContentChildren + the [editorRegistry] input. */
  private directiveRegistry = signal<EditorRegistry>({});

  constructor() {
    // Compute effective disabled (input OR formDisabled from setDisabledState).
    effect(() => {
      this.effectiveDisabled.set(this.disabled() || this.formDisabled());
    });

    // Push every reactive input down to the WC. Lit reflects via property assignment.
    effect(() => {
      const wc = this.wcRef()?.nativeElement;
      if (!wc) return;
      wc.query = this.query();
      wc.schema = this.schema();
      wc.rootEntity = this.rootEntity();
      wc.multiEntityPickerEnabled = this.multiEntityPickerEnabled();
      wc.selectedFields = this.selectedFields();
      wc.sortBy = this.sortBy();
      wc.messages = this.messages();
      wc.showPreview = this.showPreview();
      wc.showSavedQueries = this.showSavedQueries();
      wc.maxDepth = this.maxDepth();
      wc.savedQueries = this.savedQueries();
      wc.disabled = this.effectiveDisabled();
      // Merge directive-projected editors with the programmatic registry input.
      // Programmatic entries take precedence (consumer's explicit override).
      const directive = this.directiveRegistry();
      const programmatic = this.editorRegistry() ?? {};
      wc.editorRegistry = { ...directive, ...programmatic };
      // Trigger a render after batched property assignments.
      (wc as MpQueryBuilderElement & { requestUpdate?: () => void }).requestUpdate?.();
    });

    // Validate [operatorOverrides] on every change. We log warnings; the
    // sanitized result isn't currently consumed by the WC (the WC's operator
    // <select> already filters by OperatorCatalog[field.type] — see M6).
    // This validation surfaces consumer mistakes early via console.warn.
    effect(() => {
      const overrides = this.operatorOverrides();
      if (!overrides) return;
      const result = validateOperatorOverrides(this.schema(), overrides);
      for (const w of result.warnings) {
        console.warn(w);
      }
    });

    // Propagate model() changes to the form onChange, guarded by writingFromForm.
    effect(() => {
      const tree = this.query();
      if (this.writingFromForm) return;
      this.onChangeFn(tree);
    });
  }

  ngAfterContentInit(): void {
    this.rebuildDirectiveRegistry();
    this.editorDirectives.changes.subscribe(() => this.rebuildDirectiveRegistry());
  }

  private rebuildDirectiveRegistry(): void {
    const next: EditorRegistry = {};
    for (const dir of this.editorDirectives.toArray()) {
      const fieldName = dir.fieldName();
      const factory: EditorFactory = (ctx: EditorContext) => {
        const view = this.vcr.createEmbeddedView(dir.templateRef, { $implicit: ctx, ctx });
        view.detectChanges();
        const root = view.rootNodes.find((n) => n instanceof HTMLElement) as HTMLElement | undefined
          ?? document.createElement('span');
        return {
          element: root,
          dispose: () => view.destroy(),
        };
      };
      next[fieldName] = factory;
    }
    this.directiveRegistry.set(next);
  }

  protected onQueryChange(event: Event): void {
    const detail = (event as CustomEvent<{ tree: Expression }>).detail;
    if (!detail) return;
    // Coming FROM the WC; do NOT re-enter onChangeFn → writeValue loop.
    this.writingFromForm = true;
    this.query.set(detail.tree);
    queueMicrotask(() => { this.writingFromForm = false; });
    this.onChangeFn(detail.tree);
    this.onTouchedFn();
  }

  protected onRootEntityChange(event: Event): void {
    const detail = (event as CustomEvent<{ rootEntity: string }>).detail;
    if (!detail) return;
    this.rootEntity.set(detail.rootEntity);
  }

  protected onSelectedFieldsChange(event: Event): void {
    const detail = (event as CustomEvent<{ selectedFields: string[] }>).detail;
    if (!detail) return;
    this.selectedFields.set(detail.selectedFields);
  }

  protected onSortByChange(event: Event): void {
    const detail = (event as CustomEvent<{ sortBy: SortDescriptor[] }>).detail;
    if (!detail) return;
    this.sortBy.set(detail.sortBy);
  }

  protected onSaveQuery(event: Event): void {
    this.saveQuery.emit((event as CustomEvent<{ name: string; tree: Expression }>).detail);
  }

  protected onLoadQuery(event: Event): void {
    this.loadQuery.emit((event as CustomEvent<{ name: string }>).detail);
  }

  protected onDeleteQuery(event: Event): void {
    this.deleteQuery.emit((event as CustomEvent<{ name: string }>).detail);
  }

  /* ---- ControlValueAccessor ---- */

  writeValue(value: Expression | null | undefined): void {
    if (value == null) {
      this.writingFromForm = true;
      this.query.set(emptyGroup('and'));
      queueMicrotask(() => { this.writingFromForm = false; });
      return;
    }
    this.writingFromForm = true;
    this.query.set(value);
    queueMicrotask(() => { this.writingFromForm = false; });
  }

  registerOnChange(fn: (value: Expression) => void): void {
    this.onChangeFn = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouchedFn = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.formDisabled.set(isDisabled);
  }
}
