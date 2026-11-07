import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { DatatableColumnDef, DatatableFilters, FilterContext } from '@mintplayer/ui-core/datatable';
import { BsDatatableComponent, BsDatatableFilterDirective } from './generated/datatable.component.generated';

/**
 * #465 T1/T7: a column's custom filter panel is created on its first open and
 * kept after that. The consumer component's own state survives a close; `ctx`
 * reaches the same instance in place (the outlet's context changes, the view
 * does not), including after the `filters` model is written from outside.
 */
let constructed = 0;

@Component({
  selector: 'probe-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="probe" [attr.data-term]="ctx().term" [attr.data-selected]="selected()">
    <button type="button" class="bump" (click)="bumps.set(bumps() + 1)">{{ bumps() }}</button>
  </div>`,
})
class ProbePanelComponent {
  readonly ctx = input.required<FilterContext>();
  readonly bumps = signal(0);
  selected = () => this.ctx().selection.values.map((v) => String(v.value)).join(',');
  constructor() {
    constructed++;
  }
}

const COLUMNS: DatatableColumnDef[] = [{ name: 'name', label: 'Name', filterable: true, filterMode: 'custom' }];

@Component({
  selector: 'bs-keep-alive-host',
  imports: [BsDatatableComponent, BsDatatableFilterDirective, ProbePanelComponent],
  template: `<bs-datatable [columns]="columns" [data]="rows" [(filters)]="filters">
    <ng-template bsDatatableFilter let-ctx="ctx"><probe-panel [ctx]="ctx" /></ng-template>
  </bs-datatable>`,
})
class HostComponent {
  readonly columns = COLUMNS;
  readonly rows = [
    { id: 1, name: 'Alpha' },
    { id: 2, name: 'Bravo' },
  ];
  readonly filters = signal<DatatableFilters>({});
}

describe('bs-datatable custom filter panel keep-alive (#465)', () => {
  it('keeps the panel instance and its state across close and reopen, with a live ctx', async () => {
    constructed = 0;
    const fixture = TestBed.createComponent(HostComponent);
    const settle = async () => {
      fixture.detectChanges();
      await fixture.whenStable();
      await new Promise((resolve) => setTimeout(resolve, 0));
      fixture.detectChanges();
    };
    await settle();
    const host = fixture.nativeElement as HTMLElement;
    const panel = host.querySelector<HTMLElement>('[data-dt-filter-panel="name"]')!;
    const toggle = async (newState: 'open' | 'closed') => {
      const ev = new Event('toggle');
      Object.defineProperty(ev, 'newState', { value: newState });
      panel.dispatchEvent(ev);
      await settle();
    };

    await toggle('open');
    const probe = panel.querySelector<HTMLElement>('.probe')!;
    probe.querySelector<HTMLButtonElement>('.bump')!.click();
    probe.querySelector<HTMLButtonElement>('.bump')!.click();
    fixture.componentInstance.filters.set({ name: { values: ['Alpha'], inverse: false } });
    await settle();
    expect(panel.querySelector('.probe')).toBe(probe);
    expect(probe.dataset['selected']).toBe('Alpha');
    await toggle('closed');
    await toggle('open');
    expect(panel.querySelector('.probe')).toBe(probe);
    expect(probe.querySelector('.bump')!.textContent?.trim()).toBe('2');
    expect(probe.dataset['selected']).toBe('Alpha');
    expect(probe.dataset['term']).toBe('');
    expect(constructed).toBe(1);
  });
});
