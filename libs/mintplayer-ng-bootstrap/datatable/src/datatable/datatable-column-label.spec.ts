import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BsDatatableComponent } from './datatable.component';
import { BsDatatableColumnDirective } from '../datatable-column/datatable-column.directive';

/**
 * `bsDatatableColumnLabel` and `bsDatatableColumnResizable` (#426), driven from
 * signals: a plain-field write would notify nothing and the child would keep
 * its old value.
 */
@Component({
  selector: 'datatable-column-label-harness',
  imports: [BsDatatableComponent, BsDatatableColumnDirective],
  template: `
    <bs-datatable [data]="data" [resizableColumns]="tableResizable()">
      <div *bsDatatableColumn="'name'">{{ header() }}</div>
      <div *bsDatatableColumn="'actions'; sortable: false; label: actionsLabel(); resizable: actionsResizable()">
        <span aria-hidden="true">&#8943;</span>
      </div>
    </bs-datatable>
  `,
})
class HarnessComponent {
  readonly data = [{ id: 1, name: 'Alpha', actions: '' }];
  readonly header = signal('Artist');
  readonly actionsLabel = signal<string | undefined>('Actions');
  readonly actionsResizable = signal<boolean | undefined>(false);
  readonly tableResizable = signal(true);
}

describe('bs-datatable — column label and resizable', () => {
  let fixture: ComponentFixture<HarnessComponent>;

  const mp = () => fixture.nativeElement.querySelector('mp-datatable') as HTMLElement;
  const handle = (column: string) =>
    mp().querySelector(`thead tr:first-child th[data-column="${column}"] .resize-handle`);
  const settle = async () => {
    fixture.detectChanges();
    await (mp() as unknown as { updateComplete: Promise<unknown> }).updateComplete;
    await new Promise((r) => setTimeout(r, 0));
    fixture.detectChanges();
    await (mp() as unknown as { updateComplete: Promise<unknown> }).updateComplete;
  };

  beforeEach(async () => {
    fixture = TestBed.createComponent(HarnessComponent);
    await settle();
  });

  it('names a column by its header template text when no label is set', () => {
    expect(handle('name')?.getAttribute('aria-label')).toBe('Resize column Artist');
  });

  it('follows the header text when it changes (a language switch)', async () => {
    fixture.componentInstance.header.set('Artiest');
    await settle();
    expect(handle('name')?.getAttribute('aria-label')).toBe('Resize column Artiest');
  });

  it('bsDatatableColumnResizable: false drops only that handle', () => {
    expect(handle('name')).not.toBeNull();
    expect(handle('actions')).toBeNull();
  });

  it('forwards the label to the generated strings', async () => {
    fixture.componentInstance.actionsResizable.set(true);
    await settle();
    expect(handle('actions')?.getAttribute('aria-label')).toBe('Resize column Actions');
  });

  it('an unset resizable follows the table, so a table-wide false is not overridden', async () => {
    fixture.componentInstance.actionsResizable.set(undefined);
    fixture.componentInstance.tableResizable.set(false);
    await settle();
    expect(handle('name')).toBeNull();
    expect(handle('actions')).toBeNull();
  });
});
