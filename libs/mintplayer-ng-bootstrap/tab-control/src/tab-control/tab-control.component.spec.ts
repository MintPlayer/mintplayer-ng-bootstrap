import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { BsTabPageHeaderDirective } from '../tab-page-header/tab-page-header.directive';
import { BsTabPageComponent } from '../tab-page/tab-page.component';
import { BsTabsPosition } from '../tabs-position';
import { BsTabControlComponent } from './tab-control.component';

@Component({
  selector: 'bs-tab-control-test',
  template: `
    <bs-tab-control [border]="border()" [selectFirstTab]="selectFirst()" [tabsPosition]="position()">
      @for (tab of tabs(); track tab) {
        <bs-tab-page [disabled]="tab.disabled">
          <ng-container *bsTabPageHeader>{{ tab.title }}</ng-container>
          <span class="body">{{ tab.title }} body</span>
        </bs-tab-page>
      }
    </bs-tab-control>`,
  imports: [BsTabControlComponent, BsTabPageComponent, BsTabPageHeaderDirective],
})
class BsTabControlTestComponent {
  border = signal(true);
  selectFirst = signal(true);
  position = signal<BsTabsPosition>('top');
  tabs = signal([
    { title: 'One', disabled: false },
    { title: 'Two', disabled: false },
    { title: 'Three', disabled: true },
  ]);

  control = viewChild.required(BsTabControlComponent);
}

describe('BsTabControlComponent', () => {
  let component: BsTabControlTestComponent;
  let fixture: ComponentFixture<BsTabControlTestComponent>;

  const root = () => (fixture.nativeElement as HTMLElement).querySelector('bs-tab-control') as HTMLElement;
  const radios = () => [...root().querySelectorAll<HTMLInputElement>(':scope > input.tab-radio')];
  const tabs = () => [...root().querySelectorAll<HTMLElement>(':scope > .tsc > ul > li > label.nav-link')];
  const panes = () => [...root().querySelectorAll<HTMLElement>(':scope > .tab-content > .tab-pane')];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BsTabControlTestComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BsTabControlTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  describe('markup', () => {
    it('makes the host the .tab-control root with one radio, tab and pane per page', () => {
      expect(root().classList.contains('tab-control')).toBe(true);
      expect(root().getAttribute('data-mps')).toBe('tab-control');
      expect(radios()).toHaveLength(3);
      expect(tabs().map((tab) => tab.textContent?.trim())).toEqual(['One', 'Two', 'Three']);
      expect(panes().map((pane) => pane.textContent?.trim())).toEqual(['One body', 'Two body', 'Three body']);
    });

    it('names every radio into one group and points each label at its radio', () => {
      const name = radios()[0].name;
      expect(radios().every((radio) => radio.name === name)).toBe(true);
      tabs().forEach((tab, i) => expect(tab.getAttribute('for')).toBe(radios()[i].id));
    });

    it('renders the strip after the panes for bottom tabs', () => {
      component.position.set('bottom');
      fixture.detectChanges();
      const strip = root().querySelector(':scope > .tsc') as HTMLElement;
      expect(strip.classList.contains('bottom-tabs')).toBe(true);
      expect(strip.previousElementSibling?.classList.contains('tab-content')).toBe(true);
      expect(root().getAttribute('data-tabs-position')).toBe('bottom');
    });

    it('draws the pane border only when asked', () => {
      const content = root().querySelector(':scope > .tab-content') as HTMLElement;
      expect(content.classList.contains('border')).toBe(true);
      component.border.set(false);
      fixture.detectChanges();
      expect(content.classList.contains('border')).toBe(false);
    });
  });

  describe('selection', () => {
    it('checks the first enabled page by default', () => {
      expect(radios().map((radio) => radio.checked)).toEqual([true, false, false]);
      expect(component.control().checkedTab()).toBe(component.control().tabPages()[0]);
    });

    it('checks nothing without selectFirstTab', () => {
      component.selectFirst.set(false);
      fixture.detectChanges();
      expect(radios().some((radio) => radio.checked)).toBe(false);
      expect(component.control().checkedTab()).toBeNull();
    });

    it('selects a page on tab click and refuses a disabled one', () => {
      tabs()[1].click();
      fixture.detectChanges();
      expect(radios()[1].checked).toBe(true);
      tabs()[2].click();
      fixture.detectChanges();
      expect(radios()[1].checked).toBe(true);
    });

    it('follows a radio change (the not-enhanced tier)', () => {
      radios()[1].checked = true;
      radios()[1].dispatchEvent(new Event('change', { bubbles: true }));
      fixture.detectChanges();
      expect(component.control().checkedTab()).toBe(component.control().tabPages()[1]);
    });

    it('selects through setActiveTab', () => {
      component.control().setActiveTab(component.control().tabPages()[1]);
      fixture.detectChanges();
      expect(radios()[1].checked).toBe(true);
    });
  });

  describe('enhanced tier', () => {
    it('turns the labels into APG tabs and hides the radios', () => {
      expect(root().querySelector('ul')?.getAttribute('role')).toBe('tablist');
      expect(tabs().map((tab) => tab.getAttribute('role'))).toEqual(['tab', 'tab', 'tab']);
      expect(tabs().map((tab) => tab.getAttribute('aria-selected'))).toEqual(['true', 'false', 'false']);
      expect(tabs().map((tab) => tab.getAttribute('tabindex'))).toEqual(['0', '-1', '-1']);
      expect(tabs()[2].getAttribute('aria-disabled')).toBe('true');
      expect(radios().every((radio) => radio.hidden)).toBe(true);
      panes().forEach((pane, i) => {
        expect(pane.getAttribute('role')).toBe('tabpanel');
        expect(pane.getAttribute('aria-labelledby')).toBe(tabs()[i].id);
        expect(tabs()[i].getAttribute('aria-controls')).toBe(pane.id);
      });
    });

    it('moves focus and selection with the arrow keys, skipping disabled tabs', () => {
      tabs()[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      fixture.detectChanges();
      expect(radios()[0].checked).toBe(true);
      expect(document.activeElement).toBe(tabs()[0]);
      tabs()[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
      fixture.detectChanges();
      expect(radios()[1].checked).toBe(true);
      expect(tabs()[1].getAttribute('tabindex')).toBe('0');
    });
  });

  it('keeps the page hosts out of the layout', () => {
    const hosts = [...root().querySelectorAll('bs-tab-page')];
    expect(hosts).toHaveLength(3);
    expect(hosts.every((host) => host.hasAttribute('hidden'))).toBe(true);
  });
});
