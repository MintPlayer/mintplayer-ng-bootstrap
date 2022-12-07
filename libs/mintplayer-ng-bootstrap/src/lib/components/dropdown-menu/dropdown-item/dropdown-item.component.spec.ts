import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BsDropdownItemComponent } from './dropdown-item.component';

describe('BsDropdownItemComponent', () => {
  let component: BsDropdownItemComponent;
  let fixture: ComponentFixture<BsDropdownItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BsDropdownItemComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BsDropdownItemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
