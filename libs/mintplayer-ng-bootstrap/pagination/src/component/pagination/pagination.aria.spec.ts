import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsPaginationComponent } from './pagination.component';

@Component({
  selector: 'bs-pagination-aria-harness',
  imports: [BsPaginationComponent],
  template: `
    <bs-pagination
      aria-label="Search results"
      [pageNumbers]="pages()"
      [(selectedPageNumber)]="selected"
      [showArrows]="true"
      [numberOfBoxes]="numberOfBoxes()"
      [hrefFor]="hrefFor()"
    ></bs-pagination>
  `,
})
class HarnessComponent {
  pages = signal([1, 2, 3, 4, 5]);
  selected = signal(3);
  numberOfBoxes = signal(0);
  hrefFor = signal<((page: number) => string) | null>(null);
}

describe('BsPaginationComponent ARIA', () => {
  let fixture: ComponentFixture<HarnessComponent>;
  let host: HarnessComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HarnessComponent] }).compileComponents();
    fixture = TestBed.createComponent(HarnessComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  const root = (): HTMLElement => fixture.nativeElement.querySelector('bs-pagination');
  const pageLinks = () => Array.from(root().querySelectorAll<HTMLElement>('.page-link'))
    .filter((b) => /^\d+$/.test(b.textContent?.trim() ?? ''));

  it('renders a nav landmark named by the host aria-label, with Bootstrap markup', () => {
    const nav = root().querySelector('nav')!;
    expect(nav.getAttribute('aria-label')).toBe('Search results');
    expect(root().querySelector('mp-pagination')).toBeNull();
    expect(nav.querySelector('ul.pagination > li.page-item > button.page-link')).not.toBeNull();
  });

  it('only the selected page link has aria-current="page"', () => {
    const currents = pageLinks().filter((b) => b.hasAttribute('aria-current'));
    expect(currents.length).toBe(1);
    expect(currents[0].getAttribute('aria-current')).toBe('page');
    expect(currents[0].textContent?.trim()).toBe('3');
    expect(currents[0].closest('li')?.classList.contains('active')).toBe(true);
  });

  it('aria-current moves with the selection, and a click selects', () => {
    host.selected.set(5);
    fixture.detectChanges();
    expect(pageLinks().find((b) => b.hasAttribute('aria-current'))?.textContent?.trim()).toBe('5');
    pageLinks()[0].click();
    fixture.detectChanges();
    expect(host.selected()).toBe(1);
    expect(root().querySelector<HTMLButtonElement>('[aria-label="Previous"]')?.disabled).toBe(true);
  });

  it('the ellipsis is a non-interactive span hidden from AT', () => {
    host.pages.set(Array.from({ length: 20 }, (_, i) => i + 1));
    host.selected.set(10);
    host.numberOfBoxes.set(7);
    fixture.detectChanges();
    const gaps = Array.from(root().querySelectorAll<HTMLElement>('span.page-link'));
    expect(gaps.length).toBeGreaterThan(0);
    expect(gaps.every((g) => g.getAttribute('aria-hidden') === 'true')).toBe(true);
  });

  it('with hrefFor renders links, and a plain click selects without navigating', () => {
    host.hrefFor.set((page) => `?page=${page}`);
    fixture.detectChanges();
    const two = pageLinks().find((a) => a.textContent?.trim() === '2') as HTMLAnchorElement;
    expect(two.tagName).toBe('A');
    expect(two.getAttribute('href')).toBe('?page=2');
    const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
    two.dispatchEvent(event);
    fixture.detectChanges();
    expect(event.defaultPrevented).toBe(true);
    expect(host.selected()).toBe(2);
  });
});
