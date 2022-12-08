import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BsTableComponent } from './table.component';

describe('BsTableComponent', () => {
  let component: BsTableComponent;
  let fixture: ComponentFixture<BsTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BsTableComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BsTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
