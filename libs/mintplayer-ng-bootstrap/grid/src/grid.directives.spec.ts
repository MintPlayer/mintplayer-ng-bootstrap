import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BsGridColDirective, BsGridColumnDirective, BsGridRowDirective } from './generated';

/** The generated grid directives (#458): each stamps the consumer's element and puts its classes there. */
@Component({
  selector: 'test-host',
  imports: [BsGridRowDirective, BsGridColDirective, BsGridColumnDirective],
  template: `
    <div bsRow class="mine" id="row">
      <div col id="col"></div>
      <div [md]="md()" lg="4" id="column"></div>
    </div>
  `,
})
class TestHostComponent {
  readonly md = signal(6);
}

describe('generated grid directives', () => {
  it('put the row, col and column classes on the consumer elements, stamped with the grid scope', () => {
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
    const el = (id: string) => fixture.nativeElement.querySelector(`#${id}`) as HTMLElement;
    expect(el('row').className).toBe('mine row');
    expect(el('col').classList.contains('col')).toBe(true);
    expect(el('column').className).toBe('col-md-6 col-lg-4');
    ['row', 'col', 'column'].forEach((id) => expect(el(id).getAttribute('data-mps')).toBe('grid'));

    fixture.componentInstance.md.set(3);
    fixture.detectChanges();
    expect([...el('column').classList].sort()).toEqual(['col-lg-4', 'col-md-3']);
  });
});
