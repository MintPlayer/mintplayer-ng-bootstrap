import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  type CemAttribute,
  type CemElement,
  type CemMember,
  type Domain,
  type LitType,
  domainOf,
  kebabToCamel,
  litFromAttribute,
  manifestElements,
  publicFields,
  reflectedAttribute,
  representative,
  scanLiteralAliases,
} from './cem-properties';

/**
 * The property / attribute table, driven by `custom-elements.json` (PRD F19).
 *
 * Every custom element the manifest describes is mounted, and then:
 *
 *  - every public, writable field whose declared type the table understands is
 *    set to a representative value and must read back (round-trip); a field the
 *    manifest marks `reflects` must also show up as its attribute, and follow the
 *    property back when it is reset;
 *  - every observed attribute is set and must land on its property, converted to
 *    the declared type; it is then removed, and the element must still render
 *    and the property must fall back — to the initial value for a hand-written
 *    `attributeChangedCallback` arm, or to lit's documented "attribute absent"
 *    value (`null`, or `false` for a Boolean) for a lit-managed attribute;
 *  - every hand-written numeric or enum arm gets the coercion cases: garbage in
 *    must leave the property where it was, never `NaN`, never an unlisted value.
 *
 * The case list is not written down here — it comes from the manifest, so a new
 * element or a new attribute is covered the moment it is published. What IS
 * written down is every exception, in {@link OVERRIDES} and {@link NOT_MOUNTABLE},
 * each with its reason; a case the table cannot exercise generically becomes a
 * visible `it.skip` naming why, never a silent omission.
 *
 * The manifest is a build artifact (`nx run mintplayer-web-components:cem`, a
 * `dependsOn` of this project's `test` target). Without it the suite fails
 * loudly rather than passing vacuously.
 */

const LIB_ROOT = resolve(import.meta.dirname, '..');
const MANIFEST = resolve(LIB_ROOT, 'custom-elements.json');

/* ------------------------------------------------------------------ */
/* Exceptions — every one carries its reason                           */
/* ------------------------------------------------------------------ */

/** Manifest declarations that are not a mountable tag. Asserted to be exactly these. */
const NOT_MOUNTABLE: Record<string, string> = {
  MpDropdownElement: 'abstract base of mp-dropdown-menu, never defined as a tag',
  MpNavbarElement: 'abstract base of the navbar family, never defined as a tag',
  MpRibbonItemBase: 'abstract base of the ribbon items; its members are exercised through every concrete item',
  MpOverlayContainer: 'module-private portal host (not exported); OverlayController creates it',
};

interface Override {
  /** Why this case departs from the generic rule. Required on every entry. */
  reason: string;
  /** Skip the case; `reason` is shown in the test name. */
  skip?: true;
  /** Attribute case: the property the attribute backs, when not derivable. */
  prop?: string;
  /** Attribute case: the attribute string to set. Property case: the value to assign. */
  value?: unknown;
  /** The property value expected after the write (defaults to the typed value). */
  expect?: unknown;
  /** The property value expected after the attribute is removed. */
  restored?: unknown;
}

/**
 * Keyed `tag@attribute` or `tag.property`. A value here is a CONSUMER-VALID
 * input where the generic probe would be invalid (a locale, a colour), or a
 * documented deviation from the generic expectation.
 */
