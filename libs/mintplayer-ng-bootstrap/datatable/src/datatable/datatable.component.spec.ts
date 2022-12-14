import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsGridTestingModule, BsPaginationTestingModule, BsTableTestingModule } from '@mintplayer/ng-bootstrap/testing';

import { BsDatatableComponent } from './datatable.component';

describe('BsDatatableComponent', () => {
  let component: BsDatatableComponent;
  let fixture: ComponentFixture<BsDatatableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        BsGridTestingModule,
        BsTableTestingModule,
        BsPaginationTestingModule,
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