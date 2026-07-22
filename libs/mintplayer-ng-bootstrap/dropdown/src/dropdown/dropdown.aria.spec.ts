import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OverlayContainer, OverlayModule } from '@angular/cdk/overlay';
import { MockProvider } from 'ng-mocks';
import { BS_DEVELOPMENT } from '@mintplayer/ng-bootstrap';
import { BsRovingFocusDirective, BsRovingFocusItemDirective } from '@mintplayer/ng-bootstrap/a11y';
import { BsDropdownItemDirective, BsDropdownMenuComponent } from '@mintplayer/ng-bootstrap/dropdown-menu';
import { BsDropdownDirective } from './dropdown.directive';
import { BsDropdownMenuDirective } from '../dropdown-menu/dropdown-menu.directive';
import { BsDropdownToggleDirective } from '../dropdown-toggle/dropdown-toggle.directive';
// Register <mp-dropdown-menu> so the wrapper's projected <li>s get their WC-driven
// roles (role=menuitem/option, aria-selected) synchronously in the test.
import '@mintplayer/web-components/dropdown-menu';

@Component({
  selector: 'bs-dropdown-aria-test',
  imports: [
    BsDropdownDirective,
    BsDropdownToggleDirective,
    BsDropdownMenuDirective,
    BsDropdownMenuComponent,
    BsDropdownItemDirective,
  ],
  template: `
    <div bsDropdown #dd="bsDropdown" [popupRole]="role()" [(isOpen)]="isOpen">
      <button bsDropdownToggle>Open</button>
      <bs-dropdown-menu *bsDropdownMenu [menuMode]="role()" [attr.id]="dd.menuId() || null" [attr.role]="dd.popupRole()">
        <li bsDropdownItem [active]="true">Item A</li>
        <li bsDropdownItem>Item B</li>
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

  // Let the projected <li>s render and the WC (mp-dropdown-menu) sync item roles.
  const open = async () => {
    host.isOpen.set(true);
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise<void>(resolve => setTimeout(resolve));
    fixture.detectChanges();
  };

  const queryToggle = () =>
    fixture.nativeElement.querySelector<HTMLButtonElement>('button[bsDropdownToggle]')!;
  const queryMenu = () =>
    overlayContainerEl.querySelector<HTMLElement>('bs-dropdown-menu');
  const queryItems = () =>
    Array.from(overlayContainerEl.querySelectorAll<HTMLElement>('li[bsDropdownItem]'));

  describe('default (menu) mode', () => {
    it('toggle advertises aria-haspopup="menu" and aria-controls pointing at the menu id', async () => {
      const toggle = queryToggle();
      await open();

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

    it('menu host has role="menu" and items have role="menuitem" without aria-selected', async () => {
      await open();

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

    it('menu host has role="listbox" and items have role="option" with aria-selected mirrored from active', async () => {
      await open();

      const menu = queryMenu()!;
      const items = queryItems();
      expect(menu.getAttribute('role')).toBe('listbox');
      expect(items[0].getAttribute('role')).toBe('option');
      expect(items[0].getAttribute('aria-selected')).toBe('true');
      expect(items[1].getAttribute('role')).toBe('option');
      expect(items[1].getAttribute('aria-selected')).toBe('false');
    });
  });

  it('roving-focus items expose stable generated ids (so aria-activedescendant can target them)', async () => {
    @Component({
      selector: 'bs-dropdown-aria-roving',
      imports: [
        BsDropdownDirective,
        BsDropdownToggleDirective,
        BsDropdownMenuDirective,
        BsDropdownMenuComponent,
        BsDropdownItemDirective,
        BsRovingFocusDirective,
        BsRovingFocusItemDirective,
      ],
      template: `
        <div bsDropdown #dd="bsDropdown" popupRole="listbox" [(isOpen)]="isOpen">
          <button bsDropdownToggle>Open</button>
          <bs-dropdown-menu *bsDropdownMenu bsRovingFocus mode="activedescendant" menuMode="listbox"
            [attr.id]="dd.menuId() || null" [attr.role]="dd.popupRole()">
            <li bsDropdownItem bsRovingFocusItem>Item A</li>
            <li bsDropdownItem bsRovingFocusItem>Item B</li>
          </bs-dropdown-menu>
        </div>
      `,
    })
    class RovingHarness {
      isOpen = signal(true);
    }

    await TestBed.resetTestingModule().configureTestingModule({
      imports: [OverlayModule, RovingHarness],
      providers: [MockProvider(BS_DEVELOPMENT, false)],
    }).compileComponents();

    const f = TestBed.createComponent(RovingHarness);
    f.detectChanges();
    await f.whenStable();
    await new Promise<void>(resolve => setTimeout(resolve));
    f.detectChanges();

    const overlay = TestBed.inject(OverlayContainer).getContainerElement();
    const items = Array.from(overlay.querySelectorAll<HTMLElement>('li[bsDropdownItem]'));
    items.forEach(item => {
      expect(item.id).toMatch(/^bs-rovingitem-\d+$/);
    });
    expect(items[0].id).not.toBe(items[1].id);
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
        <div bsDropdown id="my-picker" #dd="bsDropdown" [(isOpen)]="isOpen">
          <button bsDropdownToggle>Open</button>
          <bs-dropdown-menu *bsDropdownMenu [attr.id]="dd.menuId() || null">m</bs-dropdown-menu>
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
