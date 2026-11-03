import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { BsTabControlComponent, BsTabPageComponent, BsTabPageHeaderDirective } from '../index';

/**
 * The generated tab control (#458 M4): each `bs-tab-page` is a declaration
 * whose header and body the control renders in its own label and pane (Q15).
 */
@Component({
  selector: 'bs-tab-control-test',
  template: `
    <bs-tab-control [(activeTab)]="active">
      @for (page of pages(); track page.id) {
        <bs-tab-page [tabId]="page.id" [disabled]="page.disabled">
          <strong *bsTabPageHeader class="rich">{{ page.title }}</strong>
          <span class="body">{{ page.title }} body</span>
          @if (page.nested) {
            <bs-tab-control class="inner">
              <bs-tab-page><span *bsTabPageHeader>Inner A</span>A</bs-tab-page>
              <bs-tab-page><span *bsTabPageHeader>Inner B</span>B</bs-tab-page>
            </bs-tab-control>
          }
        </bs-tab-page>
      }
    </bs-tab-control>`,
  imports: [BsTabControlComponent, BsTabPageComponent, BsTabPageHeaderDirective],
})
class BsTabControlTestComponent {
  active = signal<string | null>(null);
  pages = signal([
    { id: 'one', title: 'One', disabled: false, nested: false },
    { id: 'two', title: 'Two', disabled: false, nested: true },
    { id: 'three', title: 'Three', disabled: true, nested: false },
  ]);
}

describe('BsTabControlComponent (generated, #458)', () => {
  let component: BsTabControlTestComponent;
  let fixture: ComponentFixture<BsTabControlTestComponent>;

  const outer = () => (fixture.nativeElement as HTMLElement).querySelector('bs-tab-control') as HTMLElement;
  const inner = () => (fixture.nativeElement as HTMLElement).querySelector('bs-tab-control.inner') as HTMLElement;
  const tabs = (root = outer()) => [...root.querySelectorAll<HTMLLabelElement>(':scope > .tsc > ul > li > label.nav-link')];
  const radios = (root = outer()) => [...root.querySelectorAll<HTMLInputElement>(':scope > input.tab-radio')];
  const panes = (root = outer()) => [...root.querySelectorAll<HTMLElement>(':scope > .tab-content > .tab-pane')];
  const selected = (root = outer()) => tabs(root).map((tab) => tab.getAttribute('aria-selected'));

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [BsTabControlTestComponent] }).compileComponents();
    fixture = TestBed.createComponent(BsTabControlTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('makes the host the .tab-control root, with one radio, tab and pane per page', () => {
    expect(outer().classList.contains('tab-control')).toBe(true);
    expect(outer().getAttribute('data-mps')).toBe('tab-control');
    expect(radios()).toHaveLength(3);
    expect(tabs()).toHaveLength(3);
    expect(panes()).toHaveLength(3);
  });

  it('renders each rich header inside its tab and each body inside its pane', () => {
    expect(tabs().map((tab) => tab.querySelector('strong.rich')?.textContent)).toEqual(['One', 'Two', 'Three']);
    expect(panes().map((pane) => pane.querySelector(':scope > .body')?.textContent)).toEqual(['One body', 'Two body', 'Three body']);
  });

  it('wires every tab to its pane', () => {
    tabs().forEach((tab, index) => {
      expect(tab.getAttribute('aria-controls')).toBe(panes()[index].id);
      expect(panes()[index].getAttribute('aria-labelledby')).toBe(tab.id);
    });
  });

  it('shows the first enabled page while none is active', () => {
    expect(radios().map((radio) => radio.checked)).toEqual([true, false, false]);
    expect(selected()).toEqual(['true', 'false', 'false']);
  });

  it('selects on click and writes the page id back', () => {
    tabs()[1].click();
    fixture.detectChanges();
    expect(component.active()).toBe('two');
    expect(selected()).toEqual(['false', 'true', 'false']);
    expect(radios()[1].checked).toBe(true);
  });

  it('follows activeTab from the consumer, and refuses a disabled page', () => {
    component.active.set('two');
    fixture.detectChanges();
    expect(selected()).toEqual(['false', 'true', 'false']);

    tabs()[2].click();
    fixture.detectChanges();
    expect(component.active()).toBe('two');
    expect(tabs()[2].getAttribute('aria-disabled')).toBe('true');
  });

  it('keeps a nested control\'s pages out of the outer one', () => {
    expect(tabs(inner()).map((tab) => tab.textContent?.trim())).toEqual(['Inner A', 'Inner B']);
    expect(panes(inner()).map((pane) => pane.textContent?.trim())).toEqual(['A', 'B']);
    expect(panes()[1].contains(inner())).toBe(true);

    tabs(inner())[1].click();
    fixture.detectChanges();
    expect(selected(inner())).toEqual(['false', 'true']);
    expect(selected()).toEqual(['true', 'false', 'false']);
  });
});
