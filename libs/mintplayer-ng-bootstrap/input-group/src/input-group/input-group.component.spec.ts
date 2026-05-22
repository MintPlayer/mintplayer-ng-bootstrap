import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BsInputGroupComponent } from './input-group.component';

describe('InputGroupComponent', () => {
  let component: BsInputGroupComponent;
  let fixture: ComponentFixture<BsInputGroupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BsInputGroupComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BsInputGroupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
