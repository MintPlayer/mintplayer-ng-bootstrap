import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BsCloseComponent } from './close.component';

describe('BsCloseComponent', () => {
  let component: BsCloseComponent;
  let fixture: ComponentFixture<BsCloseComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BsCloseComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BsCloseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
