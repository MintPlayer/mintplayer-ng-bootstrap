import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { MockModule } from 'ng-mocks';
import { GridComponent } from './grid.component';

describe('GridComponent', () => {
  let component: GridComponent;
  let fixture: ComponentFixture<GridComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MockModule(BsGridModule),
      ],
      declarations: [
        // Unit to test
        GridComponent,
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GridComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