const SLOW_STEP = 'a 1-minute step renders 1440 localised slots; 30 exercises the same path in budget';
const OVERRIDES: Record<string, Override> = {
  // Values the generic probe would get wrong for a documented reason.
  'mp-time-list.step': { value: 30, reason: SLOW_STEP },
  'mp-timepicker.step': { value: 30, reason: SLOW_STEP },
  'mp-datetime-picker.step': { value: 30, reason: SLOW_STEP },
  'mp-time-list@step': { value: '30', reason: SLOW_STEP },
  'mp-timepicker@step': { value: '30', reason: SLOW_STEP },
  'mp-datetime-picker@step': { value: '30', reason: SLOW_STEP },
  'mp-otp-input.value': { value: '482193', reason: 'the default numeric type strips non-digits' },
  'mp-carousel.index': { expect: 0, reason: 'clamped to the slide count; a carousel with no slides only has index 0' },
  'mp-radio-group.value': { expect: null, reason: 'a value must name a child mp-radio; the bare group has none, so it is refused' },
  'mp-hierarchy-chart.zoomGestures': { value: 'wheel', reason: 'a space-separated gesture list; unknown tokens are dropped' },
  'mp-hierarchy-chart@zoom-gestures': { value: 'wheel', reason: 'a space-separated gesture list; unknown tokens are dropped' },
  'mp-hierarchy-chart@max-depth': { value: '3', expect: 3, reason: 'typed as a string attribute but parsed as a number (or "auto")' },
  'mp-tab-control@tabs-position': { value: 'bottom', reason: 'enum read straight from the attribute: top | bottom' },
  'mp-tab-control@border': { value: 'top', reason: 'enum read straight from the attribute: full | top | false' },
  'mp-tree-select@scroll-height': {
    prop: 'panelScrollHeight',
    value: '120px',
    reason: 'backs panelScrollHeight, because HTMLElement.scrollHeight is read-only',
  },
  'mp-scheduler@view': {
    restored: 'year',
    reason: 'the view is navigation state the toolbar also changes; the attribute is a one-way command, so removing it keeps the current view',
  },
  'mp-scheduler@date': {
    restored: new Date('2024-01-15T09:30:00'),
    reason: 'the date is navigation state the toolbar also changes; removing the attribute keeps the current date',
  },
  'mp-phone-input.value': { value: '+32470123456', reason: 'normalised to E.164 against the selected country' },
  'mp-phone-input@value': { value: '+32470123456', reason: 'normalised to E.164 against the selected country' },
  'mp-phone-input@country': {
    value: 'be',
    restored: 'be',
    reason: 'a phone input always has a country; removing the attribute keeps the current one',
  },
};

/** Values that must be well-formed for the element to render at all, keyed by attribute or property name. */
const VALID_BY_NAME: Record<string, string> = {
  locale: 'nl-BE',
  colorStart: '#336699',
  colorEnd: '#663399',
  'color-start': '#336699',
  'color-end': '#663399',
};

/* ------------------------------------------------------------------ */
/* Harness                                                             */
/* ------------------------------------------------------------------ */

type Host = HTMLElement & Record<string, unknown> & { updateComplete?: Promise<unknown> };
interface LitDecl {
  type?: LitType;
  attribute?: boolean | string;
  state?: boolean;
  reflect?: boolean;
  converter?: unknown;
}
type LitCtor = CustomElementConstructor & {
  elementProperties?: Map<PropertyKey, LitDecl>;
  observedAttributes?: string[];
};

const LOADERS = Object.fromEntries(
  Object.entries(
    import.meta.glob<Record<string, unknown>>([
      '../**/*.ts',
      '!../**/*.spec.ts',
      '!../**/*.d.ts',
      '!../**/node_modules/**',
      '!../dist/**',
      '!../_conformance/**',
    ]),
  ).map(([rel, load]) => [resolve(import.meta.dirname, rel), load]),
);

/** Lets lit (and anything it schedules) finish; a render that throws rejects here. */
async function settle(el: Host): Promise<void> {
  await el.updateComplete;
  await Promise.resolve();
  await el.updateComplete;
}

async function mount(tag: string): Promise<Host> {
  const el = document.createElement(tag) as Host;
  document.body.append(el);
  await settle(el);
  return el;
}

afterEach(() => {
  document.body.replaceChildren();
});

interface Resolved {
  decl: CemElement;
  tag?: string;
  ctor?: LitCtor;
  problem?: string;
}

