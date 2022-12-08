import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BsToastComponent } from './toast.component';

describe('BsToastComponent', () => {
  let component: BsToastComponent;
  let fixture: ComponentFixture<BsToastComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BsToastComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BsToastComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
