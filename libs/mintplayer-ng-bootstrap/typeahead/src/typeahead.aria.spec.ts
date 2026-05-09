import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OverlayContainer, OverlayModule } from '@angular/cdk/overlay';
import { MockProvider } from 'ng-mocks';
import { BS_DEVELOPMENT } from '@mintplayer/ng-bootstrap';
import { BsTypeaheadComponent } from './typeahead.component';

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

  const input = () => fixture.nativeElement.querySelector<HTMLInputElement>('input')!;
  const menu = () => overlay.querySelector<HTMLElement>('bs-dropdown-menu');
  const items = () => Array.from(overlay.querySelectorAll<HTMLElement>('bs-dropdown-item'));
  const press = (key: string) => {
    input().dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    fixture.detectChanges();
  };

  it('input gets combobox role + listbox haspopup + autocomplete=list (all from bsCombobox primitive)', () => {
    expect(input().getAttribute('role')).toBe('combobox');
    expect(input().getAttribute('aria-haspopup')).toBe('listbox');
    expect(input().getAttribute('aria-autocomplete')).toBe('list');
  });

  it('aria-expanded + aria-controls reflect the dropdown state', () => {
    expect(input().getAttribute('aria-expanded')).toBe('false');

    host.isOpen.set(true);
    fixture.detectChanges();

    expect(input().getAttribute('aria-expanded')).toBe('true');
    const controls = input().getAttribute('aria-controls');
    expect(controls).toMatch(/^bs-dropdown-menu-\d+$/);
    expect(menu()!.id).toBe(controls);
  });

  it('menu is role="listbox", items are role="option" (auto from popupRole="listbox")', () => {
    host.isOpen.set(true);
    fixture.detectChanges();

    expect(menu()!.getAttribute('role')).toBe('listbox');
    items().forEach(item => expect(item.getAttribute('role')).toBe('option'));
  });

  it('ArrowDown updates aria-activedescendant to the next option id without moving browser focus', () => {
    host.isOpen.set(true);
    fixture.detectChanges();

    input().focus();
    press('ArrowDown');

    const activeDesc = input().getAttribute('aria-activedescendant');
    expect(activeDesc).toMatch(/^bs-dropdown-item-\d+$/);
    // First-arrow moves to the second item (activeIndex started at 0)
    expect(activeDesc).toBe(items()[1].id);
    expect(document.activeElement).toBe(input());
  });

  it('Enter on a highlighted option emits suggestionSelected', () => {
    host.isOpen.set(true);
    fixture.detectChanges();

    input().focus();
    press('ArrowDown');
    press('Enter');

    expect(host.lastSelected()).toEqual({ text: 'Banana' });
  });

  it('Escape closes the dropdown', () => {
    host.isOpen.set(true);
    fixture.detectChanges();
    expect(host.isOpen()).toBe(true);

    input().focus();
    press('Escape');

    expect(host.isOpen()).toBe(false);
  });
});
