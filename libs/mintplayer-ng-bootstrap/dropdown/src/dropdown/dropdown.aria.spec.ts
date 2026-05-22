import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OverlayContainer, OverlayModule } from '@angular/cdk/overlay';
import { MockProvider } from 'ng-mocks';
import { BS_DEVELOPMENT } from '@mintplayer/ng-bootstrap';
import { BsDropdownItemComponent, BsDropdownMenuComponent } from '@mintplayer/ng-bootstrap/dropdown-menu';
import { BsDropdownDirective } from './dropdown.directive';
import { BsDropdownMenuDirective } from '../dropdown-menu/dropdown-menu.directive';
import { BsDropdownToggleDirective } from '../dropdown-toggle/dropdown-toggle.directive';
@Component({
  selector: 'bs-dropdown-aria-test',
  imports: [
    BsDropdownDirective,
    BsDropdownToggleDirective,
    BsDropdownMenuDirective,
    BsDropdownMenuComponent,
    BsDropdownItemComponent,
  ],
  template: `
    <div bsDropdown [popupRole]="role()" [(isOpen)]="isOpen">
      <button bsDropdownToggle>Open</button>
      <bs-dropdown-menu *bsDropdownMenu>
        <bs-dropdown-item [isSelected]="true">Item A</bs-dropdown-item>
        <bs-dropdown-item>Item B</bs-dropdown-item>
      </bs-dropdown-menu>
    </div>
  `,
})
class HarnessComponent {
  role = signal<'menu' | 'listbox'>('menu');
  isOpen = signal(false);
}

describe('Dropdown ARIA wiring', () => {
  let fixture: ComponentFixture<HarnessComponent>;
  let host: HarnessComponent;
  let overlayContainerEl: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OverlayModule, HarnessComponent],
      providers: [MockProvider(BS_DEVELOPMENT, false)],
    }).compileComponents();

    fixture = TestBed.createComponent(HarnessComponent);
    host = fixture.componentInstance;
    overlayContainerEl = TestBed.inject(OverlayContainer).getContainerElement();
    fixture.detectChanges();
  });

  const queryToggle = () =>
    fixture.nativeElement.querySelector<HTMLButtonElement>('button[bsDropdownToggle]')!;
  const queryMenu = () =>
    overlayContainerEl.querySelector<HTMLElement>('bs-dropdown-menu');
  const queryItems = () =>
    Array.from(overlayContainerEl.querySelectorAll<HTMLElement>('bs-dropdown-item'));

  describe('default (menu) mode', () => {
    it('toggle advertises aria-haspopup="menu" and aria-controls pointing at the menu id', () => {
      const toggle = queryToggle();
      host.isOpen.set(true);
      fixture.detectChanges();

      const menu = queryMenu()!;
      expect(toggle.getAttribute('aria-haspopup')).toBe('menu');
      expect(toggle.getAttribute('aria-controls')).toBe(menu.id);
      expect(menu.id).toMatch(/^bs-dropdown-menu-\d+$/);
    });

    it('toggle reflects aria-expanded as the dropdown opens and closes', () => {
      const toggle = queryToggle();
      expect(toggle.getAttribute('aria-expanded')).toBe('false');

      host.isOpen.set(true);
      fixture.detectChanges();
      expect(toggle.getAttribute('aria-expanded')).toBe('true');

      host.isOpen.set(false);
      fixture.detectChanges();
      expect(toggle.getAttribute('aria-expanded')).toBe('false');
    });

    it('menu host has role="menu" and items have role="menuitem" without aria-selected', () => {
      host.isOpen.set(true);
      fixture.detectChanges();

      const menu = queryMenu()!;
      const items = queryItems();
      expect(menu.getAttribute('role')).toBe('menu');
      expect(items).toHaveLength(2);
      items.forEach(item => {
        expect(item.getAttribute('role')).toBe('menuitem');
        expect(item.hasAttribute('aria-selected')).toBe(false);
      });
    });
  });

  describe('listbox mode', () => {
    beforeEach(() => {
      host.role.set('listbox');
      fixture.detectChanges();
    });

    it('toggle advertises aria-haspopup="listbox"', () => {
      expect(queryToggle().getAttribute('aria-haspopup')).toBe('listbox');
    });

    it('menu host has role="listbox" and items have role="option" with aria-selected mirrored from isSelected', () => {
      host.isOpen.set(true);
      fixture.detectChanges();

      const menu = queryMenu()!;
      const items = queryItems();
      expect(menu.getAttribute('role')).toBe('listbox');
      expect(items[0].getAttribute('role')).toBe('option');
      expect(items[0].getAttribute('aria-selected')).toBe('true');
      expect(items[1].getAttribute('role')).toBe('option');
      expect(items[1].getAttribute('aria-selected')).toBe('false');
    });

    it('items have stable generated ids (so aria-activedescendant can target them)', () => {
      host.isOpen.set(true);
      fixture.detectChanges();

      const items = queryItems();
      items.forEach(item => {
        expect(item.id).toMatch(/^bs-dropdown-item-\d+$/);
      });
      expect(items[0].id).not.toBe(items[1].id);
    });
  });

  it('honours an explicit host id by deriving the menu id from it', async () => {
    @Component({
      selector: 'bs-dropdown-aria-explicit-id',
      imports: [
        BsDropdownDirective,
        BsDropdownToggleDirective,
        BsDropdownMenuDirective,
        BsDropdownMenuComponent,
      ],
      template: `
        <div bsDropdown id="my-picker" [(isOpen)]="isOpen">
          <button bsDropdownToggle>Open</button>
          <bs-dropdown-menu *bsDropdownMenu>m</bs-dropdown-menu>
        </div>
      `,
    })
    class ExplicitIdHarness {
      isOpen = signal(true);
    }

    await TestBed.resetTestingModule().configureTestingModule({
      imports: [OverlayModule, ExplicitIdHarness],
      providers: [MockProvider(BS_DEVELOPMENT, false)],
    }).compileComponents();

    const f = TestBed.createComponent(ExplicitIdHarness);
    f.detectChanges();

    const overlay = TestBed.inject(OverlayContainer).getContainerElement();
    const toggle = f.nativeElement.querySelector<HTMLButtonElement>('button[bsDropdownToggle]')!;
    const menu = overlay.querySelector<HTMLElement>('bs-dropdown-menu')!;

    expect(menu.id).toBe('my-picker-menu');
    expect(toggle.getAttribute('aria-controls')).toBe('my-picker-menu');
  });
});
