import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BsAlertCloseComponent } from './alert-close.component';

describe('AlertCloseComponent', () => {
  let component: BsAlertCloseComponent;
  let fixture: ComponentFixture<BsAlertCloseComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BsAlertCloseComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsAlertCloseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
