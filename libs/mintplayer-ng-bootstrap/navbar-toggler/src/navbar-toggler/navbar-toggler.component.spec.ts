import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BsNavbarTogglerComponent } from './navbar-toggler.component';

describe('BsNavbarTogglerComponent', () => {
  let component: BsNavbarTogglerComponent;
  let fixture: ComponentFixture<BsNavbarTogglerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ BsNavbarTogglerComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsNavbarTogglerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
