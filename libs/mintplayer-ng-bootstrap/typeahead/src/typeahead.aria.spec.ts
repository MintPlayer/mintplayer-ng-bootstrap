import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsTypeaheadComponent } from './typeahead.component';
import { inMemoryTypeaheadProvider } from '@mintplayer/ui-core/typeahead';

/**
 * The WAI-ARIA combobox pattern (list autocomplete, aria-activedescendant),
 * as the core's `connect()` bags produce it and `[mpProps]` applies it.
 * The same contract is asserted for the other fronts by the four-fronts
 * conformance spec in ui-core; this spec pins the Angular wiring.
 */
@Component({
  selector: 'bs-typeahead-aria-harness',
  imports: [BsTypeaheadComponent],
  template: `<bs-typeahead [provider]="provider" [debounceMs]="0" inputLabel="Fruit" [errorText]="error()" (select)="lastSelected.set($event)"></bs-typeahead>`,
})
class HarnessComponent {
  readonly provider = inMemoryTypeaheadProvider([{ text: 'Apple' }, { text: 'Banana' }, { text: 'Cherry' }]);
  readonly error = signal<string | null>(null);
  readonly lastSelected = signal<{ text: string } | null>(null);
}

describe('BsTypeaheadComponent ARIA', () => {
  let fixture: ComponentFixture<HarnessComponent>;
  const input = () => fixture.nativeElement.querySelector('input') as HTMLInputElement;
  const listbox = () => fixture.nativeElement.querySelector('ul[role=listbox]') as HTMLElement;
  const options = () => Array.from(fixture.nativeElement.querySelectorAll('li[role=option]')) as HTMLElement[];
  const key = (k: string) => {
    const event = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true });
    input().dispatchEvent(event);
    return event;
  };
  const settle = async () => {
    await new Promise((r) => setTimeout(r, 0));
    await fixture.whenStable();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HarnessComponent] }).compileComponents();
    fixture = TestBed.createComponent(HarnessComponent);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('input is a named combobox with list autocomplete, controlling a listbox that exists while closed', () => {
    expect(input().getAttribute('role')).toBe('combobox');
    expect(input().getAttribute('aria-autocomplete')).toBe('list');
    expect(input().getAttribute('aria-haspopup')).toBe('listbox');
    expect(input().getAttribute('aria-label')).toBe('Fruit');
    expect(input().getAttribute('aria-expanded')).toBe('false');
    expect(input().getAttribute('aria-controls')).toBe(listbox().id);
    expect(listbox().hidden).toBe(true);
    expect(input().hasAttribute('aria-activedescendant')).toBe(false);
  });

  it('typing opens the listbox; the active option is tracked with aria-activedescendant while focus stays in the input', async () => {
    input().focus();
    input().value = 'a';
    input().dispatchEvent(new Event('input', { bubbles: true }));
    await settle();
    expect(input().getAttribute('aria-expanded')).toBe('true');
    expect(listbox().hidden).toBe(false);
    expect(options()).toHaveLength(2); // Apple, Banana
    expect(options().every((o) => o.getAttribute('aria-selected') === 'false')).toBe(true);

    expect(key('ArrowDown').defaultPrevented).toBe(true);
    await fixture.whenStable();
    expect(input().getAttribute('aria-activedescendant')).toBe(options()[0].id);
    expect(options()[0].getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(input());

    key('ArrowDown');
    await fixture.whenStable();
    expect(input().getAttribute('aria-activedescendant')).toBe(options()[1].id);

    key('Enter');
    await fixture.whenStable();
    expect(fixture.componentInstance.lastSelected()).toEqual({ text: 'Banana' });
    expect(input().value).toBe('Banana');
    expect(input().getAttribute('aria-expanded')).toBe('false');
    expect(input().hasAttribute('aria-activedescendant')).toBe(false);
  });

  it('Escape closes and is consumed; Tab closes but is not consumed', async () => {
    input().value = 'a';
    input().dispatchEvent(new Event('input', { bubbles: true }));
    await settle();
    expect(key('Escape').defaultPrevented).toBe(true);
    await fixture.whenStable();
    expect(input().getAttribute('aria-expanded')).toBe('false');
    key('ArrowDown');
    await fixture.whenStable();
    expect(input().getAttribute('aria-expanded')).toBe('true');
    expect(key('Tab').defaultPrevented).toBe(false);
    await fixture.whenStable();
    expect(input().getAttribute('aria-expanded')).toBe('false');
  });

  it('announces the result count once in a polite live region', async () => {
    const live = fixture.nativeElement.querySelector('[role=status]') as HTMLElement;
    expect(live.getAttribute('aria-live')).toBe('polite');
    input().value = 'an';
    input().dispatchEvent(new Event('input', { bubbles: true }));
    await settle();
    expect(live.textContent).toBe('1 result found');
  });

  it('forwards host aria-*, id and tabindex to the input (id/tabindex moved); host role is not forwarded', async () => {
    @Component({
      selector: 'bs-typeahead-forward-harness',
      imports: [BsTypeaheadComponent],
      template: `<span id="lbl">Street</span><bs-typeahead id="street" tabindex="3" aria-labelledby="lbl" aria-describedby="hint" role="group" [provider]="null"></bs-typeahead>`,
    })
    class ForwardHarness {}
    await TestBed.resetTestingModule().configureTestingModule({ imports: [ForwardHarness] }).compileComponents();
    const f = TestBed.createComponent(ForwardHarness);
    f.detectChanges();
    const host = f.nativeElement.querySelector('bs-typeahead') as HTMLElement;
    const el = f.nativeElement.querySelector('input') as HTMLInputElement;
    expect(el.id).toBe('street');
    expect(el.getAttribute('tabindex')).toBe('3');
    expect(el.getAttribute('aria-labelledby')).toBe('lbl');
    expect(el.getAttribute('aria-describedby')).toBe('hint');
    expect(el.getAttribute('role')).toBe('combobox');
    expect(host.hasAttribute('id')).toBe(false);
    expect(host.hasAttribute('tabindex')).toBe(false);
  });

  it('error text is the described-by and error message of the input, never announced', async () => {
    fixture.componentInstance.error.set('Pick a fruit');
    fixture.detectChanges();
    await fixture.whenStable();
    const error = fixture.nativeElement.querySelector('.ta-error') as HTMLElement;
    expect(error.textContent).toBe('Pick a fruit');
    expect(input().getAttribute('aria-describedby')).toBe(error.id);
    expect(input().getAttribute('aria-errormessage')).toBe(error.id);
    expect(input().getAttribute('aria-invalid')).toBe('true');
    expect(error.getAttribute('role')).toBeNull();
  });
});
