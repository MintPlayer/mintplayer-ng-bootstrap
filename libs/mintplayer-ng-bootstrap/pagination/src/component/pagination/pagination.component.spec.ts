import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockModule } from 'ng-mocks';

import { BsPaginationComponent } from './pagination.component';

describe('BsPaginationComponent', () => {
  let component: BsPaginationComponent;
  let fixture: ComponentFixture<BsPaginationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        // Unit to test
        BsPaginationComponent,
      ],
      declarations: []
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsPaginationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
