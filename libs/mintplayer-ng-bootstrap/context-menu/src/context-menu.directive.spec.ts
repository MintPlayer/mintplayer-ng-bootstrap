import { OverlayContainer, OverlayModule } from '@angular/cdk/overlay';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsContextMenuDirective } from './context-menu.directive';

@Component({
  selector: 'context-menu-test-component',
  imports: [BsContextMenuDirective],
  template: `
    <button type="button" class="outside">outside</button>
    <div class="trigger" tabindex="0">
      <ul class="dropdown-menu show" *bsContextMenu>
        <li><button type="button" class="dropdown-item first">Item 1</button></li>
        <li><button type="button" class="dropdown-item">Item 2</button></li>
      </ul>
    </div>
    <div class="trigger-2">
      <ng-template bsContextMenu>
        @if (true) { <div class="menu-2"><a href="#x">Link</a></div> }
      </ng-template>
    </div>`,
})
class ContextMenuTestComponent {}

describe('BsContextMenuDirective', () => {
  let fixture: ComponentFixture<ContextMenuTestComponent>;
  let container: HTMLElement;
  const q = <T extends Element>(sel: string) => fixture.nativeElement.querySelector(sel) as T;
  const menu = () => container.querySelector('.dropdown-menu') as HTMLElement | null;
  const rightClick = (el: Element, init: MouseEventInit = {}) => {
    const ev = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 30, clientY: 40, ...init });
    el.dispatchEvent(ev);
    return ev;
  };

  beforeEach(() => {
    vi.useFakeTimers();
    // jsdom has no scrolling; the directive cancels smooth-scroll animations with it
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    TestBed.configureTestingModule({ imports: [OverlayModule, ContextMenuTestComponent] });
    fixture = TestBed.createComponent(ContextMenuTestComponent);
    fixture.detectChanges();
    container = TestBed.inject(OverlayContainer).getContainerElement();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('opens the template in an overlay on right-click, replacing the native menu', () => {
    expect(menu()).toBeNull();
    const ev = rightClick(q('.trigger'));
    expect(ev.defaultPrevented).toBe(true);
    expect(menu()).not.toBeNull();
    expect(menu()!.classList).toContain('position-static');
  });

  it('moves focus to the first item on the next tick, and back to the trigger on Escape', () => {
    const trigger = q<HTMLElement>('.trigger');
    trigger.focus();
    rightClick(trigger);
    vi.runAllTimers();
    expect(document.activeElement).toBe(menu()!.querySelector('.first'));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(menu()).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it.each([
    ['Shift+F10', { key: 'F10', shiftKey: true }],
    ['the ContextMenu key', { key: 'ContextMenu' }],
  ])('opens from the keyboard with %s', (_name, init) => {
    const ev = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });
    q('.trigger').dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(true);
    expect(menu()).not.toBeNull();
  });

  it('ignores other keys', () => {
    const ev = new KeyboardEvent('keydown', { key: 'F10', bubbles: true, cancelable: true });
    q('.trigger').dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(false);
    expect(menu()).toBeNull();
  });

  it('a click outside closes it; a click inside does not', () => {
    rightClick(q('.trigger'));
    menu()!.querySelector<HTMLElement>('.first')!.click();
    expect(menu()).not.toBeNull();
    q<HTMLElement>('.outside').click();
    expect(menu()).toBeNull();
  });

  it('closes when the window loses focus', () => {
    rightClick(q('.trigger'));
    window.dispatchEvent(new Event('blur'));
    expect(menu()).toBeNull();
  });

  it('a second right-click elsewhere replaces the open menu instead of stacking another', () => {
    rightClick(q('.trigger'));
    rightClick(q('.trigger'), { clientX: 90 });
    expect(container.querySelectorAll('.dropdown-menu')).toHaveLength(1);
  });

  it('renders a template rooted in control flow (comment nodes among the roots)', () => {
    expect(() => rightClick(q('.trigger-2'))).not.toThrow();
    const m = container.querySelector('.menu-2') as HTMLElement;
    expect(m.classList).toContain('position-static');
    vi.runAllTimers();
    expect(document.activeElement).toBe(m.querySelector('a'));
  });

  it('when the directive is destroyed, closes its open menu and stops listening on the trigger', () => {
    const trigger = q('.trigger');
    rightClick(trigger);
    fixture.destroy();
    expect(menu()).toBeNull();
    const ev = rightClick(trigger);
    expect(ev.defaultPrevented).toBe(false);
    expect(menu()).toBeNull();
  });
});
