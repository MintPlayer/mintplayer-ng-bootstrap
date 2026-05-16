import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { DatatableColumnDef } from '@mintplayer/ng-bootstrap/web-components/datatable';

import { BsDatatableComponent } from './datatable.component';

interface Row { id: number; name: string; }

@Component({
  selector: 'datatable-create-harness',
  imports: [BsDatatableComponent],
  template: `<bs-datatable [columns]="columns()" [data]="data()"></bs-datatable>`,
})
class HarnessComponent {
  readonly data = signal<Row[]>([
    { id: 1, name: 'Alpha' },
    { id: 2, name: 'Bravo' },
  ]);
  readonly columns = signal<DatatableColumnDef<Row>[]>([
    { name: 'name', label: 'Name', cellRenderer: (r) => r.name },
  ]);
}

describe('BsDatatableComponent', () => {
  let fixture: ComponentFixture<HarnessComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HarnessComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(HarnessComponent);
    fixture.detectChanges();
  });

  it('should render the inner <mp-datatable>', () => {
    expect(fixture.nativeElement.querySelector('bs-datatable')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('mp-datatable')).toBeTruthy();
  });
});
