import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BsOffcanvasHeaderComponent } from './offcanvas-header.component';

describe('BsOffcanvasHeaderComponent', () => {
  let component: BsOffcanvasHeaderComponent;
  let fixture: ComponentFixture<BsOffcanvasHeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BsOffcanvasHeaderComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsOffcanvasHeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
