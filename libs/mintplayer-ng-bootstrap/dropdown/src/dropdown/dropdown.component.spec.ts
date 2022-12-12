import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BsDropdownComponent } from './dropdown.component';

describe('BsDropdownComponent', () => {
  let component: BsDropdownComponent;
  let fixture: ComponentFixture<BsDropdownComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BsDropdownComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BsDropdownComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
