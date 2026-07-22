import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OverlayContainer, OverlayModule } from '@angular/cdk/overlay';
import { MockProvider } from 'ng-mocks';
import { BS_DEVELOPMENT } from '@mintplayer/ng-bootstrap';
import { BsTypeaheadComponent } from './typeahead.component';
// Register <mp-dropdown-menu> so the projected option <li>s get their
// WC-driven listbox roles (role=option) synchronously in the test.
import '@mintplayer/web-components/dropdown-menu';

@Component({
  selector: 'bs-typeahead-aria-harness',
  imports: [BsTypeaheadComponent],
  template: `
    <bs-typeahead
      [(isOpen)]="isOpen"
      [suggestions]="suggestions()"
      (suggestionSelected)="lastSelected.set($event)"
    ></bs-typeahead>
  `,
})
class HarnessComponent {
  isOpen = signal(false);
  suggestions = signal<{ text: string }[]>([
    { text: 'Apple' },
    { text: 'Banana' },
    { text: 'Cherry' },
  ]);
  lastSelected = signal<{ text: string } | null>(null);
}

describe('BsTypeaheadComponent ARIA — primitive migration', () => {
  let fixture: ComponentFixture<HarnessComponent>;
  let host: HarnessComponent;
  let overlay: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OverlayModule, HarnessComponent],
      providers: [MockProvider(BS_DEVELOPMENT, false)],
    }).compileComponents();
    fixture = TestBed.createComponent(HarnessComponent);
    host = fixture.componentInstance;
    overlay = TestBed.inject(OverlayContainer).getContainerElement();
    fixture.detectChanges();
  });

  // Open the popup and let the projected <li>s get their generated ids
  // (bsRovingFocusItem, afterNextRender) and WC-driven option roles.
  const open = async () => {
    host.isOpen.set(true);
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise<void>(resolve => setTimeout(resolve));
    fixture.detectChanges();
  };

  const input = () => fixture.nativeElement.querySelector<HTMLInputElement>('input')!;
  const menu = () => overlay.querySelector<HTMLElement>('bs-dropdown-menu');
  const items = () => Array.from(overlay.querySelectorAll<HTMLElement>('li[bsDropdownItem]'));
  const press = (key: string) => {
    input().dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    fixture.detectChanges();
  };

  it('input gets combobox role + listbox haspopup + autocomplete=list (all from bsCombobox primitive)', () => {
    expect(input().getAttribute('role')).toBe('combobox');
    expect(input().getAttribute('aria-haspopup')).toBe('listbox');
    expect(input().getAttribute('aria-autocomplete')).toBe('list');
  });

  it('aria-expanded + aria-controls reflect the dropdown state', async () => {
    expect(input().getAttribute('aria-expanded')).toBe('false');

    await open();

    expect(input().getAttribute('aria-expanded')).toBe('true');
    const controls = input().getAttribute('aria-controls');
    expect(controls).toMatch(/^bs-dropdown-menu-\d+$/);
    expect(menu()!.id).toBe(controls);
  });

  it('menu is role="listbox", items are role="option" (listbox mode wired from popupRole="listbox")', async () => {
    await open();

    expect(menu()!.getAttribute('role')).toBe('listbox');
    items().forEach(item => expect(item.getAttribute('role')).toBe('option'));
  });

  it('ArrowDown updates aria-activedescendant to the next option id without moving browser focus', async () => {
    await open();

    input().focus();
    press('ArrowDown');

    const activeDesc = input().getAttribute('aria-activedescendant');
    expect(activeDesc).toMatch(/^bs-rovingitem-\d+$/);
    // First-arrow moves to the second item (activeIndex started at 0)
    expect(activeDesc).toBe(items()[1].id);
    expect(document.activeElement).toBe(input());
  });

  it('Enter on a highlighted option emits suggestionSelected', async () => {
    await open();

    input().focus();
    press('ArrowDown');
    press('Enter');

    expect(host.lastSelected()).toEqual({ text: 'Banana' });
  });

  it('Escape closes the dropdown', async () => {
    await open();
    expect(host.isOpen()).toBe(true);

    input().focus();
    press('Escape');

    expect(host.isOpen()).toBe(false);
  });

  it('Tab inside the open list advances aria-activedescendant without leaving the input', async () => {
    await open();

    input().focus();
    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    input().dispatchEvent(event);
    fixture.detectChanges();

    expect(event.defaultPrevented).toBe(true);
    expect(input().getAttribute('aria-activedescendant')).toBe(items()[1].id);
    expect(document.activeElement).toBe(input());
    expect(host.isOpen()).toBe(true);
  });

  it('Tab on the last option closes the dropdown and lets focus exit', async () => {
    await open();

    input().focus();
    press('End'); // jump to last option

    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    input().dispatchEvent(event);
    fixture.detectChanges();

    expect(event.defaultPrevented).toBe(false); // browser handles tab traversal
    expect(host.isOpen()).toBe(false);
  });

  it('Shift+Tab on the first option closes the dropdown and lets focus exit', async () => {
    await open();

    input().focus();
    // Already on first option (activeIndex=0)

    const event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true });
    input().dispatchEvent(event);
    fixture.detectChanges();

    expect(event.defaultPrevented).toBe(false);
    expect(host.isOpen()).toBe(false);
  });
});
