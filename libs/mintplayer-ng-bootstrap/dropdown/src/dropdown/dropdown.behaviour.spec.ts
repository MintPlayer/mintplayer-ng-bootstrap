import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OverlayContainer, OverlayModule } from '@angular/cdk/overlay';
import { BsOverlayStackService } from '@mintplayer/ng-bootstrap/a11y';
import { BsDropdownDirective } from './dropdown.directive';
import { BsDropdownMenuDirective } from '../dropdown-menu/dropdown-menu.directive';
import { BsDropdownToggleDirective } from '../dropdown-toggle/dropdown-toggle.directive';

@Component({
  selector: 'bs-dropdown-behaviour-test',
  imports: [BsDropdownDirective, BsDropdownToggleDirective, BsDropdownMenuDirective],
  template: `
    <button type="button" class="outside">outside</button>
    @if (mounted()) {
      <div bsDropdown [(isOpen)]="isOpen" [hasBackdrop]="backdrop()" [closeOnClickOutside]="closeOutside()" [sameDropdownWidth]="sameWidth()">
        <button type="button" bsDropdownToggle>Open</button>
        <ul class="menu" *bsDropdownMenu>
          <li><a href="#a" class="dropdown-item first">A</a></li>
          <li><a href="#b" class="dropdown-item">B</a></li>
        </ul>
      </div>
    }`,
})
class HostComponent {
  readonly mounted = signal(true);
  readonly isOpen = signal(false);
  readonly backdrop = signal(false);
  readonly closeOutside = signal(true);
  readonly sameWidth = signal(false);
}

describe('Dropdown behaviour', () => {
  let fixture: ComponentFixture<HostComponent>;
  let container: HTMLElement;
  const toggle = () => fixture.nativeElement.querySelector('[bsDropdownToggle]') as HTMLButtonElement;
  const menu = () => container.querySelector('.menu') as HTMLElement | null;
  const settle = () => { fixture.detectChanges(); TestBed.tick(); };
  const open = () => {
    fixture.componentInstance.isOpen.set(true);
    settle();
  };

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({ imports: [OverlayModule, HostComponent] });
    fixture = TestBed.createComponent(HostComponent);
    settle();
    container = TestBed.inject(OverlayContainer).getContainerElement();
  });

  afterEach(() => vi.useRealTimers());

  it('the toggle opens and closes the menu in an overlay', () => {
    toggle().click();
    settle();
    expect(fixture.componentInstance.isOpen()).toBe(true);
    expect(menu()).not.toBeNull();
    toggle().click();
    settle();
    expect(menu()).toBeNull();
  });

  it('ArrowDown on the toggle opens the menu and moves focus to its first item', () => {
    const ev = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true });
    toggle().dispatchEvent(ev);
    settle();
    expect(ev.defaultPrevented).toBe(true);
    vi.runAllTimers();
    // the menu lives in the overlay container, not inside the dropdown's element
    expect(document.activeElement).toBe(menu()!.querySelector('.first'));
  });

  it('a click outside closes it, but not in the first moments after opening', () => {
    open();
    const outside = fixture.nativeElement.querySelector('.outside') as HTMLElement;
    outside.click();
    expect(fixture.componentInstance.isOpen()).toBe(true);
    vi.advanceTimersByTime(150);
    outside.click();
    settle();
    expect(fixture.componentInstance.isOpen()).toBe(false);
  });

  it('a click on the toggle or inside the menu is not a click outside', () => {
    open();
    vi.advanceTimersByTime(150);
    menu()!.querySelector<HTMLElement>('.first')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(fixture.componentInstance.isOpen()).toBe(true);
  });

  it('with closeOnClickOutside off, a click outside leaves it open, and Escape still closes it', () => {
    fixture.componentInstance.closeOutside.set(false);
    open();
    vi.advanceTimersByTime(150);
    (fixture.nativeElement.querySelector('.outside') as HTMLElement).click();
    expect(fixture.componentInstance.isOpen()).toBe(true);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(fixture.componentInstance.isOpen()).toBe(false);
  });

  it('Escape closes only the top overlay', () => {
    open();
    const stack = TestBed.inject(BsOverlayStackService);
    const above = stack.push();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(fixture.componentInstance.isOpen()).toBe(true);
    stack.release(above);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(fixture.componentInstance.isOpen()).toBe(false);
  });

  it('with a backdrop, a backdrop click closes it', () => {
    fixture.componentInstance.backdrop.set(true);
    open();
    const backdrop = container.querySelector('.cdk-overlay-backdrop') as HTMLElement;
    expect(backdrop).not.toBeNull();
    backdrop.click();
    expect(fixture.componentInstance.isOpen()).toBe(false);
  });

  it('closes when the window loses focus', () => {
    open();
    window.dispatchEvent(new Event('blur'));
    expect(fixture.componentInstance.isOpen()).toBe(false);
  });

  it('sameDropdownWidth sizes the menu to the dropdown', () => {
    fixture.componentInstance.sameWidth.set(true);
    open();
    // jsdom lays nothing out: the dropdown is 0 wide
    expect(menu()!.style.width).toBe('0px');
  });

  it('destroyed while open, it removes its overlay and releases its stack entry', () => {
    open();
    const stack = TestBed.inject(BsOverlayStackService);
    const release = vi.spyOn(stack, 'release');
    fixture.componentInstance.mounted.set(false);
    settle();
    expect(menu()).toBeNull();
    expect(release).toHaveBeenCalledTimes(1);
  });
});
