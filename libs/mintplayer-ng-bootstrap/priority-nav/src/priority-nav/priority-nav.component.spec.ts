import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, PLATFORM_ID, signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { Breakpoint } from '@mintplayer/ng-bootstrap';
import { BsOverlayStackService } from '@mintplayer/ng-bootstrap/a11y';
import { BsPriorityNavComponent } from './priority-nav.component';
import { BsPriorityNavItemDirective } from '../priority-nav-item/priority-nav-item.directive';

@Component({
  selector: 'priority-nav-test',
  imports: [BsPriorityNavComponent, BsPriorityNavItemDirective],
  template: `
    <bs-priority-nav>
      <a *bsPriorityNavItem="1; hideBelow: 'md'" href="#a">A</a>
      <a *bsPriorityNavItem="2; hideBelow: 'lg'" href="#b">B</a>
      <a *bsPriorityNavItem="3" href="#c">C</a>
    </bs-priority-nav>
  `,
})
class TestHostComponent {}

describe('BsPriorityNavComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render all items in the inline strip', () => {
    const links = fixture.nativeElement.querySelectorAll('.priority-nav-strip .priority-nav-item');
    expect(links.length).toBe(3);
  });

  it('should also render items in the overflow menu (dual render)', () => {
    const overflowItems = fixture.nativeElement.querySelectorAll('.priority-nav-overflow .priority-nav-overflow-item');
    expect(overflowItems.length).toBe(3);
  });
});

@Component({
  selector: 'priority-nav-config-test',
  imports: [BsPriorityNavComponent, BsPriorityNavItemDirective],
  template: `
    <button class="outside" type="button">outside</button>
    <bs-priority-nav [collapseAt]="collapseAt()" [hideEmptyMore]="hideEmptyMore()" (overflowChange)="overflow.set($event)">
      <a *bsPriorityNavItem="1" href="#a">A</a>
      <a *bsPriorityNavItem="2" href="#b">B</a>
    </bs-priority-nav>
  `,
})
class ConfigHostComponent {
  readonly collapseAt = signal<Breakpoint | null>(null);
  readonly hideEmptyMore = signal(true);
  readonly overflow = signal<BsPriorityNavItemDirective[]>([]);
}

describe('BsPriorityNavComponent behaviour', () => {
  let fixture: ComponentFixture<ConfigHostComponent>;
  const nav = () => fixture.debugElement.query(By.directive(BsPriorityNavComponent)).componentInstance as BsPriorityNavComponent;
  const toggle = () => fixture.nativeElement.querySelector('.priority-nav-more-toggle') as HTMLButtonElement;
  const overflowList = () => fixture.nativeElement.querySelector('.priority-nav-overflow') as HTMLElement;

  beforeEach(() => {
    fixture = TestBed.createComponent(ConfigHostComponent);
    fixture.detectChanges();
  });

  it('overflows nothing while unmeasured (jsdom lays nothing out) and hides the empty More toggle', () => {
    expect(nav().hasAnyOverflow()).toBe(false);
    expect(toggle().classList).toContain('priority-nav-hidden');
    fixture.componentInstance.hideEmptyMore.set(false);
    fixture.detectChanges();
    expect(toggle().classList).not.toContain('priority-nav-hidden');
  });

  it.each([
    ['xxl', 1400], ['xl', 1200], ['lg', 992], ['md', 768], ['sm', 576], ['xs', 0],
  ] as const)('collapseAt %s maps to the %ipx breakpoint', (bp, px) => {
    fixture.componentInstance.collapseAt.set(bp);
    fixture.detectChanges();
    expect(nav().collapseAtPx()).toBe(px);
  });

  it('collapses every item into the More menu below the collapseAt breakpoint', () => {
    // jsdom's window is 1024px wide: below xl, above lg
    fixture.componentInstance.collapseAt.set('xl');
    fixture.detectChanges();
    expect(nav().fullyCollapsed()).toBe(true);
    expect(fixture.componentInstance.overflow().map((i) => i.priority())).toEqual([1, 2]);
    const inline = [...fixture.nativeElement.querySelectorAll('.priority-nav-strip .priority-nav-item')] as HTMLElement[];
    expect(inline.every((el) => el.classList.contains('priority-nav-hidden'))).toBe(true);
    expect(overflowList().classList).toContain('priority-nav-overflow-align-start');

    fixture.componentInstance.collapseAt.set('lg');
    fixture.detectChanges();
    expect(nav().fullyCollapsed()).toBe(false);
    expect(fixture.componentInstance.overflow()).toEqual([]);
  });

  it('re-reads the window width on resize', () => {
    fixture.componentInstance.collapseAt.set('xl');
    fixture.detectChanges();
    expect(nav().windowWidth()).toBe(window.innerWidth);
    window.dispatchEvent(new Event('resize'));
    expect(nav().windowWidth()).toBe(window.innerWidth);
  });

  it('the More toggle is a disclosure: aria-expanded follows the open state', () => {
    fixture.componentInstance.hideEmptyMore.set(false);
    fixture.detectChanges();
    expect(toggle().getAttribute('aria-expanded')).toBe('false');
    expect(toggle().getAttribute('aria-controls')).toBe(overflowList().id);
    toggle().click();
    fixture.detectChanges();
    expect(toggle().getAttribute('aria-expanded')).toBe('true');
    expect(overflowList().classList).toContain('priority-nav-overflow-open');
    toggle().click();
    fixture.detectChanges();
    expect(toggle().getAttribute('aria-expanded')).toBe('false');
  });

  it('Escape closes the open menu when it is the top overlay', () => {
    const stack = TestBed.inject(BsOverlayStackService);
    nav().toggleMore();
    fixture.detectChanges();
    const other = stack.push();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    // another overlay opened above it: that one owns Escape
    expect(nav().isMoreOpen()).toBe(true);
    stack.release(other);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(nav().isMoreOpen()).toBe(false);
  });

  it('a primary click outside closes the menu; inside, or another button, does not', () => {
    nav().toggleMore();
    fixture.detectChanges();
    const outside = fixture.nativeElement.querySelector('.outside') as HTMLElement;
    outside.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 2 }));
    expect(nav().isMoreOpen()).toBe(true);
    overflowList().dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0 }));
    expect(nav().isMoreOpen()).toBe(true);
    outside.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0 }));
    expect(nav().isMoreOpen()).toBe(false);
  });

  it('releases its overlay-stack entry when the menu closes', () => {
    const stack = TestBed.inject(BsOverlayStackService);
    const push = vi.spyOn(stack, 'push');
    const release = vi.spyOn(stack, 'release');
    nav().toggleMore();
    fixture.detectChanges();
    nav().toggleMore();
    fixture.detectChanges();
    expect(push).toHaveBeenCalledTimes(1);
    expect(release).toHaveBeenCalledWith(push.mock.results[0].value);
  });
});

