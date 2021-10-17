import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BsCardComponent } from './card.component';

describe('BsCardComponent', () => {
  let component: BsCardComponent;
  let fixture: ComponentFixture<BsCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BsCardComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
