import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BsProgressBarComponent } from './progress-bar.component';

describe('BsProgressBarComponent', () => {
  let component: BsProgressBarComponent;
  let fixture: ComponentFixture<BsProgressBarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BsProgressBarComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsProgressBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
