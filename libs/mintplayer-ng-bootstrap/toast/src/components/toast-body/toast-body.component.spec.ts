import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BsToastBodyComponent } from './toast-body.component';

describe('BsToastBodyComponent', () => {
  let component: BsToastBodyComponent;
  let fixture: ComponentFixture<BsToastBodyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BsToastBodyComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BsToastBodyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
