import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { BsTableModule } from '@mintplayer/ng-bootstrap/table';
import { BsPaginationModule } from '@mintplayer/ng-bootstrap/pagination';
import { MockModule } from 'ng-mocks';

import { BsDatatableComponent } from './datatable.component';

describe('BsDatatableComponent', () => {
  let component: BsDatatableComponent;
  let fixture: ComponentFixture<BsDatatableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MockModule(BsGridModule),
        MockModule(BsTableModule),
        MockModule(BsPaginationModule),
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