async function resolveElement(decl: CemElement): Promise<Resolved> {
  const load = LOADERS[resolve(LIB_ROOT, decl.path)];
  if (!load) return { decl, problem: 'no module loader' };
  const mod = await load();
  const ctor = mod[decl.name] as LitCtor | undefined;
  if (typeof ctor !== 'function') return { decl, problem: 'class not exported' };
  const tag = customElements.getName(ctor) ?? undefined;
  return tag ? { decl, tag, ctor } : { decl, problem: 'class never defined as a tag' };
}

/** The lit declaration that owns `attrName`, if the attribute is lit-managed. */
function litOwner(ctor: LitCtor, attrName: string): { prop: string; decl: LitDecl } | undefined {
  const entries = [...(ctor.elementProperties ?? new Map<PropertyKey, LitDecl>()).entries()];
  const found = entries.find(([key, decl]) => {
    if (decl.state || decl.attribute === false || typeof key !== 'string') return false;
    const name = typeof decl.attribute === 'string' ? decl.attribute : key.toLowerCase();
    return name === attrName;
  });
  return found ? { prop: found[0] as string, decl: found[1] } : undefined;
}

/** Parses an attribute string into the domain's value, the way a correct arm should. */
function typedFromAttribute(domain: Domain, value: string): unknown {
  switch (domain.kind) {
    case 'boolean':
      return value !== 'false';
    case 'number':
      return Number(value);
    case 'literal':
      return domain.values.find((v) => String(v) === value) ?? value;
    case 'string[]':
      return value.split(',');
    case 'number[]':
      return value.split(',').map(Number);
    case 'date':
      return new Date(value);
    default:
      return value;
  }
}

/* ------------------------------------------------------------------ */
/* Case construction                                                   */
/* ------------------------------------------------------------------ */

const MANIFEST_PRESENT = existsSync(MANIFEST);
const DECLS = MANIFEST_PRESENT ? manifestElements(readFileSync(MANIFEST, 'utf8')) : [];
const ALIASES = scanLiteralAliases(LIB_ROOT);
const RESOLVED = await Promise.all(DECLS.map(resolveElement));
const MOUNTABLE = RESOLVED.filter((r): r is Required<Resolved> => r.tag !== undefined && r.ctor !== undefined);

interface PropertyCase {
  id: string;
  tag: string;
  field: CemMember;
  domain: Domain;
  override: Partial<Override>;
}

interface AttributeCase {
  id: string;
  tag: string;
  attr: CemAttribute;
  prop: string;
  /** The string written to the attribute. */
  value: string;
  /** Expected property value after the write. */
  expectSet: unknown;
  /** Expected property value after removal; `'initial'` = whatever the fresh element held. */
  expectRemoved: unknown;
  /** Literal domain the converted value must belong to (lit-managed only). */
  within?: Literal[];
  litManaged: boolean;
}

type Literal = string | number | boolean;

interface CoercionCase {
  id: string;
  tag: string;
  attr: string;
  prop: string;
  garbage: string;
  kind: 'number' | 'enum';
}

interface SkipCase {
  id: string;
  reason: string;
}

const propertyCases: PropertyCase[] = [];
const attributeCases: AttributeCase[] = [];
const coercionCases: CoercionCase[] = [];
const skipped: SkipCase[] = [];