describe('BsPriorityNavComponent on the server', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'server' }] });
  });

  it('renders the no-JS disclosure: a checkbox named by the toggle label, and no measure strip', () => {
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    const checkbox = root.querySelector('input.priority-nav-more-checkbox') as HTMLInputElement;
    const label = root.querySelector('label.priority-nav-more-toggle-noscript') as HTMLLabelElement;
    expect(checkbox.type).toBe('checkbox');
    expect(label.htmlFor).toBe(checkbox.id);
    expect(checkbox.getAttribute('aria-controls')).toBe(root.querySelector('.priority-nav-overflow')!.id);
    expect(root.querySelector('.priority-nav-measure')).toBeNull();
    expect(root.querySelector('nav')!.classList).toContain('noscript');
  });

  it('leaves hiding to CSS: no item is hidden by the JS flags, and nothing overflows', () => {
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
    const nav = fixture.debugElement.query(By.directive(BsPriorityNavComponent)).componentInstance as BsPriorityNavComponent;
    expect(nav.overflowingIds().size).toBe(0);
    expect(nav.itemWidths().size).toBe(0);
    expect(nav.itemGap()).toBe(0);
    expect(nav.itemsWithMeta().every((e) => !e.hideInline && !e.hideInOverflow)).toBe(true);
    expect(nav.itemsWithMeta()[0].hideBelowClass).toBe('priority-nav-item-hide-below-md');
  });
});

@Component({
  selector: 'priority-nav-action-test',
  imports: [BsPriorityNavComponent, BsPriorityNavItemDirective],
  template: `
    <bs-priority-nav [hideEmptyMore]="false">
      <button *bsPriorityNavItem="1" type="button" class="action" (click)="runs.set(runs() + 1)">Run</button>
      <button *bsPriorityNavItem="2" type="button" class="submenu" aria-haspopup="menu" aria-expanded="false">Sub</button>
      <input *bsPriorityNavItem="3" class="field" aria-label="Search">
    </bs-priority-nav>
  `,
})
class ActionHostComponent {
  readonly runs = signal(0);
}

describe('BsPriorityNavComponent overflow item activation (#426)', () => {
  let fixture: ComponentFixture<ActionHostComponent>;
  const nav = () => fixture.debugElement.query(By.directive(BsPriorityNavComponent)).componentInstance as BsPriorityNavComponent;
  const toggle = () => fixture.nativeElement.querySelector('.priority-nav-more-toggle') as HTMLButtonElement;
  const inOverflow = (selector: string) =>
    fixture.nativeElement.querySelector(`.priority-nav-overflow ${selector}`) as HTMLElement;

  beforeEach(() => {
    fixture = TestBed.createComponent(ActionHostComponent);
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
    toggle().click();
    fixture.detectChanges();
  });

  afterEach(() => fixture.nativeElement.remove());

  it('an action item runs AND closes the menu, returning focus to More', () => {
    const action = inOverflow('.action');
    action.focus();
    action.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.runs()).toBe(1);
    expect(nav().isMoreOpen()).toBe(false);
    expect(toggle().getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(toggle());
  });

  it('does not steal focus an action already moved elsewhere', () => {
    const elsewhere = document.createElement('button');
    document.body.appendChild(elsewhere);
    const action = inOverflow('.action');
    action.addEventListener('click', () => elsewhere.focus());
    action.click();
    expect(nav().isMoreOpen()).toBe(false);
    expect(document.activeElement).toBe(elsewhere);
    elsewhere.remove();
  });

  it('a nested-menu trigger and a form field keep the menu open', () => {
    inOverflow('.submenu').click();
    expect(nav().isMoreOpen()).toBe(true);
    inOverflow('.field').click();
    expect(nav().isMoreOpen()).toBe(true);
  });

  it('Escape returns focus from inside the panel to More', () => {
    inOverflow('.field').focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(nav().isMoreOpen()).toBe(false);
    expect(document.activeElement).toBe(toggle());
  });
});
