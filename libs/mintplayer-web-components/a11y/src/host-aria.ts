/**
 * One `ElementInternals` per element, shared between everything that needs it.
 *
 * `attachInternals()` throws if called twice, so `HostAriaController` and the
 * form-association mixin cannot each call it. This memoizes the first call and
 * hands the same object to every later caller.
 */
const internalsByElement = new WeakMap<HTMLElement, ElementInternals | null>();

export function sharedInternals(host: HTMLElement): ElementInternals | null {
  if (internalsByElement.has(host)) return internalsByElement.get(host) ?? null;

  let internals: ElementInternals | null = null;
  const attach = (host as HTMLElement & { attachInternals?: () => ElementInternals }).attachInternals;
  if (typeof attach === 'function') {
    try {
      internals = attach.call(host);
    } catch {
      // Already attached elsewhere, or unsupported for this element. Either way
      // there is nothing to recover — degrade to attribute-only behaviour.
      internals = null;
    }
  }
  internalsByElement.set(host, internals);
  return internals;
}

/** True when the browser supports assigning cross-root ARIA element references. */
export function supportsAriaElementReferences(): boolean {
  return typeof ElementInternals !== 'undefined' && 'ariaLabelledByElements' in ElementInternals.prototype;
}

/** ARIA state this controller can reflect onto the host. Values of `null` remove the state. */
export interface HostAriaState {
  expanded?: boolean | null;
  selected?: boolean | null;
  checked?: boolean | 'mixed' | null;
  pressed?: boolean | null;
  disabled?: boolean | null;
  invalid?: boolean | null;
  required?: boolean | null;
  readOnly?: boolean | null;
  current?: string | null;
  hasPopup?: string | null;
  level?: number | null;
  orientation?: string | null;
  multiSelectable?: boolean | null;
  valueNow?: number | null;
  valueMin?: number | null;
  valueMax?: number | null;
  valueText?: string | null;
  label?: string | null;
}

export interface HostAriaOptions {
  /**
   * Default role for the host. An author-supplied `role` attribute still wins,
   * which is the point — this is a default, not an override.
   */
  role?: string;
  /**
   * Host attributes to resolve into cross-root element references.
   * Default: `['aria-labelledby', 'aria-describedby']`.
   */
  referenceAttributes?: string[];
}

const DEFAULT_REFERENCE_ATTRIBUTES = ['aria-labelledby', 'aria-describedby'];

let warnedAboutReferences = false;

/** Re-arm the once-only reference warning. Tests only. */
export function resetReferenceWarningForTesting(): void {
  warnedAboutReferences = false;
}

/**
 * Puts a web component's role and ARIA state on its **host**, and makes the
 * consumer's `aria-labelledby` / `aria-describedby` actually work.
 *
 * Two problems, one platform answer.
 *
 * **The role is in the wrong place.** Most components in this library render
 * their semantic role onto a node inside the shadow root. A consumer can only
 * reach the host, and `aria-label` on a host with no role is ignored by
 * browsers (naming is prohibited on `role="generic"`), so components end up
 * unnameable from outside — the audit found `mp-select` unnamed by default and
 * `mp-datatable`, `mp-timeline` and `mp-tree-select` with no naming path at all.
 * `internals.role` puts the role on the host, so a host `aria-label` applies to
 * the right node with no forwarding.
 *
 * **IDREFs cannot cross a shadow boundary.** `aria-labelledby="my-label"` on a
 * host, copied onto an `<input>` inside the shadow root, resolves to nothing:
 * IDREF *strings* are scoped to the holder's own tree. `mp-checkbox` does
 * exactly this today and it is silently dead — the attribute is visibly present
 * on the input in devtools and conveys nothing. The fix is that reflected ARIA
 * *element reference* properties take elements, not ids, and may point at the
 * same scope **or a parent scope** — so resolving the ids in the *host's* tree
 * (where they do resolve) and assigning the elements inward is the permitted
 * direction. `ariaLabelledByElements` has been Baseline since April 2025.
 *
 * Where the element-reference API is unavailable, references are skipped rather
 * than approximated: copying the referenced element's `textContent` into
 * `aria-label` drifts silently the moment the label is edited or translated, and
 * a stale name is worse than a missing one. The documented fallback is the
 * component's own `inputLabel` property.
 */
export class HostAriaController {
  private readonly internals: ElementInternals | null;
  private readonly referenceAttributes: string[];

  constructor(
    private readonly host: HTMLElement,
    private readonly options: HostAriaOptions = {},
  ) {
    this.internals = sharedInternals(host);
    this.referenceAttributes = options.referenceAttributes ?? DEFAULT_REFERENCE_ATTRIBUTES;

    if (options.role && this.internals) {
      this.internals.role = options.role;
    } else if (options.role && !host.hasAttribute('role')) {
      // No internals available — fall back to the attribute so the host is at
      // least nameable. Skipped when the author set their own role.
      host.setAttribute('role', options.role);
    }
  }

  /** True when the role and state are going through `ElementInternals`. */
  get usesInternals(): boolean {
    return this.internals !== null;
  }

