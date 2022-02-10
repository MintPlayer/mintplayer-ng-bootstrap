import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BsOffcanvasBodyComponent } from './offcanvas-body.component';

describe('BsOffcanvasBodyComponent', () => {
  let component: BsOffcanvasBodyComponent;
  let fixture: ComponentFixture<BsOffcanvasBodyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BsOffcanvasBodyComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsOffcanvasBodyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
