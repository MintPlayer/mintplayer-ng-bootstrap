import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BsListGroupComponent } from './list-group.component';

describe('BsListGroupComponent', () => {
  let component: BsListGroupComponent;
  let fixture: ComponentFixture<BsListGroupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BsListGroupComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsListGroupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
