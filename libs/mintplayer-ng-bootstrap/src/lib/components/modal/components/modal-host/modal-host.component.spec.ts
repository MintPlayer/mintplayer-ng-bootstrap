import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BsModalHostComponent } from './modal-host.component';

describe('BsModalHostComponent', () => {
  let component: BsModalHostComponent;
  let fixture: ComponentFixture<BsModalHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BsModalHostComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsModalHostComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
