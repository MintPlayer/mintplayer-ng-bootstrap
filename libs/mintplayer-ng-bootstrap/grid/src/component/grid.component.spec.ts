import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BsGridComponent } from './grid.component';

describe('BsGridComponent', () => {
  let component: BsGridComponent;
  let fixture: ComponentFixture<BsGridComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BsGridComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BsGridComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
