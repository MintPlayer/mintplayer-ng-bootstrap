import { Component, forwardRef, Input, TemplateRef, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsDatatableComponent } from '../datatable/datatable.component';
import { BsRowTemplateDirective } from './row-template.directive';

describe('BsRowTemplateDirective', () => {
  let component: BsRowTemplateTestComponent;
  let fixture: ComponentFixture<BsRowTemplateTestComponent>;

  beforeEach(async () => {
    const testbed = TestBed.configureTestingModule({
      imports: [],
      declarations: [
        // Directive to test
        BsRowTemplateDirective,

        // Mock components
        BsDatatableMockComponent,

        // Testbench
        BsRowTemplateTestComponent,
      ],
      providers: []
    });
    await testbed.compileComponents();
    fixture = TestBed.createComponent(BsRowTemplateTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should contain a rowTemplate', () => {
    expect(component.table.rowTemplate).toBeDefined();
  });
});

interface Artist {
  id: number;
  name: string;
  yearStarted: number;
  yearQuit: number | null;
  text: string;
}

@Component({
  selector: 'bs-row-template-test',
  template: `
    <bs-datatable #table [data]="artists">
      <ng-template bsRowTemplate let-artist>
        <tr>
          <td class="text-nowrap">{{ artist.name }}</td>
          <td class="text-nowrap">{{ artist.yearStarted }}</td>
          <td class="text-nowrap">{{ artist.yearQuit }}</td>
        </tr>
      </ng-template>
    </bs-datatable>`
})
class BsRowTemplateTestComponent {
  @ViewChild('table') table!: BsDatatableMockComponent;

  artists?: Artist[] = [
    { id: 1, name: 'Dario G', yearStarted: 1993, yearQuit: null, text: 'Dario G' },
    { id: 1, name: 'Oasis', yearStarted: 1993, yearQuit: null, text: 'Oasis' },
    { id: 1, name: 'Coldplay', yearStarted: 1993, yearQuit: null, text: 'Coldplay' },
    { id: 1, name: 'Beyonce', yearStarted: 1993, yearQuit: null, text: 'Beyonce' },
    { id: 1, name: 'Daft Punk', yearStarted: 1993, yearQuit: null, text: 'Daft Punk' },
  ];
}

@Component({
  selector: 'bs-datatable',
  template: `
    <table>
      <tbody>
        <ng-container *ngIf="!!data && !!rowTemplate">
          <ng-container *ngFor="let item of data.data">
            <ng-container *ngTemplateOutlet="rowTemplate; context: { $implicit: item }"></ng-container>
          </ng-container>
        </ng-container>
      </tbody>
    </table>`,
  providers: [
    { provide: BsDatatableComponent, useExisting: forwardRef(() => BsDatatableMockComponent) }
  ]
})
class BsDatatableMockComponent {
  @Input() data: Artist[] = [];
  rowTemplate?: TemplateRef<any>;
}
