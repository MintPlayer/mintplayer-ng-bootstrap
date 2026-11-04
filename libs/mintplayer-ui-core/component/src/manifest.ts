/**
 * The manifest of a component group, `<group>/src/<group>.component.ts`
 * (PRD #437 D10). It is what `@mintplayer/nx-component-compiler` reads to
 * generate the four fronts, so it is plain data: Node loads it with its type
 * annotations stripped, which means it may only `import type`.
 *
 *     import type { ComponentGroup } from '@mintplayer/ui-core/component';
 *
 *     export default {
 *       group: 'navbar',
 *       style: { scope: 'navbar' },
 *       components: {
 *         'navbar-nav': {
 *           core: 'navbarNavCore',
 *           inputs: { type: 'NavbarNavInputs', fields: { align: { default: "'start'" } } },
 *         },
 *       },
 *     } satisfies ComponentGroup;
 *
 * Names in it (`core`, `inputs.type`, an output's `type`, the group sheet) are
 * exports of the group's entry point, or of `from` where given; the generated
 * fronts import them, so a typo is a type error there.
 */

/** How a Lit property converts from its attribute; `false` keeps it a property only. */
export type InputKind = 'string' | 'boolean' | 'number' | false;

export interface InputField {
  /** A TypeScript expression for the default, e.g. `"'md'"` or `'false'`. Omitted: `undefined`. */
  readonly default?: string;
  /** Lit attribute conversion. Inferred from `default` (a string, boolean or number literal), else `false`. */
  readonly kind?: InputKind;
  /** Reflect the property to its attribute (Lit). */
  readonly reflect?: boolean;
  /**
   * Two-way: the core's state key of the same name is the live value, written
   * back when the core changes it (Angular model(), Vue v-model, Lit property).
   * React stays controlled through the matching `<name>Change` output.
   */
  readonly model?: boolean;
  /**
   * Angular only: the input's public name. A structural directive's inputs are named after its selector
   * (`*bsPopover="'top'; title: 'Hi'"` sets `bsPopover` and `bsPopoverTitle`).
   */
  readonly alias?: string;
  readonly doc?: string;
}

export interface OutputField {
  /** The detail type, an export of the entry (or `from`). */
  readonly type: string;
  readonly from?: string;
  readonly doc?: string;
}

export interface MethodField {
  readonly doc?: string;
}

/** Per-front names, all derived from the element name unless given. */
export interface ComponentNames {
  /** Angular class; default `Bs<Pascal>Component`. */
  readonly angular?: string;
  /** Angular selector; default `bs-<element>`. */
  readonly selector?: string;
  /** React and Vue component; default `Bs<Pascal>`. */
  readonly component?: string;
  /** Lit class; default `Mp<Pascal>`. */
  readonly lit?: string;
  /** Custom element tag; default `mp-<element>`. */
  readonly tag?: string;
}

/** A content query: every `component` in the content, in document order. */
export interface ContentQuery {
  /** The queried element of the same group (`ribbon-tab`), or a declaration (`tab-page`). */
  readonly component: string;
  /** An element of the same group that may wrap it; its inputs ride along as `within`. */
  readonly within?: string;
}

export interface ComponentManifest {
  /** The `ComponentCore` export. */
  readonly core: string;
  /** The `CoreContext` export the core `provides` to its content, if any. */
  readonly provides?: string;
  /** The template, under `templates/`; default `<element>.view.vue`. */
  readonly template?: string;
  readonly inputs?: {
    /** The core's inputs interface. */
    readonly type: string;
    readonly fields: Readonly<Record<string, InputField>>;
  };
  /**
   * Keyed by the core's event name, camelCase (`expandedChange`). Angular
   * outputs, Vue emits and Lit DOM events use it lowercased (`expandedchange`);
   * React props prefix it with `on` (`onExpandedChange`).
   */
  readonly outputs?: Readonly<Record<string, OutputField>>;
  readonly methods?: {
    /** The core's public method signatures (`ComponentCore`'s `M`). */
    readonly type: string;
    readonly fields: Readonly<Record<string, MethodField>>;
  };
  /**
   * Content queries, keyed by the input they fill (the core's inputs type must
   * declare it as `readonly ContentChild[]`). Each front reads the inputs of the
   * named components in the consumer's content WHILE RENDERING (Angular
   * `contentChildren`, React `props.children`, Vue slot vnodes, Lit child
   * elements), so a parent can render what its children declare on the server.
   */
  readonly content?: Readonly<Record<string, ContentQuery>>;
  readonly names?: ComponentNames;
  /** The component's documentation, copied onto every front. */
  readonly doc?: string;
}

/**
 * The group's one scoped sheet (S15). The compiler stamps `data-mps=<scope>` on
 * every element its templates render, so a core's bags carry no scope. The
 * sheet is `<scope>.scoped.scss`, exported as `<camelScope>ScopedStyles` (the
 * codegen derives both from the file name, so the stamp and the sheet agree).
 * A group that renders another core's bags `@use`s that core's sheet in its own.
 */
