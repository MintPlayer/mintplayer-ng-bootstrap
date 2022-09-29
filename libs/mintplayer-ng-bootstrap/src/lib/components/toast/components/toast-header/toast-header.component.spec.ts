import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BsToastHeaderComponent } from './toast-header.component';

describe('BsToastHeaderComponent', () => {
  let component: BsToastHeaderComponent;
  let fixture: ComponentFixture<BsToastHeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BsToastHeaderComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BsToastHeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
