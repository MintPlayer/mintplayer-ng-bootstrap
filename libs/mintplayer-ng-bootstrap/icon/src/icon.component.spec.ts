import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BsIconComponent } from './icon.component';

describe('BsIconComponent', () => {
  let component: BsIconComponent;
  let fixture: ComponentFixture<BsIconComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BsIconComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BsIconComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
