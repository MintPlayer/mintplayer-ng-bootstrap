import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BsPaginationComponent } from './pagination.component';

describe('BsPaginationComponent', () => {
  let component: BsPaginationComponent;
  let fixture: ComponentFixture<BsPaginationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BsPaginationComponent ]
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
