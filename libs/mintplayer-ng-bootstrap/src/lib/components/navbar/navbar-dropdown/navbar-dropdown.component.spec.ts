import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BsNavbarDropdownComponent } from './navbar-dropdown.component';

describe('BsNavbarDropdownComponent', () => {
  let component: BsNavbarDropdownComponent;
  let fixture: ComponentFixture<BsNavbarDropdownComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BsNavbarDropdownComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsNavbarDropdownComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
