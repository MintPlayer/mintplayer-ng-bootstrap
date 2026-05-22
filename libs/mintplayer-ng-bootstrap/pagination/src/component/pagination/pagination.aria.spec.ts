import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsPaginationComponent } from './pagination.component';

@Component({
  selector: 'bs-pagination-aria-harness',
  imports: [BsPaginationComponent],
  template: `
    <bs-pagination
      [pageNumbers]="pages()"
      [(selectedPageNumber)]="selected"
      [showArrows]="true"
      [numberOfBoxes]="numberOfBoxes()"
      [ariaLabel]="label()"
    ></bs-pagination>
  `,
})
class HarnessComponent {
  pages = signal([1, 2, 3, 4, 5]);
  selected = signal(3);
  label = signal('Pagination');
  numberOfBoxes = signal(0);
}

describe('BsPaginationComponent ARIA', () => {
  let fixture: ComponentFixture<HarnessComponent>;
  let host: HarnessComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HarnessComponent] }).compileComponents();
    fixture = TestBed.createComponent(HarnessComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
    await flushUpdates();
  });

  const wc = (): HTMLElement & { updateComplete?: Promise<void> } =>
    fixture.nativeElement.querySelector('mp-pagination');

  const shadow = (): ShadowRoot => wc().shadowRoot as ShadowRoot;

  async function flushUpdates(): Promise<void> {
    const el = wc();
    if (el?.updateComplete) await el.updateComplete;
    fixture.detectChanges();
    if (el?.updateComplete) await el.updateComplete;
  }

  const pageButtons = () => Array.from(shadow().querySelectorAll<HTMLButtonElement>('button.page-link'))
    .filter((b) => /^\d+$/.test(b.textContent?.trim() ?? ''));

  it('renders a nav landmark with the configured aria-label', () => {
    expect(shadow().querySelector('nav')?.tagName).toBe('NAV');
    expect(shadow().querySelector('nav')?.getAttribute('aria-label')).toBe('Pagination');
  });

  it('only the selected page link has aria-current="page"', () => {
    const currents = pageButtons().filter((b) => b.hasAttribute('aria-current'));
    expect(currents.length).toBe(1);
    expect(currents[0].getAttribute('aria-current')).toBe('page');
    expect(currents[0].textContent?.trim()).toBe('3');
  });

  it('aria-current moves with the selection', async () => {
    host.selected.set(5);
    await flushUpdates();
    const currents = pageButtons().filter((b) => b.hasAttribute('aria-current'));
    expect(currents[0].textContent?.trim()).toBe('5');
  });

  it('does not announce "(current)" via a visually-hidden span', () => {
    const texts = Array.from(shadow().querySelectorAll<HTMLElement>('.visually-hidden')).map((e) => e.textContent);
    expect(texts.some((t) => t?.includes('(current)'))).toBe(false);
  });

  it('ellipsis renders as a non-interactive <span>, not a <button>', async () => {
    host.pages.set(Array.from({ length: 20 }, (_, i) => i + 1));
    host.selected.set(10);
    host.numberOfBoxes.set(7);
    await flushUpdates();
    const gaps = Array.from(shadow().querySelectorAll<HTMLElement>('.ellipsis'));
    expect(gaps.length).toBeGreaterThan(0);
    gaps.forEach((g) => {
      expect(g.tagName).toBe('SPAN');
      expect(g.getAttribute('aria-hidden')).toBe('true');
    });
  });
});
