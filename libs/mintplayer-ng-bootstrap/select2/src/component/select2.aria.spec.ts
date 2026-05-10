import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OverlayContainer, OverlayModule } from '@angular/cdk/overlay';
import { MockProvider } from 'ng-mocks';
import { BS_DEVELOPMENT } from '@mintplayer/ng-bootstrap';
import { BsSelect2Component } from './select2.component';

interface Suggestion { id: number; text: string }

@Component({
  selector: 'bs-select2-aria-harness',
  imports: [BsSelect2Component],
  template: `
    <bs-select2
      [(isOpen)]="isOpen"
      [(suggestions)]="suggestions"
      [(selectedItems)]="selected"
    ></bs-select2>
  `,
})
class HarnessComponent {
  isOpen = signal(true);
  suggestions = signal<Suggestion[]>([
    { id: 1, text: 'Apple' },
    { id: 2, text: 'Banana' },
    { id: 3, text: 'Cherry' },
  ]);
  selected = signal<Suggestion[]>([{ id: 2, text: 'Banana' }]);
}

describe('BsSelect2Component ARIA — primitive migration', () => {
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
  const items = () => Array.from(overlay.querySelectorAll<HTMLElement>('bs-dropdown-item'));
  const press = (key: string) => {
    input().dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    fixture.detectChanges();
  };

  it('input gets combobox role from bsCombobox and dropdown menu is role=listbox', () => {
    expect(input().getAttribute('role')).toBe('combobox');
    const menu = overlay.querySelector<HTMLElement>('bs-dropdown-menu');
    expect(menu?.getAttribute('role')).toBe('listbox');
  });

  it('items get role="option" and aria-selected mirrors selectedItems', () => {
    const opts = items();
    expect(opts.every(o => o.getAttribute('role') === 'option')).toBe(true);
    // Banana (id 2) is selected; Apple + Cherry are not
    expect(opts[0].getAttribute('aria-selected')).toBe('false');
    expect(opts[1].getAttribute('aria-selected')).toBe('true');
    expect(opts[2].getAttribute('aria-selected')).toBe('false');
  });

  it('ArrowDown highlights the next option via aria-activedescendant on the input', () => {
    input().focus();
    press('ArrowDown');
    expect(input().getAttribute('aria-activedescendant')).toBe(items()[1].id);
  });

  it('Enter on a highlighted option toggles it in selectedItems', () => {
    input().focus();
    press('ArrowDown'); // highlight Banana (idx 1)
    press('Enter');
    fixture.detectChanges();
    // Banana was already selected; Enter toggles it off
    expect(host.selected()).toEqual([]);
  });
});