MOUNTABLE.map(({ decl, tag, ctor }) => {
  const probe = document.createElement(tag) as Host;
  const fields = publicFields(decl);
  const fieldByName = new Map(fields.map((f) => [f.name, f]));

  fields.map((field) => {
    const id = `${tag}.${field.name}`;
    const override: Partial<Override> = OVERRIDES[id] ?? {};
    if (override.skip) return skipped.push({ id, reason: override.reason ?? '' });
    if (field.readonly) return skipped.push({ id, reason: 'readonly in the manifest' });
    const domain = domainOf(field.type?.text, ALIASES);
    if (domain.kind === 'unsupported' && override.value === undefined) {
      return skipped.push({ id, reason: domain.reason });
    }
    return propertyCases.push({ id, tag, field, domain, override });
  });

  const observed = new Set(ctor.observedAttributes ?? []);
  (decl.attributes ?? []).map((attr) => {
    const id = `${tag}@${attr.name}`;
    const override: Partial<Override> = OVERRIDES[id] ?? {};
    if (override.skip) return skipped.push({ id, reason: override.reason ?? '' });
    const owner = litOwner(ctor, attr.name);
    const stateDecl = ctor.elementProperties?.get(attr.fieldName ?? attr.name);
    if (!observed.has(attr.name) && stateDecl?.state) {
      return skipped.push({ id, reason: 'lit internal state (state: true) that the manifest lists as an attribute' });
    }
    if (attr.name.startsWith('aria-') && !owner && !override.prop) {
      return skipped.push({
        id,
        reason: 'ARIA attribute read at render time; its forwarding is pinned by the element aria spec',
      });
    }
    const prop = override.prop ?? owner?.prop ?? attr.fieldName ?? kebabToCamel(attr.name);
    if (!(prop in probe)) {
      return skipped.push({ id, reason: 'no backing property; the attribute only feeds rendering (covered by the element spec)' });
    }
    const initial = probe[prop];
    const typeText = attr.type?.text || fieldByName.get(prop)?.type?.text;
    const declared = domainOf(typeText, ALIASES);
    const domain: Domain =
      declared.kind !== 'unsupported'
        ? declared
        : typeof initial === 'boolean'
          ? { kind: 'boolean' }
          : typeof initial === 'number'
            ? { kind: 'number' }
            : typeof initial === 'string'
              ? { kind: 'string' }
              : declared;
    const litManaged = owner !== undefined && owner.decl.converter === undefined;

    const chosen = (): string | undefined => {
      if (override.value !== undefined) return String(override.value);
      if (VALID_BY_NAME[attr.name]) return VALID_BY_NAME[attr.name];
      switch (domain.kind) {
        case 'boolean':
          // lit Boolean and presence-style arms read '' as true; a default-true
          // hand-written arm can only be switched OFF, and does so with 'false'.
          return !litManaged && initial === true ? 'false' : '';
        case 'number':
        case 'string':
        case 'literal':
          return String(representative(domain, initial));
        case 'string[]':
        case 'number[]':
          // Hand-written list arms take a comma-separated list.
          return litManaged ? undefined : (representative(domain, initial) as unknown[]).join(',');
        case 'date':
          return litManaged ? undefined : '2024-01-15T09:30:00';
        default:
          return undefined;
      }
    };
    const value = chosen();
    if (value === undefined) {
      return skipped.push({ id, reason: domain.kind === 'unsupported' ? domain.reason : `${domain.kind} attribute` });
    }

    const expectSet =
      'expect' in override
        ? override.expect
        : litManaged
          ? litFromAttribute(value, owner.decl.type)
          : typedFromAttribute(domain, value);
    const expectRemoved =
      'restored' in override ? override.restored : litManaged ? litFromAttribute(null, owner.decl.type) : 'initial';

    attributeCases.push({
      id,
      tag,
      attr,
      prop,
      value,
      expectSet,
      expectRemoved,
      within: litManaged && domain.kind === 'literal' ? domain.values : undefined,
      litManaged,
    });

    if (!litManaged && !override.value) {
      if (domain.kind === 'number') {
        coercionCases.push({ id, tag, attr: attr.name, prop, garbage: 'not-a-number', kind: 'number' });
      } else if (domain.kind === 'literal' && domain.values.every((v) => typeof v === 'string')) {
        coercionCases.push({ id, tag, attr: attr.name, prop, garbage: 'm20-not-a-member', kind: 'enum' });
      }
    }
    return undefined;
  });
  return undefined;
});

/* ------------------------------------------------------------------ */
/* The table                                                           */
/* ------------------------------------------------------------------ */

