import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BsProgressComponent } from './progress.component';

describe('BsProgressComponent', () => {
  let component: BsProgressComponent;
  let fixture: ComponentFixture<BsProgressComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BsProgressComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsProgressComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
