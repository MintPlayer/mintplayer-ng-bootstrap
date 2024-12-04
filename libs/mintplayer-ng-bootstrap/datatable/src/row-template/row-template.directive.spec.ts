import { Component, forwardRef, Input, TemplateRef, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockComponent } from 'ng-mocks';
import { BsDatatableComponent } from '../datatable/datatable.component';
import { BsRowTemplateDirective } from './row-template.directive';

describe('BsRowTemplateDirective', () => {
  let component: BsRowTemplateTestComponent;
  let fixture: ComponentFixture<BsRowTemplateTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [],
      declarations: [
        // Directive to test
        BsRowTemplateDirective,

        // Mock components
        MockComponent(BsDatatableComponent),

        // Testbench
        BsRowTemplateTestComponent,
      ]
    }).compileComponents();

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
  standalone: false,
  template: `
    <bs-datatable #table>
      <tr *bsRowTemplate="let artist of artists">
        <td class="text-nowrap">{{ artist.name }}</td>
        <td class="text-nowrap">{{ artist.yearStarted }}</td>
        <td class="text-nowrap">{{ artist.yearQuit }}</td>
      </tr>
    </bs-datatable>`
})
class BsRowTemplateTestComponent {
  @ViewChild('table') table!: BsDatatableComponent<Artist>;

  artists?: Artist[] = [
    { id: 1, name: 'Dario G', yearStarted: 1993, yearQuit: null, text: 'Dario G' },
    { id: 1, name: 'Oasis', yearStarted: 1993, yearQuit: null, text: 'Oasis' },
    { id: 1, name: 'Coldplay', yearStarted: 1993, yearQuit: null, text: 'Coldplay' },
    { id: 1, name: 'Beyonce', yearStarted: 1993, yearQuit: null, text: 'Beyonce' },
    { id: 1, name: 'Daft Punk', yearStarted: 1993, yearQuit: null, text: 'Daft Punk' },
  ];
}
