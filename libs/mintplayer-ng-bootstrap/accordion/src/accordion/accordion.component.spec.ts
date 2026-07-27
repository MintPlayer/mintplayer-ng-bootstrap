import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { BsAccordionTabHeaderDirective } from '../accordion-tab-header/accordion-tab-header.directive';
import { BsAccordionTabComponent } from '../accordion-tab/accordion-tab.component';
import { BsAccordionComponent } from './accordion.component';

@Component({
  selector: 'bs-accordion-test',
  template: `
    <bs-accordion [multi]="multi()" [highlightActiveTab]="highlight()">
      @for (tab of tabs(); track tab) {
        <bs-accordion-tab [(isActive)]="tab.open" [disabled]="tab.disabled">
          <ng-container *bsAccordionTabHeader>{{ tab.title }}</ng-container>
          <span class="body">{{ tab.title }} body</span>
        </bs-accordion-tab>
      }
    </bs-accordion>`,
  imports: [BsAccordionComponent, BsAccordionTabComponent, BsAccordionTabHeaderDirective],
})
class BsAccordionTestComponent {
  multi = signal(false);
  highlight = signal(false);
  tabs = signal([
    { title: 'One', open: signal(false), disabled: false },
    { title: 'Two', open: signal(false), disabled: false },
    { title: 'Three', open: signal(false), disabled: false },
  ]);

  accordion = viewChild.required(BsAccordionComponent);
}

describe('BsAccordionComponent', () => {
  let component: BsAccordionTestComponent;
  let fixture: ComponentFixture<BsAccordionTestComponent>;

  const host = () => fixture.nativeElement as HTMLElement;
  const element = () => host().querySelector('mp-accordion') as HTMLElement;
  const headers = () => [...host().querySelectorAll<HTMLElement>('[accordion-header]')];
  const tabs = () => [...host().querySelectorAll<HTMLElement>('bs-accordion-tab')];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BsAccordionTestComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BsAccordionTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
    expect(element()).toBeTruthy();
  });

  describe('marker bridging', () => {
    it('makes each tab host the marker the web component reads', () => {
      tabs().forEach((tab, index) => {
        expect(tab.hasAttribute('accordion-tab')).toBe(true);
        expect(tab.getAttribute('slot')).toBe(`c${index}`);
        // Markers must be DIRECT children of the element — named slots
        // accept nothing else.
        expect(tab.parentElement).toBe(element());
      });
    });

    it('hoists each tab header into an index-slotted sibling of its tab', () => {
      const rendered = headers();
      expect(rendered).toHaveLength(3);
      rendered.forEach((header, index) => {
        expect(header.getAttribute('slot')).toBe(`h${index}`);
        expect(header.parentElement).toBe(element());
        expect(header.textContent?.trim()).toBe(['One', 'Two', 'Three'][index]);
      });
    });

    it('keeps header and tab indexes aligned when a tab has no header', () => {
      component.tabs.update((list) => [
        ...list,
        { title: '', open: signal(false), disabled: false },
      ]);
      fixture.detectChanges();
      expect(headers()).toHaveLength(4);
      expect(headers()[3].getAttribute('slot')).toBe('h3');
      expect(tabs()[3].getAttribute('slot')).toBe('c3');
    });

    it('reflects state onto the marker attributes', () => {
      expect(tabs()[1].hasAttribute('is-active')).toBe(false);

      component.tabs()[1].open.set(true);
      fixture.detectChanges();
      expect(tabs()[1].getAttribute('is-active')).toBe('');

      component.tabs.update((list) =>
        list.map((tab, index) => (index === 2 ? { ...tab, disabled: true } : tab)));
      fixture.detectChanges();
      expect(tabs()[2].getAttribute('disabled')).toBe('');
    });

    it('bridges multi and highlightActiveTab as presence attributes', () => {
      expect(element().hasAttribute('multi')).toBe(false);
      expect(element().hasAttribute('highlight-active-tab')).toBe(false);

      component.multi.set(true);
      component.highlight.set(true);
      fixture.detectChanges();

      expect(element().getAttribute('multi')).toBe('');
      expect(element().getAttribute('highlight-active-tab')).toBe('');
    });
  });

  describe('toggle event bridging', () => {
    const toggle = (target: Element, index: number, active: boolean) =>
      target.dispatchEvent(
        new CustomEvent('mp-accordion-tab-toggle', {
          detail: { index, active, originalEvent: null },
          bubbles: true,
          composed: true,
        }),
      );

    it('writes the web component toggle back into the tab model', () => {
      toggle(element(), 1, true);
      fixture.detectChanges();
      expect(component.tabs()[1].open()).toBe(true);

      toggle(element(), 1, false);
      fixture.detectChanges();
      expect(component.tabs()[1].open()).toBe(false);
    });

    it('ignores a nested accordion toggle instead of applying its index', () => {
      // Nesting is the normal case and the event is composed, so it passes
      // straight through this accordion — whose tab 0 must NOT open.
      const nested = document.createElement('mp-accordion');
      tabs()[2].appendChild(nested);
      toggle(nested, 0, true);
      fixture.detectChanges();

      expect(component.tabs().map((tab) => tab.open())).toEqual([false, false, false]);
    });

    it('stops a claimed event at the accordion that handled it', () => {
      const seen: Event[] = [];
      host().addEventListener('mp-accordion-tab-toggle', (event) => seen.push(event));
      toggle(element(), 0, true);
      expect(seen).toHaveLength(0);
    });
  });
});
