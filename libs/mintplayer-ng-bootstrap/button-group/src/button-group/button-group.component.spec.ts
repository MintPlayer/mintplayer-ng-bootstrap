import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BsButtonGroupComponent } from './button-group.component';

describe('BsButtonGroupComponent', () => {
  let component: BsButtonGroupComponent;
  let fixture: ComponentFixture<BsButtonGroupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BsButtonGroupComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BsButtonGroupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
