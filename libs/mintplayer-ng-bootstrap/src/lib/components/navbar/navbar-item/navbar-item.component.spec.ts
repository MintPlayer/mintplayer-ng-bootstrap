import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BsNavbarItemComponent } from './navbar-item.component';

describe('BsNavbarItemComponent', () => {
  let component: BsNavbarItemComponent;
  let fixture: ComponentFixture<BsNavbarItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BsNavbarItemComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsNavbarItemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