export interface GroupStyle {
  /** The literal scope, e.g. `'navbar'`. */
  readonly scope: string;
  /** Module exporting the sheet; default the group's entry. */
  readonly from?: string;
  /**
   * The Bootstrap partials the group's markup uses (`'forms'`, `'dropdown'`…).
   * Bootstrap ships per component (#452): every front installs these part
   * sheets from `@mintplayer/ui-core/bootstrap` before the group's own sheet.
   */
  readonly bootstrap?: readonly BootstrapPartName[];
}

export type BootstrapPartName =
  | 'containers' | 'grid' | 'tables' | 'forms' | 'transitions' | 'dropdown' | 'button-group' | 'nav'
  | 'navbar' | 'card' | 'accordion' | 'breadcrumb' | 'pagination' | 'badge' | 'alert' | 'progress'
  | 'list-group' | 'close' | 'toasts' | 'modal' | 'tooltip' | 'popover' | 'carousel' | 'spinners'
  | 'offcanvas' | 'placeholders';

/** Per-front names of a directive, all derived from its name unless given. */
export interface DirectiveNames {
  /** Angular class; default `Bs<Pascal>Directive`. */
  readonly angular?: string;
  /** Angular selector; default `[bs<Pascal>]`. */
  readonly selector?: string;
  /** React hook; default `useBs<Pascal>`. */
  readonly react?: string;
  /** Vue directive; default `vBs<Pascal>` (used as `v-bs-<name>`). */
  readonly vue?: string;
  /** Lit element-part directive; default `bs<Pascal>`. */
  readonly lit?: string;
}

/**
 * A directive (#458 §4.3): a core without a template, placed on an element the
 * consumer renders. Its core's `view` returns that element's bag; the fronts
 * stamp it with the group's scope and install the group's sheets, so the
 * element opts in to them. Angular: an attribute directive. React: a hook
 * returning props (`mergeProps` combines them with the consumer's). Vue: a
 * custom directive. Lit: an element-part directive.
 */
export interface DirectiveManifest {
  /** The `ComponentCore` export; its `view` returns a `CoreBag`. */
  readonly core: string;
  readonly inputs?: ComponentManifest['inputs'];
  /** DOM events on the element in Vue and Lit; Angular outputs; React `on<Name>` options. */
  readonly outputs?: ComponentManifest['outputs'];
  /**
   * An overlay directive (#458 M6, tooltip and popover): the component of the group its content renders
   * in. The core's view returns `{ anchor, overlay }`: `anchor` is the element's bag (not scoped: the
   * element is the consumer's, and only the panel is styled), `overlay` the panel's inputs while it
   * renders, else null. Every front renders that component into a body host with the consumer's
   * content as its default slot. Angular: a structural directive (`*bsTooltip`), its template the
   * content. React: the hook returns `[props, overlay]`, the content an option. Vue: a renderless
   * component whose default slot receives `{ props }`, the content its `content` slot. Lit: the
   * directive's second argument, a function returning the content.
   */
  readonly overlay?: string;
  readonly names?: DirectiveNames;
  readonly doc?: string;
}

/**
 * A declaration (#458 Q15): an element with inputs and slots but no core and no
 * markup of its own. A parent of the group queries it (`content`) and renders
 * its slots inside the parent's markup with `<content-slot>`, so rich consumer
 * content lands where the parent's structure needs it (a tab page's header in
 * the tab strip, its body in the pane), on the server too. Angular: a hidden
 * component lending its slots as TemplateRefs (named slots are structural
 * directives, `*bsTabPageHeader`). React: a component rendering null whose slot
 * props the parent reads. Vue: a component rendering nothing whose slots the
 * parent reads. Lit: a hidden element whose `slot=` children the parent moves.
 */
export interface DeclarationManifest {
  readonly inputs?: ComponentManifest['inputs'];
  /** Named slots, besides the default slot every declaration lends. */
  readonly slots?: Readonly<Record<string, { readonly doc?: string }>>;
  readonly names?: ComponentNames;
  readonly doc?: string;
}

export interface ComponentGroup {
  /** The entry point name; also the generated entry in every front lib. */
  readonly group: string;
  /** The sheet every component of the group installs, and the scope its templates are stamped with. */
  readonly style?: GroupStyle;
  /** Keyed by element name (`navbar`, `navbar-item`, …). */
  readonly components?: Readonly<Record<string, ComponentManifest>>;
  /** Keyed by directive name (`row`, `col`, …). */
  readonly directives?: Readonly<Record<string, DirectiveManifest>>;
  /** Keyed by element name (`tab-page`); a component's content query collects them. */
  readonly declarations?: Readonly<Record<string, DeclarationManifest>>;
}
