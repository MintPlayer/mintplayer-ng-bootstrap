import { Component, PLATFORM_ID, signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { BsTabsPosition } from '../tabs-position';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BsTabControlComponent } from './tab-control.component';
// after the control: tab-page imports it back (a cycle), so it must be evaluated first
import { BsTabPageComponent } from '../tab-page/tab-page.component';
import { BsTabPageHeaderDirective } from '../tab-page-header/tab-page-header.directive';

describe('BsTabControlComponent', () => {
  let component: BsTabControlComponent;
  let fixture: ComponentFixture<BsTabControlComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        // Component to test
        BsTabControlComponent,

        // Testbench
        BsTabControlTestComponent,

        // Mock components
        BsTabPageMockComponent,
      ],
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsTabControlComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

@Component({
  selector: 'bs-tab-control-test',
  template: `
    <bs-tab-control>
      <bs-tab-page>
        <ng-template>
          <span class="triangle me-2"></span>
          Tab 1
        </ng-template>
        This is tab 1
      </bs-tab-page>
      <bs-tab-page>
        <ng-template>
          <span class="triangle me-2"></span>
          Tab 2
        </ng-template>
        This is tab 2
      </bs-tab-page>
      <bs-tab-page [disabled]="true">
        <ng-template>
          <span class="triangle me-2"></span>
          Tab 3
        </ng-template>
        This is tab 3
      </bs-tab-page>
      <bs-tab-page>
        <ng-template>
          <span class="triangle me-2"></span>
          Tab 4
        </ng-template>
        This is tab 4
      </bs-tab-page>
    </bs-tab-control>`
})
class BsTabControlTestComponent {}

@Component({
  selector: 'bs-tab-page',
  template: 'tab-page works',
})
class BsTabPageMockComponent {}


@Component({
  selector: 'bs-tab-control-signal-host',
  imports: [BsTabControlComponent, BsTabPageComponent, BsTabPageHeaderDirective],
  template: `
    <bs-tab-control [border]="border()" [selectFirstTab]="selectFirst()" [tabsPosition]="position()">
      <bs-tab-page [disabled]="firstDisabled()"><span *bsTabPageHeader>One</span>Page 1</bs-tab-page>
      <bs-tab-page><span *bsTabPageHeader>Two</span>Page 2</bs-tab-page>
      <bs-tab-page [disabled]="true"><span *bsTabPageHeader>Three</span>Page 3</bs-tab-page>
    </bs-tab-control>`,
})
class SignalHostComponent {
  readonly border = signal(true);
  readonly selectFirst = signal(true);
  readonly position = signal<BsTabsPosition>('top');
  readonly firstDisabled = signal(false);
}

describe('BsTabControlComponent behaviour', () => {
  const create = () => {
    const fixture = TestBed.createComponent(SignalHostComponent);
    fixture.detectChanges();
    const control = fixture.debugElement.query(By.directive(BsTabControlComponent)).componentInstance as BsTabControlComponent;
    return { fixture, control, root: fixture.nativeElement as HTMLElement };
  };

  afterEach(() => vi.useRealTimers());

  it('selects the first enabled tab, both as the checked tab and, after a tick, as the active one', () => {
    vi.useFakeTimers();
    const { fixture, control } = create();
    fixture.componentInstance.firstDisabled.set(true);
    fixture.detectChanges();
    const pages = control.tabPages();
    expect(control.checkedTab()).toBe(pages[1]);
    vi.runAllTimers();
    expect(control.activeTab()).toBe(pages[1]);
  });

  it('with selectFirstTab off, nothing is selected', () => {
    vi.useFakeTimers();
    const { fixture, control } = create();
    fixture.componentInstance.selectFirst.set(false);
    fixture.detectChanges();
    vi.runAllTimers();
    // the effect's timer from the first render may already have chosen a tab
    control.activeTab.set(null);
    expect(control.checkedTab()).toBeNull();
    expect(control.activeTabName()).toBeNull();
  });

  it('maps the inputs onto the element\'s attributes', () => {
    const { fixture, root, control } = create();
    const wc = root.querySelector('mp-tab-control') as HTMLElement;
    expect(wc.getAttribute('tabs-position')).toBe('top');
    expect(wc.hasAttribute('border')).toBe(false);
    expect(wc.getAttribute('active-tab')).toBe(control.tabPages()[0].tabName());
    fixture.componentInstance.border.set(false);
    fixture.componentInstance.selectFirst.set(false);
    fixture.componentInstance.position.set('bottom');
    fixture.detectChanges();
    expect(wc.getAttribute('border')).toBe('false');
    expect(wc.getAttribute('select-first-tab')).toBe('false');
    expect(wc.getAttribute('tabs-position')).toBe('bottom');
  });

  it('slots each page\'s header and content by its tab name', () => {
    const { root, control } = create();
    const name = control.tabPages()[1].tabName();
    expect(root.querySelector(`[slot="${name}-header"]`)?.textContent).toBe('Two');
    expect(root.querySelector(`bs-tab-page[slot="${name}-content"]`)).not.toBeNull();
    expect(root.querySelectorAll('bs-tab-page[data-disabled]')).toHaveLength(1);
  });

  it('a tab-activate event from the element activates that page, but never a disabled one', () => {
    const { root, control } = create();
    const wc = root.querySelector('mp-tab-control') as HTMLElement;
    const [, second, third] = control.tabPages();
    wc.dispatchEvent(new CustomEvent('tab-activate', { detail: { tabId: second.tabName() } }));
    expect(control.activeTab()).toBe(second);
    wc.dispatchEvent(new CustomEvent('tab-activate', { detail: { tabId: third.tabName() } }));
    wc.dispatchEvent(new CustomEvent('tab-activate', { detail: { tabId: 'no-such-tab' } }));
    expect(control.activeTab()).toBe(second);
  });

  it('setActiveTab prevents the event default and skips disabled pages', () => {
    const { control } = create();
    const [first, , third] = control.tabPages();
    const ev = new Event('click', { cancelable: true });
    expect(control.setActiveTab(first, ev)).toBe(false);
    expect(ev.defaultPrevented).toBe(true);
    expect(control.activeTab()).toBe(first);
    control.setActiveTab(third);
    expect(control.activeTab()).toBe(first);
  });
});

describe('BsTabControlComponent on the server', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'server' }] });
  });

  it('renders the no-JS radio group: one radio per page, labelled by its header, disabled where the page is', () => {
    const fixture = TestBed.createComponent(SignalHostComponent);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    const radios = [...root.querySelectorAll('input.tab-radio')] as HTMLInputElement[];
    expect(radios).toHaveLength(3);
    expect(new Set(radios.map((r) => r.name)).size).toBe(1);
    expect(radios[0].checked).toBe(true);
    expect(radios[2].disabled).toBe(true);
    const label = root.querySelector(`label[for="${radios[1].id}"]`);
    expect(label?.textContent?.trim()).toBe('Two');
    expect(radios[1].getAttribute('aria-controls')).toBe(`${radios[1].id}-panel`);
    const region = root.querySelector(`[id="${radios[1].id}-panel"]`);
    // the page content is projected on the server too
    expect(region?.textContent).toContain('Page 2');
    expect(region?.getAttribute('role')).toBe('region');
    expect(region?.getAttribute('aria-labelledby')).toBe(`${radios[1].id}-header`);
    expect(root.querySelector('mp-tab-control')).toBeNull();
  });

  it('puts the strip below the content for bottom tabs', () => {
    const fixture = TestBed.createComponent(SignalHostComponent);
    fixture.componentInstance.position.set('bottom');
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector('.bottom-tabs .nav-tabs')).not.toBeNull();
    expect(root.querySelectorAll('.nav-tabs')).toHaveLength(1);
  });
});