describe('custom-elements.json property / attribute table', () => {
  it('reads a manifest that describes the library', () => {
    // Guards discovery: a missing or truncated manifest must fail here, not pass
    // every table below vacuously. Rebuild it with nx run mintplayer-web-components:cem.
    expect(MANIFEST_PRESENT).toBe(true);
    expect(MOUNTABLE.length).toBeGreaterThanOrEqual(60);
    expect(attributeCases.length).toBeGreaterThanOrEqual(250);
    expect(propertyCases.length).toBeGreaterThanOrEqual(250);
  });

  it('cannot mount exactly the declarations listed in NOT_MOUNTABLE', () => {
    const unmountable = RESOLVED.filter((r) => r.tag === undefined).map((r) => r.decl.name).sort();
    expect(unmountable).toEqual(Object.keys(NOT_MOUNTABLE).sort());
  });

  it('has no override for a case the manifest no longer produces', () => {
    const ids = new Set([
      ...propertyCases.map((c) => c.id),
      ...attributeCases.map((c) => c.id),
      ...skipped.map((c) => c.id),
    ]);
    expect(Object.keys(OVERRIDES).filter((k) => !ids.has(k))).toEqual([]);
  });

  describe('property round-trip', () => {
    it.each(propertyCases)('$id reads back what was assigned', async ({ tag, field, domain, override }) => {
      const el = await mount(tag);
      const initial = el[field.name];
      const value = override.value ?? VALID_BY_NAME[field.name] ?? representative(domain, initial);
      const expected = 'expect' in override ? override.expect : value;

      el[field.name] = value;
      await settle(el);
      expect(el[field.name]).toEqual(expected);
      if (field.reflects && field.attribute) {
        expect(el.getAttribute(field.attribute)).toBe(reflectedAttribute(expected));
      }

      el[field.name] = initial;
      await settle(el);
      expect(el[field.name]).toEqual(initial);
      if (field.reflects && field.attribute) {
        expect(el.getAttribute(field.attribute)).toBe(reflectedAttribute(initial));
      }
    });
  });

  describe('observed attribute', () => {
    it.each(attributeCases)(
      '$id lands on its property, then falls back when removed',
      async ({ tag, attr, prop, value, expectSet, expectRemoved, within }) => {
        const el = await mount(tag);
        const initial = el[prop];

        el.setAttribute(attr.name, value);
        await settle(el);
        expect(el[prop]).toEqual(expectSet);
        if (within) expect(within).toContain(el[prop]);

        el.removeAttribute(attr.name);
        await settle(el);
        expect(el[prop]).toEqual(expectRemoved === 'initial' ? initial : expectRemoved);
      },
    );
  });

  describe('attribute coercion', () => {
    it.each(coercionCases)('$id ignores an unparseable $kind value', async ({ tag, attr, prop, garbage }) => {
      const el = await mount(tag);
      const initial = el[prop];
      el.setAttribute(attr, garbage);
      await settle(el);
      expect(el[prop]).toEqual(initial);
      if (typeof el[prop] === 'number') expect(Number.isNaN(el[prop])).toBe(false);
    });
  });

  describe('pinned: the time-list step can never stall the slot loop', () => {
    const slotCount = (el: Host) => (el.shadowRoot ?? el).querySelectorAll('button.slot').length;

    it.each([
      ['removed', null],
      ['non-numeric', 'soon'],
      ['zero', '0'],
      ['negative', '-15'],
    ])('a %s step renders the default 15-minute list', async (_, value) => {
      const el = await mount('mp-time-list');
      el.setAttribute('step', '30');
      await settle(el);
      expect(slotCount(el)).toBe(48);
      if (value === null) el.removeAttribute('step');
      else el.setAttribute('step', value);
      await settle(el);
      expect(slotCount(el)).toBe(96);
    });
  });

  describe('not exercised generically', () => {
    it.skip.each(skipped)('$id — $reason', () => undefined);
  });
});
