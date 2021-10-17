import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BsNavbarNavComponent } from './navbar-nav.component';

describe('BsNavbarNavComponent', () => {
  let component: BsNavbarNavComponent;
  let fixture: ComponentFixture<BsNavbarNavComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BsNavbarNavComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsNavbarNavComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
