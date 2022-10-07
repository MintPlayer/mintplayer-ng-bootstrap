import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BsSelectComponent } from './select.component';

describe('BsSelectComponent', () => {
  let component: BsSelectComponent;
  let fixture: ComponentFixture<BsSelectComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BsSelectComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BsSelectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
