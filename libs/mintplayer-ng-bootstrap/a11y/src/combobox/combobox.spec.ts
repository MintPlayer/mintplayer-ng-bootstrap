import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OverlayModule } from '@angular/cdk/overlay';
import { MockProvider } from 'ng-mocks';
import { BS_DEVELOPMENT } from '@mintplayer/ng-bootstrap';
import { BsDropdownDirective, BsDropdownMenuDirective, BsDropdownToggleDirective } from '@mintplayer/ng-bootstrap/dropdown';
import { BsDropdownMenuComponent } from '@mintplayer/ng-bootstrap/dropdown-menu';
import { BsComboboxDirective, BsComboboxNavigateDirection } from './combobox.directive';

@Component({
  selector: 'bs-combobox-harness',
  imports: [
    BsDropdownDirective,
    BsDropdownMenuDirective,
    BsDropdownToggleDirective,
    BsDropdownMenuComponent,
    BsComboboxDirective,
  ],
  template: `
    <div bsDropdown popupRole="listbox" [(isOpen)]="isOpen">
      <input
        bsCombobox
        [activeDescendant]="activeDescendant()"
        (navigate)="lastNavigate.set($event)"
        (activate)="activated.set((activated() ?? 0) + 1)"
        (cancel)="cancelled.set((cancelled() ?? 0) + 1)"
      >
      <bs-dropdown-menu *bsDropdownMenu>menu content</bs-dropdown-menu>
    </div>
  `,
})
class HarnessComponent {
  isOpen = signal(false);
  activeDescendant = signal<string | null>(null);
  lastNavigate = signal<BsComboboxNavigateDirection | null>(null);
  activated = signal<number | null>(null);
  cancelled = signal<number | null>(null);
}

describe('BsComboboxDirective', () => {
  let fixture: ComponentFixture<HarnessComponent>;
  let host: HarnessComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OverlayModule, HarnessComponent],
      providers: [MockProvider(BS_DEVELOPMENT, false)],
    }).compileComponents();
    fixture = TestBed.createComponent(HarnessComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  const input = () => fixture.nativeElement.querySelector<HTMLInputElement>('input')!;
  const press = (key: string) => {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    input().dispatchEvent(event);
    fixture.detectChanges();
    return event;
  };

  describe('static ARIA attributes', () => {
    it('emits role="combobox", aria-autocomplete, aria-haspopup="listbox"', () => {
      expect(input().getAttribute('role')).toBe('combobox');
      expect(input().getAttribute('aria-autocomplete')).toBe('list');
      expect(input().getAttribute('aria-haspopup')).toBe('listbox');
    });
  });

  describe('reactive ARIA attributes from parent dropdown', () => {
    it('aria-expanded mirrors dropdown.isOpen()', () => {
      expect(input().getAttribute('aria-expanded')).toBe('false');
      host.isOpen.set(true);
      fixture.detectChanges();
      expect(input().getAttribute('aria-expanded')).toBe('true');
    });

    it('aria-controls points at dropdown.menuId', () => {
      const controls = input().getAttribute('aria-controls');
      expect(controls).toMatch(/^bs-dropdown-menu-\d+$/);
    });

    it('aria-activedescendant reflects the activeDescendant input', () => {
      expect(input().getAttribute('aria-activedescendant')).toBeNull();
      host.activeDescendant.set('option-7');
      fixture.detectChanges();
      expect(input().getAttribute('aria-activedescendant')).toBe('option-7');
    });
  });

  describe('keyboard handling', () => {
    it('ArrowDown opens the dropdown when closed', () => {
      expect(host.isOpen()).toBe(false);
      const ev = press('ArrowDown');
      expect(host.isOpen()).toBe(true);
      expect(ev.defaultPrevented).toBe(true);
      expect(host.lastNavigate()).toBeNull();
    });

    it('ArrowDown emits navigate("next") when already open', () => {
      host.isOpen.set(true);
      fixture.detectChanges();
      press('ArrowDown');
      expect(host.lastNavigate()).toBe('next');
    });

    it('ArrowUp emits navigate("prev") when open', () => {
      host.isOpen.set(true);
      fixture.detectChanges();
      press('ArrowUp');
      expect(host.lastNavigate()).toBe('prev');
    });

    it('Home/End emit navigate("first"/"last") only when open', () => {
      press('Home');
      expect(host.lastNavigate()).toBeNull();

      host.isOpen.set(true);
      fixture.detectChanges();
      press('Home');
      expect(host.lastNavigate()).toBe('first');
      press('End');
      expect(host.lastNavigate()).toBe('last');
    });

    it('Escape closes the dropdown and emits cancel', () => {
      host.isOpen.set(true);
      fixture.detectChanges();
      press('Escape');
      expect(host.isOpen()).toBe(false);
      expect(host.cancelled()).toBe(1);
    });

    it('Enter emits activate when the dropdown is open', () => {
      press('Enter');
      expect(host.activated()).toBeNull();

      host.isOpen.set(true);
      fixture.detectChanges();
      press('Enter');
      expect(host.activated()).toBe(1);
    });

    it('typing letters does not consume the event', () => {
      const ev = press('a');
      expect(ev.defaultPrevented).toBe(false);
      expect(host.lastNavigate()).toBeNull();
    });
  });
});
