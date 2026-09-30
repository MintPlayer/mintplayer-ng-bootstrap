import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { BsSelectComponent } from '../component/select.component';
import { BsSelectOption, BsSelectValueAccessor } from './select-value-accessor';

/**
 * A placeholder option — `<option value="">` — is the idiomatic way to offer
 * "none / auto / follow the browser", and `mp-select` normalizes an empty
 * selection to `null` on its host. The host is what the accessor reads, because
 * `mp-select` re-dispatches a composed `change` whose target is the element
 * rather than the inner `<select>`.
 *
 * Selecting such an option therefore handed `null` to `extractId`, which called
 * `.split(':')` on it and threw. The model never updated, so the control looked
 * stuck on whatever was chosen before — reported as "switching to the browser
 * locale changes nothing", with a console TypeError behind it.
 *
 * These exercise the id/value mapping directly; the accessor's Angular wiring is
 * covered by the component spec next door.
 */
describe('BsSelectValueAccessor — placeholder options', () => {
  function accessor(): BsSelectValueAccessor {
    // The mapping methods under test touch neither DI nor the host component.
    return Object.create(BsSelectValueAccessor.prototype, {
      optionMap: { value: new Map<string, unknown>(), writable: true },
    }) as BsSelectValueAccessor;
  }

  it('returns null for extractId rather than throwing', () => {
    const a = accessor();

    expect(() => a.extractId(null)).not.toThrow();
    expect(a.extractId(null)).toBeNull();
    expect(a.extractId(undefined)).toBeNull();
  });

  it('passes a placeholder selection through to the model as null', () => {
    const a = accessor();

    // What mp-select reports when the empty-valued option is chosen.
    expect(a.getOptionValue(null)).toBeNull();
  });

  it('still resolves a registered [ngValue] option by its id', () => {
    const a = accessor();
    a.optionMap.set('1', 1800);

    expect(a.getOptionValue('1: 1800')).toBe(1800);
  });

  it('falls through to the raw string for a plain value attribute', () => {
    const a = accessor();

    // Options written as `value="nl-BE"` are never registered in optionMap —
    // only [ngValue] registers — so the string itself is the value.
    expect(a.getOptionValue('nl-BE')).toBe('nl-BE');
  });

  it('does not mistake an unregistered id for a registered one', () => {
    const a = accessor();
    a.optionMap.set('0', 'zero');

    expect(a.getOptionValue('7: seven')).toBe('7: seven');
  });
});

interface Person { id: number; name: string }
const PEOPLE: Person[] = [{ id: 1, name: 'Ann' }, { id: 2, name: 'Bob' }];

@Component({
  imports: [BsSelectComponent, BsSelectOption, ReactiveFormsModule],
  template: `
    <bs-select [formControl]="ctrl" [compareWith]="byId">
      <option [ngValue]="null">None</option>
      @for (p of people(); track p.id) {
        <option [ngValue]="p">{{ p.name }}</option>
      }
    </bs-select>`,
})
class ReactiveHost {
  readonly people = signal<Person[]>(PEOPLE);
  readonly ctrl = new FormControl<Person | null>({ id: 2, name: 'Bob (copy)' });
  readonly byId = (a: Person | null, b: Person | null) => a?.id === b?.id;
}

@Component({
  imports: [BsSelectComponent, BsSelectOption, ReactiveFormsModule],
  template: `
    <bs-select [formControl]="ctrl">
      <option value="">Browser locale</option>
      <option value="nl-BE">Nederlands</option>
      <option value="en-US">English</option>
    </bs-select>`,
})
class PlainValueHost {
  readonly ctrl = new FormControl<string | null>('en-US');
}

describe('BsSelectValueAccessor with Angular forms', () => {
  const mpSelect = (f: ComponentFixture<unknown>) => (f.nativeElement as HTMLElement).querySelector('mp-select') as HTMLElement & { value: string | null; disabled: boolean };
  const choose = (f: ComponentFixture<unknown>, value: string | null) => {
    const el = mpSelect(f);
    // mp-select re-dispatches a composed change on its host, whose value is the chosen option's
    Object.defineProperty(el, 'value', { configurable: true, get: () => value, set: () => undefined });
    el.dispatchEvent(new Event('change', { bubbles: true }));
    delete (el as { value?: unknown }).value;
  };

  it('writes the model to the element as the matching option\'s id string, using compareWith', async () => {
    const f = TestBed.createComponent(ReactiveHost);
    f.detectChanges();
    await f.whenStable();
    // Bob is the third option (after None and Ann): id "2"
    expect(mpSelect(f).value).toBe('2: Object');
  });

  it('maps a chosen [ngValue] option back to its object', async () => {
    const f = TestBed.createComponent(ReactiveHost);
    f.detectChanges();
    await f.whenStable();
    choose(f, '1: Object');
    expect(f.componentInstance.ctrl.value).toBe(PEOPLE[0]);
    choose(f, '0: null');
    expect(f.componentInstance.ctrl.value).toBeNull();
  });

  it('marks the control touched when focus leaves the inner <select>', async () => {
    const f = TestBed.createComponent(ReactiveHost);
    f.detectChanges();
    await f.whenStable();
    const inner = mpSelect(f).shadowRoot!.querySelector('select')!;
    // what a browser fires on the shadow <select>: blur (non-bubbling) and a composed focusout
    inner.dispatchEvent(new FocusEvent('blur', { composed: true }));
    expect(f.componentInstance.ctrl.touched).toBe(false);
    inner.dispatchEvent(new FocusEvent('focusout', { bubbles: true, composed: true }));
    expect(f.componentInstance.ctrl.touched).toBe(true);
  });

  it('disables the element with the control', async () => {
    const f = TestBed.createComponent(ReactiveHost);
    f.detectChanges();
    await f.whenStable();
    f.componentInstance.ctrl.disable();
    expect(mpSelect(f).disabled).toBe(true);
    f.componentInstance.ctrl.enable();
    expect(mpSelect(f).disabled).toBe(false);
  });

  it('forgets a removed option: a value that only it matched no longer resolves', async () => {
    const f = TestBed.createComponent(ReactiveHost);
    f.detectChanges();
    await f.whenStable();
    f.componentInstance.people.set([PEOPLE[0]]);
    f.detectChanges();
    choose(f, '2: Object');
    expect(f.componentInstance.ctrl.value).toBe('2: Object');
  });

  it('plain value options pass their string through, and the placeholder reaches the model as null', async () => {
    const f = TestBed.createComponent(PlainValueHost);
    f.detectChanges();
    await f.whenStable();
    expect(mpSelect(f).value).toBe('en-US');
    choose(f, 'nl-BE');
    expect(f.componentInstance.ctrl.value).toBe('nl-BE');
    choose(f, null);
    expect(f.componentInstance.ctrl.value).toBeNull();
  });
});

describe('BsSelectValueAccessor.buildValueString', () => {
  const a = Object.create(BsSelectValueAccessor.prototype) as BsSelectValueAccessor;

  it('is the bare value without an id', () => {
    expect(a.buildValueString(null, 'x')).toBe('x');
  });

  it('prefixes the id, names objects "Object", and caps the length at 50', () => {
    expect(a.buildValueString('3', { a: 1 })).toBe('3: Object');
    expect(a.buildValueString('4', 'y'.repeat(80))).toHaveLength(50);
  });
});
