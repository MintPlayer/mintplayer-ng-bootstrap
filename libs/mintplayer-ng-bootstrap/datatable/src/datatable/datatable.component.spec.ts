import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsGridComponent, BsGridRowDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsTableComponent } from '@mintplayer/ng-bootstrap/table';
import { BsPaginationComponent } from '@mintplayer/ng-bootstrap/pagination';
import { MockComponent, MockModule } from 'ng-mocks';

import { BsDatatableComponent } from './datatable.component';

describe('BsDatatableComponent', () => {
  let component: BsDatatableComponent<any>;
  let fixture: ComponentFixture<BsDatatableComponent<any>>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MockModule(BsGridComponent, BsGridRowDirective),
        MockComponent(BsTableComponent),
        MockComponent(BsPaginationComponent),
      ],
      declarations: [
        // Unit to test
        BsDatatableComponent,
      ]
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