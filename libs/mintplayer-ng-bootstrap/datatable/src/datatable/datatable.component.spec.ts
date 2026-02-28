import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsTableComponent } from '@mintplayer/ng-bootstrap/table';
import { BsPaginationComponent } from '@mintplayer/ng-bootstrap/pagination';
import { MockComponent, MockDirective } from 'ng-mocks';

import { BsDatatableComponent } from './datatable.component';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsColFormLabelDirective } from '@mintplayer/ng-bootstrap/grid';

describe('BsDatatableComponent', () => {
  let component: BsDatatableComponent<any>;
  let fixture: ComponentFixture<BsDatatableComponent<any>>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MockComponent(BsGridComponent), MockDirective(BsGridRowDirective), MockDirective(BsGridColumnDirective), MockDirective(BsColFormLabelDirective),
        MockComponent(BsTableComponent),
        MockComponent(BsPaginationComponent),
        // Unit to test
        BsDatatableComponent,
      ],
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsDatatableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});