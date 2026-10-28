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

  const root = () => (fixture.nativeElement as HTMLElement).querySelector('bs-accordion') as HTMLElement;
  const rows = () => [...root().querySelectorAll<HTMLDetailsElement>(':scope > details')];
  const summaries = () => rows().map((row) => row.querySelector('summary') as HTMLElement);

  /** Open or close a row the way the platform does: flip `open`, then `toggle`. */
  // Flipping `open` fires the native toggle (once, asynchronously), as a click
  // does; a second, synthetic toggle would replay a stale state over the core's.
  const flip = async (row: HTMLDetailsElement, open: boolean) => {
    if (row.open !== open) {
      const toggled = new Promise((resolve) => row.addEventListener('toggle', resolve, { once: true }));
      row.open = open;
      await toggled;
    }
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BsAccordionTestComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BsAccordionTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('markup', () => {
    it('makes the host the .accordion root and renders one details row per tab', () => {
      expect(root().classList.contains('accordion')).toBe(true);
      expect(root().getAttribute('data-mps')).toBe('accordion');
      expect(rows()).toHaveLength(3);
      expect(rows().every((row) => row.classList.contains('accordion-item'))).toBe(true);
    });

    it('renders each header and body inside its own row', () => {
      expect(summaries().map((s) => s.textContent?.trim())).toEqual(['One', 'Two', 'Three']);
      rows().forEach((row, index) => {
        expect(row.querySelector('.accordion-content .body')?.textContent).toBe(`${['One', 'Two', 'Three'][index]} body`);
      });
    });

    it('wires each header to its region', () => {
      rows().forEach((row) => {
        const summary = row.querySelector('summary') as HTMLElement;
        const region = row.querySelector('[role=region]') as HTMLElement;
        expect(summary.getAttribute('aria-controls')).toBe(region.id);
        expect(region.getAttribute('aria-labelledby')).toBe(summary.id);
      });
    });

    it('groups the rows by name only when single-open', () => {
      const name = rows()[0].getAttribute('name');
      expect(name).toBeTruthy();
      expect(rows().every((row) => row.getAttribute('name') === name)).toBe(true);

      component.multi.set(true);
      fixture.detectChanges();
      expect(rows().some((row) => row.hasAttribute('name'))).toBe(false);
    });

    it('lowers highlightActiveTab onto a data attribute', () => {
      expect(root().hasAttribute('data-highlight-active')).toBe(false);
      component.highlight.set(true);
      fixture.detectChanges();
      expect(root().hasAttribute('data-highlight-active')).toBe(true);
    });

    it('takes a disabled tab out of the tab order', () => {
      component.tabs.update((list) => list.map((tab, index) => (index === 2 ? { ...tab, disabled: true } : tab)));
      fixture.detectChanges();
      expect(summaries()[2].getAttribute('aria-disabled')).toBe('true');
      expect(summaries()[2].getAttribute('tabindex')).toBe('-1');
    });
  });

  describe('state', () => {
    it('renders isActive onto the row', () => {
      component.tabs()[1].open.set(true);
      fixture.detectChanges();
      expect(rows().map((row) => row.open)).toEqual([false, true, false]);
    });

    it('writes a row toggle back into the tab model', async () => {
      await flip(rows()[1], true);
      expect(component.tabs()[1].open()).toBe(true);
      await flip(rows()[1], false);
      expect(component.tabs()[1].open()).toBe(false);
    });

    it('closes the open sibling when single-open', async () => {
      await flip(rows()[0], true);
      // Closing the sibling fires its own toggle a task later: wait for it.
      const closed = new Promise((resolve) => rows()[0].addEventListener('toggle', resolve, { once: true }));
      await flip(rows()[2], true);
      await closed;
      fixture.detectChanges();
      expect(component.tabs().map((tab) => tab.open())).toEqual([false, false, true]);
    });

    it('keeps siblings open when multi', async () => {
      component.multi.set(true);
      fixture.detectChanges();
      await flip(rows()[0], true);
      await flip(rows()[2], true);
      expect(component.tabs().map((tab) => tab.open())).toEqual([true, false, true]);
    });

    it('ignores a nested accordion row', async () => {
      const nested = document.createElement('div');
      nested.className = 'accordion';
      nested.setAttribute('data-mps', 'accordion');
      nested.innerHTML = '<details class="accordion-item" data-mps="accordion"><summary>n</summary></details>';
      rows()[2].querySelector('.accordion-content')?.append(nested);
      await flip(nested.querySelector('details') as HTMLDetailsElement, true);
      expect(component.tabs().map((tab) => tab.open())).toEqual([false, false, false]);
    });

    it('closeAll closes every row', async () => {
      component.multi.set(true);
      fixture.detectChanges();
      await flip(rows()[0], true);
      await flip(rows()[1], true);
      component.accordion().closeAll();
      expect(rows().some((row) => row.open)).toBe(false);
    });
  });
});
