import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ButtonTypeComponent } from './button-type.component';

describe('ButtonTypeComponent', () => {
  let component: ButtonTypeComponent;
  let fixture: ComponentFixture<ButtonTypeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ButtonTypeComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ButtonTypeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
