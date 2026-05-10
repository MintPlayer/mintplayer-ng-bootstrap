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
  });

  const nav = () => fixture.nativeElement.querySelector<HTMLElement>('nav')!;
  const pageLinks = () => Array.from(fixture.nativeElement.querySelectorAll<HTMLAnchorElement>('a.page-link'))
    .filter(a => /^\d+$/.test(a.textContent?.trim() ?? ''));

  it('renders a nav landmark with the configured aria-label', () => {
    expect(nav().tagName).toBe('NAV');
    expect(nav().getAttribute('aria-label')).toBe('Pagination');
  });

  it('only the selected page link has aria-current="page"', () => {
    const links = pageLinks();
    const currents = links.filter(a => a.hasAttribute('aria-current'));
    expect(currents.length).toBe(1);
    expect(currents[0].getAttribute('aria-current')).toBe('page');
    expect(currents[0].textContent?.trim()).toBe('3');
  });

  it('aria-current moves with the selection', () => {
    host.selected.set(5);
    fixture.detectChanges();
    const currents = pageLinks().filter(a => a.hasAttribute('aria-current'));
    expect(currents[0].textContent?.trim()).toBe('5');
  });

  it('does not render any visually-hidden "(current)" span (aria-current does the announcing)', () => {
    const hidden = fixture.nativeElement.querySelector<HTMLElement>('.visually-hidden');
    // 'Previous' and 'Next' visually-hidden labels still exist; just check no '(current)'
    const texts = Array.from(fixture.nativeElement.querySelectorAll<HTMLElement>('.visually-hidden')).map(e => e.textContent);
    expect(texts.some(t => t?.includes('(current)'))).toBe(false);
  });

  it('ellipsis renders as a non-interactive <span>, not an <a>', () => {
    host.pages.set(Array.from({ length: 20 }, (_, i) => i + 1));
    host.selected.set(10);
    host.numberOfBoxes.set(7);
    fixture.detectChanges();
    const ellipsisLis = Array.from(fixture.nativeElement.querySelectorAll<HTMLElement>('li.page-item'))
      .filter(li => li.textContent?.includes('More pages'));
    expect(ellipsisLis.length).toBeGreaterThan(0);
    ellipsisLis.forEach(li => {
      expect(li.querySelector('a')).toBeNull();
      expect(li.querySelector('span.page-link')).not.toBeNull();
    });
  });
});
