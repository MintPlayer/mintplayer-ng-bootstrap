import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BsNavbarMenuComponent } from './bs-navbar-menu.component';

describe('BsNavbarMenuComponent', () => {
  let component: BsNavbarMenuComponent;
  let fixture: ComponentFixture<BsNavbarMenuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BsNavbarMenuComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsNavbarMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
