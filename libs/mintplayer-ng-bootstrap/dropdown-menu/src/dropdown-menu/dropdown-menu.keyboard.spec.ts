import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OverlayContainer, OverlayModule } from '@angular/cdk/overlay';
import { MockProvider } from 'ng-mocks';
import { BS_DEVELOPMENT } from '@mintplayer/ng-bootstrap';
import { BsDropdownDirective, BsDropdownMenuDirective, BsDropdownToggleDirective } from '@mintplayer/ng-bootstrap/dropdown';
import { BsDropdownMenuComponent } from './dropdown-menu.component';
import { BsDropdownItemComponent } from '../dropdown-item/dropdown-item.component';
@Component({
  selector: 'bs-dropdown-keyboard-harness',
  imports: [
    BsDropdownDirective,
    BsDropdownToggleDirective,
    BsDropdownMenuDirective,
    BsDropdownMenuComponent,
    BsDropdownItemComponent,
  ],
  template: `
    <div bsDropdown [(isOpen)]="isOpen">
      <button bsDropdownToggle>Open</button>
      <bs-dropdown-menu *bsDropdownMenu>
        <bs-dropdown-item>Apple</bs-dropdown-item>
        <bs-dropdown-item [disabled]="true">Banana (disabled)</bs-dropdown-item>
        <bs-dropdown-item>Cherry</bs-dropdown-item>
        <bs-dropdown-item (click)="lastClick.set('Date')">Date</bs-dropdown-item>
      </bs-dropdown-menu>
    </div>
  `,
})
class HarnessComponent {
  isOpen = signal(true);
  lastClick = signal<string | null>(null);
}

describe('Dropdown menu — menu-mode keyboard navigation', () => {
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

  const menu = () => overlay.querySelector<HTMLElement>('bs-dropdown-menu')!;
  const items = () => Array.from(overlay.querySelectorAll<HTMLElement>('bs-dropdown-item'));
  const press = (key: string, target: HTMLElement = menu()) => {
    target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    fixture.detectChanges();
  };

  it('first item gets tabindex=0 by default; others -1; disabled is -1', () => {
    const tabs = items().map(el => el.getAttribute('tabindex'));
    // Apple=0 (focused default), Banana=-1 (disabled), Cherry=-1, Date=-1
    expect(tabs).toEqual(['0', '-1', '-1', '-1']);
  });

  it('ArrowDown skips disabled items', () => {
    press('ArrowDown');
    // Apple (0) → ArrowDown → skip Banana (disabled) → land on Cherry (2)
    const tabs = items().map(el => el.getAttribute('tabindex'));
    expect(tabs).toEqual(['-1', '-1', '0', '-1']);
    expect(document.activeElement).toBe(items()[2]);
  });

  it('ArrowDown wraps from last to first (skipping disabled)', () => {
    press('End');
    // Date is now focused
    expect(items()[3].getAttribute('tabindex')).toBe('0');
    press('ArrowDown');
    // wraps to Apple
    expect(items()[0].getAttribute('tabindex')).toBe('0');
  });

  it('Home/End jump to first/last enabled', () => {
    press('End');
    expect(items()[3].getAttribute('tabindex')).toBe('0');
    press('Home');
    expect(items()[0].getAttribute('tabindex')).toBe('0');
  });

  it('Enter on a focused item activates it (dispatches click)', () => {
    press('End'); // focus Date (the one with the click handler)
    items()[3].focus();
    press('Enter', items()[3]);
    expect(host.lastClick()).toBe('Date');
  });

  it('Space on a focused item activates it too', () => {
    press('End');
    items()[3].focus();
    press(' ', items()[3]);
    expect(host.lastClick()).toBe('Date');
  });

  it('disabled item does not activate on Enter', () => {
    items()[1].focus(); // Banana (disabled)
    press('Enter', items()[1]);
    expect(host.lastClick()).toBeNull();
  });
});