  /**
   * Reflect ARIA state onto the host.
   *
   * Call from `render()` or `updated()` — from wherever the visual state is
   * derived — never as a side effect of an event handler. State written only on
   * an event is stale for every other path that changes it (programmatic
   * setters, server-rendered markup, a sibling closing this one), which is the
   * defect class behind the frozen `aria-expanded` and write-only-when-true
   * `aria-pressed` findings.
   */
  setState(state: HostAriaState): void {
    for (const [key, value] of Object.entries(state) as [keyof HostAriaState, unknown][]) {
      const attribute = STATE_ATTRIBUTES[key];
      if (!attribute) continue;

      if (value === null || value === undefined) {
        this.clear(key, attribute);
        continue;
      }
      this.write(key, attribute, String(value));
    }
  }

  /**
   * Resolve the host's IDREF attributes into cross-root element references.
   *
   * Call from `connectedCallback` and whenever a reference attribute changes.
   * Returns the attributes it could not honour, so a caller can warn.
   */
  syncReferences(): string[] {
    if (!this.internals || !supportsAriaElementReferences()) {
      const present = this.referenceAttributes.filter((attr) => this.host.hasAttribute(attr));
      if (present.length > 0 && !warnedAboutReferences) {
        warnedAboutReferences = true;
        // eslint-disable-next-line no-console
        console.warn(
          `[a11y] This browser cannot assign ARIA element references, so ${present.join(', ')} on `
            + `<${this.host.localName}> cannot cross its shadow boundary. Use the component's label property instead.`,
        );
      }
      return present;
    }

    const unresolved: string[] = [];
    const root = this.host.getRootNode() as Document | ShadowRoot;

    for (const attribute of this.referenceAttributes) {
      const property = REFERENCE_PROPERTIES[attribute];
      if (!property) continue;

      const raw = this.host.getAttribute(attribute);
      if (raw === null) {
        this.assignReferences(property, null);
        continue;
      }

      const ids = raw.split(/\s+/).filter(Boolean);
      // Resolve in the HOST's tree — that is where the consumer's ids live, and
      // resolving them here is what makes the inward assignment legal.
      const elements = ids
        .map((id) => (root as Document).getElementById?.(id) ?? null)
        .filter((el): el is HTMLElement => el instanceof HTMLElement);

      if (elements.length !== ids.length) unresolved.push(attribute);
      this.assignReferences(property, elements.length > 0 ? elements : null);
    }
    return unresolved;
  }

  private assignReferences(property: string, elements: HTMLElement[] | null): void {
    if (!this.internals) return;
    try {
      (this.internals as unknown as Record<string, unknown>)[property] = elements;
    } catch {
      // Some engines reject assignment when the referenced element is not in a
      // valid scope; nothing useful to do but leave the name unset.
    }
  }

  private write(key: keyof HostAriaState, attribute: string, value: string): void {
    if (this.internals) {
      const property = INTERNALS_PROPERTIES[key];
      if (property && property in this.internals) {
        (this.internals as unknown as Record<string, unknown>)[property] = value;
        return;
      }
    }
    this.host.setAttribute(attribute, value);
  }

  private clear(key: keyof HostAriaState, attribute: string): void {
    if (this.internals) {
      const property = INTERNALS_PROPERTIES[key];
      if (property && property in this.internals) {
        (this.internals as unknown as Record<string, unknown>)[property] = null;
        return;
      }
    }
    this.host.removeAttribute(attribute);
  }
}

const STATE_ATTRIBUTES: Record<keyof HostAriaState, string> = {
  expanded: 'aria-expanded',
  selected: 'aria-selected',
  checked: 'aria-checked',
  pressed: 'aria-pressed',
  disabled: 'aria-disabled',
  invalid: 'aria-invalid',
  required: 'aria-required',
  readOnly: 'aria-readonly',
  current: 'aria-current',
  hasPopup: 'aria-haspopup',
  level: 'aria-level',
  orientation: 'aria-orientation',
  multiSelectable: 'aria-multiselectable',
  valueNow: 'aria-valuenow',
  valueMin: 'aria-valuemin',
  valueMax: 'aria-valuemax',
  valueText: 'aria-valuetext',
  label: 'aria-label',
};

const INTERNALS_PROPERTIES: Record<keyof HostAriaState, string> = {
  expanded: 'ariaExpanded',
  selected: 'ariaSelected',
  checked: 'ariaChecked',
  pressed: 'ariaPressed',
  disabled: 'ariaDisabled',
  invalid: 'ariaInvalid',
  required: 'ariaRequired',
  readOnly: 'ariaReadOnly',
  current: 'ariaCurrent',
  hasPopup: 'ariaHasPopup',
  level: 'ariaLevel',
  orientation: 'ariaOrientation',
  multiSelectable: 'ariaMultiSelectable',
  valueNow: 'ariaValueNow',
  valueMin: 'ariaValueMin',
  valueMax: 'ariaValueMax',
  valueText: 'ariaValueText',
  label: 'ariaLabel',
};

const REFERENCE_PROPERTIES: Record<string, string> = {
  'aria-labelledby': 'ariaLabelledByElements',
  'aria-describedby': 'ariaDescribedByElements',
};
