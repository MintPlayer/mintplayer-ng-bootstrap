import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BsCardHeaderComponent } from './card-header.component';

describe('BsCardHeaderComponent', () => {
  let component: BsCardHeaderComponent;
  let fixture: ComponentFixture<BsCardHeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BsCardHeaderComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsCardHeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
