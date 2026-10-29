import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { BsSelectComponent } from '../generated';
import { BsSelectOption, BsSelectValueAccessor } from './select-value-accessor';

/**
 * The accessor of the generated `bs-select` (#437): the native `<select>` renders
 * in the component's own light DOM, so its `change` and `focusout` bubble to the
 * host. An `[ngValue]` option maps any value to an `"<id>: <value>"` string; a
 * plain `value` option passes its string; a `value=""` placeholder is `null`.
 */

interface Person { id: number; name: string }
const PEOPLE: Person[] = [{ id: 1, name: 'Ann' }, { id: 2, name: 'Bob' }];

@Component({
  imports: [BsSelectComponent, BsSelectOption, ReactiveFormsModule],
  template: `
    <bs-select [formControl]="ctrl" [compareWith]="byId" aria-label="Person">
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

async function create<T>(type: new () => T): Promise<ComponentFixture<T>> {
  const f = TestBed.createComponent(type);
  f.detectChanges();
  await f.whenStable();
  f.detectChanges();
  return f;
}

const inner = (f: ComponentFixture<unknown>) => (f.nativeElement as HTMLElement).querySelector('bs-select select') as HTMLSelectElement;

function choose(f: ComponentFixture<unknown>, value: string): void {
  inner(f).value = value;
  inner(f).dispatchEvent(new Event('change', { bubbles: true }));
}

describe('BsSelectValueAccessor with Angular forms', () => {
  it('renders the consumer options inside the native select, named by the host aria-label', async () => {
    const f = await create(ReactiveHost);
    expect([...inner(f).options].map((o) => o.text.trim())).toEqual(['None', 'Ann', 'Bob']);
    expect(inner(f).getAttribute('aria-label')).toBe('Person');
  });

  it('selects the option matching the model with compareWith, and marks it for SSR', async () => {
    const f = await create(ReactiveHost);
    // Bob is the third option (after None and Ann): id "2"
    expect(inner(f).value).toBe('2: Object');
    expect(inner(f).options[2].hasAttribute('selected')).toBe(true);
    expect(inner(f).options[1].hasAttribute('selected')).toBe(false);
  });

  it('maps a chosen [ngValue] option back to its value', async () => {
    const f = await create(ReactiveHost);
    choose(f, '1: Object');
    expect(f.componentInstance.ctrl.value).toBe(PEOPLE[0]);
    choose(f, '0: null');
    expect(f.componentInstance.ctrl.value).toBeNull();
  });

  it('follows a model written later', async () => {
    const f = await create(ReactiveHost);
    f.componentInstance.ctrl.setValue(PEOPLE[0]);
    f.detectChanges();
    expect(inner(f).value).toBe('1: Object');
  });

  it('marks the control touched when focus leaves the select', async () => {
    const f = await create(ReactiveHost);
    inner(f).dispatchEvent(new FocusEvent('blur'));
    expect(f.componentInstance.ctrl.touched).toBe(false);
    inner(f).dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    expect(f.componentInstance.ctrl.touched).toBe(true);
  });

  it('disables the select with the control', async () => {
    const f = await create(ReactiveHost);
    f.componentInstance.ctrl.disable();
    f.detectChanges();
    expect(inner(f).disabled).toBe(true);
    f.componentInstance.ctrl.enable();
    f.detectChanges();
    expect(inner(f).disabled).toBe(false);
  });

  it('forgets a removed option: a value only it matched no longer resolves', async () => {
    const f = await create(ReactiveHost);
    f.componentInstance.people.set([PEOPLE[0]]);
    f.detectChanges();
    const stale = document.createElement('option');
    stale.value = '2: Object';
    inner(f).append(stale);
    choose(f, '2: Object');
    expect(f.componentInstance.ctrl.value).toBe('2: Object');
  });

  it('passes plain value options through, and the placeholder reaches the model as null', async () => {
    const f = await create(PlainValueHost);
    expect(inner(f).value).toBe('en-US');
    choose(f, 'nl-BE');
    expect(f.componentInstance.ctrl.value).toBe('nl-BE');
    choose(f, '');
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
