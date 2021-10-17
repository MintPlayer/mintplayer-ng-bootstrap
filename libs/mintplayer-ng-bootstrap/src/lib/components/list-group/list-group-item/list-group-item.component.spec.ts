import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BsListGroupItemComponent } from './list-group-item.component';

describe('ListGroupItemComponent', () => {
  let component: BsListGroupItemComponent;
  let fixture: ComponentFixture<BsListGroupItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BsListGroupItemComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsListGroupItemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
