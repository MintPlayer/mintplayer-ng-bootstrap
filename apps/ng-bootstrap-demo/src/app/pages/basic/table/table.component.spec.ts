import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { BsTableComponent } from '@mintplayer/ng-bootstrap/table';
import { BsCheckboxComponent } from '@mintplayer/ng-bootstrap/checkbox';
import { MockComponent, MockModule } from 'ng-mocks';

import { TableComponent } from './table.component';

describe('TableComponent', () => {
  let component: TableComponent;
  let fixture: ComponentFixture<TableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        FormsModule,
        MockModule(BsGridModule),
        MockComponent(BsTableComponent),
        MockComponent(BsCheckboxComponent),
      ],
      declarations: [
        // Unit to test
        TableComponent,
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
