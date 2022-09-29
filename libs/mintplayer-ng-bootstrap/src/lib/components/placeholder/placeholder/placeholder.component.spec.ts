import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BsPlaceholderComponent } from './placeholder.component';

describe('BsPlaceholderComponent', () => {
  let component: BsPlaceholderComponent;
  let fixture: ComponentFixture<BsPlaceholderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BsPlaceholderComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BsPlaceholderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
