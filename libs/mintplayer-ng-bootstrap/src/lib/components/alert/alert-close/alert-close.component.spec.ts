import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AlertCloseComponent } from './alert-close.component';

describe('AlertCloseComponent', () => {
  let component: AlertCloseComponent;
  let fixture: ComponentFixture<AlertCloseComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AlertCloseComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AlertCloseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
